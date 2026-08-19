-- ============================================================
-- 0041 — Coupons a vendor can own, and a badge that can't lie
-- ------------------------------------------------------------
-- MUST run after 0031_coupon_redemption.sql. It re-declares three functions
-- that migration created (`apply_coupon_to_order`, `guard_order_update`,
-- `force_order_total_pending`) and depends on `coupon_redemptions` existing.
--
-- ## What was wrong
--
-- Three separate holes, all of them the same shape — a promotion the system
-- displays but does not model:
--
--   1. **`restaurants.offer` is free text.** A vendor types "35% OFF up to
--      ₹120" into the store edit sheet and it renders as a badge on the
--      restaurant card and the public listing. Nothing validates it, no code
--      backs it, and no customer can act on it. It is a claim about a discount
--      with no discount behind it.
--
--   2. **`coupons` had no scope.** The table has existed since 0006 with a
--      global primary key and no `restaurant_id`, so every code applies to
--      every order on the platform. A vendor could not run a promotion even in
--      principle, and there was no UI to create a code at all — the only two
--      that exist are the demo seeds from 0006, inserted by hand.
--
--   3. **Nobody funded the discount.** `recompute_order_total()` subtracts
--      `orders.discount` from the total, and vendor earnings derive item
--      revenue as `total - delivery_fee - tax_amount`. So the vendor silently
--      absorbed 100% of every platform-run coupon, with no column recording
--      who was supposed to pay for it.
--
-- Plus one that fell out while reading 0006: the `coupons — read active`
-- policy is `for select using (active and not expired)` with the Supabase
-- default table grants behind it, which means **anon could read every live
-- promo code on the platform**. `/api/coupons/validate` requires a session and
-- rate-limits to 20/minute precisely to stop code enumeration; the table it
-- guards was readable without either. That is closed below.
--
-- ## The shape of the fix
--
--   * `coupons` gains `restaurant_id` (NULL = platform-wide) and `funded_by`.
--     A vendor-funded code must name a restaurant; the check constraint makes
--     "vendor-funded by nobody in particular" unrepresentable.
--   * Pricing moves into `price_coupon()`, one function that both the preview
--     and the redemption call. Before this, `src/lib/data-access/coupons.ts`
--     re-implemented the arithmetic in TypeScript and the two could drift —
--     the failure this codebase is most careful about. There is now one
--     implementation, and the TS layer is a caller.
--   * Direct SELECT on `coupons` is revoked from anon and authenticated. A
--     customer reaches a coupon only by naming it, through `preview_coupon()`,
--     which is rate-limited at the route above it. Admins and owning vendors
--     keep row-scoped policy reads for their management screens.
--   * `restaurants.offer` becomes derived — written only by a trigger off the
--     vendor's own live coupons, and carrying `offer_expires_at` so a lapsed
--     campaign stops advertising itself without anything having to run.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- ============================================================
-- Scope and funding.
-- ------------------------------------------------------------
-- `code` stays the primary key, so it stays globally unique. Two vendors
-- cannot both own SAVE20, which is the right trade: the customer types a code
-- with no way to say which shop they meant, and a checkout that has to guess
-- is a checkout that will guess wrong.
--
-- `funded_by` defaults to 'platform' because that is what every existing row
-- is — the two demo codes from 0006 apply everywhere and come out of the
-- platform's margin. A vendor code has to say so explicitly.
-- ============================================================
alter table public.coupons
  add column if not exists restaurant_id uuid
    references public.restaurants (id) on delete cascade,
  add column if not exists funded_by text not null default 'platform',
  add column if not exists label text,
  add column if not exists created_by uuid
    references public.profiles (id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'coupons_funded_by_check'
  ) then
    alter table public.coupons
      add constraint coupons_funded_by_check
      check (funded_by in ('platform', 'vendor'));
  end if;

  -- "Vendor-funded" is meaningless without a vendor to bill. A platform-funded
  -- code may still be scoped to one restaurant — that is a platform campaign
  -- run at one shop, which is a real thing an operator does.
  if not exists (
    select 1 from pg_constraint where conname = 'coupons_funding_scope_check'
  ) then
    alter table public.coupons
      add constraint coupons_funding_scope_check
      check (funded_by = 'platform' or restaurant_id is not null);
  end if;
