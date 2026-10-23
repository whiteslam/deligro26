-- ============================================================
-- 0172 — Per-zone automatic rider assignment (Insights §17.4)
-- ------------------------------------------------------------
-- STATUS: PENDING APPROVAL — not applied to any database from this repo.
-- Order: after 0081 → 0082 → 0141 → 0142 (it calls _ops_rider_ineligible) → 0151.
--
-- Today a ready order is OFFERED to the best rider, who has a few minutes to
-- accept. A zone can now be switched to automatic assignment: dispatch picks
-- the best eligible riders and puts the order straight on the first one the
-- database accepts, falling back to the offer when none can take it.
--
-- What this adds:
--   delivery_zones.dispatch_mode          'offer' (default, exactly as before)
--                                         | 'auto_assign'
--   delivery_zones.auto_assign_max_load   0–3 deliveries a rider may already
--                                         carry (0 = only idle riders)
--   deliveries.assignment_source          how the leg was assigned:
--                                         'rider_accept' | 'ops' | 'auto'
--   deliveries.auto_assign_fell_back_at   set once when dispatch tried to assign
--                                         automatically and fell back to an offer
--   rider_eligible_for_order(rider, order) the same rule the manager picker and
--                                         ops_assign_rider use (_ops_rider_ineligible)
--   ops_auto_assign_delivery(order, rider, max_load)   atomic, returns null or the refusal
--   ops_set_zone_dispatch(...)            audited `zone.dispatch_mode`
--   ops_dispatch_overview(zones, all)     modes plus the last 24 hours
--
-- One eligibility rule: automatic and manual assignment both call
-- _ops_rider_ineligible, so they cannot disagree about who may take an order.
--
-- The source is stamped by a trigger, not by editing the assign functions: a
-- change made inside ops_assign_rider / ops_reassign_delivery has an acting
-- manager (deligro.actor_id), an automatic one sets deligro.assign_source, and
-- anything else is a rider taking an offer. Auto-assignment is a system action
-- recorded in delivery_events and assignment_source, not in ops_audit_log; the
-- MODE change is audited.
--
-- Everything here is service role only.
--
-- Rollback:
--   drop function if exists public.ops_dispatch_overview(uuid[], boolean);
--   drop function if exists public.ops_set_zone_dispatch(uuid, uuid, text, int, text, text);
--   drop function if exists public.ops_mark_auto_fallback(uuid);
--   drop function if exists public.ops_auto_assign_delivery(uuid, uuid, int);
--   drop function if exists public.rider_eligible_for_order(uuid, uuid);
--   drop trigger if exists zz_deliveries_assignment_source on public.deliveries;
--   drop function if exists public.stamp_delivery_assignment_source();
--   alter table public.deliveries drop column if exists auto_assign_fell_back_at, drop column if exists assignment_source;
--   alter table public.delivery_zones drop column if exists dispatch_updated_at, drop column if exists dispatch_updated_by,
--     drop column if exists auto_assign_max_load, drop column if exists dispatch_mode;
-- ============================================================

begin;

-- 1 — Zone setting -----------------------------------------------------------------------------------------
alter table public.delivery_zones
  add column if not exists dispatch_mode text not null default 'offer',
  add column if not exists auto_assign_max_load smallint not null default 0,
  add column if not exists dispatch_updated_by uuid references public.profiles (id) on delete set null,
  add column if not exists dispatch_updated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'delivery_zones_dispatch_mode_check') then
    alter table public.delivery_zones
      add constraint delivery_zones_dispatch_mode_check check (dispatch_mode in ('offer', 'auto_assign'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'delivery_zones_auto_assign_max_load_check') then
    alter table public.delivery_zones
      add constraint delivery_zones_auto_assign_max_load_check check (auto_assign_max_load between 0 and 3);
  end if;
end $$;

comment on column public.delivery_zones.dispatch_mode is
  'offer: ready orders are offered to the best rider (default). auto_assign: dispatch assigns the best eligible rider directly, falling back to an offer.';

-- 2 — How each delivery was assigned ---------------------------------------------------------------------
alter table public.deliveries
  add column if not exists assignment_source text,
  add column if not exists auto_assign_fell_back_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'deliveries_assignment_source_check') then
    alter table public.deliveries
      add constraint deliveries_assignment_source_check check (assignment_source in ('rider_accept', 'ops', 'auto'));
  end if;
