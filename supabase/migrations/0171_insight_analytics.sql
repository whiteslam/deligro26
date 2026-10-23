-- ============================================================
-- 0171 — Zone grid, vendor benchmarks, SLA targets and breaches (Insights §17.3, §17.5, §17.9)
-- ------------------------------------------------------------
-- STATUS: PENDING APPROVAL — not applied to any database from this repo.
-- Order: after 0142 (audit helpers, ops_counts_as_order) and 0151 (_ops_replay_matches).
--
-- Three read-only analyses, computed where the rows live and returned as ONE
-- jsonb value each (so PostgREST's 1,000-row cap never truncates them), plus the
-- one thing a manager can change: the service-level targets.
--
--   ops_zone_grid          delivered drops in a range on a 1 km grid, with
--                          per-zone and per-city totals. A cell with fewer than
--                          p_min_cell_drops drops is omitted — no single
--                          household ever appears as a marker — but its drops
--                          still count in the zone's totals.
--   ops_vendor_benchmarks  per shop: orders, median prep and accept minutes,
--                          cancellation rate, rating, AOV, repeat rate.
--   ops_sla_breaches       per stage (accept, prep, pickup, deliver): orders
--                          that reached it, breaches against the target, rate and
--                          median — overall, by zone, city, shop, rider and day.
--   ops_sla_targets        minutes per stage; one default row (zone_id null) and
--                          optional per-zone rows. Changed only through
--                          ops_set_sla_target / ops_reset_sla_target, which are
--                          audited, zone-checked and replay-safe.
--
-- Everything counts orders the way the rest of the manager app does: an online
-- checkout whose payment is pending or failed is not an order; cancelled orders
-- are in no SLA stage.
--
-- All functions are service-role only: they bypass RLS by running with the zone
-- list the caller passes, so they must never be reachable by a client.
--
-- Rollback:
--   drop function if exists public.ops_reset_sla_target(uuid, uuid, text, text);
--   drop function if exists public.ops_set_sla_target(uuid, uuid, int, int, int, int, text, text);
--   drop function if exists public.ops_sla_breaches(uuid[], boolean, timestamptz, timestamptz);
--   drop function if exists public.ops_vendor_benchmarks(uuid[], boolean, timestamptz, timestamptz);
--   drop function if exists public.ops_zone_grid(uuid[], boolean, timestamptz, timestamptz, int);
--   drop function if exists public._ops_stage_json(bigint, bigint, double precision);
--   drop function if exists public._ops_haversine_km(double precision, double precision, double precision, double precision);
--   drop table if exists public.ops_sla_targets;
-- ============================================================

begin;

-- 1 — Helpers ----------------------------------------------------------------------------------------------
create or replace function public._ops_haversine_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql immutable strict parallel safe set search_path = public as $$
  select 2 * 6371.0 * asin(sqrt(least(1.0,
           power(sin(radians(lat2 - lat1) / 2), 2)
         + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))));
$$;

-- One SLA stage, as the API prints it. A stage nobody reached is all zeros.
create or replace function public._ops_stage_json(n bigint, b bigint, med double precision)
returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'orders', coalesce(n, 0),
    'breaches', coalesce(b, 0),
    'rate', case when coalesce(n, 0) > 0 then round(coalesce(b, 0)::numeric / n, 4) else 0 end,
    'medianMinutes', case when med is null then null else round(med::numeric, 1) end);
$$;

