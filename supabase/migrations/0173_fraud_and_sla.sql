-- ============================================================
-- 0173 — Fraud rules, dismissals and the live SLA check (Insights §17.6, §17.9)
-- ------------------------------------------------------------
-- STATUS: PENDING APPROVAL — not applied to any database from this repo.
-- Order: after 0171 (ops_sla_targets), 0166 (ops_alerts), 0142, 0151.
--
-- The database half of "fraud and unusual transaction alerts" and of SLA
-- breach alerts. Nothing here pushes anything: the alert engine (Phase 8) asks
-- for candidates, raises its alerts, and attaches the evidence. These functions
-- only decide WHO looks suspicious and say WHY, in plain words and ids.
--
-- Five rules, each with a default and an optional per-zone override:
--   customer_cancellations  customer-cancelled orders plus COD orders failed as
--                           "customer unreachable" — default ≥ 3 in 7 days
--   code_sharing            one code redeemed by ≥ 2 accounts that share a device
--                           or a drop point, with more redemptions than the code
--                           allows per customer — 30 days
--   refund_rate             approved refunds ÷ delivered orders ≥ 30 % with at
--                           least 3 delivered — 30 days
--   rider_cash_gap          cash collected minus cash handed over > ₹2,000 on days
--                           at least 48 hours old, no open dispute
--   unusual_order_value     an order in the last 24 hours above 3 × the zone's
--                           p95 order value (needs ≥ 50 orders in the window)
--
-- Privacy. Evidence is ids, times and short sentences: never a phone, an address
-- or a device value. The device hash lives only in order_client_meta, which no
-- role can select; only the functions below read it, and ops_fraud_candidates
-- reports "these accounts share one", never the hash.
--
-- A dismissal (ops_dismiss_fraud) resolves the alert as a false positive and
-- silences that subject for 7–90 days — unless its measure reaches twice what it
-- was when dismissed.
--
-- Everything is service role only.
--
-- Rollback:
--   drop function if exists public.ops_fraud_cases(uuid[], boolean, text, text, uuid, timestamptz, uuid, int, text[]);
--   drop function if exists public.ops_set_fraud_rule(uuid, text, uuid, boolean, numeric, int, text);
--   drop function if exists public.ops_dismiss_fraud(uuid, uuid, text, int, text);
--   drop function if exists public.ops_attach_fraud_evidence(text, text, uuid, text, text, text, numeric, numeric, int, jsonb);
--   drop function if exists public.ops_sla_live(timestamptz);
--   drop function if exists public.ops_fraud_candidates(timestamptz);
--   drop function if exists public.ops_prune_order_client_meta();
--   drop function if exists public.record_order_client_meta(uuid, text);
--   drop table if exists public.ops_fraud_alerts, public.ops_fraud_dismissals, public.order_client_meta, public.ops_fraud_rules;
-- ============================================================

begin;

-- 1 — Rules --------------------------------------------------------------------------------------------------
create table if not exists public.ops_fraud_rules (
  id          bigint generated always as identity primary key,
  rule        text not null check (rule in ('customer_cancellations', 'code_sharing', 'refund_rate', 'rider_cash_gap', 'unusual_order_value')),
  zone_id     uuid references public.delivery_zones (id) on delete cascade,
  enabled     boolean not null default true,
  threshold   numeric not null,
  window_days int not null check (window_days between 1 and 90),
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  constraint ops_fraud_rules_rule_zone unique nulls not distinct (rule, zone_id)
);

insert into public.ops_fraud_rules (rule, zone_id, enabled, threshold, window_days) values
  ('customer_cancellations', null, true, 3,    7),
  ('code_sharing',           null, true, 2,    30),
  ('refund_rate',            null, true, 0.30, 30),
  ('rider_cash_gap',         null, true, 2000, 2),
  ('unusual_order_value',    null, true, 3,    30)
on conflict (rule, zone_id) do nothing;

alter table public.ops_fraud_rules enable row level security;
drop policy if exists "ops_fraud_rules — staff read" on public.ops_fraud_rules;
create policy "ops_fraud_rules — staff read" on public.ops_fraud_rules for select
  using (public.is_admin() or public.is_manager());
revoke all on public.ops_fraud_rules from anon, authenticated;
grant select on public.ops_fraud_rules to authenticated;
revoke insert, update, delete, truncate on public.ops_fraud_rules from service_role;
grant select on public.ops_fraud_rules to service_role;

