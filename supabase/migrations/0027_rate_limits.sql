-- Shared fixed-window rate limits for API routes (OTP IP caps, writes, etc.).
-- Replaces the Upstash Redis requirement at current scale: one Postgres table
-- is enough across all Vercel serverless instances. Service-role only.

create table if not exists public.rate_limits (
  key      text primary key,
  count    int not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;
-- No policies on purpose: only the service-role key (server) may touch this.

/**
 * Atomically consume one unit of a fixed window.
 * Returns jsonb: { ok, remaining, reset_at (epoch ms), retry_after (seconds) }.
 */
create or replace function public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_ms bigint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now    timestamptz := clock_timestamp();
  v_window interval;
  v_count  int;
  v_reset  timestamptz;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'rate limit key required';
  end if;
  if p_limit is null or p_limit < 1 then
    raise exception 'rate limit must be >= 1';
  end if;
  if p_window_ms is null or p_window_ms < 1 then
    raise exception 'window must be >= 1 ms';
  end if;

  v_window := make_interval(secs => greatest(p_window_ms / 1000.0, 0.001));

  loop
    select rl.count, rl.reset_at
      into v_count, v_reset
      from public.rate_limits rl
     where rl.key = p_key
     for update;

    if not found then
      begin
        v_reset := v_now + v_window;
        insert into public.rate_limits (key, count, reset_at)
        values (p_key, 1, v_reset);
        return jsonb_build_object(
          'ok', true,
          'remaining', p_limit - 1,
          'reset_at', (extract(epoch from v_reset) * 1000)::bigint,
          'retry_after', 0
        );
      exception
        when unique_violation then
          -- Concurrent insert — retry with a lock.
          continue;
      end;
    end if;

    -- Window expired: start a fresh bucket.
    if v_reset <= v_now then
      v_reset := v_now + v_window;
      update public.rate_limits
         set count = 1,
             reset_at = v_reset
       where key = p_key;
      return jsonb_build_object(
        'ok', true,
        'remaining', p_limit - 1,
        'reset_at', (extract(epoch from v_reset) * 1000)::bigint,
        'retry_after', 0
      );
    end if;

    -- Already at / over the cap.
    if v_count >= p_limit then
      return jsonb_build_object(
        'ok', false,
        'remaining', 0,
        'reset_at', (extract(epoch from v_reset) * 1000)::bigint,
        'retry_after', greatest(
          0,
          ceil(extract(epoch from (v_reset - v_now)))
        )::int
      );
    end if;

    update public.rate_limits
       set count = v_count + 1
     where key = p_key;

    return jsonb_build_object(
      'ok', true,
      'remaining', p_limit - (v_count + 1),
      'reset_at', (extract(epoch from v_reset) * 1000)::bigint,
      'retry_after', 0
    );
  end loop;
end;
$$;

revoke all on function public.check_rate_limit(text, int, bigint) from public;
grant execute on function public.check_rate_limit(text, int, bigint) to service_role;

comment on table public.rate_limits is
  'Fixed-window API rate-limit buckets. Service-role only; used by src/lib/rate-limit.ts.';
comment on function public.check_rate_limit(text, int, bigint) is
  'Atomic fixed-window rate limit. Called from the Next.js server with the service role.';
