-- ============================================================
-- 0047 — COD collection record, cash handover chain, operational expenses
-- ------------------------------------------------------------
-- Confirmed business rules this migration implements:
--
--   1. Riders are salaried, not paid a per-order commission and not charged a
--      subscription. That was already the assumption throughout the app
--      (pricing.ts, build-plan.ts, the driver board); nothing here changes it.
--
--   2. Deligro provides the EV bike and bears its running costs (maintenance,
--      charging, other rider-related operating expenses). Bike ALLOCATION
--      stays an offline register on purpose — this migration does not track
--      which bike belongs to which rider. What it adds is a place to record
--      the rupee amount when a bike-related (or other small operational) cost
--      is financially material, whether it was paid offline or digitally.
--
--   3. COD cash physically moves Customer → Rider → Manager → Owner, and that
--      movement can stay offline — but the collection and each handover leg
--      must have a corresponding digital record. Before this migration,
--      `advanceDelivery()` deliberately left a COD order's money untouched at
--      completion (see its own comment in driver-orders.ts: "no cash
--      reconciliation behind that word yet"). This migration is what that
--      comment was waiting for: a place to record the collection, and a place
--      to record each handover, without inventing a payment rail nobody asked
--      for.
--
-- Deliberately NOT built here, per the same rules: rider payroll, EV bike
-- allocation/asset tracking, vendor cash remittance, or any payment gateway
-- integration. Those stay offline processes by design. Only the financial
-- RECORD is digital.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- ============================================================
-- 1 — COD collection, recorded on the delivery itself.
-- ------------------------------------------------------------
-- One row already exists per order (`deliveries`), so the collection record
-- lives there rather than in a new table. Written once, by the rider's own
-- "mark delivered" action (see advanceDelivery in driver-orders.ts) — the
-- rider does nothing extra to produce it.
-- ============================================================
alter table public.deliveries
  add column if not exists cod_collected_amount integer,
  add column if not exists cod_collected_at timestamptz;

do $$
begin
  alter table public.deliveries
    add constraint deliveries_cod_collected_amount_nonneg
    check (cod_collected_amount is null or cod_collected_amount >= 0);
exception
  when duplicate_object then null;
end $$;

comment on column public.deliveries.cod_collected_amount is
  'Whole rupees the rider confirmed collecting from the customer at handover, for a cash-on-delivery order. Null until the order is marked delivered; stays null for an online-paid order, which never has cash to collect.';
comment on column public.deliveries.cod_collected_at is
  'When the collection was recorded. Set once, at delivery completion, never revised after.';

-- ============================================================
-- 2 — The cash handover chain: Rider -> Manager -> Owner.
-- ------------------------------------------------------------
-- Each row is one physical handover, recorded after the fact by whoever
-- received the cash. The physical movement stays offline; this is only the
-- record that it happened, for how much, and who is now holding it.
--
-- Deliberately not tied to individual orders: a rider hands over a shift's
-- accumulated cash in one lump, not order by order, and forcing a one-to-one
-- link back to `deliveries` would demand a reconciliation feature nobody
-- asked for. Reconciling a handover total against `deliveries.cod_collected_amount`
-- for the same period is an operator's own arithmetic for now — see the
-- summary on /manager/cash, which shows both totals side by side without
-- forcing them to match.
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'cash_handover_leg') then
    create type public.cash_handover_leg as enum ('rider_to_manager', 'manager_to_owner');
  end if;
end $$;

create table if not exists public.cod_handovers (
  id            uuid primary key default gen_random_uuid(),
  leg           public.cash_handover_leg not null,
  from_user     uuid references public.profiles (id) on delete set null,
  to_user       uuid references public.profiles (id) on delete set null,
  amount        integer not null check (amount >= 0),
  handover_date date not null default current_date,
  note          text,
  recorded_by   uuid not null references public.profiles (id),
  created_at    timestamptz not null default now()
);