end $$;

create index if not exists coupons_restaurant_idx
  on public.coupons (restaurant_id) where restaurant_id is not null;

comment on column public.coupons.restaurant_id is
  'Which shop this code works at. NULL = every shop. Enforced in apply_coupon_to_order() against the order''s own restaurant_id, not by the client.';
comment on column public.coupons.funded_by is
  'Who pays for the discount. ''vendor'' comes out of the shop''s item revenue; ''platform'' does not — see the settlement note on orders.discount_funded_by.';
comment on column public.coupons.label is
  'Short internal name for the campaign. Never shown to customers — the badge text is derived, see refresh_restaurant_offer().';
comment on column public.coupons.created_by is
  'Who created it. Nulled rather than cascaded on profile delete: the campaign outlives the operator who set it up.';

-- ============================================================
-- Who pays, recorded on the order.
-- ------------------------------------------------------------
-- The settlement question is "was this discount the vendor's promotion or
-- ours?", and it has to be answerable months later from the order alone —
-- `coupons.funded_by` can be edited, and a code can be deleted outright. So it
-- is snapshotted here, for the same reason `coupon_code` is.
--
-- src/lib/data-access/vendor-earnings.ts reads it: item revenue is
-- `total - fee - tax + discount`, less the discount again when the vendor
-- funded it. Before this column there was no way to write that line.
-- ============================================================
alter table public.orders
  add column if not exists discount_funded_by text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_discount_funded_by_check'
  ) then
    alter table public.orders
      add constraint orders_discount_funded_by_check
      check (discount_funded_by is null
             or discount_funded_by in ('platform', 'vendor'));
  end if;
end $$;

comment on column public.orders.discount_funded_by is
  'Who absorbed orders.discount, snapshotted at redemption. NULL when there was no coupon. Never accepted from a client.';

-- ============================================================
-- Reading a coupon now requires naming it.
-- ------------------------------------------------------------
-- The 0006 policy handed every active code to anyone who asked, anon
-- included. Replaced with three audiences and nothing else:
--
--   * admins — everything, for the console;
--   * vendors — their own rows, for the shop's promotions screen;
--   * customers — nothing directly. They go through preview_coupon(), which
--     answers about one code they already typed.
--
-- The grants are the second half of that: RLS filters rows, so a policy alone
-- would still let a customer ask for all of them and receive none, which is
-- fine — but revoking SELECT makes the intent unambiguous and survives someone
-- later adding a well-meaning "read active" policy back.
-- ============================================================
drop policy if exists "coupons — read active" on public.coupons;
drop policy if exists "coupons — admin all" on public.coupons;
drop policy if exists "coupons — vendor read" on public.coupons;
drop policy if exists "coupons — vendor insert" on public.coupons;
drop policy if exists "coupons — vendor update" on public.coupons;
drop policy if exists "coupons — vendor delete" on public.coupons;

create policy "coupons — admin all" on public.coupons for all
  using (public.is_admin()) with check (public.is_admin());

create policy "coupons — vendor read" on public.coupons for select
  using (restaurant_id in (
    select id from public.restaurants where owner_id = auth.uid()
  ));

