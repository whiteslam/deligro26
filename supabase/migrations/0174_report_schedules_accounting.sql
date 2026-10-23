-- ============================================================
-- 0174 — Scheduled reports and the accounting settings (Insights §17.7, §17.10)
-- ------------------------------------------------------------
-- STATUS: PENDING APPROVAL — not applied to any database from this repo.
-- Order: after 0141, 0142, 0151.
--
-- SCHEDULED REPORTS. A manager picks a report, a period preset, a time and the
-- people who should get it. A cron builds the PDF on the server, keeps it in a
-- private bucket for 90 days and tells each recipient — after checking, at send
-- time, that they still may see that report in those zones. The notification
-- carries no file link: the app asks for a five-minute signed link, and that
-- request is checked again.
--
--   report_schedules   what to send, to whom, how often. Owner, recipients and
--                      admins can read a schedule; nobody writes the table
--                      directly - ops_upsert_report_schedule /
--                      ops_delete_report_schedule do, audited, zone-checked
--                      and replay-safe.
--   report_runs        one row per schedule and period (unique), so two crons
--                      overlapping can never send the same period twice.
--   ops-reports        the private bucket the PDFs live in. No policy for anon
--                      or authenticated: only the service role reads or writes.
--
-- ACCOUNTING SETTINGS. One row: the company name and the ledger names the
-- Tally / journal export uses. Admin-only, audited, never readable by a client.
-- (The export's figures come from ops_accounting_lines, added further down.)
--
-- Everything is service role only except the two RLS reads described above.
--
-- Rollback:
--   drop function if exists public.ops_set_accounting_settings(uuid, jsonb, text);
--   drop function if exists public.ops_prune_report_runs(int);
--   drop function if exists public.ops_due_report_schedules(timestamptz, int);
--   drop function if exists public.ops_advance_schedule(uuid, timestamptz);
--   drop function if exists public.ops_finish_report_run(uuid, text, text, int, uuid[], jsonb, text);
--   drop function if exists public.ops_claim_report_run(uuid, date, date);
--   drop function if exists public.ops_delete_report_schedule(uuid, uuid, text);
--   drop function if exists public.ops_upsert_report_schedule(uuid, uuid, jsonb, text);
--   drop table if exists public.accounting_settings, public.report_runs, public.report_schedules;
--   delete from storage.buckets where id = 'ops-reports';   -- after emptying it
-- ============================================================

begin;

-- 1 — Schedules and runs ---------------------------------------------------------------------------------------
create table if not exists public.report_schedules (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 3 and 80),
  kind          text not null check (kind in (
                  'sales', 'orders', 'vendor-performance', 'rider-performance', 'commission', 'vendor-settlement',
                  'rider-payout', 'cancellation', 'refunds-adjustments', 'marketing', 'support-tickets',
                  'cash-reconciliation', 'finance-daily', 'average-order')),
  filters       jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  frequency     text not null check (frequency in ('daily', 'weekly')),
  weekday       smallint check (weekday between 1 and 7),
  hour_ist      smallint not null check (hour_ist between 0 and 23),
  range_preset  text not null check (range_preset in ('yesterday', 'last_7_days', 'last_week', 'month_to_date', 'last_month')),
  zone_ids      uuid[],
  recipient_ids uuid[] not null check (cardinality(recipient_ids) between 1 and 20),
  active        boolean not null default true,
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  next_run_at   timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint report_schedules_weekday_for_weekly check ((frequency = 'weekly') = (weekday is not null))
);
create index if not exists report_schedules_due_idx on public.report_schedules (next_run_at) where active;
create index if not exists report_schedules_owner_idx on public.report_schedules (owner_id);

create table if not exists public.report_runs (
  id                 uuid primary key default gen_random_uuid(),
  schedule_id        uuid not null references public.report_schedules (id) on delete cascade,
  period_from        date not null,
  period_to          date not null,
  status             text not null default 'running' check (status in ('running', 'sent', 'partial', 'too_large', 'failed')),
  file_path          text,
  rows               int,
  recipients_sent    uuid[] not null default '{}',
  recipients_skipped jsonb not null default '[]'::jsonb,
  error              text,
  created_at         timestamptz not null default now(),
  constraint report_runs_one_per_period unique (schedule_id, period_from, period_to)
);
create index if not exists report_runs_schedule_idx on public.report_runs (schedule_id, created_at desc);