-- 2 — Dismissals and the evidence behind each alert ----------------------------------------------------------
create table if not exists public.ops_fraud_dismissals (
  id                   bigint generated always as identity primary key,
  rule                 text not null,
  subject_key          text not null,
  zone_id              uuid,
  measure_at_dismissal numeric not null,
  until                timestamptz not null,
  alert_id             uuid references public.ops_alerts (id) on delete set null,
  dismissed_by         uuid references public.profiles (id) on delete set null,
  reason               text not null,
  created_at           timestamptz not null default now()
);
create index if not exists ops_fraud_dismissals_lookup_idx on public.ops_fraud_dismissals (rule, subject_key, until);
create index if not exists ops_fraud_dismissals_alert_idx on public.ops_fraud_dismissals (alert_id);

-- One row per fraud alert: what it is about and the evidence, attached by the
-- engine after it raises the alert (ops_alerts has no room for it).
create table if not exists public.ops_fraud_alerts (
  alert_id      uuid primary key references public.ops_alerts (id) on delete cascade,
  rule          text not null,
  subject_type  text not null,
  subject_id    text not null,
  subject_label text,
  measure       numeric not null,
  threshold     numeric not null,
  window_days   int not null,
  evidence      jsonb not null default '[]'::jsonb,
  updated_at    timestamptz not null default now()
);

alter table public.ops_fraud_dismissals enable row level security;
alter table public.ops_fraud_alerts     enable row level security;
revoke all on public.ops_fraud_dismissals, public.ops_fraud_alerts from anon, authenticated;
revoke insert, update, delete, truncate on public.ops_fraud_dismissals, public.ops_fraud_alerts from service_role;
grant select on public.ops_fraud_dismissals, public.ops_fraud_alerts to service_role;

-- 3 — The hashed device, per order ---------------------------------------------------------------------------
-- sha256(install id || server pepper), computed by the order route. No role
-- selects this table; the functions below are the only readers.
create table if not exists public.order_client_meta (
  order_id    uuid primary key references public.orders (id) on delete cascade,
  device_hash text,
  created_at  timestamptz not null default now()
);
create index if not exists order_client_meta_created_idx on public.order_client_meta (created_at);
create index if not exists order_client_meta_hash_idx on public.order_client_meta (device_hash) where device_hash is not null;
alter table public.order_client_meta enable row level security;
revoke all on public.order_client_meta from anon, authenticated, service_role;

