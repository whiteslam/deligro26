-- ============================================================
-- 0030 — The order guard was blocking the function that makes totals true
-- ------------------------------------------------------------
-- MUST run after 0029_phone_orders.sql, which last declared
-- `guard_order_update()`. It is safe to apply on a database that has not run
-- 0029: the guard compares columns through `to_jsonb`, and a column this
-- database does not have is absent from both sides and compares equal.
--
-- ## The bug
--
-- Migration 0024 locked `total` against every role below admin, and said this
-- about the function that has to write it:
--
--     -- Admin and trusted server code (the cancel route, recompute_order_total)
--     -- are unrestricted. recompute_order_total is SECURITY DEFINER owned by
--     -- postgres, so it passes regardless of who triggered the recompute.
--
-- That is not what SECURITY DEFINER does. It changes the *privileges* a
-- function runs with; it does not change `auth.uid()` or `auth.jwt()`, which
-- read the request GUC and still describe the customer who made the request.
-- So inside `recompute_order_total()`, `is_admin()` is still false and the role
-- claim is still `authenticated` — and `guard_order_update()` fires on its
-- UPDATE and raises:
--
--     only order status may be changed by this role (attempted: total)
--
-- The effect, from 0024 onward: **a customer could not place an order.**
-- `createOrder()` inserts the order, inserts the items, then calls
-- `recompute_order_total()` and throws on its error — so checkout returned 500
-- and left an orphan order at total = 0 with its items attached.
--
-- It went unnoticed because no order has been placed through the app since
-- 0024 was applied; every row in `orders` older than that came from the legacy
-- import, which runs as the service role and is exempt.
--
-- ## The fix
--
-- `current_user` is the signal 0024 wanted: under PostgREST it is `anon` or
-- `authenticated`, and inside a SECURITY DEFINER function owned by `postgres`
-- it is `postgres`. Unlike a GUC it cannot be forged — a customer cannot make
-- `current_user` become `postgres` without already owning the database.
--
-- **But the guard has to stop being SECURITY DEFINER itself to see it.** A
-- SECURITY DEFINER trigger function reads its own owner as `current_user`, so
-- the check would have been true for everyone and would have disabled the
-- guard completely. Measured directly:
--
--     direct UPDATE by authenticated   → DEFINER trigger sees postgres
--                                        INVOKER trigger sees authenticated
--     UPDATE inside a definer function → DEFINER trigger sees postgres
--                                        INVOKER trigger sees postgres
--
-- Only the INVOKER row distinguishes the two cases. The guard needs no
-- privileges of its own — it compares OLD and NEW and calls `is_admin()`,
-- which is SECURITY DEFINER in its own right — so dropping to INVOKER costs
-- nothing and is what makes the test meaningful.
--
-- The trust boundary this draws is explicit: any SECURITY DEFINER function
-- owned by postgres may move a locked column. Today that is
-- `recompute_order_total()`. Anything added to that set later is asserting it
-- is trusted server code, and should be read as such in review.
-- ============================================================

begin;

-- SECURITY INVOKER, changed from DEFINER in every prior declaration of this
-- function (0024/0025/0026/0029). See the header: as DEFINER it cannot tell
-- who is updating, which is the whole job. It needs no elevated privileges.
create or replace function public.guard_order_update()
returns trigger
language plpgsql security invoker set search_path = public as $$
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
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
     -- 0030: a SECURITY DEFINER function owned by the database owner is running.
     -- This is the "trusted server code" branch 0024 intended and did not get.
     or current_user in ('postgres', 'supabase_admin') then
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

-- Re-asserted so the ordering stays explicit in the last file that touches
-- these triggers: `zz_` sorts after `orders_guard_update`, so the guard sees
-- the row as the caller submitted it. See 0026.
drop trigger if exists zz_orders_stamp_lifecycle on public.orders;
create trigger zz_orders_stamp_lifecycle
  before update on public.orders
  for each row execute function public.stamp_order_lifecycle();

-- ============================================================
-- While we are here: make `total` authoritative at INSERT too.
-- ------------------------------------------------------------
-- The guard covers UPDATE. Nothing covered INSERT, and
-- "orders — customer insert" (0001) checks only that the row is the caller's:
--
--     with check (customer_id = auth.uid() and current_role() = 'customer')
--
-- So a customer holding the publishable key could POST straight to PostgREST
-- with `total: 1` and own a real order for a rupee. `recompute_order_total()`
-- exists to make the total authoritative, but only ever ran because the app
-- chose to call it — and an attacker skipping the app simply does not.
--
-- Pinning it to 0 costs the honest path nothing: `createOrder()` already
-- inserts `total: 0` as a placeholder and calls the recompute immediately
-- after, which — as of the fix above — now works. The service role and admin
-- are exempt, so the legacy import and the phone-order desk still write their
-- own totals.
--
-- Named to sort before `orders_force_payment_pending` for no reason other than
-- readability; the two touch different columns and do not interact.
-- ============================================================
-- SECURITY INVOKER for the same reason as the guard above: it tests
-- `current_user`, which a DEFINER function cannot see past its own owner.
create or replace function public.force_order_total_pending()
returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  -- Not an error: asking for a total is not a lie, it is just not the
  -- caller's to assert. recompute_order_total() settles it from order_items.
  new.total := 0;
  return new;
end;
$$;

drop trigger if exists orders_force_total_pending on public.orders;
create trigger orders_force_total_pending
  before insert on public.orders
  for each row execute function public.force_order_total_pending();

commit;

-- ============================================================
-- POST-MIGRATION — verify, and read the residual risk.
-- ------------------------------------------------------------
-- 1. A customer can place an order again. The real check is an actual checkout
--    through the app; in SQL, as an authenticated customer:
--
--      select public.recompute_order_total('<an order id of theirs>');
--
--    Before this migration that raised. It should now succeed.
--
-- 2. A customer still cannot move a total themselves (should still raise):
--
--      update public.orders set total = 1 where id = '<their order>';
--
-- 3. **Residual, NOT closed here:** `delivery_fee` and `tax_amount` are still
--    accepted as submitted at INSERT. A direct PostgREST insert can zero them
--    and save the fee, because at BEFORE INSERT there are no `order_items`
--    yet and the trigger has no subtotal to derive them from.
--
--    Closing it properly means deriving fees in the database after the items
--    exist — i.e. `recompute_order_total()` growing into a function that reads
--    `platform_settings` and recomputes fee and tax as well as the sum. That
--    puts the pricing rules in `src/lib/pricing.ts` into SQL as a second
--    implementation, which is a deliberate design decision and not a
--    drive-by. Tracked as a finding in docs/SECURITY_AUDIT.md.
-- ============================================================