-- 2 — The zone grid -----------------------------------------------------------------------------------------
-- Cell = a 1 km square. Latitude steps are 1/111.32 degree; longitude steps
-- shrink with the cosine of the latitude of the drop's nearest zone centre
-- (21.7 when there is no zone), so the cell is square wherever the zone is.
create or replace function public.ops_zone_grid(
  p_zone_ids uuid[], p_all boolean, p_from timestamptz, p_to timestamptz, p_min_cell_drops int default 3
)
returns jsonb
language sql stable security definer set search_path = public as $$
  with dd as (
    select greatest(1, extract(epoch from (p_to - p_from)) / 86400.0) as days
  ), z as (
    select dz.id, dz.name, dz.city_id, c.name as city_name, dz.center_lat, dz.center_lng, dz.radius_km,
           (coalesce(p_all, false) or dz.id = any(coalesce(p_zone_ids, '{}'::uuid[]))) as in_scope
      from public.delivery_zones dz
      join public.cities c on c.id = dz.city_id
     where dz.is_active
  ), d as (
    select o.id, o.zone_id,
           case when (o.address ->> 'lat') ~ '^-?[0-9]+(\.[0-9]+)?$' then (o.address ->> 'lat')::double precision end as lat,
           case when (o.address ->> 'lng') ~ '^-?[0-9]+(\.[0-9]+)?$' then (o.address ->> 'lng')::double precision end as lng,
           r.lat as rlat, r.lng as rlng,
           extract(epoch from (dl.delivered_at - o.created_at)) / 60.0 as mins
      from public.orders o
      join public.restaurants r on r.id = o.restaurant_id
      join public.deliveries dl on dl.order_id = o.id and dl.status::text = 'delivered' and dl.delivered_at is not null
     where o.status::text = 'delivered'
       and o.zone_id is not null
       and o.created_at >= p_from and o.created_at < p_to
       and (coalesce(p_all, false) or o.zone_id = any(coalesce(p_zone_ids, '{}'::uuid[])))
       and public.ops_counts_as_order(o.payment_method::text, o.payment_status::text)
  ), dn as (
    select d.id, d.zone_id, d.lat, d.lng, d.mins,
           nz.id as nz_id, nz.center_lat as nz_lat, nz.dist as nz_dist,
           (select coalesce(bool_or(public._ops_haversine_km(d.lat, d.lng, z2.center_lat, z2.center_lng) <= z2.radius_km), false) from z z2) as inside_any,
           public._ops_haversine_km(d.rlat, d.rlng, d.lat, d.lng) as dist_km,
           public._ops_haversine_km(d.lat, d.lng, hz.center_lat, hz.center_lng) as own_dist,
           hz.radius_km as own_radius, hz.city_id, hz.city_name
      from d
      left join z hz on hz.id = d.zone_id
      left join lateral (
        select zz.id, zz.center_lat, public._ops_haversine_km(d.lat, d.lng, zz.center_lat, zz.center_lng) as dist
          from z zz
         order by public._ops_haversine_km(d.lat, d.lng, zz.center_lat, zz.center_lng)
         limit 1
      ) nz on true
     where d.lat is not null and d.lng is not null and d.mins >= 0
  ), cells as (
    select floor(dn.lat / (1.0 / 111.32))::bigint as li,
           floor(dn.lng / (1.0 / (111.32 * cos(radians(coalesce(dn.nz_lat, 21.7))))))::bigint as gi,
           coalesce(dn.nz_lat, 21.7) as ref_lat,
           count(*)::int as drops,
           avg(dn.mins) as avg_m,
           percentile_cont(0.5) within group (order by dn.mins) as med_m,
           avg(dn.dist_km) as avg_km,
           mode() within group (order by dn.nz_id) as nz_id,
           avg(dn.nz_dist) as to_center_km,
           (avg(case when dn.inside_any then 1 else 0 end) >= 0.5) as inside_zone
      from dn
     group by 1, 2, 3
    having count(*) >= greatest(1, coalesce(p_min_cell_drops, 3))
  ), zs as (
    select z.id, z.name, z.city_id, z.city_name, z.center_lat, z.center_lng, z.radius_km,
           count(dn.id)::int as drops,
           avg(dn.mins) as avg_m,
           percentile_cont(0.5) within group (order by dn.mins) as med_m,
           avg(dn.dist_km) as avg_km,
           (count(*) filter (where dn.own_dist > dn.own_radius))::int as outside_drops,
           percentile_cont(0.95) within group (order by dn.own_dist) as p95,
           avg(dn.lat) filter (where dn.own_dist > dn.own_radius) as out_lat,
           avg(dn.lng) filter (where dn.own_dist > dn.own_radius) as out_lng,
           (select count(*) from public.orders o2
             where o2.zone_id = z.id and o2.created_at >= p_from and o2.created_at < p_to
               and o2.status::text <> 'cancelled'
               and public.ops_counts_as_order(o2.payment_method::text, o2.payment_status::text)) as counted
      from z
      left join dn on dn.zone_id = z.id
     where z.in_scope
     group by z.id, z.name, z.city_id, z.city_name, z.center_lat, z.center_lng, z.radius_km
  ), cs as (
    select dn.city_id as id, dn.city_name as name,
           count(*)::int as drops,
           avg(dn.mins) as avg_m,
           percentile_cont(0.5) within group (order by dn.mins) as med_m,
           avg(dn.dist_km) as avg_km,
           (count(*) filter (where dn.own_dist > dn.own_radius))::int as outside_drops
      from dn
     group by dn.city_id, dn.city_name
  )
  select jsonb_build_object(
    'rangeDays', (select days from dd),
    'zones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', zs.id, 'name', zs.name, 'cityId', zs.city_id, 'cityName', zs.city_name,
        'centerLat', zs.center_lat, 'centerLng', zs.center_lng, 'radiusKm', zs.radius_km,
        'drops', zs.drops, 'avgDeliveryMinutes', zs.avg_m, 'medianDeliveryMinutes', zs.med_m, 'avgDistanceKm', zs.avg_km,
        'outsideDrops', zs.outside_drops,
        'outsideRadiusShare', case when zs.drops > 0 then zs.outside_drops::numeric / zs.drops else 0 end,
        'outsideCenter', case when zs.out_lat is null then null else jsonb_build_object('lat', zs.out_lat, 'lng', zs.out_lng) end,
        'p95DistanceKm', zs.p95,
        'ordersPerDay', zs.counted::numeric / (select days from dd)
      ) order by zs.name) from zs), '[]'::jsonb),
    'cities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cs.id, 'name', cs.name, 'drops', cs.drops,
        'avgDeliveryMinutes', cs.avg_m, 'medianDeliveryMinutes', cs.med_m, 'avgDistanceKm', cs.avg_km,
        'outsideRadiusShare', case when cs.drops > 0 then cs.outside_drops::numeric / cs.drops else 0 end,
        'ordersPerDay', coalesce((select sum(zs.counted) from zs where zs.city_id = cs.id), 0)::numeric / (select days from dd)
      ) order by cs.name) from cs), '[]'::jsonb),
    'cells', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', c.li || ':' || c.gi,
        'bounds', jsonb_build_object(
          'south', c.li * (1.0 / 111.32), 'north', (c.li + 1) * (1.0 / 111.32),
          'west', c.gi * (1.0 / (111.32 * cos(radians(c.ref_lat)))), 'east', (c.gi + 1) * (1.0 / (111.32 * cos(radians(c.ref_lat))))),
        'center', jsonb_build_object(
          'lat', (c.li + 0.5) * (1.0 / 111.32), 'lng', (c.gi + 0.5) * (1.0 / (111.32 * cos(radians(c.ref_lat))))),
        'drops', c.drops, 'avgDeliveryMinutes', c.avg_m, 'medianDeliveryMinutes', c.med_m, 'avgDistanceKm', c.avg_km,
        'nearestZoneId', case when exists (select 1 from z where z.id = c.nz_id and z.in_scope) then c.nz_id end,
        'distanceToZoneCenterKm', c.to_center_km, 'insideZone', c.inside_zone
      ) order by c.drops desc, c.li, c.gi) from cells c), '[]'::jsonb)
  );
