-- ============================================================
-- Deligro — where each shop actually is
--
-- Until now `restaurants.distance_km` was a static number set at seed time: it
-- was the same however far away the customer was. To show a real distance we
-- need the shop's own position, so the vendor pins it on a map (see
-- /vendor/settings) and we measure from the customer's location to here.
--
-- distance_km stays as the fallback for shops that haven't pinned yet, so
-- nothing on the feed goes blank mid-rollout.
-- ============================================================

alter table public.restaurants
  add column if not exists lat     double precision,
  add column if not exists lng     double precision,
  add column if not exists address text;

comment on column public.restaurants.lat is
  'Shop latitude, set by the vendor pinning it on the map. Null = never pinned; the UI falls back to distance_km.';
comment on column public.restaurants.lng is
  'Shop longitude — see lat.';
comment on column public.restaurants.address is
  'Reverse-geocoded street address of the pin, shown to customers and drivers.';

-- No new policy needed: "restaurants — owner manage" (0001_init) already scopes
-- writes to the owning vendor, and these are columns on that same row.
