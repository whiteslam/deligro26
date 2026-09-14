-- ============================================================
-- 0051 — Who cancelled this order, and why
-- ------------------------------------------------------------
-- MUST run after 0026_order_lifecycle.sql: it re-declares both
-- `stamp_order_lifecycle()` and `guard_order_update()`, extending the locked
-- column list that 0025/0026 set.
--
-- The gap this closes, in one sentence: a customer looking at five cancelled
-- orders in a row has no way to learn that four of them were rejected by the
-- restaurant, and concludes the app is broken.
--
-- `cancelled_at` (0026) records WHEN an order was cancelled and nothing
-- records WHO or WHY. Every cancel path already knows both — the customer
-- route knows the customer asked, the kitchen board knows the vendor rejected,
-- the admin action already collects a reason and files it against the *refund*
-- rather than against the order — and all of it was thrown away at the point
-- of writing `status = 'cancelled'`.
--
-- Two columns, with the same discipline 0026 applied to the timestamps:
--
--   * `cancelled_by` is EVIDENCE. It is derived from who is actually making the
--     write, never accepted from a client, and it is in the guard's locked list
--     so a vendor cannot pre-write "customer" onto an order they are about to
--     reject. The one exception is service_role — our own server routes, which
--     are already exempt from the guard and are the code that knows a
--     customer-initiated cancel came through an admin client.
--   * `cancellation_reason` is a SENTENCE, written once. Freezing it after the
--     first write is what stops a rejection reason being edited afterwards into
--     something more flattering.
--
-- Existing cancelled rows are NOT backfilled. We do not know who cancelled them
-- and inventing an answer for a column whose whole purpose is provenance would
-- defeat the column. The UI renders "no reason recorded" for those.
--
-- Idempotent: safe to re-run. Apply in the Supabase SQL editor, or with
-- `supabase db push`.
-- ============================================================

begin;

-- ============================================================
-- The columns.
-- ============================================================
alter table public.orders
  add column if not exists cancelled_by        text,
  add column if not exists cancellation_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_cancelled_by_check'
  ) then
    alter table public.orders
      add constraint orders_cancelled_by_check
      check (
        cancelled_by is null
        or cancelled_by in ('customer', 'vendor', 'manager', 'admin', 'system')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'orders_cancellation_reason_check'
  ) then
    -- A bounded sentence, not a free-text dump: this is rendered verbatim to a
    -- customer, and an unbounded column on a row anyone in the chain can write
    -- is a storage vector aimed at a screen we do not control the width of.
    alter table public.orders
      add constraint orders_cancellation_reason_check
      check (
        cancellation_reason is null
        or char_length(cancellation_reason) between 1 and 200
      );
  end if;
end $$;

comment on column public.orders.cancelled_by is
  'customer | vendor | manager | admin | system — derived from the actor by stamp_order_lifecycle(), never supplied by a client. Null on rows cancelled before 0051, which is an honest "we do not know".';
comment on column public.orders.cancellation_reason is
  'What the cancelling party said, shown verbatim to the customer. Written once and frozen: a rejection reason is evidence, not a draft.';

