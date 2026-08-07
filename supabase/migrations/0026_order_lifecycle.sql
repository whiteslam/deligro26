-- ============================================================
-- 0026 — Order lifecycle timestamps, refund provenance, rider location
-- ------------------------------------------------------------
-- MUST run after 0025_payments_razorpay.sql: it re-declares
-- `guard_order_update()` and extends the locked-column list that migration set.
--
-- The audit that prompted this found the order pipeline honest about *state*
-- and silent about *time*. `orders` recorded created_at and nothing else, so:
--
--   * the ETA shown to a customer was a per-restaurant constant that never
--     moved, from checkout to doorstep;
--   * "is this order late?" was unanswerable, because nothing recorded when the
--     kitchen accepted it or when the food was ready;
--   * `platform_settings.default_prep_minutes` was editable by an admin and
--     read by nothing.
--
-- Three timestamps fix all three. They are stamped by a trigger rather than by
-- the app, so they are correct no matter which path moved the order — the
-- vendor board, the cancel route, a manager, or a future admin override — and
-- so they cannot be forged by whoever happens to hold the row.
--
-- Idempotent: safe to re-run. Apply in the Supabase SQL editor, or with
-- `supabase db push`.
-- ============================================================

begin;

-- ============================================================
-- Order lifecycle timestamps.
-- ============================================================
alter table public.orders
  add column if not exists accepted_at  timestamptz,
  add column if not exists ready_at     timestamptz,
  add column if not exists cancelled_at timestamptz;

comment on column public.orders.accepted_at is
  'When the kitchen accepted (placed -> kitchen). Null while awaiting acceptance — which is what `placed` means, and what the customer tracker used to mis-label as "accepted".';
comment on column public.orders.ready_at is
  'When the food was packed (kitchen -> ready). The start of the waiting-for-a-rider window.';
comment on column public.orders.cancelled_at is
  'When the order was cancelled, by whichever party.';

-- Backfill so existing rows are not retro-actively "late": an order already
-- past a stage happened at some point, and created_at is the only honest
-- lower bound we have.
update public.orders
   set accepted_at = coalesce(accepted_at, created_at)
 where accepted_at is null
   and status in ('kitchen', 'ready', 'on_the_way', 'delivered');

update public.orders
   set ready_at = coalesce(ready_at, created_at)
 where ready_at is null
   and status in ('ready', 'on_the_way', 'delivered');

update public.orders
   set cancelled_at = coalesce(cancelled_at, created_at)
 where cancelled_at is null
   and status = 'cancelled';

-- ============================================================
-- Stamp the timestamps from the transition itself.
-- ------------------------------------------------------------
-- `coalesce(old, now())` on purpose: a stage is stamped the FIRST time it is
-- entered. Re-entering a state (or an admin correcting a status) must not
-- rewrite history and quietly make a late order look punctual.
-- ============================================================
create or replace function public.stamp_order_lifecycle()
returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'kitchen' then
      new.accepted_at := coalesce(old.accepted_at, now());
    elsif new.status = 'ready' then
      -- A kitchen that skips straight to ready still accepted it at some point.
      new.accepted_at := coalesce(old.accepted_at, now());
      new.ready_at    := coalesce(old.ready_at, now());
    elsif new.status = 'cancelled' then
      new.cancelled_at := coalesce(old.cancelled_at, now());
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- Extend the locked-column guard.
-- ------------------------------------------------------------
-- Re-declared from 0025 with the three timestamps added. They are evidence
-- about lateness — and therefore about who is at fault for it — so they are not
-- the vendor's, driver's or manager's to edit. Only the trigger writes them.
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
    'accepted_at', 'ready_at', 'cancelled_at'
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

-- Named to sort AFTER orders_guard_update: same-timing triggers fire
-- alphabetically, and the guard must compare the row as the caller submitted it.
-- Stamping first would make the guard reject the vendor's own legitimate
-- status change, because the timestamp it is about to add would read as an
-- attempt to edit a locked column.
drop trigger if exists zz_orders_stamp_lifecycle on public.orders;
create trigger zz_orders_stamp_lifecycle
  before update on public.orders
  for each row execute function public.stamp_order_lifecycle();

-- Late-order queries scan by stage, not by id.
create index if not exists orders_accepted_at_idx on public.orders (accepted_at);
create index if not exists orders_ready_at_idx    on public.orders (ready_at);

-- ============================================================
-- Refund provenance.
-- ------------------------------------------------------------
-- The refunds table has existed since 0001 and nothing has ever written to it:
-- there was no request path and no automatic refund, so the admin queue could
-- only ever be empty. Now that an order can actually be paid (0025), a
-- cancellation has to be able to give the money back, and the row has to say
-- where the refund came from and whether the gateway honoured it.
-- ============================================================
alter table public.refunds
  add column if not exists requested_by       uuid references public.profiles (id),
  add column if not exists origin             text not null default 'customer',
  add column if not exists provider_refund_id text,
  add column if not exists settled_at         timestamptz;

comment on column public.refunds.origin is
  'customer | vendor_rejected | admin | system — who or what caused the refund to exist.';
comment on column public.refunds.provider_refund_id is
  'Razorpay refund id, once the gateway has actually returned the money. Null for a COD refund, which is settled off-platform.';

create unique index if not exists refunds_provider_refund_id_key
  on public.refunds (provider_refund_id)
  where provider_refund_id is not null;

create index if not exists refunds_order_id_idx on public.refunds (order_id);

-- ============================================================
-- A refund request cannot exceed what was paid.
-- ------------------------------------------------------------
-- "refunds — customer request" (0001) checks that the order is the caller's and
-- that status is 'pending' — but says nothing about `amount`. A customer could
-- post a ₹9,99,999 request against a ₹240 order. It is only a request, and an
-- admin still decides, so it was never money out the door; it is still a
-- garbage-data vector aimed at the one queue an operator is asked to trust.
--
-- Also: one open request per order. Without it, refresh-spamming the request
-- button buries the queue under duplicates of the same claim.
-- ============================================================
-- The bound is written as a scalar subquery rather than as an extra condition
-- inside an EXISTS: in there, `amount` is an unqualified reference to the row
-- being inserted resolving across a subquery boundary, which is legal but too
-- subtle to be load-bearing on a money path. This form is unambiguous, and it
-- fails closed — for an order that is not the caller's the subquery yields
-- NULL, `amount <= NULL` is NULL, and a WITH CHECK that is not TRUE rejects.
drop policy if exists "refunds — customer request" on public.refunds;
create policy "refunds — customer request" on public.refunds for insert
  with check (
    status = 'pending'
    and amount > 0
    and amount <= (
      select o.total
      from public.orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
    )
  );

create unique index if not exists refunds_one_open_per_order
  on public.refunds (order_id)
  where status = 'pending';

-- ============================================================
-- Rider location is reported, not invented.
-- ------------------------------------------------------------
-- 0008 added driver_lat/lng/driver_location_at, and the only thing that ever
-- wrote them was `acceptDelivery`, with a hardcoded offset from the centre of
-- Bemetara that never changed again. The map a customer watched was a
-- simulation drawn from a fixed fake origin.
--
-- The columns are already right; what was missing is a way for the rider's
-- device to report, and a way to tell a real fix from the placeholder.
-- ============================================================
alter table public.deliveries
  add column if not exists driver_location_source text;

comment on column public.deliveries.driver_location_source is
  'gps | none. Null or ''none'' means no real fix has ever been reported and any position shown is interpolated — the customer UI must say so rather than draw a confident dot.';

commit;
