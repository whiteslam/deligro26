-- ============================================================
-- 0028 — Vendor settlements (admin ledger)
-- ------------------------------------------------------------
-- Payout bank/UPI details already live on restaurants (0017/0018). Customer
-- collection exists (0025). This migration is the missing settle-out side:
-- an admin builds a date-range draft of delivered orders, remits bank/UPI
-- off-platform, then marks the batch paid with a UTR.
--
-- Money does NOT move through this table. It is a ledger of what was owed and
-- what an operator recorded as remitted.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'vendor_settlement_status') then
    create type public.vendor_settlement_status as enum ('draft', 'paid', 'void');
  end if;
end $$;

create table if not exists public.vendor_settlements (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references public.restaurants (id) on delete restrict,

  -- Inclusive IST calendar bounds stored as timestamptz instants
  -- (period_start = IST midnight of first day; period_end = IST midnight of
  -- the day AFTER the last day — exclusive upper bound, same convention as
  -- analytics windows in lib/utils/ist-time.ts).
  period_start       timestamptz not null,
  period_end         timestamptz not null,

  food_gross         integer not null default 0,
  commission         integer not null default 0,
  refunds_recovered  integer not null default 0,
  -- Can be negative when COD commission due exceeds online remittance.
  net_payable        integer not null default 0,

  status             public.vendor_settlement_status not null default 'draft',

  paid_at            timestamptz,
  paid_by            uuid references public.profiles (id) on delete set null,
  payment_ref        text,
  notes              text,

  created_at         timestamptz not null default now(),
  created_by         uuid references public.profiles (id) on delete set null,
  voided_at          timestamptz,
  voided_by          uuid references public.profiles (id) on delete set null,

  constraint vendor_settlements_period_check check (period_end > period_start)
);

create index if not exists vendor_settlements_restaurant_idx
  on public.vendor_settlements (restaurant_id, created_at desc);

create index if not exists vendor_settlements_status_idx
  on public.vendor_settlements (status, created_at desc);

-- One order may appear in at most one live (non-void) settlement. Voiding
-- deletes the child rows so the order can be resettled; the header row stays
-- for audit with status = void.
create table if not exists public.vendor_settlement_orders (
  id                 uuid primary key default gen_random_uuid(),
  settlement_id      uuid not null references public.vendor_settlements (id) on delete cascade,
  order_id           uuid not null references public.orders (id) on delete restrict,

  food_gross         integer not null check (food_gross >= 0),
  commission         integer not null check (commission >= 0),
  vendor_net         integer not null,
  -- What this line contributes to net_payable (online: +vendor_net − refunds;
  -- COD: −commission − refunds).
  contribution       integer not null,
  refund_recovered   integer not null default 0 check (refund_recovered >= 0),

  payment_method     text,
  payment_status     text,

  created_at         timestamptz not null default now(),

  constraint vendor_settlement_orders_order_unique unique (order_id)
);

create index if not exists vendor_settlement_orders_settlement_idx
  on public.vendor_settlement_orders (settlement_id);

alter table public.vendor_settlements enable row level security;
alter table public.vendor_settlement_orders enable row level security;

-- Admins may read; every write goes through the service role from
-- src/lib/data-access/admin-settlements.ts after requireRole('admin').
drop policy if exists "vendor_settlements — admin read" on public.vendor_settlements;
create policy "vendor_settlements — admin read" on public.vendor_settlements
  for select using (public.is_admin());

drop policy if exists "vendor_settlement_orders — admin read" on public.vendor_settlement_orders;
create policy "vendor_settlement_orders — admin read" on public.vendor_settlement_orders
  for select using (public.is_admin());

revoke insert, update, delete on public.vendor_settlements from anon, authenticated;
revoke insert, update, delete on public.vendor_settlement_orders from anon, authenticated;
grant select on public.vendor_settlements to authenticated;
grant select on public.vendor_settlement_orders to authenticated;
grant select, insert, update, delete on public.vendor_settlements to service_role;
grant select, insert, update, delete on public.vendor_settlement_orders to service_role;

commit;
