-- ============================================================
-- 0170 — Hourly demand and rider-supply rollups (Insights, §17.1–17.2)
-- ------------------------------------------------------------
-- STATUS: PENDING APPROVAL — not applied to any database from this repo.
-- Order: after 0061 → 0081 → 0141 → 0142 → 0144 (it reads ops_counts_as_order).
--
-- The forecast and "riders needed" screens need eight to ten weeks of orders
-- by zone and hour. Reading that many orders into Node on every request would
-- be exactly the unbounded pull the Phase 2 review ruled out, so the hourly
-- shape is kept in two small tables a scheduled job keeps current:
--
--   ops_hourly_demand       one row per zone and IST hour: orders, delivered,
--                           cancelled, customer_paid (the same "what counts as
--                           an order" rule as every other figure — an online
--                           checkout whose payment is pending or failed is not
--                           an order).
--   ops_hourly_rider_supply one row per zone and IST hour: online rider-minutes
--                           (rider_shifts clipped to the hour; a rider who works
--                           n zones counts 1/n in each) and deliveries made.
--
-- Hours are IST (Asia/Kolkata, UTC+5:30), so an hour boundary falls at :30 UTC.
-- `hour_start` is the instant an IST hour began.
--
-- Both refresh functions are idempotent: they recompute every zone-hour in the
-- window and delete rows that became empty, so a late cancellation or a shift
-- that ended after the first run corrects itself on the next one.
--
-- Service role only. RLS is on with no policies and every privilege is revoked
-- from anon/authenticated; even the service role reads, never writes, directly.
--
-- Rollback:
--   drop function if exists public.ops_backfill_insight_rollups();
--   drop function if exists public.ops_refresh_insight_rollups(timestamptz, timestamptz);
--   drop function if exists public._ops_ist_hour(timestamptz);
--   drop table if exists public.ops_hourly_rider_supply, public.ops_hourly_demand;
-- ============================================================

begin;