end $$;

grant select (assignment_source, auto_assign_fell_back_at) on public.deliveries to authenticated;

create or replace function public.stamp_delivery_assignment_source()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Only at the moment a leg becomes `assigned` or changes rider.
  if new.status::text = 'assigned'
     and (tg_op = 'INSERT' or old.status::text is distinct from 'assigned' or old.driver_id is distinct from new.driver_id) then
    new.assignment_source := case
      when nullif(current_setting('deligro.actor_id', true), '') is not null then 'ops'
      when current_setting('deligro.assign_source', true) = 'auto' then 'auto'
      else 'rider_accept'
    end;
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_delivery_assignment_source() from public, anon, authenticated;

drop trigger if exists zz_deliveries_assignment_source on public.deliveries;
create trigger zz_deliveries_assignment_source
  before insert or update on public.deliveries
  for each row execute function public.stamp_delivery_assignment_source();

-- 3 — The one eligibility rule, asked about an order ------------------------------------------------------
create or replace function public.rider_eligible_for_order(p_rider uuid, p_order uuid)
returns text
language sql stable security definer set search_path = public as $$
  select public._ops_rider_ineligible(p_rider, (select o.zone_id from public.orders o where o.id = p_order), null);
$$;

-- 4 — Assign automatically ----------------------------------------------------------------------------------
-- Locks the order, so two dispatch runs for one order take turns; the second
-- finds the delivery already assigned. Returns null on success, else why not.
create or replace function public.ops_auto_assign_delivery(p_order uuid, p_rider uuid, p_max_load int)
returns text
language plpgsql security definer set search_path = public as $$
declare
  o     public.orders%rowtype;
  d     public.deliveries%rowtype;
  mode  text;
  bad   text;
  load  int;
begin
  select * into o from public.orders where id = p_order for update;
  if o.id is null then
    return 'not_found';
  end if;
  if o.status::text in ('delivered', 'cancelled') then
    return 'terminal';
  end if;
  select z.dispatch_mode into mode from public.delivery_zones z where z.id = o.zone_id;
  if mode is distinct from 'auto_assign' then
    return 'mode_off';
  end if;
  select * into d from public.deliveries where order_id = p_order for update;
  if d.id is not null and d.status::text <> 'unassigned' then
    return 'already_assigned';
  end if;
  bad := public.rider_eligible_for_order(p_rider, p_order);
  if bad is not null then
    return bad;
  end if;
  select count(*)::int into load from public.deliveries x
   where x.driver_id = p_rider and x.status::text in ('assigned', 'picked_up');
  if load > greatest(0, coalesce(p_max_load, 0)) then
    return 'over_load';
  end if;

  perform set_config('deligro.assign_source', 'auto', true);
  if d.id is null then
    insert into public.deliveries (order_id, driver_id, status, assigned_at, driver_location_source)
    values (p_order, p_rider, 'assigned', now(), 'none');
  else
    update public.deliveries
       set driver_id = p_rider, status = 'assigned', assigned_at = now(), driver_location_source = 'none'
     where id = d.id;
  end if;
  perform set_config('deligro.assign_source', '', true);
  return null;
end;
$$;

-- Dispatch tried to assign automatically and fell back to an offer.
create or replace function public.ops_mark_auto_fallback(p_order uuid)
returns void
language sql volatile security definer set search_path = public as $$
  update public.deliveries
     set auto_assign_fell_back_at = now()
   where order_id = p_order and auto_assign_fell_back_at is null;
$$;