alter table public.report_schedules enable row level security;
alter table public.report_runs      enable row level security;

drop policy if exists "report_schedules — owner, recipients, admins" on public.report_schedules;
create policy "report_schedules — owner, recipients, admins" on public.report_schedules for select
  using (public.is_admin() or owner_id = auth.uid() or auth.uid() = any (recipient_ids));

drop policy if exists "report_runs — owner, recipients, admins" on public.report_runs;
create policy "report_runs — owner, recipients, admins" on public.report_runs for select
  using (exists (select 1 from public.report_schedules s
                  where s.id = schedule_id
                    and (public.is_admin() or s.owner_id = auth.uid() or auth.uid() = any (s.recipient_ids))));

revoke all on public.report_schedules, public.report_runs from anon, authenticated;
grant select on public.report_schedules, public.report_runs to authenticated;
revoke insert, update, delete, truncate on public.report_schedules, public.report_runs from service_role;
grant select on public.report_schedules, public.report_runs to service_role;

-- 2 — The private bucket ---------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ops-reports', 'ops-reports', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 3 — Create or change a schedule --------------------------------------------------------------------------------
-- p_fields keys (any subset on update): name, kind, filters, frequency, weekday,
-- hourIst, rangePreset, zoneIds, recipientIds, active, nextRunAt. The caller
-- works out nextRunAt (the next run after now, in IST) and passes it.
create or replace function public.ops_upsert_report_schedule(
  p_actor uuid, p_id uuid, p_fields jsonb, p_client_action_id text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  role_name  text;
  cur        public.report_schedules%rowtype;
  existing   text;
  v_name     text;
  v_kind     text;
  v_filters  jsonb;
  v_freq     text;
  v_weekday  smallint;
  v_hour     smallint;
  v_preset   text;
  v_zones    uuid[];
  v_recips   uuid[];
  v_active   boolean;
  v_next     timestamptz;
  z          uuid;
  new_id     uuid;
  act        text;
begin
  if coalesce(auth.jwt() ->> 'role', '') not in ('service_role', 'supabase_admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select p.role::text into role_name from public.profiles p where p.id = p_actor;
  if role_name is null or role_name not in ('admin', 'manager') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if public._ops_replayed(p_actor, p_client_action_id) then
    select a.entity_id into existing from public.ops_audit_log a
     where a.client_action_id = p_client_action_id and a.actor_id = p_actor and a.action like 'report_schedule.%' limit 1;
    if existing is null then
      raise exception 'client_action_id_conflict' using errcode = '23505';
    end if;
    return jsonb_build_object('id', existing, 'replayed', true);
  end if;

  if p_fields is null or jsonb_typeof(p_fields) <> 'object' then
    raise exception 'bad_request' using errcode = '22023';
  end if;

  if p_id is not null then
    select * into cur from public.report_schedules where id = p_id for update;
    if cur.id is null then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    if cur.owner_id <> p_actor and role_name <> 'admin' then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  -- Each field: the given value, else the current one (an update), else required.
  v_name   := coalesce(p_fields ->> 'name', cur.name);
  v_kind   := coalesce(p_fields ->> 'kind', cur.kind);
  v_freq   := coalesce(p_fields ->> 'frequency', cur.frequency);
  v_preset := coalesce(p_fields ->> 'rangePreset', cur.range_preset);
  v_active := coalesce((p_fields ->> 'active')::boolean, cur.active, true);
  v_hour   := coalesce((p_fields ->> 'hourIst')::smallint, cur.hour_ist);
  v_next   := coalesce((p_fields ->> 'nextRunAt')::timestamptz, cur.next_run_at);
  v_filters := case when p_fields ? 'filters' then p_fields -> 'filters' else coalesce(cur.filters, '{}'::jsonb) end;
  v_weekday := case when v_freq = 'weekly' then coalesce((p_fields ->> 'weekday')::smallint, cur.weekday) else null end;

  if v_name is null or char_length(v_name) not between 3 and 80
     or v_kind is null or v_freq is null or v_hour is null or v_preset is null or v_next is null
     or jsonb_typeof(v_filters) <> 'object' then
    raise exception 'bad_request' using errcode = '22023';
  end if;

  if p_fields ? 'zoneIds' then
    v_zones := case when jsonb_typeof(p_fields -> 'zoneIds') = 'null' then null
                    else array(select (jsonb_array_elements_text(p_fields -> 'zoneIds'))::uuid) end;
  else
    v_zones := cur.zone_ids;
  end if;
  if p_fields ? 'recipientIds' then
    v_recips := array(select (jsonb_array_elements_text(p_fields -> 'recipientIds'))::uuid);
  else
    v_recips := cur.recipient_ids;
  end if;
  if v_recips is null or cardinality(v_recips) not between 1 and 20 then
    raise exception 'bad_request' using errcode = '22023';
  end if;

  -- Zones: they must exist, and a manager may only name zones they work.
  if v_zones is not null then
    foreach z in array v_zones loop
      if not exists (select 1 from public.delivery_zones dz where dz.id = z) then
        raise exception 'bad_request' using errcode = '22023';
      end if;
      if role_name <> 'admin' and not exists (select 1 from public.staff_zones sz where sz.user_id = p_actor and sz.zone_id = z) then
        raise exception 'forbidden' using errcode = '42501';
      end if;
    end loop;
  end if;

  -- Recipients are staff.
  if exists (
    select 1 from unnest(v_recips) r
     where not exists (select 1 from public.profiles p where p.id = r and p.role::text in ('admin', 'manager'))
  ) then
    raise exception 'bad_request' using errcode = '22023';
  end if;

  begin
    if p_id is null then
      insert into public.report_schedules (name, kind, filters, frequency, weekday, hour_ist, range_preset, zone_ids,
                                           recipient_ids, active, owner_id, next_run_at)
      values (v_name, v_kind, v_filters, v_freq, v_weekday, v_hour, v_preset, v_zones, v_recips, v_active, p_actor, v_next)
      returning id into new_id;
      act := 'report_schedule.create';
    else
      update public.report_schedules
         set name = v_name, kind = v_kind, filters = v_filters, frequency = v_freq, weekday = v_weekday, hour_ist = v_hour,
             range_preset = v_preset, zone_ids = v_zones, recipient_ids = v_recips, active = v_active,
             next_run_at = v_next, updated_at = now()
       where id = p_id;
      new_id := p_id;
      act := 'report_schedule.update';
    end if;
  exception when check_violation or invalid_text_representation or invalid_datetime_format or numeric_value_out_of_range then
    raise exception 'bad_request' using errcode = '22023';
  end;

  perform public._ops_log(p_actor, act, 'report_schedule', new_id::text, case when cardinality(v_zones) = 1 then v_zones[1] end, null,
    case when p_id is null then null else jsonb_build_object('name', cur.name, 'kind', cur.kind, 'frequency', cur.frequency,
      'hourIst', cur.hour_ist, 'active', cur.active, 'recipients', cardinality(cur.recipient_ids)) end,
    jsonb_build_object('name', v_name, 'kind', v_kind, 'frequency', v_freq, 'hourIst', v_hour, 'rangePreset', v_preset,
      'active', v_active, 'recipients', cardinality(v_recips), 'zones', coalesce(cardinality(v_zones), 0)),
    p_client_action_id);
  return jsonb_build_object('id', new_id, 'replayed', false);
end;
$$;

create or replace function public.ops_delete_report_schedule(p_actor uuid, p_id uuid, p_client_action_id text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  role_name text;
  cur       public.report_schedules%rowtype;
begin
  if coalesce(auth.jwt() ->> 'role', '') not in ('service_role', 'supabase_admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select p.role::text into role_name from public.profiles p where p.id = p_actor;
  if role_name is null or role_name not in ('admin', 'manager') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if public._ops_replayed(p_actor, p_client_action_id) then
    perform public._ops_replay_matches(p_client_action_id, array['report_schedule.delete'], p_id::text);
    return jsonb_build_object('id', p_id, 'replayed', true);
  end if;
  select * into cur from public.report_schedules where id = p_id for update;
  if cur.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if cur.owner_id <> p_actor and role_name <> 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.report_schedules where id = p_id;
  perform public._ops_log(p_actor, 'report_schedule.delete', 'report_schedule', p_id::text, null, null,
    jsonb_build_object('name', cur.name, 'kind', cur.kind, 'frequency', cur.frequency, 'active', cur.active), null,
    p_client_action_id);
  return jsonb_build_object('id', p_id, 'replayed', false);
end;
$$;

-- 4 — The runner's functions (no actor: the cron is the system) ---------------------------------------------------
create or replace function public.ops_claim_report_run(p_schedule uuid, p_from date, p_to date)
returns uuid
language sql volatile security definer set search_path = public as $$
  insert into public.report_runs (schedule_id, period_from, period_to)
  values (p_schedule, p_from, p_to)
  on conflict (schedule_id, period_from, period_to) do nothing
  returning id;
$$;

create or replace function public.ops_finish_report_run(
  p_run uuid, p_status text, p_file_path text, p_rows int, p_sent uuid[], p_skipped jsonb, p_error text
)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if p_status is null or p_status not in ('running', 'sent', 'partial', 'too_large', 'failed') then
    raise exception 'bad_request' using errcode = '22023';
  end if;
  update public.report_runs
     set status = p_status, file_path = p_file_path, rows = p_rows,
         recipients_sent = coalesce(p_sent, '{}'::uuid[]), recipients_skipped = coalesce(p_skipped, '[]'::jsonb),
         error = left(p_error, 300)
   where id = p_run;
end;
$$;

create or replace function public.ops_advance_schedule(p_schedule uuid, p_next timestamptz)
returns void
language sql volatile security definer set search_path = public as $$
  update public.report_schedules set next_run_at = p_next, updated_at = now() where id = p_schedule;
$$;

create or replace function public.ops_due_report_schedules(p_now timestamptz, p_limit int)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(s) order by s.next_run_at), '[]'::jsonb)
    from (select * from public.report_schedules
           where active and next_run_at <= p_now
           order by next_run_at
           limit greatest(0, least(coalesce(p_limit, 10), 50))) s;
$$;

-- Releases the files of runs older than p_days and hands back their paths so
-- the caller can delete the objects. The run rows stay (download answers "gone").
create or replace function public.ops_prune_report_runs(p_days int)
returns jsonb
language sql volatile security definer set search_path = public as $$
  with gone as (
    update public.report_runs r set file_path = null
     where r.file_path is not null and r.created_at < now() - make_interval(days => greatest(1, coalesce(p_days, 90)))
    returning (select r2.file_path from public.report_runs r2 where r2.id = r.id) as old
  )
  select coalesce(jsonb_agg(old), '[]'::jsonb) from gone;
$$;

-- 5 — Accounting settings ---------------------------------------------------------------------------------------------
create table if not exists public.accounting_settings (
  id                     boolean primary key default true check (id),
  company_name           text not null default 'Deligro',
  ledger_cod             text not null default 'Customer Collections - COD',
  ledger_online          text not null default 'Customer Collections - Online',
  ledger_discount        text not null default 'Discount Expense',
  ledger_vendor_payable  text not null default 'Vendor Payable',
  ledger_delivery_income text not null default 'Delivery Fee Income',
  ledger_gst_payable     text not null default 'GST Payable',
  ledger_rider_tips      text not null default 'Rider Tips Payable',
  ledger_commission      text not null default 'Commission Income',
  ledger_commission_gst  text not null default 'Output GST on Commission',
  ledger_other_income    text not null default 'Other Charges Income',
  ledger_refunds         text not null default 'Customer Refunds',
  ledger_bank            text not null default 'Bank',
  ledger_rider_salary    text not null default 'Rider Salary',
  parent_groups          jsonb not null default '{}'::jsonb check (jsonb_typeof(parent_groups) = 'object'),
  updated_by             uuid references public.profiles (id) on delete set null,
  updated_at             timestamptz not null default now()
);
insert into public.accounting_settings (id) values (true) on conflict (id) do nothing;
alter table public.accounting_settings enable row level security;
revoke all on public.accounting_settings from anon, authenticated;
revoke insert, update, delete, truncate on public.accounting_settings from service_role;
grant select on public.accounting_settings to service_role;

-- Admin-only. Keys are the column names; every value is a name of 1–80
-- printable characters. Unknown keys are refused rather than ignored.
create or replace function public.ops_set_accounting_settings(p_actor uuid, p_fields jsonb, p_client_action_id text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  role_name text;
  k         text;
  v         text;
  cur       public.accounting_settings%rowtype;
  before    jsonb := '{}'::jsonb;
  after     jsonb := '{}'::jsonb;
  allowed   constant text[] := array['company_name', 'ledger_cod', 'ledger_online', 'ledger_discount', 'ledger_vendor_payable',
    'ledger_delivery_income', 'ledger_gst_payable', 'ledger_rider_tips', 'ledger_commission', 'ledger_commission_gst',
    'ledger_other_income', 'ledger_refunds', 'ledger_bank', 'ledger_rider_salary'];
begin
  if coalesce(auth.jwt() ->> 'role', '') not in ('service_role', 'supabase_admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select p.role::text into role_name from public.profiles p where p.id = p_actor;
  if role_name is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if public._ops_replayed(p_actor, p_client_action_id) then
    perform public._ops_replay_matches(p_client_action_id, array['accounting_settings.set'], 'accounting_settings');
    return jsonb_build_object('replayed', true);
  end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' then
    raise exception 'bad_request' using errcode = '22023';
  end if;
  select * into cur from public.accounting_settings where id;
  for k in select jsonb_object_keys(p_fields) loop
    if not (k = any (allowed)) then
      raise exception 'bad_request' using errcode = '22023';
    end if;
    v := p_fields ->> k;
    if v is null or char_length(btrim(v)) not between 1 and 80 or v ~ '[[:cntrl:]]' then
      raise exception 'bad_request' using errcode = '22023';
    end if;
    before := before || jsonb_build_object(k, to_jsonb(cur) ->> k);
    after := after || jsonb_build_object(k, btrim(v));
  end loop;
  if after = '{}'::jsonb then
    raise exception 'bad_request' using errcode = '22023';
  end if;
  -- One statement per changed column keeps the column list out of dynamic SQL.
  update public.accounting_settings s set
    company_name           = coalesce(after ->> 'company_name', s.company_name),
    ledger_cod             = coalesce(after ->> 'ledger_cod', s.ledger_cod),
    ledger_online          = coalesce(after ->> 'ledger_online', s.ledger_online),
    ledger_discount        = coalesce(after ->> 'ledger_discount', s.ledger_discount),
    ledger_vendor_payable  = coalesce(after ->> 'ledger_vendor_payable', s.ledger_vendor_payable),
    ledger_delivery_income = coalesce(after ->> 'ledger_delivery_income', s.ledger_delivery_income),
    ledger_gst_payable     = coalesce(after ->> 'ledger_gst_payable', s.ledger_gst_payable),
    ledger_rider_tips      = coalesce(after ->> 'ledger_rider_tips', s.ledger_rider_tips),
    ledger_commission      = coalesce(after ->> 'ledger_commission', s.ledger_commission),
    ledger_commission_gst  = coalesce(after ->> 'ledger_commission_gst', s.ledger_commission_gst),
    ledger_other_income    = coalesce(after ->> 'ledger_other_income', s.ledger_other_income),
    ledger_refunds         = coalesce(after ->> 'ledger_refunds', s.ledger_refunds),
    ledger_bank            = coalesce(after ->> 'ledger_bank', s.ledger_bank),
    ledger_rider_salary    = coalesce(after ->> 'ledger_rider_salary', s.ledger_rider_salary),
    updated_by = p_actor, updated_at = now()
   where s.id;
  perform public._ops_log(p_actor, 'accounting_settings.set', 'accounting_settings', 'accounting_settings', null, null,
    before, after, p_client_action_id);
  return jsonb_build_object('replayed', false);
end;
$$;

-- 6 — Who may call ----------------------------------------------------------------------------------------------------
revoke execute on function public.ops_upsert_report_schedule(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.ops_delete_report_schedule(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.ops_claim_report_run(uuid, date, date) from public, anon, authenticated;
revoke execute on function public.ops_finish_report_run(uuid, text, text, int, uuid[], jsonb, text) from public, anon, authenticated;
revoke execute on function public.ops_advance_schedule(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.ops_due_report_schedules(timestamptz, int) from public, anon, authenticated;
revoke execute on function public.ops_prune_report_runs(int) from public, anon, authenticated;
revoke execute on function public.ops_set_accounting_settings(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.ops_upsert_report_schedule(uuid, uuid, jsonb, text) to service_role;
grant execute on function public.ops_delete_report_schedule(uuid, uuid, text) to service_role;
grant execute on function public.ops_claim_report_run(uuid, date, date) to service_role;
grant execute on function public.ops_finish_report_run(uuid, text, text, int, uuid[], jsonb, text) to service_role;
grant execute on function public.ops_advance_schedule(uuid, timestamptz) to service_role;
grant execute on function public.ops_due_report_schedules(timestamptz, int) to service_role;
grant execute on function public.ops_prune_report_runs(int) to service_role;
grant execute on function public.ops_set_accounting_settings(uuid, jsonb, text) to service_role;

commit;