create or replace function public.record_order_client_meta(p_order uuid, p_device_hash text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_device_hash is null or p_device_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'bad_request' using errcode = '22023';
  end if;
  insert into public.order_client_meta (order_id, device_hash) values (p_order, p_device_hash)
  on conflict (order_id) do nothing;
end;
$$;

create or replace function public.ops_prune_order_client_meta()
returns int
language sql volatile security definer set search_path = public as $$
  with gone as (delete from public.order_client_meta where created_at < now() - interval '180 days' returning 1)
  select count(*)::int from gone;
$$;

-- 4 — Switch the two alert kinds on (the engine evaluates them from Phase 9) --------------------------------------
update public.ops_alert_rules set enabled = true where kind in ('fraud_suspected', 'sla_breach') and zone_id is null;
update public.ops_alert_rules set threshold = 25 where kind = 'sla_breach' and zone_id is null and threshold is null;

-- 5 — The candidates ------------------------------------------------------------------------------------------
-- A jsonb array of { rule, zoneId, subjectType, subjectId, measure, threshold,
-- windowDays, evidence[] }, evidence at most 20 rows. A subject dismissed and
-- still inside its dismissal is left out unless its measure has doubled.
create or replace function public.ops_fraud_candidates(p_now timestamptz)
returns jsonb
language sql stable security definer set search_path = public as $$
  with eff as (
    select z.id as zone_id, d.rule,
           coalesce(zr.enabled, d.enabled)         as enabled,
           coalesce(zr.threshold, d.threshold)     as threshold,
           coalesce(zr.window_days, d.window_days) as window_days
      from public.delivery_zones z
      cross join (select * from public.ops_fraud_rules where zone_id is null) d
      left join public.ops_fraud_rules zr on zr.rule = d.rule and zr.zone_id = z.id
     where z.is_active
  ),
  -- 1 — customers who keep cancelling or being unreachable
  canc as (
    select o.zone_id, o.customer_id, o.id as order_id, o.created_at, o.total, e.threshold, e.window_days,
           (o.status::text = 'cancelled' and o.cancelled_by = 'customer') as by_customer
      from public.orders o
      join eff e on e.zone_id = o.zone_id and e.rule = 'customer_cancellations' and e.enabled
     where o.customer_id is not null and o.zone_id is not null
       and o.created_at >= p_now - make_interval(days => e.window_days) and o.created_at <= p_now
       and ((o.status::text = 'cancelled' and o.cancelled_by = 'customer')
            or (o.payment_method::text = 'cod'
                and exists (select 1 from public.delivery_exceptions x
                             where x.order_id = o.id and x.kind = 'customer_unreachable' and x.status = 'approved')))
  ),
  c1 as (
    select zone_id, 'customer_cancellations'::text as rule, 'customer'::text as stype, customer_id::text as sid,
           count(*)::numeric as measure, max(threshold) as threshold, max(window_days) as wd,
           to_jsonb((array_agg(jsonb_build_object('kind', 'order', 'id', order_id, 'at', created_at,
             'text', case when by_customer then 'Cancelled by customer · ₹' else 'Customer unreachable at delivery · ₹' end || total::text)
             order by created_at desc))[1:20]) as ev
      from canc
     group by zone_id, customer_id
    having count(*) >= max(threshold)
  ),
  -- 2 — one code, several accounts, one device or one drop point
  red as (
    select cr.code, cr.customer_id, cr.order_id, cr.created_at, cr.discount, o.zone_id, e.threshold, e.window_days,
           m.device_hash,
           case when (o.address ->> 'lat') ~ '^-?[0-9]+(\.[0-9]+)?$' and (o.address ->> 'lng') ~ '^-?[0-9]+(\.[0-9]+)?$'
                then round((o.address ->> 'lat')::numeric, 4)::text || ',' || round((o.address ->> 'lng')::numeric, 4)::text end as spot,
           coalesce(cp.max_per_customer, 1) as max_per
      from public.coupon_redemptions cr
      join public.orders o on o.id = cr.order_id
      join eff e on e.zone_id = o.zone_id and e.rule = 'code_sharing' and e.enabled
      left join public.order_client_meta m on m.order_id = o.id
      left join public.coupons cp on cp.code = cr.code
     where o.zone_id is not null
       and cr.created_at >= p_now - make_interval(days => e.window_days) and cr.created_at <= p_now
  ),
  grp as (
    select code, zone_id, threshold, window_days, max_per,
           count(distinct customer_id) as accounts, count(*) as redemptions,
           to_jsonb((array_agg(jsonb_build_object('kind', 'redemption', 'id', order_id, 'at', created_at,
             'text', 'Account ending ' || right(customer_id::text, 4) || ' redeemed ' || code || ' · ₹' || discount::text || ' off')
             order by created_at desc))[1:20]) as ev
      from red where device_hash is not null
     group by code, zone_id, device_hash, threshold, window_days, max_per
    union all
    select code, zone_id, threshold, window_days, max_per,
           count(distinct customer_id), count(*),
           to_jsonb((array_agg(jsonb_build_object('kind', 'redemption', 'id', order_id, 'at', created_at,
             'text', 'Account ending ' || right(customer_id::text, 4) || ' redeemed ' || code || ' · ₹' || discount::text || ' off')
             order by created_at desc))[1:20])
      from red where spot is not null
     group by code, zone_id, spot, threshold, window_days, max_per
  ),
  c2 as (
    select distinct on (code, zone_id)
           zone_id, 'code_sharing'::text as rule, 'code'::text as stype, code as sid,
           accounts::numeric as measure, threshold, window_days as wd, ev
      from grp
     where accounts >= threshold and redemptions > max_per
     order by code, zone_id, accounts desc
  ),
  -- 3 — customers whose delivered orders keep being refunded
  rd as (
    select o.zone_id, o.customer_id, e.threshold, e.window_days,
           count(distinct o.id) as delivered,
           count(distinct r.id) filter (where r.status::text = 'approved') as refunds,
           to_jsonb((array_agg(jsonb_build_object('kind', 'refund', 'id', r.id, 'at', r.created_at,
             'text', 'Refund approved · ₹' || r.amount::text) order by r.created_at desc)
             filter (where r.status::text = 'approved'))[1:20]) as ev
      from public.orders o
      join eff e on e.zone_id = o.zone_id and e.rule = 'refund_rate' and e.enabled
      left join public.refunds r on r.order_id = o.id
     where o.customer_id is not null and o.zone_id is not null and o.status::text = 'delivered'
       and o.created_at >= p_now - make_interval(days => e.window_days) and o.created_at <= p_now
     group by o.zone_id, o.customer_id, e.threshold, e.window_days
  ),
  c3 as (
    select zone_id, 'refund_rate'::text as rule, 'customer'::text as stype, customer_id::text as sid,
           refunds::numeric / delivered as measure, threshold, window_days as wd, coalesce(ev, '[]'::jsonb) as ev
      from rd
     where delivered >= 3 and refunds::numeric / delivered >= threshold
  ),
  -- 4 — riders holding cash they should have handed over
  cd as (
    select o.zone_id, d.driver_id, (d.cod_collected_at at time zone 'Asia/Kolkata')::date as day,
           sum(coalesce(d.cod_collected_amount, 0)) as collected, e.threshold, e.window_days
      from public.deliveries d
      join public.orders o on o.id = d.order_id
      join eff e on e.zone_id = o.zone_id and e.rule = 'rider_cash_gap' and e.enabled
     where d.cod_collected_at is not null and d.driver_id is not null and o.zone_id is not null
       and d.cod_collected_at >= p_now - interval '60 days'
       and (((d.cod_collected_at at time zone 'Asia/Kolkata')::date + 1)::timestamp at time zone 'Asia/Kolkata')
             <= p_now - make_interval(days => e.window_days)
     group by o.zone_id, d.driver_id, (d.cod_collected_at at time zone 'Asia/Kolkata')::date, e.threshold, e.window_days
  ),
  hd as (
    select h.zone_id, h.from_user as driver_id, h.handover_date as day, sum(h.amount) as handed
      from public.cod_handovers h
     where h.leg::text = 'rider_to_manager' and h.from_user is not null
     group by h.zone_id, h.from_user, h.handover_date
  ),
  gap as (
    select cd.zone_id, cd.driver_id, cd.day, cd.collected, coalesce(hd.handed, 0) as handed,
           cd.collected - coalesce(hd.handed, 0) as gap, cd.threshold, cd.window_days
      from cd
      left join hd on hd.driver_id = cd.driver_id and hd.day = cd.day and hd.zone_id = cd.zone_id
     where cd.collected - coalesce(hd.handed, 0) > 0
       and not exists (select 1 from public.cash_disputes x where x.driver_id = cd.driver_id and x.day = cd.day and x.status = 'open')
       and not exists (select 1 from public.cash_deposits x where x.driver_id = cd.driver_id and x.status = 'disputed'
                        and (x.created_at at time zone 'Asia/Kolkata')::date = cd.day)
  ),
  c4 as (
    select zone_id, 'rider_cash_gap'::text as rule, 'rider'::text as stype, driver_id::text as sid,
           sum(gap) as measure, max(threshold) as threshold, max(window_days) as wd,
           to_jsonb((array_agg(jsonb_build_object('kind', 'cash_day', 'id', driver_id::text || ':' || day::text, 'at', day,
             'text', '₹' || to_char(collected, 'FM999,999,999') || ' collected on ' || to_char(day, 'DD Mon')
                     || ', ₹' || to_char(handed, 'FM999,999,999') || ' handed over') order by day desc))[1:20]) as ev
      from gap
     group by zone_id, driver_id
    having sum(gap) > max(threshold)
  ),
  -- 5 — an order far above what this zone normally sees
  zp as (
    select o.zone_id, percentile_cont(0.95) within group (order by o.total) as p95, count(*) as n, e.threshold, e.window_days
      from public.orders o
      join eff e on e.zone_id = o.zone_id and e.rule = 'unusual_order_value' and e.enabled
     where o.zone_id is not null and o.status::text <> 'cancelled'
       and o.created_at >= p_now - make_interval(days => e.window_days) and o.created_at <= p_now
       and public.ops_counts_as_order(o.payment_method::text, o.payment_status::text)
     group by o.zone_id, e.threshold, e.window_days
    having count(*) >= 50
  ),
  c5 as (
    select o.zone_id, 'unusual_order_value'::text as rule, 'order'::text as stype, o.id::text as sid,
           (o.total / zp.p95)::numeric as measure, zp.threshold, zp.window_days as wd,
           jsonb_build_array(jsonb_build_object('kind', 'order', 'id', o.id, 'at', o.created_at,
             'text', 'Order of ₹' || to_char(o.total, 'FM999,999,999') || ' against a typical top order of ₹'
                     || to_char(round(zp.p95), 'FM999,999,999'))) as ev
      from public.orders o
      join zp on zp.zone_id = o.zone_id
     where o.status::text <> 'cancelled'
       and o.created_at >= p_now - interval '24 hours' and o.created_at <= p_now
       and public.ops_counts_as_order(o.payment_method::text, o.payment_status::text)
       and zp.p95 > 0 and o.total > zp.threshold * zp.p95
  ),
  allc as (
    select * from c1 union all select * from c2 union all select * from c3
    union all select * from c4 union all select * from c5
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'rule', a.rule, 'zoneId', a.zone_id, 'subjectType', a.stype, 'subjectId', a.sid,
           'measure', a.measure, 'threshold', a.threshold, 'windowDays', a.wd,
           'evidence', coalesce(a.ev, '[]'::jsonb)
         ) order by a.rule, a.sid), '[]'::jsonb)
    from allc a
   where not exists (
     select 1 from public.ops_fraud_dismissals dm
      where dm.rule = a.rule and dm.subject_key = a.stype || ':' || a.sid
        and dm.until > p_now and a.measure < 2 * dm.measure_at_dismissal);
