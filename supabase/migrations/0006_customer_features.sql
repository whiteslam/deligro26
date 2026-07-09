-- ============================================================
-- Deligro — crucial customer features (ported from the legacy site)
--   • saved addresses            (per-user, RLS)
--   • delivery handover OTP       (pickup + delivery codes on each order)
--   • ratings & reviews           (one per delivered order)
--   • wallet                      (balance + ledger)
--   • coupons                     (promo codes)
-- The wallet/coupon *checkout math* is wired separately (pairs with payments);
-- this migration lays the schema + RLS so the app never trusts the client.
-- ============================================================

-- ---------- saved addresses ----------
create table if not exists public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  label      text not null default 'Home',
  line       text not null,
  lat        double precision,
  lng        double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);

alter table public.addresses enable row level security;
create policy "addresses — owner all" on public.addresses for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- One default per user: clear the old default whenever a new one is set.
create or replace function public.addresses_single_default()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_default then
    update public.addresses set is_default = false
      where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end $$;
drop trigger if exists addresses_default_trg on public.addresses;
create trigger addresses_default_trg
  before insert or update on public.addresses
  for each row execute function public.addresses_single_default();

-- ---------- delivery handover OTP ----------
-- 4-digit codes, generated at insert. The customer reads their delivery_otp to
-- the rider (proves delivery); the restaurant reads pickup_otp (proves handover).
alter table public.orders
  add column if not exists pickup_otp   text default lpad((floor(random()*10000))::int::text, 4, '0'),
  add column if not exists delivery_otp text default lpad((floor(random()*10000))::int::text, 4, '0');

-- ---------- ratings & reviews ----------
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  rating        int not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  unique (order_id)
);
create index if not exists reviews_restaurant_idx on public.reviews (restaurant_id);

alter table public.reviews enable row level security;
-- Anyone may read reviews (public restaurant ratings); a customer may write a
-- review only for their own delivered order.
create policy "reviews — read" on public.reviews for select using (true);
create policy "reviews — owner insert" on public.reviews for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid() and o.status = 'delivered'
    )
  );

-- ---------- wallet ----------
alter table public.profiles
  add column if not exists wallet_balance numeric(10,2) not null default 0;

create table if not exists public.wallet_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  amount     numeric(10,2) not null,          -- + credit, − debit
  reason     text not null,
  order_id   uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists wallet_tx_user_idx on public.wallet_transactions (user_id, created_at desc);

alter table public.wallet_transactions enable row level security;
create policy "wallet — owner read" on public.wallet_transactions for select
  using (user_id = auth.uid());
-- Writes are server-only (service role) so a client can't credit itself.

-- ---------- coupons ----------
create table if not exists public.coupons (
  code         text primary key,
  kind         text not null check (kind in ('percent', 'flat')),
  value        numeric(10,2) not null,
  min_order    numeric(10,2) not null default 0,
  max_discount numeric(10,2),
  active       boolean not null default true,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.coupons enable row level security;
create policy "coupons — read active" on public.coupons for select
  using (active and (expires_at is null or expires_at > now()));
-- Management is admin/service-role only.

-- A couple of demo coupons so the flow is testable immediately.
insert into public.coupons (code, kind, value, min_order, max_discount) values
  ('WELCOME50', 'percent', 50, 149, 100),
  ('FLAT30',    'flat',    30, 199, null)
on conflict (code) do nothing;
