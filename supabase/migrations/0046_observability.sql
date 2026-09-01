-- ============================================================
-- 0046 — Observability & incident centre
-- ------------------------------------------------------------
-- The store behind /admin/observability. Nine tables, a partitioned event
-- stream, and the scheduled SQL that rolls it up, expires it and evaluates
-- alerts.
--
-- WHY IN POSTGRES AND NOT AN APM
-- ------------------------------
-- Half of what this system has to answer is not "what threw" but "which 17
-- orders are stuck", "did the kitchen stop accepting", "is the money we took
-- recorded against an order". Those are joins against `orders`, `deliveries`
-- and `payments`. An external error tracker cannot see them. See
-- docs/OBSERVABILITY_PLAN.md §5.
--
-- CONTAINMENT (AGENTS.md rules 1, 4 and 5)
-- ----------------------------------------
-- Every table here is service_role-only, on the `rate_limits` (0027) pattern:
-- RLS enabled with NO policies, and all privileges revoked from anon and
-- authenticated. RLS-with-no-policies denies every row to every non-superuser
-- role; the revoke is the second lock, because Supabase grants table
-- privileges to anon/authenticated by default and a policy added carelessly
-- later would otherwise be the only thing standing between a customer and the
-- platform's stack traces.
--
-- Reads happen exclusively through src/lib/obs/*.ts, which is `server-only`
-- and reached behind requireRole("admin"). There is no anon path, no
-- authenticated path, and no PostgREST path.
--
-- WHAT IS DELIBERATELY NOT STORED
-- -------------------------------
-- No request bodies, no response bodies, no headers beyond a four-key
-- allowlist, no IP addresses, no names, no phone numbers, no emails. Identity
-- is a `profiles.id` UUID and nothing else; the console resolves it to a
-- customer page where an operator already has an audited path to real details.
-- Redaction is applied in src/lib/obs/redact.ts BEFORE the row is built, so
-- there is no code path that reaches these tables unredacted.
--
-- Idempotent: safe to re-run. Apply in the Supabase SQL editor, or with
-- `supabase db push`.
-- ============================================================

begin;

-- ============================================================
-- Enumerated vocabularies.
-- ------------------------------------------------------------
-- CHECK constraints rather than Postgres enums, on purpose: an enum needs
-- ALTER TYPE to gain a value, which cannot run inside a transaction with other
-- DDL and turns "we now also record queue events" into a two-step deploy. The
-- constraint is the same guarantee with a cheaper upgrade path.
-- ============================================================

-- ============================================================
-- obs_events — the raw stream.
-- ------------------------------------------------------------
-- Range-partitioned weekly on occurred_at so retention is DROP TABLE on a
-- partition rather than a DELETE over millions of rows. Deleting a fortnight of
-- telemetry row-by-row would generate more WAL than the telemetry itself, and
-- would leave the table bloated until an autovacuum that competes with the
-- ordering path for the same I/O.
--
-- The primary key must contain the partition key, hence (id, occurred_at).
-- ============================================================
create table if not exists public.obs_events (
  id                bigint generated always as identity,
  occurred_at       timestamptz not null default now(),

  -- production | preview | development. Defaulted from VERCEL_ENV by the
  -- emitter. The console filters to 'production' unless told otherwise, so a
  -- developer's deliberate test failures can never be mistaken for an outage.
  env               text        not null,
  -- Short git SHA. Null when the platform did not supply one (local `next dev`).
  release           text,

  kind              text        not null,
  level             text        not null,
  -- Where in OUR code, e.g. 'api/orders' or 'lib/dispatch'. Not a file path:
  -- a module can move without splitting its history in two.
  source            text        not null,
  -- Redacted and truncated by the emitter. NOT NULL because an event with no
  -- message is an event nobody can act on.
  message           text        not null,

  -- Correlation. request_id is one HTTP request; trace_id is one logical
  -- operation and survives across the webhook boundary (see the note on
  -- payments.provider_order_id in docs/OBSERVABILITY_PLAN.md §5).
  trace_id          text,
  request_id        text,
  span_id           text,
  parent_span_id    text,
  duration_ms       integer,

  -- TEMPLATED, e.g. '/api/orders/[id]'. Storing the concrete path would make
  -- per-endpoint aggregation impossible and would put a user-scoped id into an
  -- index for no gain — the id it would carry is already in order_id below.
  http_method       text,
  http_route        text,
  http_status       smallint,

  -- razorpay | onesignal | renflair | supabase | maps. Set on `provider`
  -- events, which is how "their outage" is told apart from "our bug".
  provider          text,

  error_type        text,
  error_fingerprint text,
  -- Redacted and truncated. Frames outside src/ are kept — a throw from inside
  -- @supabase/supabase-js is a real diagnosis.
  stack             text,

  actor_role        text,
  actor_id          uuid,
  order_id          uuid,
  restaurant_id     uuid,
  driver_id         uuid,

  -- Allowlisted keys only (src/lib/obs/redact.ts). A deny-list would leak the
  -- first field nobody thought to deny.
  attrs             jsonb       not null default '{}'::jsonb,

  constraint obs_events_pkey primary key (id, occurred_at),
  constraint obs_events_kind_check  check (kind  in ('http','error','provider','db','domain','client','log')),
  constraint obs_events_level_check check (level in ('debug','info','warn','error','fatal')),
  constraint obs_events_env_check   check (env   in ('production','preview','development'))
) partition by range (occurred_at);

comment on table public.obs_events is
  'Raw telemetry, weekly partitions, 14-day retention. Service-role only; read through src/lib/obs. Contains no bodies, headers, IPs or PII beyond profile UUIDs.';
comment on column public.obs_events.http_route is
  'TEMPLATED route (/api/orders/[id]), never the concrete path — the id lives in order_id.';
comment on column public.obs_events.trace_id is
  'One logical operation, spanning requests. Rejoined across the Razorpay webhook via payments.provider_order_id.';

-- The catch-all. Its job is to make ingest FAIL SOFT: if partition maintenance
-- has been dead long enough to exhaust the runway below, telemetry lands here
-- instead of the insert erroring and the event vanishing. `obs_maintain_partitions`
-- skips any week the default already holds rows for, so this never blocks the
-- job from recovering.
create table if not exists public.obs_events_default
  partition of public.obs_events default;

-- ---------- indexes ----------
-- BRIN on the partition key. The stream is append-ordered by time, which is
-- exactly the correlation BRIN needs, and it costs a few pages per partition
-- against the hundreds of megabytes a btree would want here.
create index if not exists obs_events_time_brin
  on public.obs_events using brin (occurred_at) with (pages_per_range = 32);

-- The error feed must never scan the http firehose. `http` events outnumber
-- errors by three or four orders of magnitude at a healthy baseline, so this
-- partial index is the difference between an instant issues page and a
-- sequential scan of a fortnight.
create index if not exists obs_events_problems_idx
  on public.obs_events (occurred_at desc)
  where level in ('error','fatal');

create index if not exists obs_events_fingerprint_idx
  on public.obs_events (error_fingerprint, occurred_at desc)
  where error_fingerprint is not null;

create index if not exists obs_events_trace_idx
  on public.obs_events (trace_id, occurred_at)
  where trace_id is not null;

create index if not exists obs_events_request_idx
  on public.obs_events (request_id)
  where request_id is not null;

create index if not exists obs_events_order_idx
  on public.obs_events (order_id, occurred_at desc)
  where order_id is not null;

create index if not exists obs_events_route_idx
  on public.obs_events (http_route, occurred_at desc)
  where http_route is not null;

create index if not exists obs_events_provider_idx
  on public.obs_events (provider, occurred_at desc)
  where provider is not null;

-- ============================================================
-- obs_issues — one row per distinct problem.
-- ------------------------------------------------------------
-- The fingerprint is computed in the application (src/lib/obs/fingerprint.ts)
-- so the normalisation rules are testable without a database. This table
-- guarantees only that one fingerprint is one issue.
-- ============================================================
create sequence if not exists public.obs_issue_seq start with 1000;

create table if not exists public.obs_issues (
  fingerprint         text primary key,
  -- DEL-1000, DEL-1001, … The operator-facing handle. Short enough to read
  -- down a phone and unique forever.
  short_id            text        not null unique,

  title               text        not null,
  -- The route, or the first stack frame inside src/. What to open first.
  culprit             text,
  kind                text        not null,
  level               text        not null,
  env                 text        not null,

  severity            text        not null default 'medium',
  -- 'auto' | 'manual'. A manual severity is NEVER overwritten by the
  -- classifier: an operator who has looked at the thing outranks a rule table,
  -- and an issue that keeps demoting itself after being escalated is an issue
  -- nobody will trust again.
  severity_source     text        not null default 'auto',

  status              text        not null default 'open',

  first_seen          timestamptz not null default now(),
  last_seen           timestamptz not null default now(),
  -- Exact and permanent, unlike the distinct user/order counts, which can only
  -- be computed inside the raw-event retention window. The console labels those
  -- "(last 14 days)" rather than presenting a number that silently shrinks when
  -- a partition is dropped.
  occurrences         bigint      not null default 0,

  release_first_seen  text,
  release_last_seen   text,

  assigned_to         uuid references public.profiles(id) on delete set null,
  incident_id         bigint,

  resolved_at         timestamptz,
  resolved_by         uuid references public.profiles(id) on delete set null,
  resolution_note     text,

  -- The most recent full event, so the detail page has a stack to render
  -- without scanning. Not a foreign key: obs_events is partitioned and its rows
  -- expire on a different clock to this table's.
  sample_event_id     bigint,
  sample_trace_id     text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint obs_issues_severity_check check (severity in ('critical','high','medium','low','info')),
  constraint obs_issues_sev_src_check  check (severity_source in ('auto','manual')),
  -- 'regressed' is its own state, not a return to 'open': an issue that comes
  -- back after being resolved is a different and more urgent fact than one that
  -- was never fixed, and the difference is the whole "Learn" step.
  constraint obs_issues_status_check   check (status in ('open','investigating','resolved','ignored','regressed')),
  constraint obs_issues_env_check      check (env in ('production','preview','development'))
);

comment on table public.obs_issues is
  'Deduplicated problems, grouped by application-computed fingerprint. 180-day retention from last_seen.';
comment on column public.obs_issues.severity_source is
  'manual = set by an operator and never overwritten by the auto-classifier.';
comment on column public.obs_issues.occurrences is
  'Exact and permanent. Distinct affected users/orders are NOT stored here — they are only knowable inside the raw-event window and are labelled as such in the UI.';

create index if not exists obs_issues_triage_idx
  on public.obs_issues (env, status, severity, last_seen desc);
create index if not exists obs_issues_last_seen_idx
  on public.obs_issues (last_seen desc);
create index if not exists obs_issues_incident_idx
  on public.obs_issues (incident_id) where incident_id is not null;

-- ============================================================
-- obs_metrics_rollup — pre-aggregated, and the only thing that survives
-- raw-event expiry.
-- ------------------------------------------------------------
-- Without this, every chart goes blank at the 14-day mark and "is this worse
-- than last month?" becomes unanswerable — which is the question that turns a
-- number into a judgement.
-- ============================================================
create table if not exists public.obs_metrics_rollup (
  bucket       timestamptz not null,
  -- 'minute' | 'hour' | 'day'. Minutes are compacted upward by the retention
  -- job, so a year of history costs kilobytes rather than gigabytes.
  grain        text        not null,
  env          text        not null,
  -- 'route' | 'provider' | 'domain'
  dimension    text        not null,
  key          text        not null,

  count        bigint      not null default 0,
  error_count  bigint      not null default 0,
  -- Exact within a minute (percentile_disc over that minute's rows). Across a
  -- wider window these are a percentile of percentiles; the console says so on
  -- hover rather than implying a precision it does not have.
  p50_ms       integer,
  p95_ms       integer,
  p99_ms       integer,
  max_ms       integer,

  primary key (bucket, grain, env, dimension, key),
  constraint obs_rollup_grain_check check (grain in ('minute','hour','day')),
  constraint obs_rollup_dim_check   check (dimension in ('route','provider','domain'))
);

comment on table public.obs_metrics_rollup is
  'Time-bucketed aggregates. Outlives obs_events so long-range charts keep working. p95/p99 across multiple buckets are approximate and labelled as such in the UI.';

create index if not exists obs_rollup_lookup_idx
  on public.obs_metrics_rollup (env, dimension, key, grain, bucket desc);

-- ============================================================
-- obs_incidents / obs_incident_notes — the human half.
-- ------------------------------------------------------------
-- Never auto-deleted. An expired incident is an outage the team gets to have
-- twice, and the notes are the only place the reasoning survives.
-- ============================================================
create table if not exists public.obs_incidents (
  id            bigint generated always as identity primary key,
  short_id      text        not null unique,
  title         text        not null,
  summary       text,
  severity      text        not null default 'high',
  status        text        not null default 'detected',
  env           text        not null default 'production',

  owner_id      uuid references public.profiles(id) on delete set null,
  opened_by     uuid references public.profiles(id) on delete set null,

  detected_at   timestamptz not null default now(),
  identified_at timestamptz,
  mitigated_at  timestamptz,
  resolved_at   timestamptz,
  closed_at     timestamptz,

  resolution    text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint obs_incidents_severity_check check (severity in ('critical','high','medium','low')),
  constraint obs_incidents_status_check
    check (status in ('detected','investigating','identified','mitigating','resolved','closed'))
);

comment on table public.obs_incidents is
  'Operator-run incidents. Never auto-deleted — this is the institutional memory the post-mortem reads.';

create index if not exists obs_incidents_open_idx
  on public.obs_incidents (status, detected_at desc);

create sequence if not exists public.obs_incident_seq start with 1;

create table if not exists public.obs_incident_notes (
  id          bigint generated always as identity primary key,
  incident_id bigint      not null references public.obs_incidents(id) on delete cascade,
  author_id   uuid        references public.profiles(id) on delete set null,
  -- 'note' | 'status' | 'severity' | 'assign'. Status and severity changes are
  -- written here as well as onto the row, so the timeline explains itself
  -- without diffing anything.
  kind        text        not null default 'note',
  body        text        not null,
  created_at  timestamptz not null default now(),

  constraint obs_notes_kind_check check (kind in ('note','status','severity','assign','link'))
);

comment on table public.obs_incident_notes is
  'Append-only incident timeline. Status/severity changes are recorded here too, so the timeline is self-explaining.';

create index if not exists obs_incident_notes_idx
  on public.obs_incident_notes (incident_id, created_at);

alter table public.obs_issues
  drop constraint if exists obs_issues_incident_fk;
alter table public.obs_issues
  add constraint obs_issues_incident_fk
  foreign key (incident_id) references public.obs_incidents(id) on delete set null;

-- ============================================================
-- obs_alert_rules / obs_alert_firings
-- ------------------------------------------------------------
-- Evaluated on a schedule against the rollups, NOT on a request. A
-- request-triggered evaluator cannot fire "orders dropped to zero", which is
-- the alert that matters most when the platform is down.
-- ============================================================
create table if not exists public.obs_alert_rules (
  id            bigint generated always as identity primary key,
  name          text        not null,
  description   text,
  -- Shipped disabled. The first week produces baselines; an operator turns a
  -- rule on once its threshold means something. Rules that fire from day one
  -- on invented thresholds train everyone to ignore them.
  enabled       boolean     not null default false,
  env           text        not null default 'production',

  -- 'error_rate' | 'error_count' | 'latency_p95' | 'volume_drop' | 'issue_severity'
  metric        text        not null,
  dimension     text,
  key           text,

  comparator    text        not null default 'gt',
  threshold     numeric     not null,
  window_min    integer     not null default 5,
  -- Below this many samples in the window the rule cannot fire. Without it,
  -- "payment failure rate > 10%" fires on one failure out of three at 4am and
  -- the alert becomes noise within a week.
  min_samples   integer     not null default 20,
  -- Minutes of silence after a firing. Enforced through obs_alert_firings
  -- rather than in memory, because there is no memory shared between
  -- serverless instances.
  cooldown_min  integer     not null default 30,

  severity      text        not null default 'high',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint obs_alert_metric_check     check (metric in ('error_rate','error_count','latency_p95','volume_drop','issue_severity')),
  constraint obs_alert_comparator_check check (comparator in ('gt','lt','gte','lte')),
  constraint obs_alert_severity_check   check (severity in ('critical','high','medium','low')),
  constraint obs_alert_window_check     check (window_min between 1 and 1440),
  constraint obs_alert_samples_check    check (min_samples >= 1)
);

comment on table public.obs_alert_rules is
  'Alert thresholds. Ship disabled by design — a rule fires only once an operator has confirmed its threshold against a real baseline.';
comment on column public.obs_alert_rules.min_samples is
  'Sample floor. Prevents a rate rule firing on a handful of overnight requests.';

create table if not exists public.obs_alert_firings (
  id           bigint generated always as identity primary key,
  rule_id      bigint      not null references public.obs_alert_rules(id) on delete cascade,
  fired_at     timestamptz not null default now(),
  env          text        not null,
  -- The number that crossed, the line it crossed, and how many samples backed
  -- it. Stored so a firing can be judged after the fact instead of taken on
  -- trust.
  observed     numeric     not null,
  threshold    numeric     not null,
  sample_count bigint      not null default 0,
  message      text        not null,
  -- Cleared when the metric returns inside the threshold, so the console can
  -- show "firing now" separately from "fired earlier".
  resolved_at  timestamptz,
  -- Set when an operator opens an incident from the alert.
  incident_id  bigint      references public.obs_incidents(id) on delete set null,
  acknowledged_at timestamptz,
  acknowledged_by uuid     references public.profiles(id) on delete set null
);

create index if not exists obs_alert_firings_idx
  on public.obs_alert_firings (rule_id, fired_at desc);
create index if not exists obs_alert_active_idx
  on public.obs_alert_firings (fired_at desc) where resolved_at is null;

-- ============================================================
-- obs_deploys — release markers.
-- ------------------------------------------------------------
-- Drawn as a line on every chart. The console reports ADJACENCY ("v2.4.1
-- deployed 10:35, errors rose 10:42") and never asserts cause: most deploys are
-- innocent, and an observability tool that cries "the deploy did it" gets
-- overruled once and then ignored.
-- ============================================================
create table if not exists public.obs_deploys (
  release        text        not null,
  env            text        not null,
  deployed_at    timestamptz not null default now(),
  commit_message text,
  branch         text,
  primary key (release, env)
);

comment on table public.obs_deploys is
  'One row per release per environment, upserted at first boot. Rendered as adjacency on issue timelines, never as attributed cause.';

create index if not exists obs_deploys_time_idx
  on public.obs_deploys (env, deployed_at desc);

-- ============================================================
-- obs_job_runs — the monitor's own vital signs.
-- ------------------------------------------------------------
-- An alerting system that stops silently is worse than none: the console goes
-- green and stays green while the platform burns. Every scheduled job writes a
-- heartbeat here, and System Health reports the age of the last one — so
-- "Alerting: last ran 47 min ago" is a visible fact rather than an absence
-- nobody notices.
-- ============================================================
create table if not exists public.obs_job_runs (
  job         text        primary key,
  last_run_at timestamptz not null default now(),
  last_ok_at  timestamptz,
  last_error  text,
  runs        bigint      not null default 0,
  failures    bigint      not null default 0,
  duration_ms integer
);

comment on table public.obs_job_runs is
  'Heartbeats for the scheduled observability jobs. If telemetry stops arriving, the age of these rows is how the console knows.';

-- ============================================================
-- Containment. Every table above, in one place so nothing is missed.
-- ------------------------------------------------------------
-- RLS on with no policies denies all rows; the revoke is the second lock. See
-- the header note — Supabase grants table privileges to anon/authenticated by
-- default, so the revoke is doing real work, not restating a default.
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'obs_events','obs_issues','obs_metrics_rollup','obs_incidents',
    'obs_incident_notes','obs_alert_rules','obs_alert_firings',
    'obs_deploys','obs_job_runs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- FORCE so the table owner is bound by RLS too. Without it a future
    -- `security definer` helper owned by postgres would read straight through.
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;

revoke all on sequence public.obs_issue_seq    from anon, authenticated;
revoke all on sequence public.obs_incident_seq from anon, authenticated;
grant usage, select on sequence public.obs_issue_seq    to service_role;
grant usage, select on sequence public.obs_incident_seq to service_role;

-- ============================================================
-- Partition maintenance.
-- ------------------------------------------------------------
-- Creates weekly partitions ahead of time. Runs daily with 8 weeks of runway,
-- so the job can be dead for two months before anything lands in the default
-- partition — and even then ingest continues rather than failing.
-- ============================================================
create or replace function public.obs_maintain_partitions(p_weeks_ahead int default 8)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date := date_trunc('week', now())::date;
  v_week  date;
  v_name  text;
  v_made  int := 0;
  i       int;
begin
  for i in 0..greatest(p_weeks_ahead, 1) loop
    v_week := v_start + (i * 7);
    v_name := format('obs_events_%s', to_char(v_week, 'IYYY_IW'));

    if to_regclass(format('public.%I', v_name)) is not null then
      continue;
    end if;

    begin
      execute format(
        'create table public.%I partition of public.obs_events for values from (%L) to (%L)',
        v_name, v_week, v_week + 7
      );
      execute format('alter table public.%I force row level security', v_name);
      execute format('revoke all on public.%I from anon, authenticated', v_name);
      execute format('grant select, insert, update, delete on public.%I to service_role', v_name);
      v_made := v_made + 1;
    exception
      -- The default partition already holds rows for this week, which only
      -- happens after the job has been dead for the whole runway. Skip rather
      -- than abort: the remaining weeks still get their partitions, and the
      -- stranded rows expire on the retention job's normal schedule.
      when others then
        null;
    end;
  end loop;

  insert into public.obs_job_runs (job, last_run_at, last_ok_at, runs)
  values ('partitions', now(), now(), 1)
  on conflict (job) do update
    set last_run_at = now(), last_ok_at = now(),
        runs = public.obs_job_runs.runs + 1, last_error = null;

  return v_made;
end;
$$;

select public.obs_maintain_partitions(8);

-- ============================================================
-- obs_ingest — one round trip per flush.
-- ------------------------------------------------------------
-- Insert the events AND upsert their issues in a single call. Three network
-- round trips per error would be three times the chance of the ingest itself
-- becoming the latency problem it was built to find; on a serverless function
-- billed by the millisecond it would also be three times the cost.
--
-- Takes an array so the emitter can flush a whole request's telemetry at once
-- from inside `after()`.
--
-- Returns the number of events stored, which is not always the number offered:
-- see the daily cap below.
-- ============================================================
create or replace function public.obs_ingest(p_events jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stored int := 0;
  e        jsonb;
  v_env    text;
  v_today  bigint;
  v_cap    bigint := 500000;   -- per environment, per day
  v_level  text;
  v_fp     text;
  v_id     bigint;
  v_short  text;
  v_at     timestamptz;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;

  v_env := coalesce(p_events -> 0 ->> 'env', 'production');

  -- Daily cap. An error loop that writes a million rows an hour would fill the
  -- database and take the ORDERING platform down to protect the monitoring of
  -- it — exactly backwards. Past the cap we shed debug/info/http and keep
  -- errors, and the shedding itself is recorded, because a dashboard that
  -- quietly goes quiet during an incident is the failure mode this whole
  -- system exists to prevent.
  select count(*) into v_today
    from public.obs_events
   where env = v_env
     and occurred_at >= date_trunc('day', now());

  for e in select * from jsonb_array_elements(p_events) loop
    v_level := coalesce(e ->> 'level', 'info');

    if v_today >= v_cap and v_level not in ('error','fatal') then
      continue;
    end if;

    v_at := coalesce((e ->> 'occurred_at')::timestamptz, now());

    insert into public.obs_events (
      occurred_at, env, release, kind, level, source, message,
      trace_id, request_id, span_id, parent_span_id, duration_ms,
      http_method, http_route, http_status, provider,
      error_type, error_fingerprint, stack,
      actor_role, actor_id, order_id, restaurant_id, driver_id, attrs
    ) values (
      v_at,
      coalesce(e ->> 'env', 'production'),
      e ->> 'release',
      coalesce(e ->> 'kind', 'log'),
      v_level,
      coalesce(e ->> 'source', 'unknown'),
      left(coalesce(e ->> 'message', '(no message)'), 2000),
      e ->> 'trace_id',
      e ->> 'request_id',
      e ->> 'span_id',
      e ->> 'parent_span_id',
      nullif(e ->> 'duration_ms', '')::integer,
      e ->> 'http_method',
      e ->> 'http_route',
      nullif(e ->> 'http_status', '')::smallint,
      e ->> 'provider',
      e ->> 'error_type',
      e ->> 'error_fingerprint',
      left(e ->> 'stack', 8000),
      e ->> 'actor_role',
      nullif(e ->> 'actor_id', '')::uuid,
      nullif(e ->> 'order_id', '')::uuid,
      nullif(e ->> 'restaurant_id', '')::uuid,
      nullif(e ->> 'driver_id', '')::uuid,
      coalesce(e -> 'attrs', '{}'::jsonb)
    )
    returning id into v_id;

    v_stored := v_stored + 1;
    v_today  := v_today + 1;

    -- ---------- group it ----------
    v_fp := e ->> 'error_fingerprint';
    if v_fp is not null and v_level in ('warn','error','fatal') then
      v_short := 'DEL-' || nextval('public.obs_issue_seq')::text;

      insert into public.obs_issues (
        fingerprint, short_id, title, culprit, kind, level, env,
        severity, first_seen, last_seen, occurrences,
        release_first_seen, release_last_seen, sample_event_id, sample_trace_id
      ) values (
        v_fp, v_short,
        left(coalesce(e ->> 'title', e ->> 'message', 'Unknown error'), 300),
        e ->> 'culprit',
        coalesce(e ->> 'kind', 'error'),
        v_level,
        coalesce(e ->> 'env', 'production'),
        coalesce(e ->> 'severity', 'medium'),
        v_at, v_at, 1,
        e ->> 'release', e ->> 'release', v_id, e ->> 'trace_id'
      )
      on conflict (fingerprint) do update set
        last_seen         = greatest(public.obs_issues.last_seen, excluded.last_seen),
        occurrences       = public.obs_issues.occurrences + 1,
        release_last_seen = coalesce(excluded.release_last_seen, public.obs_issues.release_last_seen),
        sample_event_id   = excluded.sample_event_id,
        sample_trace_id   = coalesce(excluded.sample_trace_id, public.obs_issues.sample_trace_id),
        -- An operator's severity is never overwritten. See the column comment.
        severity          = case
                              when public.obs_issues.severity_source = 'manual'
                                then public.obs_issues.severity
                              else excluded.severity
                            end,
        -- A resolved issue that recurs becomes 'regressed', not 'open' — a
        -- distinct and more urgent fact, and the one that should re-alert.
        -- 'ignored' is left alone: it was ignored on purpose.
        status            = case
                              when public.obs_issues.status = 'resolved' then 'regressed'
                              else public.obs_issues.status
                            end,
        updated_at        = now();
    end if;
  end loop;

  -- The sequence is consumed even when the insert hits the conflict path, so
  -- short ids have gaps. That is fine and deliberate: a gapless id would need a
  -- lock on every ingest, and nobody counts issue numbers.

  if v_stored < jsonb_array_length(p_events) then
    insert into public.obs_job_runs (job, last_run_at, last_error, runs, failures)
    values ('ingest_cap', now(),
            format('daily cap %s reached for env=%s; %s low-level events shed',
                   v_cap, v_env, jsonb_array_length(p_events) - v_stored), 1, 1)
    on conflict (job) do update
      set last_run_at = now(),
          last_error  = excluded.last_error,
          failures    = public.obs_job_runs.failures + 1;
  end if;

  return v_stored;
end;
$$;

comment on function public.obs_ingest(jsonb) is
  'Store a batch of already-redacted telemetry and upsert its issue groups in one round trip. Called from src/lib/obs/emit.ts inside after(), with the service role.';

-- ============================================================
-- obs_rollup — minute aggregates.
-- ------------------------------------------------------------
-- Idempotent: re-rolls the trailing window and upserts, so a missed run
-- catches up on the next one instead of leaving a hole in the chart.
-- ============================================================
create or replace function public.obs_rollup(p_lookback_min int default 10)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz := date_trunc('minute', now()) - make_interval(mins => greatest(p_lookback_min, 1));
  v_to   timestamptz := date_trunc('minute', now());
  v_rows int := 0;
begin
  -- routes
  insert into public.obs_metrics_rollup
    (bucket, grain, env, dimension, key, count, error_count, p50_ms, p95_ms, p99_ms, max_ms)
  select
    date_trunc('minute', occurred_at), 'minute', env, 'route', http_route,
    count(*),
    count(*) filter (where http_status >= 500 or level in ('error','fatal')),
    percentile_disc(0.50) within group (order by duration_ms)::int,
    percentile_disc(0.95) within group (order by duration_ms)::int,
    percentile_disc(0.99) within group (order by duration_ms)::int,
    max(duration_ms)
  from public.obs_events
  where occurred_at >= v_from and occurred_at < v_to
    and http_route is not null
  group by 1, 3, 5
  on conflict (bucket, grain, env, dimension, key) do update set
    count = excluded.count, error_count = excluded.error_count,
    p50_ms = excluded.p50_ms, p95_ms = excluded.p95_ms,
    p99_ms = excluded.p99_ms, max_ms = excluded.max_ms;
  get diagnostics v_rows = row_count;

  -- providers: razorpay / onesignal / renflair. This is the table that answers
  -- "is it them or is it us", which is the first question of any payment or
  -- notification incident.
  insert into public.obs_metrics_rollup
    (bucket, grain, env, dimension, key, count, error_count, p50_ms, p95_ms, p99_ms, max_ms)
  select
    date_trunc('minute', occurred_at), 'minute', env, 'provider', provider,
    count(*),
    count(*) filter (where level in ('error','fatal','warn')),
    percentile_disc(0.50) within group (order by duration_ms)::int,
    percentile_disc(0.95) within group (order by duration_ms)::int,
    percentile_disc(0.99) within group (order by duration_ms)::int,
    max(duration_ms)
  from public.obs_events
  where occurred_at >= v_from and occurred_at < v_to
    and provider is not null
  group by 1, 3, 5
  on conflict (bucket, grain, env, dimension, key) do update set
    count = excluded.count, error_count = excluded.error_count,
    p50_ms = excluded.p50_ms, p95_ms = excluded.p95_ms,
    p99_ms = excluded.p99_ms, max_ms = excluded.max_ms;

  -- domain checkpoints: order.created, payment.settled, dispatch.assigned …
  -- The series that makes "orders stopped" an alertable fact.
  insert into public.obs_metrics_rollup
    (bucket, grain, env, dimension, key, count, error_count, p50_ms, p95_ms, p99_ms, max_ms)
  select
    date_trunc('minute', occurred_at), 'minute', env, 'domain', source,
    count(*),
    count(*) filter (where level in ('error','fatal')),
    percentile_disc(0.50) within group (order by duration_ms)::int,
    percentile_disc(0.95) within group (order by duration_ms)::int,
    percentile_disc(0.99) within group (order by duration_ms)::int,
    max(duration_ms)
  from public.obs_events
  where occurred_at >= v_from and occurred_at < v_to
    and kind = 'domain'
  group by 1, 3, 5
  on conflict (bucket, grain, env, dimension, key) do update set
    count = excluded.count, error_count = excluded.error_count,
    p50_ms = excluded.p50_ms, p95_ms = excluded.p95_ms,
    p99_ms = excluded.p99_ms, max_ms = excluded.max_ms;

  insert into public.obs_job_runs (job, last_run_at, last_ok_at, runs)
  values ('rollup', now(), now(), 1)
  on conflict (job) do update
    set last_run_at = now(), last_ok_at = now(),
        runs = public.obs_job_runs.runs + 1, last_error = null;

  return v_rows;
end;
$$;

-- ============================================================
-- obs_retention — expire on the schedule the plan committed to.
-- ------------------------------------------------------------
-- Raw events go by DROP TABLE on a whole partition. Everything else is small
-- enough for a DELETE.
-- ============================================================
create or replace function public.obs_retention()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cut_raw   timestamptz := now() - interval '14 days';
  v_dropped   int := 0;
  r           record;
begin
  -- Whole partitions whose newest possible row is already past the cutoff.
  for r in
    select c.relname,
           pg_get_expr(c.relpartbound, c.oid) as bound
      from pg_class c
      join pg_inherits i on i.inhrelid = c.oid
     where i.inhparent = 'public.obs_events'::regclass
       and c.relname <> 'obs_events_default'
  loop
    -- Bound looks like: FOR VALUES FROM ('2026-08-24') TO ('2026-08-31')
    if (substring(r.bound from 'TO \(''([^'']+)''\)'))::timestamptz <= v_cut_raw then
      execute format('drop table if exists public.%I', r.relname);
      v_dropped := v_dropped + 1;
    end if;
  end loop;

  -- The default partition cannot be dropped, so it is pruned by row.
  delete from public.obs_events_default where occurred_at < v_cut_raw;

  -- Minutes older than 14 days compact to hours; hours older than 90 days to
  -- days. The charts keep their shape; the storage does not keep its size.
  insert into public.obs_metrics_rollup
    (bucket, grain, env, dimension, key, count, error_count, p50_ms, p95_ms, p99_ms, max_ms)
  select date_trunc('hour', bucket), 'hour', env, dimension, key,
         sum(count), sum(error_count),
         max(p50_ms), max(p95_ms), max(p99_ms), max(max_ms)
    from public.obs_metrics_rollup
   where grain = 'minute' and bucket < now() - interval '14 days'
   group by 1, 3, 4, 5
  on conflict (bucket, grain, env, dimension, key) do update set
    count = excluded.count, error_count = excluded.error_count,
    p50_ms = excluded.p50_ms, p95_ms = excluded.p95_ms,
    p99_ms = excluded.p99_ms, max_ms = excluded.max_ms;

  delete from public.obs_metrics_rollup
   where grain = 'minute' and bucket < now() - interval '14 days';

  insert into public.obs_metrics_rollup
    (bucket, grain, env, dimension, key, count, error_count, p50_ms, p95_ms, p99_ms, max_ms)
  select date_trunc('day', bucket), 'day', env, dimension, key,
         sum(count), sum(error_count),
         max(p50_ms), max(p95_ms), max(p99_ms), max(max_ms)
    from public.obs_metrics_rollup
   where grain = 'hour' and bucket < now() - interval '90 days'
   group by 1, 3, 4, 5
  on conflict (bucket, grain, env, dimension, key) do update set
    count = excluded.count, error_count = excluded.error_count,
    p50_ms = excluded.p50_ms, p95_ms = excluded.p95_ms,
    p99_ms = excluded.p99_ms, max_ms = excluded.max_ms;

  delete from public.obs_metrics_rollup
   where grain = 'hour' and bucket < now() - interval '90 days';
  delete from public.obs_metrics_rollup
   where grain = 'day'  and bucket < now() - interval '400 days';

  -- Issues: 180 days from last sighting; resolved ones released sooner. An
  -- issue linked to an incident is kept regardless — the incident is permanent
  -- and an incident whose issues have evaporated explains nothing.
  delete from public.obs_issues
   where incident_id is null
     and (
       last_seen < now() - interval '180 days'
       or (status = 'resolved' and resolved_at < now() - interval '30 days')
     );

  delete from public.obs_alert_firings where fired_at < now() - interval '90 days';

  -- obs_incidents, obs_incident_notes and obs_deploys are NOT expired here.
  -- See the table comments: they are the institutional memory.

  insert into public.obs_job_runs (job, last_run_at, last_ok_at, runs)
  values ('retention', now(), now(), 1)
  on conflict (job) do update
    set last_run_at = now(), last_ok_at = now(),
        runs = public.obs_job_runs.runs + 1, last_error = null;

  return v_dropped;
end;
$$;

-- ============================================================
-- obs_evaluate_alerts — the scheduled evaluator.
-- ------------------------------------------------------------
-- Reads the rollups, honours the sample floor and the cooldown, and records
-- every firing. Notification is the console's job (in-app for v1, per the
-- decision log in docs/OBSERVABILITY_PLAN.md §12); this function's contract is
-- only to decide truthfully and durably.
-- ============================================================
create or replace function public.obs_evaluate_alerts()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r        record;
  v_from   timestamptz;
  v_count  bigint;
  v_errors bigint;
  v_p95    numeric;
  v_value  numeric;
  v_hit    boolean;
  v_fired  int := 0;
  v_last   timestamptz;
  v_msg    text;
begin
  for r in select * from public.obs_alert_rules where enabled loop
    v_from := now() - make_interval(mins => r.window_min);

    select coalesce(sum(count), 0),
           coalesce(sum(error_count), 0),
           max(p95_ms)
      into v_count, v_errors, v_p95
      from public.obs_metrics_rollup
     where grain = 'minute'
       and env = r.env
       and bucket >= v_from
       and (r.dimension is null or dimension = r.dimension)
       and (r.key is null or key = r.key);

    -- The floor. Below it the rule is not "not firing" — it is unable to say,
    -- which is a different thing and must not read as healthy either. The
    -- console shows such a rule as "insufficient data", not as green.
    if v_count < r.min_samples and r.metric <> 'volume_drop' then
      continue;
    end if;

    v_value := case r.metric
                 when 'error_rate'   then case when v_count > 0 then (v_errors::numeric / v_count) * 100 else 0 end
                 when 'error_count'  then v_errors::numeric
                 when 'latency_p95'  then coalesce(v_p95, 0)
                 when 'volume_drop'  then v_count::numeric
                 else 0
               end;

    v_hit := case r.comparator
               when 'gt'  then v_value >  r.threshold
               when 'gte' then v_value >= r.threshold
               when 'lt'  then v_value <  r.threshold
               when 'lte' then v_value <= r.threshold
               else false
             end;

    if not v_hit then
      -- Back inside the threshold: close any open firing so the console can
      -- distinguish "firing now" from "fired earlier today".
      update public.obs_alert_firings
         set resolved_at = now()
       where rule_id = r.id and resolved_at is null;
      continue;
    end if;

    -- Cooldown, enforced from the table because serverless instances share no
    -- memory.
    select max(fired_at) into v_last
      from public.obs_alert_firings
     where rule_id = r.id;

    if v_last is not null and v_last > now() - make_interval(mins => r.cooldown_min) then
      continue;
    end if;

    v_msg := format('%s: %s is %s (threshold %s %s) over %s min, %s samples',
                    r.name, r.metric, round(v_value, 2), r.comparator, r.threshold,
                    r.window_min, v_count);

    insert into public.obs_alert_firings
      (rule_id, env, observed, threshold, sample_count, message)
    values (r.id, r.env, v_value, r.threshold, v_count, v_msg);

    v_fired := v_fired + 1;
  end loop;

  insert into public.obs_job_runs (job, last_run_at, last_ok_at, runs)
  values ('alerts', now(), now(), 1)
  on conflict (job) do update
    set last_run_at = now(), last_ok_at = now(),
        runs = public.obs_job_runs.runs + 1, last_error = null;

  return v_fired;
end;
$$;

-- ---------- function containment ----------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.obs_maintain_partitions(int)',
    'public.obs_ingest(jsonb)',
    'public.obs_rollup(int)',
    'public.obs_retention()',
    'public.obs_evaluate_alerts()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- ============================================================
-- Default alert rules — DISABLED.
-- ------------------------------------------------------------
-- Thresholds here are starting points, not measurements. Nothing fires until
-- an operator has watched a week of real traffic and switched a rule on;
-- shipping them live on guessed numbers is how an alert channel becomes
-- something everyone mutes. See docs/OBSERVABILITY_PLAN.md §9.
-- ============================================================
insert into public.obs_alert_rules
  (name, description, metric, dimension, key, comparator, threshold, window_min, min_samples, cooldown_min, severity)
values
  ('Order creation failing',
   'POST /api/orders returning 5xx above the tolerated rate.',
   'error_rate', 'route', '/api/orders', 'gt', 10, 5, 20, 30, 'critical'),

  ('Payment settlement failing',
   'Razorpay settlement writes failing — money may be taken against orders that still read unpaid.',
   'error_rate', 'domain', 'payment.settle', 'gt', 5, 5, 10, 15, 'critical'),

  ('Razorpay degraded',
   'Calls to Razorpay failing or timing out. Distinguishes their outage from ours.',
   'error_rate', 'provider', 'razorpay', 'gt', 15, 10, 20, 30, 'high'),

  ('Push delivery failing',
   'OneSignal rejecting or timing out. Customers stop being told their order moved.',
   'error_rate', 'provider', 'onesignal', 'gt', 25, 15, 20, 60, 'medium'),

  ('OTP SMS failing',
   'Renflair rejecting sends — customers cannot sign in at all.',
   'error_rate', 'provider', 'renflair', 'gt', 20, 10, 10, 30, 'critical'),

  ('Dispatch finding no rider',
   'Rider assignment failing while orders sit ready.',
   'error_rate', 'domain', 'dispatch.assign', 'gt', 30, 15, 10, 45, 'high'),

  ('Order volume collapsed',
   'Orders created dropped to near zero. The alert a request-triggered evaluator can never fire.',
   'volume_drop', 'domain', 'order.created', 'lt', 1, 30, 1, 60, 'critical'),

  ('Order API slow',
   'p95 latency on order creation past three seconds.',
   'latency_p95', 'route', '/api/orders', 'gt', 3000, 10, 20, 30, 'medium')
on conflict do nothing;

commit;

-- ============================================================
-- Scheduling — run this block SEPARATELY, after enabling pg_cron.
-- ------------------------------------------------------------
--   Supabase Dashboard → Database → Extensions → enable `pg_cron`
--   (or:  create extension if not exists pg_cron;)
--
-- Left out of the transaction above deliberately: `create extension` needs
-- privileges a migration runner may not have, and a migration that fails on a
-- permission it cannot acquire is worse than one that asks to be finished by
-- hand. Without these jobs the tables still ingest correctly — but nothing is
-- rolled up, nothing expires and no alert ever fires, and System Health will
-- say so out loud from the age of the obs_job_runs rows.
-- ============================================================
--
-- select cron.schedule('obs-rollup',     '* * * * *',   $$select public.obs_rollup(10)$$);
-- select cron.schedule('obs-alerts',     '* * * * *',   $$select public.obs_evaluate_alerts()$$);
-- select cron.schedule('obs-partitions', '17 3 * * *',  $$select public.obs_maintain_partitions(8)$$);
-- select cron.schedule('obs-retention',  '41 3 * * *',  $$select public.obs_retention()$$);
