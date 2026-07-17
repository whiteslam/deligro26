-- Promotional banners / ad campaigns — the home carousel and other placements.
--
-- The app never hardcodes promos: it asks for the active campaigns at a
-- placement and renders them. The Admin Panel owns everything below. Two RLS
-- rules matter: the public may read only campaigns that are `active` AND inside
-- their schedule window; only admins (and the service role) may write.

-- ---------- banners ----------
create table if not exists public.banners (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  headline       text not null,
  description    text not null default '',
  cta_label      text not null default 'Explore',
  -- 'internal' Deligro promo vs paid 'sponsored' campaign (wears the badge).
  kind           text not null default 'internal'
                   check (kind in ('internal', 'sponsored')),
  status         text not null default 'draft'
                   check (status in ('draft', 'active', 'paused', 'archived')),
  -- Where the CTA goes. target_value is a slug/URL/category id per target_type.
  target_type    text not null default 'food'
                   check (target_type in (
                     'food','grocery','pick_drop','shops','pharmacy',
                     'membership','refer','restaurant','store','product',
                     'category','external')),
  target_value   text,
  -- One row can appear on several surfaces; the app queries one at a time.
  placements     text[] not null default '{}',
  priority       integer not null default 0,
  display_order  integer not null default 0,
  auto_slide_ms  integer not null default 4500,
  image_url      text,
  mobile_image_url text,
  tint           text not null default 'linear-gradient(135deg,#f2a71b,#d98600)',
  glyph          text,
  sponsor_name   text,
  -- Audience narrowing; empty/null = everyone.
  target_cities   text[] not null default '{}',
  target_zones    text[] not null default '{}',
  target_segments text[] not null default '{}',
  starts_at      timestamptz,
  ends_at        timestamptz,
  -- Running counters kept on the row so the carousel needn't aggregate events
  -- on every read. `banner_events` below is the auditable source of truth.
  impressions    bigint not null default 0,
  clicks         bigint not null default 0,
  conversions    bigint not null default 0,
  orders_count   bigint not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists banners_serving_idx
  on public.banners (status, priority desc, display_order)
  where status = 'active';

alter table public.banners enable row level security;

-- Public sees only what is truly live right now: active + inside the window.
drop policy if exists "banners — read live" on public.banners;
create policy "banners — read live" on public.banners for select
  using (
    status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now())
  );

-- Admins see and manage everything (drafts, paused, archived included).
drop policy if exists "banners — admin all" on public.banners;
create policy "banners — admin all" on public.banners for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- banner_events (impressions / clicks) ----------
-- One row per tracked interaction. Anyone (incl. guests) may log one, but only
-- for a banner that is currently live — so the table can't be stuffed with
-- events for archived or nonexistent campaigns. Reads are admin-only.
create table if not exists public.banner_events (
  id          bigint generated always as identity primary key,
  banner_id   uuid not null references public.banners (id) on delete cascade,
  kind        text not null check (kind in ('impression', 'click', 'conversion', 'order')),
  placement   text,
  city        text,
  created_at  timestamptz not null default now()
);
create index if not exists banner_events_banner_idx
  on public.banner_events (banner_id, kind);

alter table public.banner_events enable row level security;

drop policy if exists "banner_events — log on live" on public.banner_events;
create policy "banner_events — log on live" on public.banner_events for insert
  with check (
    exists (
      select 1 from public.banners b
      where b.id = banner_id
        and b.status = 'active'
        and (b.starts_at is null or b.starts_at <= now())
        and (b.ends_at   is null or b.ends_at   >  now())
    )
  );

drop policy if exists "banner_events — admin read" on public.banner_events;
create policy "banner_events — admin read" on public.banner_events for select
  using (public.is_admin());

-- Atomic counter bump, runs as definer so a guest logging an event may still
-- increment the private counter on the banner row without a broad update grant.
create or replace function public.bump_banner_stat(p_banner_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.banners
     set impressions = impressions + (p_kind = 'impression')::int,
         clicks      = clicks      + (p_kind = 'click')::int,
         conversions = conversions + (p_kind = 'conversion')::int,
         orders_count = orders_count + (p_kind = 'order')::int
   where id = p_banner_id
     and status = 'active';
end;
$$;
grant execute on function public.bump_banner_stat(uuid, text) to anon, authenticated;

-- A few live demo campaigns so the home carousel has something the moment this
-- migration runs — the same courtesy 0006 does for coupons. Seeded only when the
-- table is empty, so re-running never duplicates and never fights the operator's
-- own campaigns. Delete or edit them from the Admin Panel any time.
insert into public.banners
  (name, headline, description, cta_label, kind, status, target_type, target_value,
   placements, priority, display_order, auto_slide_ms, image_url, tint, glyph, sponsor_name)
select * from (values
  ('Grocery launch', 'Groceries in minutes',
   'Fresh produce, daily staples & kirana — delivered to your door.',
   'Shop Now', 'internal', 'active', 'grocery', null::text,
   '{home_hero}'::text[], 100, 1, 4500,
   'https://images.pexels.com/photos/4198015/pexels-photo-4198015.jpeg?auto=compress&cs=tinysrgb&w=800',
   'linear-gradient(135deg,#17b26a,#0e8f57)', '🛒', null::text),
  ('Pick & Drop', 'Pick & Drop, anywhere',
   'Forgot something? Send a rider to pick up and drop across town.',
   'Book Now', 'internal', 'active', 'pick_drop', null,
   '{home_hero}', 90, 2, 4500,
   'https://images.pexels.com/photos/4391470/pexels-photo-4391470.jpeg?auto=compress&cs=tinysrgb&w=800',
   'linear-gradient(135deg,#f2a71b,#d98600)', '🛵', null),
  ('Pharmacy', 'Medicines at your door',
   'Upload a prescription and get medicines delivered discreetly.',
   'Explore', 'internal', 'active', 'pharmacy', null,
   '{home_hero}', 80, 3, 4500,
   'https://images.pexels.com/photos/208512/pexels-photo-208512.jpeg?auto=compress&cs=tinysrgb&w=800',
   'linear-gradient(135deg,#3b82f6,#1d4ed8)', '💊', null),
  ('Burger Republic (paid)', 'Burger Republic · 30% OFF today',
   'Flame-grilled smash burgers. Today only, free delivery over ₹299.',
   'Order Now', 'sponsored', 'active', 'restaurant', 'burger-republic',
   '{home_hero}', 60, 5, 4500,
   'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=800',
   'linear-gradient(135deg,#e5352b,#b31217)', '🍔', 'Burger Republic')
) as seed
where not exists (select 1 from public.banners);
