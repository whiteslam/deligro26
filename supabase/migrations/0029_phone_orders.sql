-- ============================================================
-- 0029 — Phone-in orders: how an order got here, and who typed it
-- ------------------------------------------------------------
-- MUST run after 0026_order_lifecycle.sql: it re-declares
-- `guard_order_update()` and extends the locked-column list that migration set.
--
-- Migration 0023 named this path before it existed. Its header says, of the
-- privileges deliberately withheld from a manager:
--
--     direct order INSERT  (phone orders are placed via a service-role
--                           path, so no manager INSERT policy on orders)
--
-- That is still the design, and this migration is what makes it safe to build.
-- A service-role insert bypasses RLS by definition, so the only thing standing
-- between "an operator takes an order for a customer who called" and "an
-- operator creates orders in a stranger's name" is a record of who did it.
-- Until now `orders` had nowhere to keep that record: every row looked like the
-- customer placed it themselves, because until now every row had.
--
-- Two columns, and neither is decorative:
--
--   channel    — an order placed by phone is operationally different from one
--                placed in the app. Nobody at the other end tapped "confirm",
--                so nobody at the other end saw the total, the address, or the
--                delivery estimate. Support answering "but I never ordered
--                that" needs the row to be able to say which kind it is.
--   placed_by  — attribution. Without it a phone order is an anonymous write
--                against someone else's account, which is precisely the shape
--                of the thing an audit is looking for.
--
-- Both are locked in `guard_order_update()` below. Provenance that the holder
-- of the row can edit is not provenance.
--
-- Idempotent: safe to re-run. Apply in the Supabase SQL editor, or with
-- `supabase db push`.
-- ============================================================

begin;

-- ============================================================
-- Provenance columns.
-- ------------------------------------------------------------
-- `channel` defaults to 'app' and is NOT NULL, so every row that predates this
-- migration reads as what it was: a customer ordering for themselves. Backfill
-- is therefore the default, and there is no window where a historical order is
-- ambiguous.
--
-- `placed_by` is nullable and stays null for an app order — "the customer" is
-- already recorded in customer_id, and repeating it here would invite code that
-- treats a null as suspicious rather than as normal.
--
-- ON DELETE SET NULL, not CASCADE: removing a staff account must not delete the
-- orders they handled. The attribution is lost, the order is not.
-- ============================================================
alter table public.orders
  add column if not exists channel   text not null default 'app',
  add column if not exists placed_by uuid references public.profiles (id) on delete set null;

-- Re-created rather than guarded by a catalog lookup, so re-running this file
-- after the allowed set changes actually updates the constraint.
alter table public.orders drop constraint if exists orders_channel_check;
alter table public.orders add constraint orders_channel_check
  check (channel in ('app', 'phone'));

comment on column public.orders.channel is
  'app | phone — how the order was taken. ''phone'' means a manager typed it on a call and the customer never saw a checkout screen, so they never confirmed the total, the address or the ETA.';
comment on column public.orders.placed_by is
  'The staff profile that took a phone order, null for an ordinary app order. This is the audit trail for the service-role insert that creates a phone order on a customer''s behalf — it is written once, by that path, and locked against every subsequent update.';

-- Phone orders are a small minority of the table and are always queried as such
-- (an ops filter, a channel-mix report), so a partial index carries the whole
-- workload for a fraction of an index on every row.
create index if not exists orders_channel_phone_idx
  on public.orders (created_at desc)
  where channel <> 'app';

create index if not exists orders_placed_by_idx
  on public.orders (placed_by)
  where placed_by is not null;

-- ============================================================
-- Extend the locked-column guard.
-- ------------------------------------------------------------
-- Re-declared from 0026 with the two provenance columns added. `channel` and
-- `placed_by` describe how a row came to exist; a later UPDATE cannot make that
-- history different, so no role short of admin (or the service role that wrote
-- it) may move them. In particular this stops a manager re-labelling their own
-- phone order as an app order — erasing the attribution while keeping the order.
--
-- The body is otherwise unchanged; see 0024 for the reasoning behind each entry.
-- ============================================================
create or replace function public.guard_order_update()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  locked constant text[] := array[
    'id', 'customer_id', 'restaurant_id',
    'total', 'delivery_fee', 'tax_amount', 'tip',
    'address', 'created_at',
    -- 0025: whether an order is paid is settled by a verified signature.
    'payment_method', 'payment_status',
    -- 0026: lifecycle evidence, written by stamp_order_lifecycle() only.
    'accepted_at', 'ready_at', 'cancelled_at',
    -- 0029: provenance, written once at insert by the phone-order path.
    'channel', 'placed_by'
  ];
  col     text;
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin') then
    return new;
  end if;

  foreach col in array locked loop
    -- A column this database doesn't have is absent from both objects and
    -- compares equal, so the guard adapts to a partially-migrated database.
    if (old_row -> col) is distinct from (new_row -> col) then
      raise exception
        'only order status may be changed by this role (attempted: %)', col;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists orders_guard_update on public.orders;
create trigger orders_guard_update
  before update on public.orders
  for each row execute function public.guard_order_update();

-- Re-asserted because dropping and re-creating the guard trigger above changes
-- nothing about this one, but the ORDER of the two is load-bearing and this
-- file is the last word on the table's triggers. `zz_` sorts after
-- `orders_guard_update`, so the guard still sees the row as the caller
-- submitted it, before the lifecycle stamp adds to it. See 0026.
drop trigger if exists zz_orders_stamp_lifecycle on public.orders;
create trigger zz_orders_stamp_lifecycle
  before update on public.orders
  for each row execute function public.stamp_order_lifecycle();

-- ============================================================
-- No manager INSERT policy — still deliberate.
-- ------------------------------------------------------------
-- It would be one line to add one, and it would be a mistake. An INSERT policy
-- a manager holds is a privilege they hold everywhere, including from a raw
-- PostgREST call with a body of their choosing: any customer_id, any total, any
-- restaurant, no attribution. The service-role path is narrower precisely
-- because it is not a privilege — it is one function, in one file, that
-- computes the money itself and stamps `placed_by` from the session it
-- authorized, and there is no way to reach it except through that check.
--
-- See `placePhoneOrder()` in src/lib/data-access/manager-phone-orders.ts.
-- ============================================================

commit;

-- ============================================================
-- POST-MIGRATION — verify.
-- ------------------------------------------------------------
-- Provenance is present and the backfill read as 'app' (should return one row,
-- channel = 'app', placed_by = 0):
--
--   select channel, count(*) filter (where placed_by is not null) as attributed,
--          count(*)
--     from public.orders
--    group by channel;
--
-- The guard covers the new columns (should raise, run as a non-admin):
--
--   update public.orders set channel = 'app' where channel = 'phone';
-- ============================================================