$$;

-- 6 — The live SLA check ---------------------------------------------------------------------------------------
-- Per zone and stage over the trailing hour: stages that ENDED in the last
-- 60 minutes, plus stages still running that are already past their target (a
-- breach is a breach before the order finishes). A stage that is running and
-- not yet over its target is not counted.
create or replace function public.ops_sla_live(p_now timestamptz)
returns jsonb
language sql stable security definer set search_path = public as $$
  with dflt as (
    select t.accept_minutes as a, t.prep_minutes as p, t.pickup_minutes as k, t.deliver_minutes as d
      from public.ops_sla_targets t where t.zone_id is null limit 1
  ), base as (
    select o.id, o.zone_id, o.status::text as status, o.created_at, o.accepted_at, o.ready_at,
           dl.picked_up_at, dl.delivered_at,
           coalesce(t.accept_minutes, df.a) as t_accept, coalesce(o.prep_minutes, t.prep_minutes, df.p) as t_prep,
           coalesce(t.pickup_minutes, df.k) as t_pickup, coalesce(t.deliver_minutes, df.d) as t_deliver
      from public.orders o
      left join public.deliveries dl on dl.order_id = o.id
      left join public.ops_sla_targets t on t.zone_id = o.zone_id
      cross join dflt df
     where o.zone_id is not null and o.status::text <> 'cancelled'
       and o.created_at >= p_now - interval '24 hours' and o.created_at <= p_now
       and public.ops_counts_as_order(o.payment_method::text, o.payment_status::text)
  ), s as (
    select zone_id, 'accept'::text as stage, extract(epoch from (accepted_at - created_at)) / 60.0 as minutes, t_accept::numeric as target
      from base where accepted_at is not null and accepted_at >= created_at and accepted_at > p_now - interval '60 minutes' and accepted_at <= p_now
    union all
    select zone_id, 'accept', extract(epoch from (p_now - created_at)) / 60.0, t_accept::numeric
      from base where accepted_at is null and status = 'placed' and extract(epoch from (p_now - created_at)) / 60.0 > t_accept
    union all
    select zone_id, 'prep', extract(epoch from (ready_at - accepted_at)) / 60.0, t_prep::numeric
      from base where ready_at is not null and accepted_at is not null and ready_at >= accepted_at and ready_at > p_now - interval '60 minutes' and ready_at <= p_now
    union all
    select zone_id, 'prep', extract(epoch from (p_now - accepted_at)) / 60.0, t_prep::numeric
      from base where accepted_at is not null and ready_at is null and status = 'kitchen' and extract(epoch from (p_now - accepted_at)) / 60.0 > t_prep
    union all
    select zone_id, 'pickup', extract(epoch from (picked_up_at - ready_at)) / 60.0, t_pickup::numeric
      from base where picked_up_at is not null and ready_at is not null and picked_up_at >= ready_at and picked_up_at > p_now - interval '60 minutes' and picked_up_at <= p_now
    union all
    select zone_id, 'pickup', extract(epoch from (p_now - ready_at)) / 60.0, t_pickup::numeric
      from base where ready_at is not null and picked_up_at is null and status <> 'delivered' and extract(epoch from (p_now - ready_at)) / 60.0 > t_pickup
    union all
    select zone_id, 'deliver', extract(epoch from (delivered_at - created_at)) / 60.0, t_deliver::numeric
      from base where delivered_at is not null and delivered_at >= created_at and delivered_at > p_now - interval '60 minutes' and delivered_at <= p_now
    union all
    select zone_id, 'deliver', extract(epoch from (p_now - created_at)) / 60.0, t_deliver::numeric
      from base where delivered_at is null and status <> 'delivered' and extract(epoch from (p_now - created_at)) / 60.0 > t_deliver
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'zoneId', zone_id, 'stage', stage, 'orders', n, 'breaches', b,
           'rate', case when n > 0 then round(b::numeric / n, 4) else 0 end
         ) order by zone_id, stage), '[]'::jsonb)
    from (select zone_id, stage, count(*) as n, count(*) filter (where minutes > target) as b from s group by zone_id, stage) q;