$$;

-- 3 — Vendor benchmarks ---------------------------------------------------------------------------------------
-- One jsonb array, one element per shop that had orders in the range.
create or replace function public.ops_vendor_benchmarks(
  p_zone_ids uuid[], p_all boolean, p_from timestamptz, p_to timestamptz
)
returns jsonb
language sql stable security definer set search_path = public as $$
  with o as (
    select x.id, x.restaurant_id, x.customer_id, x.status::text as status, x.total, x.created_at, x.accepted_at, x.ready_at
      from public.orders x
      join public.restaurants r on r.id = x.restaurant_id
     where x.created_at >= p_from and x.created_at < p_to
       and (coalesce(p_all, false) or r.zone_id = any(coalesce(p_zone_ids, '{}'::uuid[])))
       and public.ops_counts_as_order(x.payment_method::text, x.payment_status::text)
  ), rep as (
    select q.restaurant_id,
           (count(*) filter (where q.n >= 2))::numeric / nullif(count(*), 0) as repeat_rate
      from (select o.restaurant_id, o.customer_id, count(*) as n
              from o where o.status <> 'cancelled' and o.customer_id is not null
             group by o.restaurant_id, o.customer_id) q
     group by q.restaurant_id
  ), agg as (
    select o.restaurant_id,
           count(*)::int as orders,
           (count(*) filter (where o.status = 'cancelled'))::numeric / nullif(count(*), 0) as cancellation_rate,
           (sum(o.total) filter (where o.status <> 'cancelled'))::numeric
             / nullif(count(*) filter (where o.status <> 'cancelled'), 0) as aov,
           percentile_cont(0.5) within group (order by extract(epoch from (o.ready_at - o.accepted_at)) / 60.0)
             filter (where o.status <> 'cancelled' and o.accepted_at is not null and o.ready_at is not null and o.ready_at >= o.accepted_at) as prep_minutes,
           percentile_cont(0.5) within group (order by extract(epoch from (o.accepted_at - o.created_at)) / 60.0)
             filter (where o.status <> 'cancelled' and o.accepted_at is not null and o.accepted_at >= o.created_at) as accept_minutes
      from o
     group by o.restaurant_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'restaurantId', a.restaurant_id,
           'name', r.name,
           'zoneId', r.zone_id,
           'orders', a.orders,
           'prepMinutes', a.prep_minutes,
           'acceptMinutes', a.accept_minutes,
           'cancellationRate', a.cancellation_rate,
           'rating', case when coalesce(r.rating_count, 0) > 0 then r.rating end,
           'aov', a.aov,
           'repeatRate', rep.repeat_rate
         ) order by a.orders desc, r.name), '[]'::jsonb)
    from agg a
    join public.restaurants r on r.id = a.restaurant_id
    left join rep on rep.restaurant_id = a.restaurant_id;
