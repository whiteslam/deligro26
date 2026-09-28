# Apply pending migrations to production (owner)

Run in the Supabase dashboard → SQL editor, **in this order**, one file at a
time, pasting the whole file. Take a backup first (Database → Backups).

1. `supabase/migrations/0039_vendor_login_credentials.sql`
2. `supabase/migrations/0042_rider_dispatch.sql`
3. `supabase/migrations/0048_settlement_corrections.sql`
4. `supabase/migrations/0051_cancellation_provenance.sql`
5. `supabase/migrations/0052_role_feature_flags.sql`
6. `supabase/migrations/0053_release_hardening.sql`  ← must come after 0051

## Verify (each query must return the value shown)

```sql
-- guard is the invoker version with cancelled_by locked
select prosecdef, position('cancelled_by' in prosrc) > 0 as locks_cancelled_by
from pg_proc where proname = 'guard_order_update';
-- expect: prosecdef = false, locks_cancelled_by = true

select count(*) from pg_trigger where tgname in ('order_items_guard_insert','profiles_guard_phone');
-- expect: 2

select has_function_privilege('anon', 'public.check_rate_limit(text,int,bigint)', 'execute');
-- expect: false

select to_regclass('public.role_feature_flags') is not null as flags_table,
       exists(select 1 from information_schema.columns
              where table_name='deliveries' and column_name='offered_driver_id') as dispatch_cols;
-- expect: true, true
```

## Smoke test right after

Place one COD test order in the customer app and cancel it from admin.
Checkout must succeed (a 500 means the guard is wrong — re-run 0053).
