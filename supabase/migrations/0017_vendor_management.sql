-- Vendor Management (Admin Panel) — phase 1.
--
-- A "vendor" in this app is a `restaurants` row owned by a `profiles` row with
-- role='restaurant' (see 0001_init). This migration turns the bare
-- restaurant/approve model into a full admin-managed vendor record: owner and
-- contact snapshot, commercials, hours, payout details, legal identifiers, a
-- proper lifecycle status, a digital Terms & Conditions audit trail, and an
-- admin-owned category taxonomy.
--
-- Everything on `restaurants` is additive (`add column if not exists`), matching
-- 0002/0009. No new RLS is needed for those columns — the existing
-- "restaurants — owner manage" + `is_admin()` policies already govern the row.

-- ---------- restaurants: new vendor columns ----------

-- Owner / contact snapshot. `profiles` stays the auth source of truth; these are
-- denormalised onto the row so the admin vendor list can search name/mobile
-- without a join.
alter table public.restaurants add column if not exists owner_name       text;
alter table public.restaurants add column if not exists owner_mobile     text;
alter table public.restaurants add column if not exists owner_alt_mobile text;
alter table public.restaurants add column if not exists owner_email      text;
alter table public.restaurants add column if not exists description      text;

-- The vendor's primary category (Restaurant, Café, Pharmacy, …). A soft link to
-- `vendor_categories.name` — free text, so retagging a category never orphans a
-- vendor. Distinct from the customer-facing `cuisines[]` filter (0002).
alter table public.restaurants add column if not exists category text;

-- Commercials.
alter table public.restaurants add column if not exists commission_pct     numeric(5,2) not null default 0
  check (commission_pct >= 0 and commission_pct <= 100);
alter table public.restaurants add column if not exists min_order          integer not null default 0
  check (min_order >= 0);
alter table public.restaurants add column if not exists delivery_available boolean not null default true;
alter table public.restaurants add column if not exists self_pickup        boolean not null default false;

-- Location extras. The pin itself (lat/lng/address) comes from 0009; these two
-- round out the address the wizard collects.
alter table public.restaurants add column if not exists landmark text;
alter table public.restaurants add column if not exists pincode  text;

-- Hours. weekly_off holds day names, e.g. '{Sunday}'.
alter table public.restaurants add column if not exists opening_time time;
alter table public.restaurants add column if not exists closing_time time;
alter table public.restaurants add column if not exists weekly_off   text[] not null default '{}';

-- Payout: a UPI id OR a bank account (the app validates at least one).
alter table public.restaurants add column if not exists upi_id              text;
alter table public.restaurants add column if not exists bank_account_name   text;
alter table public.restaurants add column if not exists bank_account_number text;
alter table public.restaurants add column if not exists bank_ifsc           text;
alter table public.restaurants add column if not exists bank_name           text;

-- Legal identifiers (numbers only; the certificate files land in phase 3).
alter table public.restaurants add column if not exists fssai_number text;
alter table public.restaurants add column if not exists gst_number   text;
alter table public.restaurants add column if not exists pan_number   text;

-- Terms & Conditions acceptance — a small audit trail captured at registration.
alter table public.restaurants add column if not exists tc_accepted_at timestamptz;
alter table public.restaurants add column if not exists tc_accepted_by uuid references public.profiles (id);
alter table public.restaurants add column if not exists tc_version     text;

-- ---------- lifecycle status ----------
-- `approved` (0001) is the storefront-visibility gate that the customer read
-- policy and every catalog query depend on — we keep it, and add an
-- authoritative four-state lifecycle. A trigger keeps the two coherent so
-- `approved` is always exactly `status = 'active'`.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'vendor_status') then
    create type vendor_status as enum ('pending', 'active', 'inactive', 'suspended');
  end if;
end $$;

alter table public.restaurants
  add column if not exists status vendor_status not null default 'pending';

-- Backfill existing rows before the trigger exists: an already-approved shop is
-- active, everything else stays pending.
update public.restaurants
   set status = case when approved then 'active'::vendor_status else 'pending'::vendor_status end
 where status = 'pending';

create index if not exists restaurants_status_idx on public.restaurants (status);

-- Keep `status` and `approved` in lock-step, from either direction, so a legacy
-- writer that only touches `approved` (seed/import scripts) still works while
-- `status` becomes the field the admin UI drives.
create or replace function public.sync_restaurant_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    -- An explicit non-default status wins; otherwise derive it from `approved`
    -- (so `insert (... approved) values (true)` still lands as active).
    if new.status = 'pending' then
      new.status := case when new.approved then 'active'::vendor_status else 'pending'::vendor_status end;
    end if;
    new.approved := (new.status = 'active');
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      new.approved := (new.status = 'active');
    elsif new.approved is distinct from old.approved then
      -- Legacy path: only `approved` was set. Move status to match, treating an
      -- un-approve of a live shop as 'inactive' rather than back to 'pending'.
      new.status := case
        when new.approved then 'active'::vendor_status
        when old.status = 'active' then 'inactive'::vendor_status
        else old.status
      end;
      new.approved := (new.status = 'active');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists restaurants_sync_status on public.restaurants;
create trigger restaurants_sync_status
  before insert or update on public.restaurants
  for each row execute function public.sync_restaurant_status();

-- ---------- vendor_categories (admin taxonomy) ----------
-- Menu-item categories are free-text (`menu_items.category`, derived at read in
-- mapRestaurant). This table gives the admin a real, orderable, enable/disable
-- taxonomy that the registration wizard and menu editor pick from. It is a
-- canonical suggestion list, deliberately NOT foreign-keyed to
-- `menu_items.category` so legacy free-text rows never break.
create table if not exists public.vendor_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  slug        text unique not null,
  description text,
  sort_order  integer not null default 0,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists vendor_categories_order_idx
  on public.vendor_categories (enabled, sort_order, name);

alter table public.vendor_categories enable row level security;

-- Enabled categories are readable by anyone (they power customer-facing filters);
-- only admins may see disabled ones or write.
drop policy if exists "vendor_categories — read" on public.vendor_categories;
create policy "vendor_categories — read" on public.vendor_categories for select
  using (enabled or public.is_admin());

drop policy if exists "vendor_categories — admin all" on public.vendor_categories;
create policy "vendor_categories — admin all" on public.vendor_categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- Seed the common single-city categories, only when the table is empty so a
-- re-run never duplicates or fights the operator's own list.
insert into public.vendor_categories (name, slug, sort_order)
select * from (values
  ('Restaurant',   'restaurant',    1),
  ('Café',         'cafe',          2),
  ('Chowpatty',    'chowpatty',     3),
  ('Bakery',       'bakery',        4),
  ('Grocery',      'grocery',       5),
  ('Juice Center', 'juice-center',  6),
  ('Pharmacy',     'pharmacy',      7),
  ('Sweet Shop',   'sweet-shop',    8)
) as seed(name, slug, sort_order)
where not exists (select 1 from public.vendor_categories);