$$;

-- 7 — Evidence the engine attaches to an alert it raised ---------------------------------------------------------
create or replace function public.ops_attach_fraud_evidence(
  p_dedupe_key text, p_rule text, p_zone uuid, p_subject_type text, p_subject_id text, p_label text,
  p_measure numeric, p_threshold numeric, p_window_days int, p_evidence jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_alert uuid;
begin
  if p_rule not in ('customer_cancellations', 'code_sharing', 'refund_rate', 'rider_cash_gap', 'unusual_order_value') then
    raise exception 'bad_request' using errcode = '22023';
  end if;
  select a.id into v_alert from public.ops_alerts a where a.dedupe_key = p_dedupe_key;
  if v_alert is null then
    return;
  end if;
  insert into public.ops_fraud_alerts (alert_id, rule, subject_type, subject_id, subject_label, measure, threshold, window_days, evidence)
  values (v_alert, p_rule, p_subject_type, p_subject_id, left(p_label, 120), p_measure, p_threshold, p_window_days,
          case when jsonb_typeof(p_evidence) = 'array' then p_evidence else '[]'::jsonb end)
  on conflict (alert_id) do update
     set subject_label = excluded.subject_label, measure = excluded.measure, threshold = excluded.threshold,
         window_days = excluded.window_days, evidence = excluded.evidence, updated_at = now();
end;
$$;

-- 8 — Dismiss a case as a false positive (audited, zone-checked, replay-safe) ---------------------------------
create or replace function public.ops_dismiss_fraud(
  p_actor uuid, p_alert uuid, p_reason text, p_days int, p_client_action_id text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a   record;
  fa  record;
  why text := btrim(coalesce(p_reason, ''));
begin
  select * into a from public.ops_alerts where id = p_alert for update;
  if a.id is null or a.kind <> 'fraud_suspected' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.ops_require_staff(p_actor, a.zone_id);
  if public._ops_replayed(p_actor, p_client_action_id) then
    perform public._ops_replay_matches(p_client_action_id, array['fraud.dismiss'], p_alert::text);
    return jsonb_build_object('id', p_alert, 'replayed', true);
  end if;
  if a.status = 'resolved' then
    raise exception 'already_resolved' using errcode = '22023';
  end if;
  if char_length(why) < 3 or char_length(why) > 300 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  if p_days is null or p_days not between 7 and 90 then
    raise exception 'bad_request' using errcode = '22023';
  end if;
  select * into fa from public.ops_fraud_alerts where alert_id = p_alert;
  if fa.alert_id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  update public.ops_alerts
     set status = 'resolved', resolved_by = p_actor, resolved_at = now(), resolution = 'false positive: ' || why
   where id = p_alert;
  insert into public.ops_alert_events (alert_id, event, actor_id, note)
  values (p_alert, 'resolved', p_actor, 'false positive: ' || why);
  insert into public.ops_fraud_dismissals (rule, subject_key, zone_id, measure_at_dismissal, until, alert_id, dismissed_by, reason)
  values (fa.rule, fa.subject_type || ':' || fa.subject_id, a.zone_id, fa.measure, now() + make_interval(days => p_days), p_alert, p_actor, why);

  perform public._ops_log(p_actor, 'fraud.dismiss', 'alert', p_alert::text, a.zone_id, why,
    jsonb_build_object('status', a.status, 'rule', fa.rule, 'measure', fa.measure),
    jsonb_build_object('status', 'resolved', 'falsePositive', true, 'days', p_days),
    p_client_action_id);
  return jsonb_build_object('id', p_alert, 'replayed', false);
end;
$$;

-- 9 — Edit a rule (audited, zone-checked, replay-safe) ----------------------------------------------------------
-- No reason is asked for: a rule edit is a setting, not an intervention. The
-- audit row says "Rule changed" and carries the before and after.
create or replace function public.ops_set_fraud_rule(
  p_actor uuid, p_rule text, p_zone uuid, p_enabled boolean, p_threshold numeric, p_window_days int, p_client_action_id text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  role_name text;
  lo        numeric;
  hi        numeric;
  prior     record;
  entity    constant text := p_rule || ':' || coalesce(p_zone::text, 'default');
begin
  if p_rule is null or p_rule not in ('customer_cancellations', 'code_sharing', 'refund_rate', 'rider_cash_gap', 'unusual_order_value') then
    raise exception 'bad_request' using errcode = '22023';
  end if;
  if p_zone is null then
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
    perform public._ops_replay_matches(p_client_action_id, array['fraud_rule.set'], entity);
    return jsonb_build_object('rule', p_rule, 'zoneId', p_zone, 'replayed', true);
  end if;
  select case p_rule when 'customer_cancellations' then 1 when 'code_sharing' then 2 when 'refund_rate' then 0.05
                     when 'rider_cash_gap' then 100 else 1.5 end,
         case p_rule when 'customer_cancellations' then 50 when 'code_sharing' then 50 when 'refund_rate' then 1
                     when 'rider_cash_gap' then 100000 else 20 end
    into lo, hi;
  if p_enabled is null or p_threshold is null or p_threshold < lo or p_threshold > hi
     or p_window_days is null or p_window_days not between 1 and 90 then
    raise exception 'bad_request' using errcode = '22023';
  end if;

  select r.enabled, r.threshold, r.window_days into prior
    from public.ops_fraud_rules r
   where r.rule = p_rule and (r.zone_id = p_zone or r.zone_id is null)
   order by (r.zone_id is null) limit 1;

  insert into public.ops_fraud_rules (rule, zone_id, enabled, threshold, window_days, updated_by, updated_at)
  values (p_rule, p_zone, p_enabled, p_threshold, p_window_days, p_actor, now())
  on conflict (rule, zone_id) do update
     set enabled = excluded.enabled, threshold = excluded.threshold, window_days = excluded.window_days,
         updated_by = excluded.updated_by, updated_at = now();

  perform public._ops_log(p_actor, 'fraud_rule.set', 'fraud_rule', entity, p_zone, 'Rule changed',
    jsonb_build_object('enabled', prior.enabled, 'threshold', prior.threshold, 'windowDays', prior.window_days),
    jsonb_build_object('enabled', p_enabled, 'threshold', p_threshold, 'windowDays', p_window_days),
    p_client_action_id);
  return jsonb_build_object('rule', p_rule, 'zoneId', p_zone, 'replayed', false);
end;
$$;

-- 10 — The case list ----------------------------------------------------------------------------------------------
-- Fraud alerts joined to their evidence. status: open (open or acknowledged),
-- dismissed (resolved by a dismissal), resolved (resolved by the condition
-- clearing). counts ignore the status/rule/alert/cursor filters but respect
-- scope and the excluded rules (a manager without finance access never sees
-- cash-gap cases, not even in a count).
create or replace function public.ops_fraud_cases(
  p_zone_ids uuid[], p_all boolean, p_status text, p_rule text, p_alert uuid,
  p_cursor_at timestamptz, p_cursor_id uuid, p_limit int, p_exclude_rules text[]
)
returns jsonb
language sql stable security definer set search_path = public as $$
  with base as (
    select a.id, a.severity, a.zone_id, a.opened_at, fa.rule, fa.subject_type, fa.subject_id, fa.subject_label,
           fa.measure, fa.threshold, fa.window_days, fa.evidence,
           dm.dismissed_by, dm.reason as d_reason, dm.until as d_until,
           case when a.status = 'resolved' and dm.id is not null then 'dismissed' else a.status end as case_status
      from public.ops_alerts a
      join public.ops_fraud_alerts fa on fa.alert_id = a.id
      left join lateral (
        select d.* from public.ops_fraud_dismissals d where d.alert_id = a.id order by d.id desc limit 1
      ) dm on true
     where a.kind = 'fraud_suspected'
       and (coalesce(p_all, false) or a.zone_id = any(coalesce(p_zone_ids, '{}'::uuid[])))
       and not (fa.rule = any(coalesce(p_exclude_rules, '{}'::text[])))
  ), filtered as (
    select * from base b
     where (p_alert is null or b.id = p_alert)
       and (p_rule is null or b.rule = p_rule)
       and (p_status is null
            or (p_status = 'open' and b.case_status in ('open', 'acknowledged'))
            or b.case_status = p_status)
       and (p_cursor_at is null or (b.opened_at, b.id) < (p_cursor_at, p_cursor_id))
     order by b.opened_at desc, b.id desc
     limit greatest(1, least(coalesce(p_limit, 20), 100))
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'alertId', f.id, 'rule', f.rule, 'severity', f.severity, 'status', f.case_status,
        'zoneId', f.zone_id, 'openedAt', f.opened_at,
        'subject', jsonb_build_object('type', f.subject_type, 'id', f.subject_id, 'label', f.subject_label),
        'measure', jsonb_build_object(
          'value', f.measure, 'threshold', f.threshold, 'windowDays', f.window_days,
          'unit', case f.rule when 'refund_rate' then 'ratio' when 'rider_cash_gap' then 'rupees'
                              when 'unusual_order_value' then 'multiple' else 'count' end),
        'evidence', f.evidence,
        'dismissal', case when f.d_until is null then null
                          else jsonb_build_object('by', f.dismissed_by, 'reason', f.d_reason, 'until', f.d_until) end
      ) order by f.opened_at desc, f.id desc) from filtered f), '[]'::jsonb),
    'counts', jsonb_build_object(
      'open', (select count(*) from base where case_status in ('open', 'acknowledged')),
      'dismissed', (select count(*) from base where case_status = 'dismissed'),
      'resolved', (select count(*) from base where case_status = 'resolved'))
  );
