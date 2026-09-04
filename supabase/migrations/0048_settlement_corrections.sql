-- ============================================================
-- 0048 — Settlement corrections: recover a refund from a vendor that has
--        already been paid
-- ------------------------------------------------------------
-- The gap this closes, in the codebase's own words (refunds.ts, before this
-- migration): "There is no automatic clawback... inventing a negative
-- adjustment line here would assert a reconciliation step that doesn't exist
-- elsewhere in the ledger." And voidSettlement()'s own refusal message for a
-- paid batch: "record a correction instead." This migration is that
-- correction.
--
-- Why a new table rather than another vendor_settlement_orders row: that
-- table carries UNIQUE(order_id) on purpose (0028), so an order that has
-- already been paid out structurally cannot be added to a second settlement.
-- A correction is not a second payout for the same order — it is a debit
-- against the vendor's NEXT settlement, for money already sent on an order
-- that has since been partly or fully refunded. It needs its own row.
--
-- What happens with it, briefly (see admin-settlements.ts and refunds.ts for
-- the actual logic):
--   * A refund approved for an order already sitting in a PAID settlement
--     creates one outstanding correction here, for the exact rupee amount by
--     which the vendor's entitlement for that order dropped — recomputed with
--     the same lineFor() arithmetic every other figure in this ledger trusts,
--     never invented.
--   * The next settlement built for that vendor (writeSettlement) nets every
--     outstanding correction into its net_payable and marks them applied,
--     with a trace back to both the settlement that overpaid and the one that
--     recovered it.
--   * Voiding a settlement that had absorbed a correction reverts that
--     correction to outstanding, so it is never silently lost.
--
-- A settlement that is still a DRAFT when a refund lands does not need this
-- table at all: its vendor_settlement_orders rows can simply be deleted by
-- voiding the draft and rebuilding it, which prices the refund correctly
-- through the normal lineFor() path. This table exists only for the case a
-- draft cannot cover: money that has already left the building.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'correction_status') then
    create type public.correction_status as enum ('outstanding', 'applied', 'voided');
  end if;
end $$;

create table if not exists public.settlement_corrections (
  id                     uuid primary key default gen_random_uuid(),
  restaurant_id          uuid not null references public.restaurants (id) on delete restrict,
  order_id               uuid not null references public.orders (id) on delete restrict,
  refund_id              uuid references public.refunds (id) on delete set null,
  -- The settlement that paid the vendor for this order in the first place.
  original_settlement_id uuid not null references public.vendor_settlements (id) on delete restrict,
  -- The settlement that actually recovered it, once one exists. Null while
  -- outstanding.
  applied_settlement_id  uuid references public.vendor_settlements (id) on delete set null,
  amount                 integer not null check (amount > 0),
  reason                 text,
  status                 public.correction_status not null default 'outstanding',
  created_by             uuid not null references public.profiles (id),
  created_at             timestamptz not null default now(),
  applied_at             timestamptz
);

comment on table public.settlement_corrections is
  'A debit against a vendor''s future settlement, created when a refund is approved for an order whose payout was already settled (draft settlements handle this by being voided and rebuilt instead — see the migration header). Never edited after creation: reverted to outstanding by voidSettlement() if the settlement that absorbed it is itself voided, never updated in place.';
comment on column public.settlement_corrections.amount is
  'Whole rupees to recover from this vendor''s next payable. Computed as the drop in that order''s settlement contribution once the refund is included, using the same lineFor() arithmetic as every other settlement figure — never a re-derived or invented number.';

create index if not exists settlement_corrections_outstanding_idx
  on public.settlement_corrections (restaurant_id, status)
  where status = 'outstanding';
create index if not exists settlement_corrections_order_idx
  on public.settlement_corrections (order_id);
create index if not exists settlement_corrections_applied_idx
  on public.settlement_corrections (applied_settlement_id)
  where applied_settlement_id is not null;

alter table public.settlement_corrections enable row level security;

-- Admin only. Unlike cod_handovers/operational_expenses (0047), a manager has
-- no role in vendor settlements anywhere else in this schema (0023), so this
-- table does not extend that grant either.
drop policy if exists "settlement_corrections — admin read" on public.settlement_corrections;
create policy "settlement_corrections — admin read" on public.settlement_corrections
  for select using (public.is_admin());

-- No insert/update/delete policy for any authenticated role: every write goes
-- through the service role from admin-settlements.ts and refunds.ts, both
-- already reached only behind requireRole("admin"). Same shape as
-- vendor_settlements itself (0028).
revoke all on public.settlement_corrections from anon, authenticated;
grant select on public.settlement_corrections to authenticated;
grant select, insert, update, delete on public.settlement_corrections to service_role;

commit;
