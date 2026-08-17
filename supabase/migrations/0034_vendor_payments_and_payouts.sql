-- ============================================================
-- 0034 — Per-vendor payment rules, settlement cycles, instant payouts
-- ------------------------------------------------------------
-- Three things an operator could not previously say, and now can:
--
--   1. "This shop takes cash, that one does not, and cash stops at ₹300."
--      Payment method was a single platform-wide switch (0025's
--      feature_online_payment). It is now: platform switch AND vendor switch,
--      with a per-vendor cash ceiling above which online is the only option.
--
--   2. "Pay this vendor every week; pay that one every month."
--      A label the settlement screen reads to pre-fill a period. It does not
--      move money on a timer — nothing here does — it removes the guesswork
--      about which range to build.
--
--   3. "Pay this one order out now, ahead of the batch."
--      Deliberately NOT a new `orders.paid_to_vendor` flag. A single order paid
--      early is a settlement with one line in it, so it reuses
--      vendor_settlement_orders' UNIQUE(order_id) — which is what makes double
--      payment structurally impossible rather than a rule someone remembers.
--      `kind` distinguishes the two for the UI; the arithmetic is identical.
--
-- Also lands the two deductions the payout breakdown was missing: GST on the
-- platform commission, and a fixed per-order charge (packaging, gateway fee).
-- Both are stored per line in whole rupees at settlement time, so a rate change
-- never rewrites history and the lines always sum to the header exactly.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- ============================================================
-- 1 — Payment rules on the vendor.
-- ------------------------------------------------------------
-- Defaults are "as before": both methods on, no cash ceiling. Turning a switch
-- OFF is the restrictive act, so an un-configured vendor behaves exactly as it
-- did before this migration rather than silently losing a payment method.
--
-- `accept_online` is an AND with the platform switch and the Razorpay keys, not
-- an override of them: a vendor cannot enable a payment the platform cannot
-- take (see src/lib/payments/vendor-rules.ts).
-- ============================================================
alter table public.restaurants
  add column if not exists accept_cod boolean not null default true;

alter table public.restaurants
  add column if not exists accept_online boolean not null default true;

-- 0 = no ceiling. A positive value is the highest order total, in whole rupees,
-- that may still be paid in cash; anything above it must be paid online.
alter table public.restaurants
  add column if not exists cod_max_order integer not null default 0;

do $$
begin
  alter table public.restaurants
    add constraint restaurants_cod_max_order_nonneg check (cod_max_order >= 0);
exception
  when duplicate_object then null;
end $$;

comment on column public.restaurants.accept_cod is
  'Vendor accepts cash on delivery. Admin-only (lock_restaurant_privileged_fields).';
comment on column public.restaurants.accept_online is
  'Vendor accepts online payment. ANDed with platform_settings.feature_online_payment and the Razorpay keys — never an override of them.';
comment on column public.restaurants.cod_max_order is
  'Highest order total payable in cash, whole rupees. 0 = no ceiling.';

-- A fixed charge deducted from the vendor per delivered order — packaging,
-- payment-gateway share, whatever the contract says. Whole rupees, snapshotted
-- onto the settlement line so a later change cannot move a past payout.
alter table public.restaurants
  add column if not exists other_charges_per_order integer not null default 0;

do $$
begin
  alter table public.restaurants
    add constraint restaurants_other_charges_nonneg
    check (other_charges_per_order >= 0);
exception
  when duplicate_object then null;
end $$;

comment on column public.restaurants.other_charges_per_order is
  'Fixed per-order deduction from the vendor payout, whole rupees. Admin-only.';

-- ============================================================
-- 2 — Settlement cycle.
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'settlement_cycle') then
    create type public.settlement_cycle as enum ('weekly', 'monthly');
  end if;
end $$;

alter table public.restaurants
  add column if not exists settlement_cycle public.settlement_cycle
  not null default 'weekly';

comment on column public.restaurants.settlement_cycle is
  'How often this vendor is paid out. Pre-fills the settlement period; does not itself schedule anything.';

-- ============================================================
-- 3 — GST on the platform commission.
-- ------------------------------------------------------------
-- The commission is a service the platform sells the vendor, and in India that
-- service is taxable. Before this the payout breakdown stopped at "minus
-- commission", which is why the number an accountant computed and the number
-- this app computed were never the same.
--
-- Platform-wide, like the commission rate itself (0032). Same reasoning applies
-- to its visibility: what the platform charges its vendors is a commercial
-- term, not storefront config, so it is NOT granted to anon/authenticated.
-- ============================================================
alter table public.platform_settings
  add column if not exists commission_gst_pct numeric(5,2) not null default 0;

do $$
begin
  alter table public.platform_settings
    add constraint platform_settings_commission_gst_pct_range
    check (commission_gst_pct >= 0 and commission_gst_pct <= 100);
exception
  when duplicate_object then null;
end $$;

comment on column public.platform_settings.commission_gst_pct is
  'GST charged on the platform commission, whole percent (18 in India). Deducted from the vendor payout. Admin-only: deliberately NOT granted to anon/authenticated.';

