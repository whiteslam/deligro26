-- ============================================================
-- 0031 — Coupons that actually come off the bill
-- ------------------------------------------------------------
-- MUST run after 0030_recompute_guard_fix.sql. It depends on that fix twice
-- over: the RPC below writes `orders.discount`, which is a locked column, and
-- it reaches `recompute_order_total()`, which could not write a total at all
-- until 0030.
--
-- ## What was wrong
--
-- `coupons` has existed since 0006 with two live promo codes in it, and
-- `/api/coupons/validate` has been able to price a discount since then. Nothing
-- ever applied one. The audit logged it as M-7 ("validated but never applied"),
-- and the tracker has carried it as half-wired ever since — but it is worse
-- than half: nothing in the customer app has ever *called* the endpoint, so the
-- codes were unreachable rather than merely ineffective.
--
-- ## The shape of the fix
--
-- The discount is not a number the client sends. It is computed here, from the
-- order's own `order_items` and the coupon row, inside one SECURITY DEFINER
-- function that also records the redemption in the same transaction. That
-- placement is what makes the two hard parts fall out for free:
--
--   * **It cannot be forged.** `discount` and `coupon_code` join the locked
--     list in `guard_order_update()`, and the insert path cannot set them
--     either (see the trigger below). The only writer is this function, and it
--     derives the amount rather than accepting one.
--   * **It cannot be double-spent.** The redemption insert and the discount
--     write are one statement pair in one transaction, and `order_id` is
--     UNIQUE on the redemption table — so two concurrent calls for the same
--     order cannot both succeed, and a retry is a no-op rather than a second
--     discount.
--
-- ## A deliberate accounting choice
--
-- The discount comes off the **grand total**, after tax — not off the taxable
-- subtotal. Taking it off first would mean recomputing tax here, which would
-- put the rules in `src/lib/pricing.ts` into SQL as a second implementation of
-- the same arithmetic, and two sources of truth for what a customer is charged
-- is the failure this codebase is most careful about. If GST-correct invoicing
-- later requires tax on the discounted value, that is the moment to move the
-- whole fee-and-tax computation into the database — not to fork it here.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- ============================================================
-- Redemption limits on the coupon itself.
-- ------------------------------------------------------------
-- Without these a promo code is a permanent price cut. WELCOME50 is "50% off
-- up to ₹100" with no limit of any kind, so the same customer could take ₹100
-- off every order they ever place — which is not what anyone means by a
-- welcome offer.
--
-- `max_per_customer` defaults to 1, which is the safe direction: an existing
-- code becomes single-use per person rather than staying unlimited, and an
-- admin who wants otherwise says so explicitly. NULL means unlimited in both
-- columns, so "no limit" is always something someone chose.
-- ============================================================
alter table public.coupons
  add column if not exists max_per_customer integer default 1
    check (max_per_customer is null or max_per_customer > 0),
  add column if not exists max_redemptions  integer
    check (max_redemptions is null or max_redemptions > 0);

comment on column public.coupons.max_per_customer is
  'How many times one customer may use this code. NULL = unlimited. Default 1 — a promo code that is not limited per person is a price cut, not a promotion.';
comment on column public.coupons.max_redemptions is
  'Total redemptions allowed across all customers. NULL = unlimited.';

-- ============================================================
-- What the order records.
-- ------------------------------------------------------------
-- `coupon_code` is stored as plain text with no foreign key, deliberately —
-- the same reason `order_items` snapshots `price` instead of pointing at the
-- live menu. It is evidence of what happened, and deleting a promo code must
-- not rewrite the history of orders that used it.
-- ============================================================
alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists discount    integer not null default 0
    check (discount >= 0);

comment on column public.orders.coupon_code is
  'The promo code applied, snapshotted at redemption. No FK: deleting a coupon must not rewrite what an order was charged.';
comment on column public.orders.discount is
  'Rupees off the grand total, computed by apply_coupon_to_order() from the order''s own items. Never accepted from a client.';