$$;

-- 4 — SLA targets ----------------------------------------------------------------------------------------------
create table if not exists public.ops_sla_targets (
  id              bigint generated always as identity primary key,
  zone_id         uuid references public.delivery_zones (id) on delete cascade,
  accept_minutes  smallint not null check (accept_minutes  between 1 and 60),
  prep_minutes    smallint not null check (prep_minutes    between 1 and 180),
  pickup_minutes  smallint not null check (pickup_minutes  between 1 and 120),
  deliver_minutes smallint not null check (deliver_minutes between 10 and 240),
  updated_by      uuid references public.profiles (id) on delete set null,
  updated_at      timestamptz not null default now(),
  constraint ops_sla_targets_zone_key unique nulls not distinct (zone_id)
);
comment on table public.ops_sla_targets is
  'Service-level targets in minutes per stage. zone_id null is the platform default; a zone row overrides it. Changed only through ops_set_sla_target / ops_reset_sla_target.';

insert into public.ops_sla_targets (zone_id, accept_minutes, prep_minutes, pickup_minutes, deliver_minutes)
values (null, 5, 20, 10, 45)
on conflict (zone_id) do nothing;

alter table public.ops_sla_targets enable row level security;
drop policy if exists "ops_sla_targets — staff read" on public.ops_sla_targets;
create policy "ops_sla_targets — staff read" on public.ops_sla_targets for select
  using (public.is_admin() or public.is_manager());
revoke all on public.ops_sla_targets from anon, authenticated;
grant select on public.ops_sla_targets to authenticated;
revoke insert, update, delete, truncate on public.ops_sla_targets from service_role;
grant select on public.ops_sla_targets to service_role;