-- Re-run 0032's allowlist so the new restricted column is excluded too. Same
-- shape, same direction of failure: this enumerates what is PUBLIC.
do $$
declare
  public_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into public_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'platform_settings'
    and column_name not in ('vendor_commission_pct', 'commission_gst_pct');

  execute 'revoke select on public.platform_settings from anon, authenticated';
  execute format(
    'grant select (%s) on public.platform_settings to anon, authenticated',
    public_cols
  );
end $$;

grant select, insert, update on public.platform_settings to service_role;

-- ============================================================
-- 4 — Settlement lines carry the full deduction stack.
-- ------------------------------------------------------------
-- Every figure the payout screen shows is stored, in whole rupees, at the
-- moment the settlement is built. Nothing is re-derived at read time, so the
-- statement a vendor was shown in March still adds up in June after the rates
-- have moved. `vendor_net` and `contribution` already existed and keep their
-- meaning; they now sit at the bottom of a longer subtraction.
-- ============================================================
alter table public.vendor_settlement_orders
  add column if not exists commission_gst integer not null default 0;

alter table public.vendor_settlement_orders
  add column if not exists other_charges integer not null default 0;

alter table public.vendor_settlement_orders
  add column if not exists order_total integer not null default 0;

alter table public.vendor_settlement_orders
  add column if not exists delivery_fee integer not null default 0;

alter table public.vendor_settlement_orders
  add column if not exists tax_amount integer not null default 0;

alter table public.vendor_settlement_orders
  add column if not exists tip integer not null default 0;

do $$
begin
  alter table public.vendor_settlement_orders
    add constraint vendor_settlement_orders_deductions_nonneg
    check (commission_gst >= 0 and other_charges >= 0);
exception
  when duplicate_object then null;
end $$;

alter table public.vendor_settlements
  add column if not exists commission_gst integer not null default 0;

alter table public.vendor_settlements
  add column if not exists other_charges integer not null default 0;

-- ============================================================
-- 5 — Batch vs instant.
-- ------------------------------------------------------------
-- An instant payout is one order, paid ahead of its cycle. It is stored as an
-- ordinary settlement so that:
--   * UNIQUE(order_id) on the child table blocks it from ALSO landing in the
--     next batch — the exclusion is a constraint, not a filter someone has to
--     remember to write; and
--   * voiding it (the "Unpaid" side of the dropdown) frees the order again by
--     the same path a voided batch does.
-- `kind` exists only so the UI can label and group them.
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'settlement_kind') then
    create type public.settlement_kind as enum ('batch', 'instant');
  end if;
end $$;

alter table public.vendor_settlements
  add column if not exists kind public.settlement_kind not null default 'batch';

create index if not exists vendor_settlements_kind_idx
  on public.vendor_settlements (restaurant_id, kind, created_at desc);

comment on column public.vendor_settlements.kind is
  'batch = a date-range payout run. instant = a single order paid ahead of the cycle from the order payouts screen.';

-- ============================================================
-- 6 — The new vendor columns are admin-only to WRITE.
-- ------------------------------------------------------------
-- Extends 0024's lock. Without this a vendor holding their own JWT could raise
-- their own cash ceiling, switch their settlement cycle, or zero the per-order
-- charge — all of which are commercial terms, i.e. exactly the class 0024
-- already decided the vendor does not get to move.
-- ============================================================
create or replace function public.lock_restaurant_privileged_fields()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin') then
    return new;
  end if;

  if new.approved       is distinct from old.approved
  or new.status         is distinct from old.status
  or new.owner_id       is distinct from old.owner_id
  or new.commission_pct is distinct from old.commission_pct then
    raise exception 'approval, ownership and commission are admin-only';
  end if;

  -- Added in 0034. Kept as a separate branch with its own message so an
  -- operator reading the log can tell which rule they hit.
  if new.accept_cod              is distinct from old.accept_cod
  or new.accept_online           is distinct from old.accept_online
  or new.cod_max_order           is distinct from old.cod_max_order
  or new.other_charges_per_order is distinct from old.other_charges_per_order
  or new.settlement_cycle        is distinct from old.settlement_cycle then
    raise exception 'payment rules and settlement terms are admin-only';
  end if;

  return new;
end;
$$;

-- The trigger itself is unchanged (0024 created it); replacing the function is
-- enough. Re-asserted so a fresh database built from this file alone is correct.
drop trigger if exists zz_restaurants_lock_privileged on public.restaurants;
create trigger zz_restaurants_lock_privileged
  before update on public.restaurants
  for each row execute function public.lock_restaurant_privileged_fields();

-- ============================================================
-- 7 — What the storefront may READ of the new columns.
-- ------------------------------------------------------------
-- 0024 revoked SELECT on restaurants and re-granted an explicit safe column
-- list, so anything added since is invisible until granted here on purpose.
--
--   accept_cod / accept_online / cod_max_order  → GRANTED. Checkout has to show
--     the customer which methods this shop takes and where the cash ceiling
--     sits. It is not a secret: the customer is told it in plain words.
--
--   settlement_cycle / other_charges_per_order  → NOT granted. Payout terms.
--     Admin reads go through createAdminClient(), same as commission_pct.
-- ============================================================
grant select (accept_cod, accept_online, cod_max_order)
  on public.restaurants to anon, authenticated;

commit;