-- ============================================================
-- The redemption ledger.
-- ------------------------------------------------------------
-- Separate from `orders.coupon_code` because the two answer different
-- questions. The column says what this order was charged; the table is what
-- the limit checks count, and what an admin reads to see whether a campaign is
-- being farmed. One row per order, enforced by the unique constraint rather
-- than by the code remembering to check.
-- ============================================================
create table if not exists public.coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  order_id    uuid not null unique references public.orders (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  discount    integer not null check (discount >= 0),
  created_at  timestamptz not null default now()
);

create index if not exists coupon_redemptions_code_customer_idx
  on public.coupon_redemptions (code, customer_id);
create index if not exists coupon_redemptions_code_idx
  on public.coupon_redemptions (code);

alter table public.coupon_redemptions enable row level security;

-- Read-only to the person it is about, and to admins. There is deliberately no
-- INSERT/UPDATE/DELETE policy for anyone: the only writer is the SECURITY
-- DEFINER function below, which is owned by postgres and therefore bypasses
-- RLS. A client that posts here directly is refused by default-deny.
drop policy if exists "coupon_redemptions — own read" on public.coupon_redemptions;
create policy "coupon_redemptions — own read" on public.coupon_redemptions for select
  using (customer_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.coupon_redemptions from anon, authenticated;
grant select on public.coupon_redemptions to authenticated;
grant select, insert, update, delete on public.coupon_redemptions to service_role;

-- ============================================================
-- The total, now net of the discount.
-- ------------------------------------------------------------
-- Re-declared from 0013 with `- o.discount` and a floor at zero. The floor is
-- not defensive noise: `max_discount` caps a percentage coupon against the
-- item subtotal, but the delivery fee and tax are added after it, and a future
-- flat coupon larger than a small order's items would otherwise drive the
-- total negative and past the `total >= 0` check constraint — turning a
-- generous coupon into a failed checkout.
-- ============================================================
create or replace function public.recompute_order_total(oid uuid)
returns void
language sql security definer set search_path = public as $$
  update public.orders o
  set total = greatest(0, coalesce((
      select sum(oi.qty * oi.price) from public.order_items oi where oi.order_id = oid
    ), 0) + o.delivery_fee + o.tax_amount + o.tip - o.discount)
  where o.id = oid;
$$;

-- ============================================================
-- Neither column is the client's to set — at UPDATE or at INSERT.
-- ============================================================
create or replace function public.guard_order_update()
returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  locked constant text[] := array[
    'id', 'customer_id', 'restaurant_id',
    'total', 'delivery_fee', 'tax_amount', 'tip',
    'address', 'created_at',
    'payment_method', 'payment_status',
    'accepted_at', 'ready_at', 'cancelled_at',
    'channel', 'placed_by',
    -- 0031: money off the bill, written only by apply_coupon_to_order().
    'coupon_code', 'discount'
  ];
  col     text;
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  foreach col in array locked loop
    if (old_row -> col) is distinct from (new_row -> col) then
      raise exception
        'only order status may be changed by this role (attempted: %)', col;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists orders_guard_update on public.orders;
create trigger orders_guard_update
  before update on public.orders
  for each row execute function public.guard_order_update();

drop trigger if exists zz_orders_stamp_lifecycle on public.orders;
create trigger zz_orders_stamp_lifecycle
  before update on public.orders
  for each row execute function public.stamp_order_lifecycle();

-- Extends 0030's insert pin to the discount columns: an order arrives with no
-- coupon, and acquires one only by going through the function below.
create or replace function public.force_order_total_pending()
returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  new.total       := 0;
  new.discount    := 0;
  new.coupon_code := null;
  return new;
end;
$$;

drop trigger if exists orders_force_total_pending on public.orders;
create trigger orders_force_total_pending
  before insert on public.orders
  for each row execute function public.force_order_total_pending();

-- ============================================================
-- Redeem a coupon against an order.
-- ------------------------------------------------------------
-- Returns jsonb rather than raising, because every failure here is an ordinary
-- thing a customer can do — a mistyped code, an expired campaign, a basket
-- below the minimum — and the checkout has to say which. Reserving exceptions
-- for genuine faults keeps the two distinguishable at the call site.
--
-- Authorization is the order's, not the coupon's: the caller must own the
-- order. `auth.uid()` is still the customer inside this function (SECURITY
-- DEFINER changes privileges, not the request identity — the lesson of 0030),
-- so the ownership test is real.
-- ============================================================
create or replace function public.apply_coupon_to_order(oid uuid, coupon text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o          public.orders%rowtype;
  c          public.coupons%rowtype;
  normalized text := upper(trim(coalesce(coupon, '')));
  subtotal   integer;
  amount     integer;
  used_by_me integer;
  used_total integer;
begin
  if normalized = '' then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;

  select * into o from public.orders where id = oid;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;

  -- The caller must own the order. Service-role callers (the phone desk, a
  -- future support tool) are trusted to name the order themselves.
  if o.customer_id is distinct from auth.uid()
     and coalesce(auth.jwt() ->> 'role', '') not in ('service_role', 'supabase_admin')
     and not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;

  -- Only while the order is still being placed. A coupon applied after the
  -- kitchen has accepted it changes a bill somebody has already agreed to.
  if o.status <> 'placed' then
    return jsonb_build_object('ok', false, 'error', 'order_not_open');
  end if;
  if o.coupon_code is not null then
    return jsonb_build_object('ok', false, 'error', 'already_applied');
  end if;

  select * into c from public.coupons where code = normalized;
  if not found or not c.active then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  -- The order's own items are the authority on what the basket was worth —
  -- not a subtotal the client claimed when it asked for a preview.
  select coalesce(sum(oi.qty * oi.price), 0) into subtotal
    from public.order_items oi where oi.order_id = oid;

  if subtotal < c.min_order then
    return jsonb_build_object(
      'ok', false, 'error', 'min_order', 'minOrder', c.min_order::integer);
  end if;

  if c.max_per_customer is not null then
    select count(*) into used_by_me from public.coupon_redemptions r
      where r.code = normalized and r.customer_id = o.customer_id;
    if used_by_me >= c.max_per_customer then
      return jsonb_build_object('ok', false, 'error', 'already_used');
    end if;
  end if;

  if c.max_redemptions is not null then
    select count(*) into used_total from public.coupon_redemptions r
      where r.code = normalized;
    if used_total >= c.max_redemptions then
      return jsonb_build_object('ok', false, 'error', 'exhausted');
    end if;
  end if;

  amount := case
    when c.kind = 'percent' then round(subtotal * c.value / 100.0)
    else round(c.value)
  end;
  if c.max_discount is not null then
    amount := least(amount, round(c.max_discount));
  end if;
  -- Never more than the food is worth. The delivery fee is not discountable:
  -- somebody still rides the order out to the door.
  amount := greatest(0, least(amount, subtotal));

  -- Unique on order_id, so a concurrent duplicate call loses here rather than
  -- discounting twice. Caught rather than raised: the other call succeeded, so
  -- the order does have its discount, and the customer should not see an error
  -- about a coupon that was in fact applied.
  begin
    insert into public.coupon_redemptions (code, order_id, customer_id, discount)
    values (normalized, oid, o.customer_id, amount);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_applied');
  end;

  update public.orders
     set coupon_code = normalized, discount = amount
   where id = oid;

  perform public.recompute_order_total(oid);

  return jsonb_build_object('ok', true, 'discount', amount, 'code', normalized);
end;
$$;

revoke all on function public.apply_coupon_to_order(uuid, text) from public, anon;
grant execute on function public.apply_coupon_to_order(uuid, text)
  to authenticated, service_role;

commit;

-- ============================================================
-- POST-MIGRATION — verify.
-- ------------------------------------------------------------
-- Existing codes are now single-use per customer (should show 1, 1):
--
--   select code, max_per_customer from public.coupons order by code;
--
-- A redemption is recorded for every discounted order (should return 0 rows):
--
--   select o.id from public.orders o
--    where o.coupon_code is not null
--      and not exists (select 1 from public.coupon_redemptions r
--                       where r.order_id = o.id);
-- ============================================================