-- A vendor may only create a code for a shop they own, and only one they pay
-- for themselves. `funded_by = 'vendor'` in the WITH CHECK is what stops a
-- vendor writing a code the platform would be billed for.
create policy "coupons — vendor insert" on public.coupons for insert
  with check (
    funded_by = 'vendor'
    and restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

create policy "coupons — vendor update" on public.coupons for update
  using (restaurant_id in (
    select id from public.restaurants where owner_id = auth.uid()
  ))
  with check (
    funded_by = 'vendor'
    and restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

create policy "coupons — vendor delete" on public.coupons for delete
  using (restaurant_id in (
    select id from public.restaurants where owner_id = auth.uid()
  ));

revoke all on public.coupons from anon;
grant select, insert, update, delete on public.coupons to authenticated;
grant select, insert, update, delete on public.coupons to service_role;

-- A vendor reads the redemption count for their own campaigns. Scoped through
-- the coupon, so it only ever covers codes they own — the 0031 policy (own
-- rows, or admin) stays exactly as it was for everyone else.
drop policy if exists "coupon_redemptions — vendor read" on public.coupon_redemptions;
create policy "coupon_redemptions — vendor read" on public.coupon_redemptions for select
  using (exists (
    select 1
      from public.coupons c
      join public.restaurants r on r.id = c.restaurant_id
     where c.code = coupon_redemptions.code
       and r.owner_id = auth.uid()
  ));

commit;

-- ============================================================
-- One implementation of what a coupon is worth.
-- ------------------------------------------------------------
-- Both the preview and the redemption call this. Before 0041 the preview
-- lived in TypeScript and the redemption in SQL, and they had already drifted:
-- the TS copy never checked `max_redemptions` and could not have checked the
-- restaurant, because it was never told which one.
--
-- `customer` is nullable so a caller that does not know who is asking still
-- gets a price — it just skips the per-customer limit, which is the one check
-- that needs an identity.
--
-- Returns jsonb rather than raising: every failure here is an ordinary thing a
-- customer can do, and the checkout has to say which one.
-- ============================================================
create or replace function public.price_coupon(
  c        public.coupons,
  subtotal integer,
  rid      uuid,
  customer uuid
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  amount     integer;
  used_by_me integer;
  used_total integer;
begin
  if not c.active then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  -- A scoped code at the wrong shop. Reported distinctly rather than as
  -- 'invalid' so the checkout can say "that code is for another restaurant"
  -- instead of implying the customer mistyped it.
  if c.restaurant_id is not null and c.restaurant_id is distinct from rid then
    return jsonb_build_object('ok', false, 'error', 'wrong_restaurant');
  end if;

  if subtotal < c.min_order then
    return jsonb_build_object(
      'ok', false, 'error', 'min_order', 'minOrder', c.min_order::integer);
  end if;

  if customer is not null and c.max_per_customer is not null then
    select count(*) into used_by_me from public.coupon_redemptions r
      where r.code = c.code and r.customer_id = customer;
    if used_by_me >= c.max_per_customer then
      return jsonb_build_object('ok', false, 'error', 'already_used');
    end if;
  end if;

  if c.max_redemptions is not null then
    select count(*) into used_total from public.coupon_redemptions r
      where r.code = c.code;
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

  return jsonb_build_object(
    'ok', true,
    'code', c.code,
    'discount', amount,
    'fundedBy', c.funded_by);
end;
$$;

revoke all on function public.price_coupon(public.coupons, integer, uuid, uuid)
  from public, anon, authenticated;

-- ============================================================
-- What a code would be worth, before there is an order to attach it to.
-- ------------------------------------------------------------
-- SECURITY DEFINER because `coupons` is no longer readable by the caller. That
-- is the point: the customer can ask about a code they know, and cannot list
-- the ones they don't. Requiring a session makes every such question
-- attributable, and /api/coupons/validate rate-limits it at 20/minute.
--
-- Nothing this returns is billed. `apply_coupon_to_order()` re-derives the
-- amount from the order's own items at redemption; a preview that disagrees
-- with the bill is a bug, and a preview the client could substitute for the
-- bill would be a hole — `orders.discount` is unwritable from a client at both
-- INSERT and UPDATE, so there isn't one.
-- ============================================================
create or replace function public.preview_coupon(
  coupon text, subtotal integer, rid uuid
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  c          public.coupons%rowtype;
  normalized text := upper(trim(coalesce(coupon, '')));
  me         uuid := auth.uid();
begin
  if me is null
     and coalesce(auth.jwt() ->> 'role', '') not in ('service_role', 'supabase_admin') then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;
  if normalized = '' then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;
  if subtotal is null or subtotal < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select * into c from public.coupons where code = normalized;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  return public.price_coupon(c, subtotal, rid, me);
end;
$$;

revoke all on function public.preview_coupon(text, integer, uuid) from public, anon;
grant execute on function public.preview_coupon(text, integer, uuid)
  to authenticated, service_role;

-- ============================================================
-- Redeem, now scope- and funding-aware.
-- ------------------------------------------------------------
-- Same guarantees as 0031 — the amount is derived from the order's own
-- `order_items`, and the redemption row plus the discount write are one
-- transaction with a UNIQUE on `order_id` behind them, so a concurrent
-- duplicate loses rather than discounting twice. What is new is that the
-- pricing is delegated to price_coupon(), and that `funded_by` is snapshotted
-- onto the order so settlement can bill the right party.
-- ============================================================
create or replace function public.apply_coupon_to_order(oid uuid, coupon text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o          public.orders%rowtype;
  c          public.coupons%rowtype;
  normalized text := upper(trim(coalesce(coupon, '')));
  subtotal   integer;
  priced     jsonb;
  amount     integer;
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
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- The order's own items are the authority on what the basket was worth —
  -- not a subtotal the client claimed when it asked for a preview. Likewise
  -- `o.restaurant_id`, not a restaurant the client named.
  select coalesce(sum(oi.qty * oi.price), 0) into subtotal
    from public.order_items oi where oi.order_id = oid;

  priced := public.price_coupon(c, subtotal, o.restaurant_id, o.customer_id);
  if not (priced ->> 'ok')::boolean then
    return priced;
  end if;
  amount := (priced ->> 'discount')::integer;

  begin
    insert into public.coupon_redemptions (code, order_id, customer_id, discount)
    values (normalized, oid, o.customer_id, amount);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_applied');
  end;

  update public.orders
     set coupon_code        = normalized,
         discount           = amount,
         discount_funded_by = c.funded_by
   where id = oid;

  perform public.recompute_order_total(oid);

  return jsonb_build_object(
    'ok', true, 'discount', amount, 'code', normalized,
    'fundedBy', c.funded_by);
end;
$$;

revoke all on function public.apply_coupon_to_order(uuid, text) from public, anon;
grant execute on function public.apply_coupon_to_order(uuid, text)
  to authenticated, service_role;

-- ============================================================
-- `discount_funded_by` is not the client's to set either.
-- ------------------------------------------------------------
-- Re-declared from 0031 with the new column appended to both guards. Money and
-- who pays it move together or the pair is pointless.
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
    'coupon_code', 'discount',
    -- 0041: and who absorbed it.
    'discount_funded_by'
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

create or replace function public.force_order_total_pending()
returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  new.total              := 0;
  new.discount           := 0;
  new.coupon_code        := null;
  new.discount_funded_by := null;
  return new;
end;
$$;

drop trigger if exists orders_force_total_pending on public.orders;
create trigger orders_force_total_pending
  before insert on public.orders
  for each row execute function public.force_order_total_pending();

-- ============================================================
-- The badge stops being a claim and becomes a reading.
-- ------------------------------------------------------------
-- `restaurants.offer` keeps its shape — a short string on the row — because
-- that is what makes the customer feed cheap: the listing query already selects
-- it, and deriving the badge at read time would mean joining `coupons` on every
-- restaurant card on the home screen. So it stays a column, and stops being an
-- input: only the trigger below writes it, off the shop's own live coupons.
--
-- `offer_expires_at` is what makes it honest between writes. A trigger fires
-- when a coupon changes, not when one lapses, so without this the badge would
-- keep advertising a campaign that ended at midnight until someone touched the
-- row. The app drops the badge on read once this is past — see
-- offerIfLive() in src/lib/data-access/restaurants.ts.
-- ============================================================
alter table public.restaurants
  add column if not exists offer_expires_at timestamptz;

comment on column public.restaurants.offer is
  'Derived badge text, written only by refresh_restaurant_offer() from this shop''s live coupons. Not an input — a vendor changes it by running a promotion, not by typing one.';
comment on column public.restaurants.offer_expires_at is
  'When the coupon behind `offer` lapses. NULL = no end date. Readers must hide the badge once this is past; nothing fires at that moment to clear it.';

-- AGENTS.md §1 and migration 0024: `restaurants` is granted to anon and
-- authenticated by an explicit column list, so a column added later is
-- invisible until it is granted on purpose. This one has to be — the customer
-- app cannot decide whether to draw the badge without it.
--
-- One named column rather than re-running 0024's "everything not on the deny
-- list" block, which computes its list from the live schema and would silently
-- re-grant anything added since.
grant select (offer_expires_at) on public.restaurants to anon, authenticated;

-- ============================================================
-- A money amount as a customer would read it.
-- ------------------------------------------------------------
-- `FM` drops to_char's leading padding and its trailing zeros, but it leaves
-- the decimal point behind — 35.00 comes out as "35.", which is how a badge
-- ends up reading "35.% OFF up to ₹120.". The rtrim is what makes a whole
-- number look like one. `src/lib/promotion-rules.ts` mirrors this for the
-- form's preview; this is the copy that gets stored.
-- ============================================================
create or replace function public.promo_amount_text(n numeric)
returns text
language sql immutable set search_path = public as $$
  select rtrim(rtrim(to_char(n, 'FM999999990.99'), '0'), '.');
$$;

revoke all on function public.promo_amount_text(numeric) from public, anon, authenticated;

-- ============================================================
-- Recompute one shop's badge.
-- ------------------------------------------------------------
-- "Best" is the largest saving a customer could actually take: a percentage
-- coupon with no ceiling beats one with a ceiling, and otherwise the higher of
-- `max_discount` / `value` wins. Ties go to the newest campaign, so re-running
-- an old promotion at the same value promotes the fresh row.
--
-- Only vendor-scoped coupons feed the badge. A platform-wide code is not this
-- shop's promotion and must not decorate this shop's card while the shop next
-- door — where it works just as well — shows nothing.
-- ============================================================
create or replace function public.refresh_restaurant_offer(rid uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  c public.coupons%rowtype;
  txt text;
begin
  if rid is null then return; end if;

  select * into c
    from public.coupons
   where restaurant_id = rid
     and active
     and (expires_at is null or expires_at > now())
     and (max_redemptions is null
          or max_redemptions > (select count(*) from public.coupon_redemptions r
                                 where r.code = coupons.code))
   order by
     (kind = 'percent' and max_discount is null) desc,
     coalesce(max_discount, value) desc,
     created_at desc
   limit 1;

  if not found then
    update public.restaurants
       set offer = null, offer_expires_at = null
     where id = rid;
    return;
  end if;

  txt := case c.kind
    when 'percent' then
      public.promo_amount_text(c.value) || '% OFF'
      || case when c.max_discount is not null
              then ' up to ₹' || public.promo_amount_text(c.max_discount)
              else '' end
    else
      '₹' || public.promo_amount_text(c.value) || ' OFF'
  end
  || case when c.min_order > 0
          then ' over ₹' || public.promo_amount_text(c.min_order)
          else '' end;

  update public.restaurants
     set offer = txt, offer_expires_at = c.expires_at
   where id = rid;
end;
$$;

revoke all on function public.refresh_restaurant_offer(uuid) from public, anon, authenticated;

create or replace function public.coupons_refresh_offer()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Both sides, because moving a coupon between shops has to clear the badge
  -- on the one it left as well as set it on the one it joined.
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_restaurant_offer(old.restaurant_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_restaurant_offer(new.restaurant_id);
  end if;
  return null;
end;
$$;

drop trigger if exists coupons_refresh_offer on public.coupons;
create trigger coupons_refresh_offer
  after insert or update or delete on public.coupons
  for each row execute function public.coupons_refresh_offer();

-- A redemption can exhaust `max_redemptions`, which retires the campaign — and
-- with it the badge. Same reasoning as the coupon trigger: the state that
-- decides the badge changed, so the badge is recomputed.
create or replace function public.redemptions_refresh_offer()
returns trigger
language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  select restaurant_id into rid from public.coupons where code = new.code;
  perform public.refresh_restaurant_offer(rid);
  return null;
end;
$$;

drop trigger if exists coupon_redemptions_refresh_offer on public.coupon_redemptions;
create trigger coupon_redemptions_refresh_offer
  after insert on public.coupon_redemptions
  for each row execute function public.redemptions_refresh_offer();

-- ============================================================
-- Nobody types a badge any more.
-- ------------------------------------------------------------
-- The vendor edit sheet used to POST `offer` straight into this column. That
-- field is gone from the UI in the same change, but the UI is not the control —
-- `restaurants` is writable by its owner under the 0001 policy, so a vendor can
-- reach the column with a hand-rolled request whatever the form shows.
--
-- Service role and admin are *not* exempted here, deliberately, and this is the
-- one guard in this schema that treats them like everyone else. An operator
-- setting the badge by hand would have it silently overwritten by the next
-- coupon write — a value that survives until something unrelated happens is
-- worse than one that is refused. `refresh_restaurant_offer()` is SECURITY
-- DEFINER, so it arrives here as the function owner and passes.
-- ============================================================
create or replace function public.guard_restaurant_offer()
returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.offer            := null;
    new.offer_expires_at := null;
  else
    new.offer            := old.offer;
    new.offer_expires_at := old.offer_expires_at;
  end if;
  return new;
end;
$$;

drop trigger if exists restaurants_guard_offer on public.restaurants;
create trigger restaurants_guard_offer
  before insert or update on public.restaurants
  for each row execute function public.guard_restaurant_offer();

-- ============================================================
-- Backfill.
-- ------------------------------------------------------------
-- Every existing badge was typed by hand and backed by nothing, so this clears
-- them: a shop shows an offer again once it has a coupon behind it. That is the
-- migration doing its job, not losing data — the strings said "35% OFF" while
-- no code on the platform gave anyone 35% off anything.
-- ============================================================
do $$
declare r record;
begin
  for r in select id from public.restaurants loop
    perform public.refresh_restaurant_offer(r.id);
  end loop;
end $$;

-- ============================================================
-- POST-MIGRATION — verify.
-- ------------------------------------------------------------
-- Existing codes are platform-funded and unscoped (2 rows, both NULL/platform):
--
--   select code, restaurant_id, funded_by from public.coupons order by code;
--
-- No shop advertises an offer it cannot honour (should return 0 rows):
--
--   select r.id, r.offer from public.restaurants r
--    where r.offer is not null
--      and not exists (select 1 from public.coupons c
--                       where c.restaurant_id = r.id and c.active
--                         and (c.expires_at is null or c.expires_at > now()));
--
-- Promo codes are no longer enumerable. As anon, this must return 0 rows —
-- before 0041 it returned every live campaign on the platform:
--
--   set role anon; select count(*) from public.coupons; reset role;
--
-- Every discounted order records who paid for it (0 rows once 0041 is live;
-- orders discounted *before* it legitimately have NULL and are platform-era):
--
--   select id, coupon_code, discount, discount_funded_by from public.orders
--    where discount > 0 and discount_funded_by is null
--      and created_at > '2026-08-20';
-- ============================================================