-- 1 — The start of the IST hour containing an instant -------------------------------------------------
create or replace function public._ops_ist_hour(p timestamptz)
returns timestamptz
language sql immutable parallel safe set search_path = public as $$
  select date_trunc('hour', p at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
$$;

-- 2 — The tables ----------------------------------------------------------------------------------------
create table if not exists public.ops_hourly_demand (
  zone_id        uuid        not null references public.delivery_zones (id) on delete cascade,
  hour_start     timestamptz not null,
  orders         int         not null check (orders >= 0),
  delivered      int         not null check (delivered >= 0),
  cancelled      int         not null check (cancelled >= 0),
  customer_paid  bigint      not null check (customer_paid >= 0),
  primary key (zone_id, hour_start)
);
create index if not exists ops_hourly_demand_hour_idx on public.ops_hourly_demand (hour_start);

create table if not exists public.ops_hourly_rider_supply (
  zone_id        uuid          not null references public.delivery_zones (id) on delete cascade,
  hour_start     timestamptz   not null,
  rider_minutes  numeric(10,2) not null check (rider_minutes >= 0),
  delivered      int           not null check (delivered >= 0),
  primary key (zone_id, hour_start)
);
create index if not exists ops_hourly_rider_supply_hour_idx on public.ops_hourly_rider_supply (hour_start);

comment on table public.ops_hourly_demand is
  'Orders per zone and IST hour (counted orders only; unpaid online checkouts excluded). Refreshed by ops_refresh_insight_rollups. Service role only.';
comment on table public.ops_hourly_rider_supply is
  'Online rider-minutes and deliveries per zone and IST hour. A rider in n zones counts 1/n in each. Refreshed by ops_refresh_insight_rollups. Service role only.';

alter table public.ops_hourly_demand       enable row level security;
alter table public.ops_hourly_rider_supply enable row level security;
revoke all on public.ops_hourly_demand, public.ops_hourly_rider_supply from anon, authenticated;
revoke insert, update, delete, truncate on public.ops_hourly_demand, public.ops_hourly_rider_supply from service_role;
grant select on public.ops_hourly_demand, public.ops_hourly_rider_supply to service_role;

-- 3 — Refresh a window --------------------------------------------------------------------------------
-- Recomputes every zone-hour from the start of the IST hour containing p_from
-- up to and including the hour containing p_to. Returns the rows written.
create or replace function public.ops_refresh_insight_rollups(p_from timestamptz, p_to timestamptz)
returns int
language plpgsql security definer set search_path = public as $$
declare
  f timestamptz;
  t timestamptz;
  d int := 0;
  s int := 0;
begin
  if p_from is null or p_to is null or p_to <= p_from then
    return 0;
  end if;
  f := public._ops_ist_hour(p_from);
  t := public._ops_ist_hour(p_to) + interval '1 hour';

  -- Demand: counted orders only, cancelled kept in `orders` and counted again
  -- in `cancelled`, and out of customer_paid.
  with agg as (
    select o.zone_id,
           public._ops_ist_hour(o.created_at)                          as hour_start,
           count(*)::int                                               as orders,
           (count(*) filter (where o.status::text = 'delivered'))::int as delivered,
           (count(*) filter (where o.status::text = 'cancelled'))::int as cancelled,
           coalesce(sum(o.total) filter (where o.status::text <> 'cancelled'), 0)::bigint as customer_paid
      from public.orders o
     where o.zone_id is not null
       and o.created_at >= f and o.created_at < t
       and public.ops_counts_as_order(o.payment_method::text, o.payment_status::text)
     group by 1, 2
  ), gone as (
    delete from public.ops_hourly_demand x
     where x.hour_start >= f and x.hour_start < t
       and not exists (select 1 from agg a where a.zone_id = x.zone_id and a.hour_start = x.hour_start)
    returning 1
  ), up as (
    insert into public.ops_hourly_demand (zone_id, hour_start, orders, delivered, cancelled, customer_paid)
    select zone_id, hour_start, orders, delivered, cancelled, customer_paid from agg
    on conflict (zone_id, hour_start) do update
       set orders = excluded.orders, delivered = excluded.delivered,
           cancelled = excluded.cancelled, customer_paid = excluded.customer_paid
    returning 1
  )
  select (select count(*) from up)::int into d;

  -- Supply: shift minutes clipped to each IST hour, split 1/n over the rider's
  -- zones, plus deliveries made in that hour for the zone's orders. A rider
  -- with no zone contributes nothing (nobody can see them anyway).
  with sh as (
    select s2.driver_id, s2.started_at as a0, coalesce(s2.ended_at, now()) as e0
      from public.rider_shifts s2
     where s2.started_at < t and coalesce(s2.ended_at, now()) > f
  ), hrs as (
    select sh.driver_id, g.h as hour_start,
           greatest(sh.a0, g.h)                         as a,
           least(sh.e0, g.h + interval '1 hour')        as b
      from sh
      cross join lateral generate_series(
        public._ops_ist_hour(greatest(sh.a0, f)),
        public._ops_ist_hour(least(sh.e0, t) - interval '1 microsecond'),
        interval '1 hour'
      ) as g(h)
  ), nz as (
    select sz.user_id, count(*)::numeric as n from public.staff_zones sz group by sz.user_id
  ), per as (
    select z.zone_id, h.hour_start,
           sum(greatest(0, extract(epoch from (h.b - h.a)) / 60.0) / nz.n) as minutes
      from hrs h
      join public.staff_zones z on z.user_id = h.driver_id
      join nz on nz.user_id = h.driver_id
     where h.hour_start >= f and h.hour_start < t
     group by z.zone_id, h.hour_start
  ), deliv as (
    select o.zone_id, public._ops_ist_hour(dl.delivered_at) as hour_start, count(*)::int as delivered
      from public.deliveries dl
      join public.orders o on o.id = dl.order_id
     where dl.status::text = 'delivered'
       and dl.delivered_at >= f and dl.delivered_at < t
       and o.zone_id is not null
     group by o.zone_id, public._ops_ist_hour(dl.delivered_at)
  ), agg as (
    select coalesce(p.zone_id, v.zone_id)       as zone_id,
           coalesce(p.hour_start, v.hour_start) as hour_start,
           round(coalesce(p.minutes, 0), 2)     as rider_minutes,
           coalesce(v.delivered, 0)             as delivered
      from per p
      full join deliv v on v.zone_id = p.zone_id and v.hour_start = p.hour_start
  ), gone as (
    delete from public.ops_hourly_rider_supply x
     where x.hour_start >= f and x.hour_start < t
       and not exists (select 1 from agg a where a.zone_id = x.zone_id and a.hour_start = x.hour_start)
    returning 1
  ), up as (
    insert into public.ops_hourly_rider_supply (zone_id, hour_start, rider_minutes, delivered)
    select zone_id, hour_start, rider_minutes, delivered from agg
    on conflict (zone_id, hour_start) do update
       set rider_minutes = excluded.rider_minutes, delivered = excluded.delivered
    returning 1
  )
  select (select count(*) from up)::int into s;

  return d + s;
end;
$$;

-- 4 — First fill: ten weeks, once, only into an empty table -----------------------------------------
create or replace function public.ops_backfill_insight_rollups()
returns int
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.ops_hourly_demand limit 1) then
    return 0;
  end if;
  return public.ops_refresh_insight_rollups(now() - interval '10 weeks', now());
end;
$$;

-- 5 — Who may call ----------------------------------------------------------------------------------------
revoke execute on function public._ops_ist_hour(timestamptz) from public, anon, authenticated;
revoke execute on function public.ops_refresh_insight_rollups(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.ops_backfill_insight_rollups() from public, anon, authenticated;
grant execute on function public._ops_ist_hour(timestamptz) to service_role;
grant execute on function public.ops_refresh_insight_rollups(timestamptz, timestamptz) to service_role;
grant execute on function public.ops_backfill_insight_rollups() to service_role;

commit;
