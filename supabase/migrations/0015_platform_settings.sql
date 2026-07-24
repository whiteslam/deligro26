-- Platform settings — one admin-owned configuration row the whole app reads.
--
-- Singleton: the `id` column is pinned to true, so there is exactly one row and
-- every read/write targets it. Public may read it (the customer app needs the
-- fee, the support number, which verticals are on); only admins may change it.

create table if not exists public.platform_settings (
  id                       boolean primary key default true check (id),

  -- Fees & tax (authoritative for billing).
  delivery_fee             integer not null default 29,
  tax_rate                 numeric(5,4) not null default 0.05,
  free_delivery_threshold  integer not null default 0,
  min_order                integer not null default 0,

  -- Support & brand.
  business_name            text not null default 'Deligro',
  support_phone            text not null default '',
  support_email            text not null default '',
  support_whatsapp         text not null default '',
  business_address         text not null default '',

  -- Availability.
  accepting_orders         boolean not null default true,
  maintenance_message      text not null default '',
  feature_grocery          boolean not null default true,
  feature_pharmacy         boolean not null default true,
  feature_pick_drop        boolean not null default true,

  -- Ops defaults.
  default_prep_minutes     integer not null default 20,
  delivery_radius_km       numeric(5,1) not null default 8,
  rider_commission         numeric(5,4) not null default 0.08,
  rider_min_payout         integer not null default 30,

  updated_at               timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

drop policy if exists "settings — public read" on public.platform_settings;
create policy "settings — public read" on public.platform_settings for select
  using (true);

drop policy if exists "settings — admin write" on public.platform_settings;
create policy "settings — admin write" on public.platform_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- The one row. Defaults above match `settings-defaults.ts`, so an untouched
-- install behaves exactly as the app did before this table existed.
insert into public.platform_settings (id) values (true)
on conflict (id) do nothing;
