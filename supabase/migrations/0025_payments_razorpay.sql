-- ============================================================
-- 0025 — Online payments (Razorpay)
-- ------------------------------------------------------------
-- MUST run after 0024_security_hardening.sql: it re-creates
-- `guard_order_update()` and depends on the locked-column guard defined there.
--
-- Ships DISABLED. `platform_settings.feature_online_payment` defaults to false,
-- so the customer app shows "Available soon" and COD stays the only method
-- until an admin turns it on AND the Razorpay keys are present. Both conditions
-- are required — a missing key must reduce what the app offers, never widen it.
--
-- The money rules this encodes:
--
--   1. `orders.payment_status` is the only truth about whether an order is paid,
--      and NOTHING that reaches the database with a user's JWT can set it. It
--      moves off 'pending' exclusively through the service role, and only after
--      a Razorpay signature has been verified server-side.
--   2. A vendor, driver or manager may still only move `status`. The two new
--      columns join the locked set in guard_order_update() — otherwise the
--      kitchen board would be one PostgREST call away from marking an order paid.
--   3. `payments` is an audit trail, not a workflow table: append and amend from
--      trusted code only. anon/authenticated get SELECT and nothing else.
--   4. Amounts here are PAISE, not rupees. Razorpay bills in the smallest
--      currency unit and the rest of the app stores whole rupees; the column is
--      named for the unit so the two can never be silently confused.
--
-- Idempotent: safe to re-run. Apply in the Supabase SQL editor, or with
-- `supabase db push`.
-- ============================================================

begin;

-- ---------- enums ----------
-- Separate DO blocks: `create type ... if not exists` does not exist, and an
-- already-present type must not abort the migration.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('cod', 'online');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    -- 'authorized' is Razorpay's captured-but-not-settled state. It is kept
    -- distinct from 'paid' so a manual-capture account never reads as settled.
    create type public.payment_status as enum (
      'pending', 'authorized', 'paid', 'failed', 'refunded'
    );
  end if;
end $$;

-- ---------- orders ----------
-- Additive, and defaulted to the behaviour that exists today: every order this
-- database already holds is a COD order awaiting collection.
alter table public.orders
  add column if not exists payment_method public.payment_method not null default 'cod',
  add column if not exists payment_status public.payment_status not null default 'pending';

create index if not exists orders_payment_status_idx
  on public.orders (payment_status);

-- ============================================================
-- The payments audit trail.
-- ------------------------------------------------------------
-- One row per Razorpay order we create. `provider_order_id` is unique, which is
-- what makes the webhook idempotent: Razorpay retries deliveries, and a retry
-- must update the existing row rather than append a second record of the same
-- money.
-- ============================================================
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders (id) on delete cascade,
  provider            text not null default 'razorpay',

  -- Razorpay's ids. The order id exists from the moment we ask for a payment;
  -- the payment id only appears once the customer actually pays.
  provider_order_id   text not null,
  provider_payment_id text,

  amount_paise        integer not null check (amount_paise >= 0),
  currency            text not null default 'INR',
  status              public.payment_status not null default 'pending',

  -- What Razorpay reports the customer used: upi / card / netbanking / wallet.
  method              text,

  -- False until an HMAC over the provider's payload matched our secret. A row
  -- that never flips this is a claim, not a payment.
  signature_verified  boolean not null default false,

  error_code          text,
  error_description   text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists payments_provider_order_id_key
  on public.payments (provider, provider_order_id);

-- Partial: many rows legitimately have no payment id yet, and NULLs must not
-- collide with each other.
create unique index if not exists payments_provider_payment_id_key
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create index if not exists payments_order_id_idx on public.payments (order_id);

alter table public.payments enable row level security;

-- ---------- payments RLS ----------
-- Read: the customer who placed the order, and admins. Deliberately NOT the
-- vendor, the driver, or the manager — 0023 scopes a manager out of finance,
-- and a kitchen does not need the customer's payment instrument to cook.
drop policy if exists "payments — read" on public.payments;
create policy "payments — read" on public.payments for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = auth.uid() or public.is_admin())
    )
  );

-- No INSERT / UPDATE / DELETE policy exists on purpose. Every write arrives
-- through the service role in src/lib/data-access/payments.ts, after a
-- signature check. RLS with no permissive policy denies by default; the revoke
-- below states it at the privilege level too, so a future policy added by
-- mistake still cannot be exercised by a browser key.
revoke insert, update, delete on public.payments from anon, authenticated;
revoke select on public.payments from anon;
grant select (
  id, order_id, provider, provider_order_id, provider_payment_id,
  amount_paise, currency, status, method, created_at
) on public.payments to authenticated;
grant select, insert, update, delete on public.payments to service_role;

-- ============================================================
-- Nothing holding a user JWT may declare an order paid.
-- ------------------------------------------------------------
-- Two holes to close, because orders are writable at two moments:
--
--   INSERT — "orders — customer insert" (0001) lets a customer post their own
--            row. Without this, the row they post could say payment_status
--            = 'paid'. The trigger forces it back to 'pending'; it does not
--            raise, because choosing to pay online is legitimate and only the
--            *status* is a lie.
--   UPDATE — guard_order_update() (0024) lists every column a vendor, driver or
--            manager may not move. The two new ones belong on that list.
-- ============================================================
create or replace function public.force_order_payment_pending()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin') then
    return new;
  end if;

  -- The customer picks how they intend to pay; they do not get to say they have.
  new.payment_status := 'pending';
  return new;
end;
$$;

drop trigger if exists orders_force_payment_pending on public.orders;
create trigger orders_force_payment_pending
  before insert on public.orders
  for each row execute function public.force_order_payment_pending();

-- Re-declared from 0024 with the two payment columns added to `locked`. The
-- body is otherwise unchanged — see 0024 for the reasoning behind each entry.
create or replace function public.guard_order_update()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  locked constant text[] := array[
    'id', 'customer_id', 'restaurant_id',
    'total', 'delivery_fee', 'tax_amount', 'tip',
    'address', 'created_at',
    -- 0025: whether an order is paid is settled by a verified signature,
    -- not by whoever currently has the order open.
    'payment_method', 'payment_status'
  ];
  col     text;
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin') then
    return new;
  end if;

  foreach col in array locked loop
    -- A column this database doesn't have is absent from both objects and
    -- compares equal, so the guard adapts to a partially-migrated database.
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

-- Keep `updated_at` honest without asking the writer to remember it.
create or replace function public.touch_payments_updated_at()
returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists payments_touch_updated_at on public.payments;
create trigger payments_touch_updated_at
  before update on public.payments
  for each row execute function public.touch_payments_updated_at();

-- ============================================================
-- The switch the customer sees.
-- ------------------------------------------------------------
-- Default false: online payment reads "Available soon" until an admin turns it
-- on in Settings → Platform. The app additionally refuses to offer it when the
-- Razorpay keys are absent, so flipping this on a keyless environment changes
-- nothing rather than producing a checkout that dead-ends.
-- ============================================================
alter table public.platform_settings
  add column if not exists feature_online_payment boolean not null default false;

commit;
