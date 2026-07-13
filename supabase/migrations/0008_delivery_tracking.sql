-- Live delivery tracking: rider GPS on the active delivery row.
alter table public.deliveries
  add column if not exists driver_lat double precision,
  add column if not exists driver_lng double precision,
  add column if not exists driver_location_at timestamptz,
  add column if not exists picked_up_at timestamptz;
