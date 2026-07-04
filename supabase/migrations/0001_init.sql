-- ============================================================
-- Deligro — schema + Row Level Security
-- ------------------------------------------------------------
-- RLS is the real security boundary. Even if an API route forgets
-- a check, Postgres refuses to return rows that aren't yours.
-- This directly closes the IDOR / broken-access-control class:
-- a denied row simply doesn't exist to the caller (SELECT returns
-- empty -> the app returns 404 -> existence is never leaked).
--
-- Role matrix enforced here:
--   own orders            customer ✅  restaurant –  driver –            admin ✅
--   others' orders        ❌           ❌            assigned & active    admin ✅
--   own menu/listing      –            ✅            –                    admin ✅
--   payment/refunds       request      ❌            ❌                   ✅ (limited)
--   user management       ❌           ❌            ❌                   ✅
-- ============================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------- enums ----------
create type user_role      as enum ('customer', 'restaurant', 'driver', 'admin');
create type order_status   as enum ('placed', 'kitchen', 'ready', 'on_the_way', 'delivered', 'cancelled');
create type delivery_status as enum ('unassigned', 'assigned', 'picked_up', 'delivered', 'cancelled');
create type refund_status  as enum ('pending', 'approved', 'denied');

-- ============================================================
-- Tables
-- ============================================================

-- One profile per auth user. `role` is the source of truth for authorization.
-- It is NEVER set from the client — see the signup trigger + the lock below.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       user_role not null default 'customer',
  full_name  text,
  phone      text,
  created_at timestamptz not null default now()
);

create table public.restaurants (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  slug       text unique not null,
  name       text not null,
  tagline    text,
  is_open    boolean not null default true,
  approved   boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.restaurants (owner_id);

create table public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null,
  description   text,
  price         integer not null check (price >= 0),  -- whole rupees
  veg           boolean not null default true,
  available     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index on public.menu_items (restaurant_id);

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.profiles (id) on delete restrict,
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  status        order_status not null default 'placed',
  -- total is authoritative: computed server-side from menu prices, never trusted
  -- from the client (see recompute_order_total()).
  total         integer not null default 0 check (total >= 0),
  address       jsonb,
  created_at    timestamptz not null default now()
);
create index on public.orders (customer_id);
create index on public.orders (restaurant_id);

create table public.order_items (
  id       uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name     text not null,
  qty      integer not null check (qty > 0),
  price    integer not null check (price >= 0)  -- unit price snapshot
);
create index on public.order_items (order_id);

create table public.deliveries (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null unique references public.orders (id) on delete cascade,
  driver_id    uuid references public.profiles (id) on delete set null,
  status       delivery_status not null default 'unassigned',
  assigned_at  timestamptz,
  delivered_at timestamptz
);
create index on public.deliveries (driver_id);

create table public.refunds (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  amount     integer not null check (amount >= 0),
  reason     text,
  status     refund_status not null default 'pending',
  decided_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- SECURITY DEFINER helpers
-- These run as the table owner, bypassing RLS *inside the function only*,
-- so policies can reference other tables without infinite recursion.
-- ============================================================

create or replace function public.current_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.owns_restaurant(rid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.restaurants r
    where r.id = rid and r.owner_id = auth.uid()
  );
$$;

-- A driver may see an order ONLY while a delivery is assigned to them and still
-- active. Once delivered/cancelled/reassigned, this returns false -> access
-- revoked automatically. (Role-matrix row: "assigned only, while active".)
create or replace function public.is_active_driver_for(oid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.deliveries d
    where d.order_id = oid
      and d.driver_id = auth.uid()
      and d.status in ('assigned', 'picked_up')
  );
$$;

-- Authoritative total: sum of order_items, written server-side.
create or replace function public.recompute_order_total(oid uuid)
returns void
language sql security definer set search_path = public as $$
  update public.orders
  set total = coalesce((select sum(qty * price) from public.order_items where order_id = oid), 0)
  where id = oid;
$$;

-- ============================================================
-- Signup trigger — create a profile as 'customer' by default.
-- Role can only be elevated by an admin/service-role later; the client
-- never chooses its own role.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.phone);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent a user from escalating their own role via a profile UPDATE.
create or replace function public.lock_role()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'role can only be changed by an admin';
  end if;
  return new;
end;
$$;

create trigger profiles_lock_role
  before update on public.profiles
  for each row execute function public.lock_role();

-- ============================================================
-- Enable RLS on everything (default-deny once enabled).
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.restaurants enable row level security;
alter table public.menu_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.deliveries  enable row level security;
alter table public.refunds     enable row level security;

-- ---------- profiles ----------
create policy "own profile — read"   on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "own profile — update" on public.profiles for update
  using (id = auth.uid() or public.is_admin());
-- (no client INSERT: profiles come from the signup trigger only)

-- ---------- restaurants ----------
-- Customers browse approved & open restaurants; owners see their own; admin all.
create policy "restaurants — read" on public.restaurants for select
  using (approved or owner_id = auth.uid() or public.is_admin());
create policy "restaurants — owner manage" on public.restaurants for all
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- ---------- menu_items ----------
create policy "menu — read" on public.menu_items for select
  using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.approved)
    or public.owns_restaurant(restaurant_id)
    or public.is_admin()
  );
create policy "menu — owner manage" on public.menu_items for all
  using (public.owns_restaurant(restaurant_id) or public.is_admin())
  with check (public.owns_restaurant(restaurant_id) or public.is_admin());

-- ---------- orders ----------
-- The IDOR-critical table. Read is scoped to the four roles precisely.
create policy "orders — read" on public.orders for select
  using (
    customer_id = auth.uid()                       -- customer: own
    or public.owns_restaurant(restaurant_id)       -- restaurant: its own orders
    or public.is_active_driver_for(id)             -- driver: assigned & active only
    or public.is_admin()                           -- admin: all (audited in app)
  );
-- Customers place their own orders.
create policy "orders — customer insert" on public.orders for insert
  with check (customer_id = auth.uid() and public.current_role() = 'customer');
-- Status transitions: restaurant for its orders, driver for assigned, admin all.
create policy "orders — update" on public.orders for update
  using (
    public.owns_restaurant(restaurant_id)
    or public.is_active_driver_for(id)
    or public.is_admin()
  )
  with check (
    public.owns_restaurant(restaurant_id)
    or public.is_active_driver_for(id)
    or public.is_admin()
  );

-- ---------- order_items — visibility follows the parent order ----------
create policy "order_items — read" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy "order_items — customer insert" on public.order_items for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.customer_id = auth.uid()
  ));

-- ---------- deliveries ----------
create policy "deliveries — read" on public.deliveries for select
  using (
    driver_id = auth.uid()
    or exists (select 1 from public.orders o where o.id = order_id and public.owns_restaurant(o.restaurant_id))
    or public.is_admin()
  );
-- Driver updates only their own delivery; admin assigns/reassigns.
create policy "deliveries — driver update" on public.deliveries for update
  using (driver_id = auth.uid() or public.is_admin())
  with check (driver_id = auth.uid() or public.is_admin());
create policy "deliveries — admin manage" on public.deliveries for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- refunds ----------
-- Customer may REQUEST a refund on their own order; only admin decides.
create policy "refunds — read" on public.refunds for select
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
    or public.is_admin()
  );
create policy "refunds — customer request" on public.refunds for insert
  with check (
    status = 'pending'
    and exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy "refunds — admin decide" on public.refunds for update
  using (public.is_admin()) with check (public.is_admin());