-- 5 — Changing a zone's mode (audited, zone-checked, replay-safe) -----------------------------------------
create or replace function public.ops_set_zone_dispatch(
  p_actor uuid, p_zone uuid, p_mode text, p_max_load int, p_reason text, p_client_action_id text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  z   public.delivery_zones%rowtype;
  why text := btrim(coalesce(p_reason, ''));
begin
  perform public.ops_require_staff(p_actor, p_zone);
  if public._ops_replayed(p_actor, p_client_action_id) then
    perform public._ops_replay_matches(p_client_action_id, array['zone.dispatch_mode'], p_zone::text);
    return jsonb_build_object('zoneId', p_zone, 'replayed', true);
  end if;
  if p_mode is null or p_mode not in ('offer', 'auto_assign') or p_max_load is null or p_max_load not between 0 and 3 then
    raise exception 'bad_request' using errcode = '22023';
  end if;
  if char_length(why) < 3 or char_length(why) > 300 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  select * into z from public.delivery_zones where id = p_zone for update;
  if z.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  update public.delivery_zones
     set dispatch_mode = p_mode, auto_assign_max_load = p_max_load,
         dispatch_updated_by = p_actor, dispatch_updated_at = now()
   where id = p_zone;

  perform public._ops_log(p_actor, 'zone.dispatch_mode', 'zone', p_zone::text, p_zone, why,
    jsonb_build_object('mode', z.dispatch_mode, 'maxLoad', z.auto_assign_max_load),
    jsonb_build_object('mode', p_mode, 'maxLoad', p_max_load),
    p_client_action_id);
  return jsonb_build_object('zoneId', p_zone, 'replayed', false);
end;
$$;

-- 6 — The dispatch screen ---------------------------------------------------------------------------------------
create or replace function public.ops_dispatch_overview(p_zone_ids uuid[], p_all boolean)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'zoneId', z.id,
    'name', z.name,
    'cityName', c.name,
    'mode', z.dispatch_mode,
    'autoAssignMaxLoad', z.auto_assign_max_load,
    'updatedBy', z.dispatch_updated_by,
    'updatedAt', z.dispatch_updated_at,
    'last24h', jsonb_build_object(
      'auto', (select count(*) from public.deliveries d join public.orders o on o.id = d.order_id
                where o.zone_id = z.id and d.assignment_source = 'auto' and d.assigned_at >= now() - interval '24 hours'),
      'offerAccepted', (select count(*) from public.deliveries d join public.orders o on o.id = d.order_id
                where o.zone_id = z.id and d.assignment_source = 'rider_accept' and d.assigned_at >= now() - interval '24 hours'),
      'ops', (select count(*) from public.deliveries d join public.orders o on o.id = d.order_id
                where o.zone_id = z.id and d.assignment_source = 'ops' and d.assigned_at >= now() - interval '24 hours'),
      'fellBackToOffer', (select count(*) from public.deliveries d join public.orders o on o.id = d.order_id
                where o.zone_id = z.id and d.auto_assign_fell_back_at >= now() - interval '24 hours')
    )
  ) order by c.name, z.name), '[]'::jsonb)
    from public.delivery_zones z
    join public.cities c on c.id = z.city_id
   where z.is_active and (coalesce(p_all, false) or z.id = any(coalesce(p_zone_ids, '{}'::uuid[])));
$$;

-- 7 — Who may call ------------------------------------------------------------------------------------------------
revoke execute on function public.rider_eligible_for_order(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.ops_auto_assign_delivery(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function public.ops_mark_auto_fallback(uuid) from public, anon, authenticated;
revoke execute on function public.ops_set_zone_dispatch(uuid, uuid, text, int, text, text) from public, anon, authenticated;
revoke execute on function public.ops_dispatch_overview(uuid[], boolean) from public, anon, authenticated;
grant execute on function public.rider_eligible_for_order(uuid, uuid) to service_role;
grant execute on function public.ops_auto_assign_delivery(uuid, uuid, int) to service_role;
grant execute on function public.ops_mark_auto_fallback(uuid) to service_role;
grant execute on function public.ops_set_zone_dispatch(uuid, uuid, text, int, text, text) to service_role;
grant execute on function public.ops_dispatch_overview(uuid[], boolean) to service_role;

commit;
