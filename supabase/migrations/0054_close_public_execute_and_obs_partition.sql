-- ============================================================
-- 0054 — two grants that earlier migrations meant to remove and did not.
--
-- Found by docs/rls-verification.sql on the live project (2026-10-07).
--
-- 1. bump_banner_stat (audit finding M-4, "closed" in 0024).
--    0024 ran `revoke execute ... from anon, authenticated`. A function's
--    default EXECUTE grant is to PUBLIC, and anon/authenticated inherit it, so
--    revoking from those two roles by name changes nothing. Block 3 of the
--    verification file still lists the function as executable by anon.
--    Revoking from PUBLIC is what actually closes it. The app calls it only
--    through the service-role client (src/lib/data-access/banners.ts), which
--    keeps its own grant, so nothing in the app changes.
--
-- 2. obs_events_default.
--    0046 revoked anon/authenticated on the nine obs_* tables and on each
--    weekly partition it creates, but the default partition is created
--    separately and was never in either list. Live, anon holds full table
--    privileges on it. A direct anonymous request returned 404 when probed, so
--    it is not reachable through the REST API today, but the privilege should
--    not exist: it is a table of operational telemetry (profile UUIDs, order
--    ids, error text). Also enable RLS, since a partition does not inherit it
--    from its parent.
--
-- Idempotent. Safe to re-run.
-- ============================================================

begin;

revoke execute on function public.bump_banner_stat(uuid, text) from public, anon, authenticated;
grant  execute on function public.bump_banner_stat(uuid, text) to service_role;

alter table public.obs_events_default enable row level security;
alter table public.obs_events_default force row level security;
revoke all on public.obs_events_default from anon, authenticated;
grant select, insert, update, delete on public.obs_events_default to service_role;

-- 3. Weekly partitions: RLS was never ENABLED on them (block 1 shows
--    rls_on = false, rls_forced = true). FORCE without ENABLE does nothing.
--    Not exploitable today because anon/authenticated privileges were revoked
--    (the second lock), but 0046 meant RLS to be the first lock. Enable it on
--    every existing partition, and teach the maintenance job to do the same for
--    the partitions it creates from now on. Body is 0046's, plus one line.
do $$
declare r record;
begin
  for r in
    select c.relname
      from pg_inherits i
      join pg_class c on c.oid = i.inhrelid
     where i.inhparent = 'public.obs_events'::regclass
  loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;
end $$;

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
      execute format('alter table public.%I enable row level security', v_name);
      execute format('alter table public.%I force row level security', v_name);
      execute format('revoke all on public.%I from anon, authenticated', v_name);
      execute format('grant select, insert, update, delete on public.%I to service_role', v_name);
      v_made := v_made + 1;
    exception
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

commit;
