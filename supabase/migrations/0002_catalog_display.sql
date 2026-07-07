-- ============================================================
-- Deligro — catalog display fields + order fee breakdown
-- Extends the minimal schema so the customer UI can render
-- from Supabase instead of src/lib/data.ts.
-- ============================================================

alter table public.restaurants
  add column if not exists image_url text,
  add column if not exists accent_tint text,
  add column if not exists cuisines text[] not null default '{}',
  add column if not exists rating numeric(2,1) not null default 4.5,
  add column if not exists rating_count integer not null default 0,
  add column if not exists eta_min integer,
  add column if not exists eta_max integer,
  add column if not exists price_tier smallint not null default 2,
  add column if not exists cost_for_two integer,
  add column if not exists distance_km numeric(4,1),
  add column if not exists offer text,
  add column if not exists promoted boolean not null default false;

alter table public.menu_items
  add column if not exists external_id text,
  add column if not exists category text,
  add column if not exists image_url text,
  add column if not exists popular boolean not null default false,
  add column if not exists bestseller boolean not null default false;

create unique index if not exists menu_items_restaurant_external_id_idx
  on public.menu_items (restaurant_id, external_id)
  where external_id is not null;

alter table public.orders
  add column if not exists delivery_fee integer not null default 0 check (delivery_fee >= 0),
  add column if not exists tax_amount integer not null default 0 check (tax_amount >= 0);

-- Grand total = item subtotal + fees (recompute_order_total only sums items).
create or replace function public.recompute_order_total(oid uuid)
returns void
language sql security definer set search_path = public as $$
  update public.orders o
  set total = coalesce((
      select sum(oi.qty * oi.price) from public.order_items oi where oi.order_id = oid
    ), 0) + o.delivery_fee + o.tax_amount
  where o.id = oid;
$$;