-- ============================================================
-- Which party is making this write?
-- ------------------------------------------------------------
-- security definer so `owns_restaurant` / `is_admin` / `is_manager` can be
-- consulted regardless of what the caller can read, and STABLE because it
-- depends only on the current transaction's identity.
--
-- Order matters. A shop owner may also be the customer on their own order
-- (0040 — an operator is allowed to shop), so the customer test comes first:
-- someone cancelling their own dinner did it as a customer, whatever else
-- their account can do.
-- ============================================================
create or replace function public.cancelling_party(customer uuid, restaurant uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return 'system';
  end if;
  if auth.uid() = customer then
    return 'customer';
  end if;
  if public.owns_restaurant(restaurant) then
    return 'vendor';
  end if;
  if public.is_admin() then
    return 'admin';
  end if;
  if public.is_manager() then
    return 'manager';
  end if;
  return 'system';
end;
$$;

-- ============================================================
-- Stamp the provenance from the transition itself.
-- ------------------------------------------------------------
-- Re-declared from 0026 with the cancellation branch extended. Everything else
-- is unchanged; see that migration for why each stage uses coalesce(old, ...).
-- ============================================================
create or replace function public.stamp_order_lifecycle()
returns trigger
language plpgsql set search_path = public as $$
declare
  service_role constant boolean :=
    coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin');
begin
  -- Both columns may ONLY be written by the update that actually cancels the
  -- order. Any other update carries the old values through untouched.
  --
  -- Freezing them merely "once set" is not enough: a vendor holds UPDATE on
  -- their own orders and `cancellation_reason` is deliberately not in the
  -- locked list, so on an order cancelled by support with no reason given they
  -- could afterwards attach a sentence of their own — and it would render under
  -- "Cancelled by Deligro support". Tying the write to the transition closes
  -- that without taking the field away from the kitchen, which is the one party
  -- that should be typing it.
  if not (new.status is distinct from old.status and new.status = 'cancelled') then
    new.cancellation_reason := old.cancellation_reason;
    new.cancelled_by        := old.cancelled_by;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'kitchen' then
      new.accepted_at := coalesce(old.accepted_at, now());
    elsif new.status = 'ready' then
      -- A kitchen that skips straight to ready still accepted it at some point.
      new.accepted_at := coalesce(old.accepted_at, now());
      new.ready_at    := coalesce(old.ready_at, now());
    elsif new.status = 'cancelled' then
      new.cancelled_at := coalesce(old.cancelled_at, now());
      -- service_role is our own server, already past the guard, and it is the
      -- only caller that can know a customer-initiated cancel arrived through
      -- an admin client (the customer cannot update orders under RLS at all,
      -- so /api/orders/:id/cancel writes as service_role on their behalf).
      -- Everyone else gets the answer derived from who they actually are.
      new.cancelled_by := coalesce(
        old.cancelled_by,
        case when service_role then new.cancelled_by else null end,
        public.cancelling_party(old.customer_id, old.restaurant_id)
      );
    end if;
  end if;

  -- Belt and braces: a row that is not cancelled carries neither, whatever it
  -- arrived holding.
  if new.status is distinct from 'cancelled' then
    new.cancellation_reason := null;
    new.cancelled_by        := null;
  end if;

  return new;
end;
$$;

-- ============================================================
-- Extend the locked-column guard.
-- ------------------------------------------------------------
-- Re-declared from 0026 with `cancelled_by` added, and `cancellation_reason`
-- deliberately left OUT of it.
--
-- `cancelled_by` answers "whose fault was this", so it is not the vendor's,
-- driver's or manager's to write — only the trigger above authors it.
-- `cancellation_reason` is the opposite: the kitchen rejecting an order is
-- exactly who should be typing the sentence, and they submit it in the same
-- update that moves the status. Pre-writing one buys nothing, because the
-- trigger freezes whatever is there the moment it is set and the guard would
-- otherwise make the honest path impossible.
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
    -- 0051: provenance, derived by stamp_order_lifecycle() from the actor.
    'cancelled_by'
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

-- ============================================================
-- Neither column is ever legitimate on an INSERT.
-- ------------------------------------------------------------
-- An order is created `placed`. RLS cannot restrict which COLUMNS an insert
-- writes, only which rows it may write, so without this a customer could seed
-- a 200-character "reason" and a `cancelled_by` of their choosing onto a brand
-- new order and have the freeze above preserve it for the rest of its life.
-- ============================================================
create or replace function public.clear_order_cancellation_on_insert()
returns trigger
language plpgsql set search_path = public as $$
begin
  new.cancelled_by        := null;
  new.cancellation_reason := null;
  return new;
end;
$$;

-- Only the roles that can actually move an order need to call it.
revoke all on function public.cancelling_party(uuid, uuid) from public;
grant execute on function public.cancelling_party(uuid, uuid)
  to authenticated, service_role;

drop trigger if exists orders_clear_cancellation_insert on public.orders;
create trigger orders_clear_cancellation_insert
  before insert on public.orders
  for each row execute function public.clear_order_cancellation_on_insert();

-- Both triggers are re-created so a database that somehow lost one gets it
-- back; the ordering rule from 0026 (guard first, then stamp) is preserved by
-- the `zz_` prefix.
drop trigger if exists orders_guard_update on public.orders;
create trigger orders_guard_update
  before update on public.orders
  for each row execute function public.guard_order_update();

drop trigger if exists zz_orders_stamp_lifecycle on public.orders;
create trigger zz_orders_stamp_lifecycle
  before update on public.orders
  for each row execute function public.stamp_order_lifecycle();

commit;