$$;

-- 11 — Who may call -----------------------------------------------------------------------------------------------
revoke execute on function public.record_order_client_meta(uuid, text) from public, anon, authenticated;
revoke execute on function public.ops_prune_order_client_meta() from public, anon, authenticated;
revoke execute on function public.ops_fraud_candidates(timestamptz) from public, anon, authenticated;
revoke execute on function public.ops_sla_live(timestamptz) from public, anon, authenticated;
revoke execute on function public.ops_attach_fraud_evidence(text, text, uuid, text, text, text, numeric, numeric, int, jsonb) from public, anon, authenticated;
revoke execute on function public.ops_dismiss_fraud(uuid, uuid, text, int, text) from public, anon, authenticated;
revoke execute on function public.ops_set_fraud_rule(uuid, text, uuid, boolean, numeric, int, text) from public, anon, authenticated;
revoke execute on function public.ops_fraud_cases(uuid[], boolean, text, text, uuid, timestamptz, uuid, int, text[]) from public, anon, authenticated;
grant execute on function public.record_order_client_meta(uuid, text) to service_role;
grant execute on function public.ops_prune_order_client_meta() to service_role;
grant execute on function public.ops_fraud_candidates(timestamptz) to service_role;
grant execute on function public.ops_sla_live(timestamptz) to service_role;
grant execute on function public.ops_attach_fraud_evidence(text, text, uuid, text, text, text, numeric, numeric, int, jsonb) to service_role;
grant execute on function public.ops_dismiss_fraud(uuid, uuid, text, int, text) to service_role;
grant execute on function public.ops_set_fraud_rule(uuid, text, uuid, boolean, numeric, int, text) to service_role;
grant execute on function public.ops_fraud_cases(uuid[], boolean, text, text, uuid, timestamptz, uuid, int, text[]) to service_role;

commit;