-- 5 — SLA breaches --------------------------------------------------------------------------------------------
-- Stages (cancelled orders are in none):
--   accept   created_at  → accepted_at             the shop
--   prep     accepted_at → ready_at                the shop; target = the order's own prep_minutes when set
--   pickup   ready_at    → deliveries.picked_up_at the rider
--   deliver  created_at  → deliveries.delivered_at end to end; attributed to the rider
-- A stage counts an order only once the order reached it; it breaches when its
-- duration is over the target.
create or replace function public.ops_sla_breaches(
  p_zone_ids uuid[], p_all boolean, p_from timestamptz, p_to timestamptz
)
returns jsonb
language sql stable security definer set search_path = public as $$
  with dflt as (
    select t.accept_minutes as a, t.prep_minutes as p, t.pickup_minutes as k, t.deliver_minutes as d
      from public.ops_sla_targets t where t.zone_id is null limit 1
  ), zs as (
    select dz.id, dz.name, dz.city_id, c.name as city_name
      from public.delivery_zones dz join public.cities c on c.id = dz.city_id
     where dz.is_active and (coalesce(p_all, false) or dz.id = any(coalesce(p_zone_ids, '{}'::uuid[])))
  ), base as (
    select o.id, o.zone_id, z.name as zone_name, z.city_id, c.name as city_name,
           o.restaurant_id, r.name as vendor_name, o.created_at, o.accepted_at, o.ready_at,
           dl.picked_up_at, dl.delivered_at, dl.driver_id,
           coalesce(t.accept_minutes, df.a)                     as t_accept,
           coalesce(o.prep_minutes, t.prep_minutes, df.p)       as t_prep,
           coalesce(t.pickup_minutes, df.k)                     as t_pickup,
           coalesce(t.deliver_minutes, df.d)                    as t_deliver
      from public.orders o
      join public.delivery_zones z on z.id = o.zone_id
      join public.cities c on c.id = z.city_id
      join public.restaurants r on r.id = o.restaurant_id
      left join public.deliveries dl on dl.order_id = o.id
      left join public.ops_sla_targets t on t.zone_id = o.zone_id
      cross join dflt df
     where o.created_at >= p_from and o.created_at < p_to
       and o.status::text <> 'cancelled'
       and o.zone_id is not null
       and (coalesce(p_all, false) or o.zone_id = any(coalesce(p_zone_ids, '{}'::uuid[])))
       and public.ops_counts_as_order(o.payment_method::text, o.payment_status::text)
  ), st as (
    select b.id, b.zone_id, b.zone_name, b.city_id, b.city_name, b.restaurant_id, b.vendor_name, b.driver_id,
           (b.created_at at time zone 'Asia/Kolkata')::date as day,
           v.stage, v.minutes, v.target
      from base b
      cross join lateral (values
        ('accept',  case when b.accepted_at  is not null and b.accepted_at  >= b.created_at  then extract(epoch from (b.accepted_at  - b.created_at))  / 60.0 end, b.t_accept::numeric),
        ('prep',    case when b.ready_at     is not null and b.accepted_at is not null and b.ready_at >= b.accepted_at then extract(epoch from (b.ready_at - b.accepted_at)) / 60.0 end, b.t_prep::numeric),
        ('pickup',  case when b.picked_up_at is not null and b.ready_at is not null and b.picked_up_at >= b.ready_at then extract(epoch from (b.picked_up_at - b.ready_at)) / 60.0 end, b.t_pickup::numeric),
        ('deliver', case when b.delivered_at is not null and b.delivered_at >= b.created_at then extract(epoch from (b.delivered_at - b.created_at)) / 60.0 end, b.t_deliver::numeric)
      ) as v(stage, minutes, target)
     where v.minutes is not null
  ), s_all as (
    select stage, count(*) as n, count(*) filter (where minutes > target) as b,
           percentile_cont(0.5) within group (order by minutes) as med
      from st group by stage
  ), s_zone as (
    select zone_id, stage, count(*) as n, count(*) filter (where minutes > target) as b,
           percentile_cont(0.5) within group (order by minutes) as med
      from st group by zone_id, stage
  ), s_city as (
    select city_id, city_name, stage, count(*) as n, count(*) filter (where minutes > target) as b,
           percentile_cont(0.5) within group (order by minutes) as med
      from st group by city_id, city_name, stage
  ), s_vendor as (
    select restaurant_id, vendor_name, stage, count(*) as n, count(*) filter (where minutes > target) as b,
           percentile_cont(0.5) within group (order by minutes) as med
      from st where stage in ('accept', 'prep') group by restaurant_id, vendor_name, stage
  ), s_rider as (
    select driver_id, stage, count(*) as n, count(*) filter (where minutes > target) as b,
           percentile_cont(0.5) within group (order by minutes) as med
      from st where stage in ('pickup', 'deliver') and driver_id is not null group by driver_id, stage
  ), s_day as (
    select day, stage, count(*) as n, count(*) filter (where minutes > target) as b
      from st group by day, stage
  ), vendors as (
    select v.restaurant_id, v.vendor_name,
           sum(v.n) filter (where v.stage = 'accept') as accept_n,
           sum(v.b) filter (where v.stage = 'accept') as accept_b,
           (coalesce(sum(v.b), 0))::numeric / nullif(sum(v.n), 0) as combined
      from s_vendor v group by v.restaurant_id, v.vendor_name
    having coalesce(sum(v.n) filter (where v.stage = 'accept'), 0) >= 5
     order by (coalesce(sum(v.b), 0))::numeric / nullif(sum(v.n), 0) desc nulls last, v.vendor_name
     limit 20
  ), riders as (
    select r.driver_id,
           (coalesce(sum(r.b), 0))::numeric / nullif(sum(r.n), 0) as combined
      from s_rider r group by r.driver_id
    having coalesce(sum(r.n) filter (where r.stage = 'deliver'), 0) >= 5
     order by (coalesce(sum(r.b), 0))::numeric / nullif(sum(r.n), 0) desc nulls last, r.driver_id
     limit 20
  )
  select jsonb_build_object(
    'overall', (
      select jsonb_object_agg(sg.stage, public._ops_stage_json(a.n, a.b, a.med))
        from (values ('accept'), ('prep'), ('pickup'), ('deliver')) sg(stage)
        left join s_all a on a.stage = sg.stage),
    'byZone', coalesce((
      select jsonb_agg(jsonb_build_object(
        'zoneId', zs.id, 'name', zs.name, 'cityId', zs.city_id,
        'accept',  public._ops_stage_json((select n from s_zone where zone_id = zs.id and stage = 'accept'),  (select b from s_zone where zone_id = zs.id and stage = 'accept'),  (select med from s_zone where zone_id = zs.id and stage = 'accept')),
        'prep',    public._ops_stage_json((select n from s_zone where zone_id = zs.id and stage = 'prep'),    (select b from s_zone where zone_id = zs.id and stage = 'prep'),    (select med from s_zone where zone_id = zs.id and stage = 'prep')),
        'pickup',  public._ops_stage_json((select n from s_zone where zone_id = zs.id and stage = 'pickup'),  (select b from s_zone where zone_id = zs.id and stage = 'pickup'),  (select med from s_zone where zone_id = zs.id and stage = 'pickup')),
        'deliver', public._ops_stage_json((select n from s_zone where zone_id = zs.id and stage = 'deliver'), (select b from s_zone where zone_id = zs.id and stage = 'deliver'), (select med from s_zone where zone_id = zs.id and stage = 'deliver'))
      ) order by zs.name) from zs), '[]'::jsonb),
    'byCity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'cityId', k.city_id, 'name', k.city_name,
        'accept',  public._ops_stage_json((select n from s_city where city_id = k.city_id and stage = 'accept'),  (select b from s_city where city_id = k.city_id and stage = 'accept'),  (select med from s_city where city_id = k.city_id and stage = 'accept')),
        'prep',    public._ops_stage_json((select n from s_city where city_id = k.city_id and stage = 'prep'),    (select b from s_city where city_id = k.city_id and stage = 'prep'),    (select med from s_city where city_id = k.city_id and stage = 'prep')),
        'pickup',  public._ops_stage_json((select n from s_city where city_id = k.city_id and stage = 'pickup'),  (select b from s_city where city_id = k.city_id and stage = 'pickup'),  (select med from s_city where city_id = k.city_id and stage = 'pickup')),
        'deliver', public._ops_stage_json((select n from s_city where city_id = k.city_id and stage = 'deliver'), (select b from s_city where city_id = k.city_id and stage = 'deliver'), (select med from s_city where city_id = k.city_id and stage = 'deliver'))
      ) order by k.city_name) from (select distinct city_id, city_name from s_city) k), '[]'::jsonb),
    'byVendor', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.restaurant_id, 'name', v.vendor_name,
        'accept', public._ops_stage_json((select n from s_vendor where restaurant_id = v.restaurant_id and stage = 'accept'), (select b from s_vendor where restaurant_id = v.restaurant_id and stage = 'accept'), (select med from s_vendor where restaurant_id = v.restaurant_id and stage = 'accept')),
        'prep',   public._ops_stage_json((select n from s_vendor where restaurant_id = v.restaurant_id and stage = 'prep'),   (select b from s_vendor where restaurant_id = v.restaurant_id and stage = 'prep'),   (select med from s_vendor where restaurant_id = v.restaurant_id and stage = 'prep'))
      ) order by v.combined desc nulls last, v.vendor_name) from vendors v), '[]'::jsonb),
    'byRider', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', rd.driver_id, 'name', coalesce(p.full_name, 'Rider'), 'code', rp.rider_code,
        'pickup',  public._ops_stage_json((select n from s_rider where driver_id = rd.driver_id and stage = 'pickup'),  (select b from s_rider where driver_id = rd.driver_id and stage = 'pickup'),  (select med from s_rider where driver_id = rd.driver_id and stage = 'pickup')),
        'deliver', public._ops_stage_json((select n from s_rider where driver_id = rd.driver_id and stage = 'deliver'), (select b from s_rider where driver_id = rd.driver_id and stage = 'deliver'), (select med from s_rider where driver_id = rd.driver_id and stage = 'deliver'))
      ) order by rd.combined desc nulls last, rd.driver_id)
        from riders rd
        left join public.profiles p on p.id = rd.driver_id
        left join public.rider_profiles rp on rp.driver_id = rd.driver_id), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', to_char(dy.day, 'YYYY-MM-DD'),
        'accept',  (select case when n > 0 then round(b::numeric / n, 4) end from s_day where day = dy.day and stage = 'accept'),
        'prep',    (select case when n > 0 then round(b::numeric / n, 4) end from s_day where day = dy.day and stage = 'prep'),
        'pickup',  (select case when n > 0 then round(b::numeric / n, 4) end from s_day where day = dy.day and stage = 'pickup'),
        'deliver', (select case when n > 0 then round(b::numeric / n, 4) end from s_day where day = dy.day and stage = 'deliver')
      ) order by dy.day) from (select distinct day from s_day) dy), '[]'::jsonb)
  );