comment on table public.cod_handovers is
  'Digital record of one cash handover leg (rider to manager, or manager to owner). The cash itself can move offline; this row is what makes that movement auditable. Never edited after creation — a correction is a new row, not an update, same as every other financial record in this schema.';
comment on column public.cod_handovers.recorded_by is
  'Who entered this record, which is not always from_user or to_user (an admin may log a handover after the fact).';

create index if not exists cod_handovers_date_idx
  on public.cod_handovers (handover_date desc);

alter table public.cod_handovers enable row level security;

drop policy if exists "cod_handovers — staff read" on public.cod_handovers;
create policy "cod_handovers — staff read" on public.cod_handovers
  for select using (public.is_admin() or public.current_role() = 'manager');

-- No insert/update/delete policy for any authenticated role: every write goes
-- through the service role from recordCodHandover() behind
-- requireRole(["manager", "admin"]), the same shape as vendor_settlements
-- (0028). A financial record like this is not something a client-held JWT
-- writes directly, however the write is authorized.
revoke all on public.cod_handovers from anon, authenticated;
grant select on public.cod_handovers to authenticated;
grant select, insert, update, delete on public.cod_handovers to service_role;

-- ============================================================
-- 3 — Operational expenses: EV bike costs and other small, offline-first spend.
-- ------------------------------------------------------------
-- Not a payroll system and not an accounts-payable system. It is the minimum
-- needed so that a financially material transaction handled offline (a bike
-- battery swap paid in cash, a rider's monthly salary transferred by normal
-- bank transfer) still has a corresponding record in Deligro, per the
-- confirmed rule that offline execution must never mean an untracked
-- transaction.
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'expense_category') then
    create type public.expense_category as enum (
      'rider_salary',
      'ev_bike_maintenance',
      'ev_bike_charging',
      'rider_other',
      'small_expense',
      'other'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'expense_payment_method') then
    create type public.expense_payment_method as enum ('offline_cash', 'offline_bank', 'upi', 'other');
  end if;
end $$;

create table if not exists public.operational_expenses (
  id             uuid primary key default gen_random_uuid(),
  category       public.expense_category not null,
  amount         integer not null check (amount >= 0),
  -- Named driver_id, matching deliveries.driver_id, even though the product
  -- calls this role "rider" everywhere above the database (ManagerRider,
  -- listRiders()). profiles.role is 'driver'; this table follows the schema's
  -- own naming, not the UI's.
  driver_id      uuid references public.profiles (id) on delete set null,
  payment_method public.expense_payment_method not null default 'offline_cash',
  expense_date   date not null default current_date,
  note           text,
  recorded_by    uuid not null references public.profiles (id),
  created_at     timestamptz not null default now()
);

comment on table public.operational_expenses is
  'A Deligro cost recorded here, whether the underlying payment happened offline (cash, bank transfer) or digitally (UPI). Rider salary, EV bike maintenance/charging, and other rider-related or small operational spend all classify as Deligro costs, never as revenue. This is a record of what was spent, not a payment rail — it does not move money.';
comment on column public.operational_expenses.driver_id is
  'Which rider this expense relates to, when it is rider-specific (salary, a bike cost tied to their bike). Null for an expense that is not rider-specific.';

create index if not exists operational_expenses_date_idx
  on public.operational_expenses (expense_date desc);
create index if not exists operational_expenses_driver_idx
  on public.operational_expenses (driver_id)
  where driver_id is not null;

alter table public.operational_expenses enable row level security;

drop policy if exists "operational_expenses — staff read" on public.operational_expenses;
create policy "operational_expenses — staff read" on public.operational_expenses
  for select using (public.is_admin() or public.current_role() = 'manager');

revoke all on public.operational_expenses from anon, authenticated;
grant select on public.operational_expenses to authenticated;
grant select, insert, update, delete on public.operational_expenses to service_role;

commit;
