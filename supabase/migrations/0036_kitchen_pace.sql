-- ============================================================
-- 0036 — Per-kitchen prep time, and a busy control
-- ------------------------------------------------------------
-- Two related gaps in how long the platform says food will take.
--
-- 1. Every kitchen on the platform was modelled as cooking at the same speed.
--    `computeOrderEta` splits a shop's advertised band into a kitchen leg and a
--    road leg, and the kitchen leg came from `platform_settings.default_prep_
--    minutes` — ONE number for every restaurant. A tandoor and a juice counter
--    were promised identically. `prep_minutes` below is that leg, per shop, and
--    null still means "use the platform default", so nothing changes for a shop
--    that has not set one.
--
-- 2. A slammed kitchen had no way to say so. Its cards kept advertising
--    "22–28 min" with forty tickets on the rail, because eta_min/eta_max are
--    free text a vendor types once and never revisits mid-service. Lateness was
--    then discovered by the customer rather than communicated by the shop.
--    `busy_until` + `busy_extra_minutes` are a temporary, self-expiring bump: the
--    vendor taps "+15 min for the next hour" and every surface that quotes this
--    shop's ETA adds it until the timestamp passes.
--
-- Self-expiring on purpose, and that is the important design choice. A boolean
-- "is busy" flag is another switch someone has to remember to turn off — which
-- is the same failure mode as `is_open` staying true at 2 a.m. (F-13). A
-- deadline cannot be forgotten; the worst case is that it lapses while the
-- kitchen is still busy, and the vendor taps it again.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

alter table public.restaurants
  add column if not exists prep_minutes        integer,
  add column if not exists busy_until          timestamptz,
  add column if not exists busy_extra_minutes  integer not null default 0;

comment on column public.restaurants.prep_minutes is
  'This kitchen''s own prep leg in minutes. NULL inherits platform_settings.default_prep_minutes. Bounds mirror MIN/MAX_PREP_MINUTES in src/lib/orders/eta.ts.';
comment on column public.restaurants.busy_until is
  'While in the future, busy_extra_minutes is added to this shop''s advertised ETA band. NULL or past = not busy. Self-expiring so it cannot be left on.';
comment on column public.restaurants.busy_extra_minutes is
  'Minutes added to the advertised band while busy_until is in the future.';

-- Bounds, so a typo in a vendor form cannot make every estimate nonsense. The
-- app clamps too (eta.ts); this is the floor under that.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'restaurants_prep_minutes_range'
  ) then
    alter table public.restaurants
      add constraint restaurants_prep_minutes_range
      check (prep_minutes is null or (prep_minutes between 1 and 180));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'restaurants_busy_extra_range'
  ) then
    alter table public.restaurants
      add constraint restaurants_busy_extra_range
      check (busy_extra_minutes between 0 and 120);
  end if;
end $$;

-- ============================================================
-- Grants.
-- ------------------------------------------------------------
-- AGENTS.md §1 and migration 0024: `restaurants` is granted to anon/authenticated
-- by an explicit column list, so a column added later is invisible until it is
-- granted on purpose. These three have to be, because the customer feed quotes
-- the bumped band — the whole point of (2) above is that shoppers see it.
--
-- Deliberately three named columns rather than re-running 0024's "everything not
-- on the deny list" block: that block computes its list from the live schema, so
-- re-running it here would silently re-grant anything else that has been added
-- since, which is the exact accident 0024 was written to stop.
-- ============================================================
grant select (prep_minutes, busy_until, busy_extra_minutes)
  on public.restaurants to anon, authenticated;

commit;