$$;

-- 6 — Changing a target (audited, zone-checked, replay-safe) ---------------------------------------------------
create or replace function public.ops_set_sla_target(
  p_actor uuid, p_zone uuid, p_accept int, p_prep int, p_pickup int, p_deliver int, p_reason text, p_client_action_id text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  role_name text;
  prior     record;
  entity    constant text := coalesce(p_zone::text, 'default');
  why       text := btrim(coalesce(p_reason, ''));
begin
  if p_zone is null then
    -- The platform default belongs to admins.
    if coalesce(auth.jwt() ->> 'role', '') not in ('service_role', 'supabase_admin') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    select p.role::text into role_name from public.profiles p where p.id = p_actor;
    if role_name is distinct from 'admin' then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  else
    perform public.ops_require_staff(p_actor, p_zone);
  end if;
  if public._ops_replayed(p_actor, p_client_action_id) then
    perform public._ops_replay_matches(p_client_action_id, array['sla_target.set'], entity);
    return jsonb_build_object('zoneId', p_zone, 'replayed', true);
  end if;
  if char_length(why) < 3 or char_length(why) > 300 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  if p_accept is null  or p_accept  not between 1 and 60
     or p_prep is null    or p_prep    not between 1 and 180
     or p_pickup is null  or p_pickup  not between 1 and 120
     or p_deliver is null or p_deliver not between 10 and 240 then
    raise exception 'bad_threshold' using errcode = '22023';
  end if;

  -- What applied before: the zone's own row, else the default.
  select t.accept_minutes, t.prep_minutes, t.pickup_minutes, t.deliver_minutes into prior
    from public.ops_sla_targets t
   where t.zone_id = p_zone or t.zone_id is null
   order by (t.zone_id is null) limit 1;

  insert into public.ops_sla_targets (zone_id, accept_minutes, prep_minutes, pickup_minutes, deliver_minutes, updated_by, updated_at)
  values (p_zone, p_accept, p_prep, p_pickup, p_deliver, p_actor, now())
  on conflict (zone_id) do update
     set accept_minutes = excluded.accept_minutes, prep_minutes = excluded.prep_minutes,
         pickup_minutes = excluded.pickup_minutes, deliver_minutes = excluded.deliver_minutes,
         updated_by = excluded.updated_by, updated_at = now();

  perform public._ops_log(p_actor, 'sla_target.set', 'sla_target', entity, p_zone, why,
    jsonb_build_object('acceptMinutes', prior.accept_minutes, 'prepMinutes', prior.prep_minutes,
                       'pickupMinutes', prior.pickup_minutes, 'deliverMinutes', prior.deliver_minutes),
    jsonb_build_object('acceptMinutes', p_accept, 'prepMinutes', p_prep, 'pickupMinutes', p_pickup, 'deliverMinutes', p_deliver),
    p_client_action_id);
  return jsonb_build_object('zoneId', p_zone, 'replayed', false);
end;
$$;

-- Back to the inherited default. The default row itself is changed, never deleted.
create or replace function public.ops_reset_sla_target(p_actor uuid, p_zone uuid, p_reason text, p_client_action_id text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  prior record;
  why   text := btrim(coalesce(p_reason, ''));
begin
  if p_zone is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.ops_require_staff(p_actor, p_zone);
  if public._ops_replayed(p_actor, p_client_action_id) then
    perform public._ops_replay_matches(p_client_action_id, array['sla_target.reset'], p_zone::text);
    return jsonb_build_object('zoneId', p_zone, 'replayed', true);
  end if;
  if char_length(why) < 3 or char_length(why) > 300 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  delete from public.ops_sla_targets t where t.zone_id = p_zone
  returning t.accept_minutes, t.prep_minutes, t.pickup_minutes, t.deliver_minutes into prior;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform public._ops_log(p_actor, 'sla_target.reset', 'sla_target', p_zone::text, p_zone, why,
    jsonb_build_object('acceptMinutes', prior.accept_minutes, 'prepMinutes', prior.prep_minutes,
                       'pickupMinutes', prior.pickup_minutes, 'deliverMinutes', prior.deliver_minutes),
    null, p_client_action_id);
  return jsonb_build_object('zoneId', p_zone, 'replayed', false);
end;
$$;

-- 7 — Who may call ------------------------------------------------------------------------------------------------
revoke execute on function public._ops_haversine_km(double precision, double precision, double precision, double precision) from public, anon, authenticated;
revoke execute on function public._ops_stage_json(bigint, bigint, double precision) from public, anon, authenticated;
revoke execute on function public.ops_zone_grid(uuid[], boolean, timestamptz, timestamptz, int) from public, anon, authenticated;
revoke execute on function public.ops_vendor_benchmarks(uuid[], boolean, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.ops_sla_breaches(uuid[], boolean, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.ops_set_sla_target(uuid, uuid, int, int, int, int, text, text) from public, anon, authenticated;
revoke execute on function public.ops_reset_sla_target(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public._ops_haversine_km(double precision, double precision, double precision, double precision) to service_role;
grant execute on function public._ops_stage_json(bigint, bigint, double precision) to service_role;
grant execute on function public.ops_zone_grid(uuid[], boolean, timestamptz, timestamptz, int) to service_role;
grant execute on function public.ops_vendor_benchmarks(uuid[], boolean, timestamptz, timestamptz) to service_role;
grant execute on function public.ops_sla_breaches(uuid[], boolean, timestamptz, timestamptz) to service_role;
grant execute on function public.ops_set_sla_target(uuid, uuid, int, int, int, int, text, text) to service_role;
grant execute on function public.ops_reset_sla_target(uuid, uuid, text, text) to service_role;

commit;
