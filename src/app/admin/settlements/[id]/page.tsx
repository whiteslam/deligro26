import { notFound } from "next/navigation";
import { AdminHero } from "@/components/admin/admin-ui";
import {
  OrderPayoutBreakdown,
  PayoutLinesTable,
  PayoutTotals,
} from "@/components/admin/payout-breakdown";
import {
  getSettlement,
  type SettlementStatus,
} from "@/lib/data-access/admin-settlements";
import { formatINR } from "@/lib/utils/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ConsoleOnly } from "@/components/admin/console-only";
import { SettlementActions } from "./settlement-actions";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<SettlementStatus, string> = {
  draft: "pill pill-pop",
  paid: "pill pill-green",
  void: "pill pill-muted",
};

const STATUS_LABEL: Record<SettlementStatus, string> = {
  draft: "Draft",
  paid: "Paid",
  void: "Void",
};

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured) notFound();

  const { id } = await params;
  let settlement;
  try {
    settlement = await getSettlement(id);
  } catch {
    notFound();
  }
  if (!settlement) notFound();

  const owes = settlement.netPayable < 0;
  const payout = settlement.payout;

  return (
    <div className="space-y-4">
      <AdminHero
        title={settlement.restaurantName}
        tag={STATUS_LABEL[settlement.status]}
        subtitle={settlement.periodLabel}
        backHref="/admin/settlements"
        backLabel="Settlements"
        badge={
          <span className={STATUS_PILL[settlement.status]}>
            {STATUS_LABEL[settlement.status]}
          </span>
        }
        action={
          <div className="text-right">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted">
              {owes ? "Vendor owes" : "Net payable"}
            </p>
            <p
              className={`mt-1 text-[21px] font-bold leading-none tracking-[-0.02em] tabular-nums ${owes ? "text-deal" : "text-ink"}`}
            >
              {formatINR(Math.abs(settlement.netPayable))}
            </p>
          </div>
        }
      />

      {settlement.kind === "instant" ? (
        <p className="rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[13px] leading-relaxed text-muted">
          Early payout for a single order, made ahead of this shop&apos;s normal
          cycle. It is excluded from the next settlement automatically, so it
          cannot be paid twice.
        </p>
      ) : null}

      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="text-sm font-semibold text-ink">
          How this payout was worked out
        </p>
        <div className="mt-3">
          <PayoutTotals
            totals={{
              foodGross: settlement.foodGross,
              commission: settlement.commission,
              commissionGst: settlement.commissionGst,
              otherCharges: settlement.otherCharges,
              refundsRecovered: settlement.refundsRecovered,
              netPayable: settlement.netPayable,
            }}
            commissionPct={payout.commissionPct}
            commissionGstPct={payout.commissionGstPct}
            orderCount={settlement.orderCount}
            mismatch={settlement.mismatch}
          />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="text-sm font-semibold text-ink">Payout details</p>
        <dl className="mt-3 grid gap-2 text-sm @3xl:grid-cols-2">
          <div className="flex justify-between gap-3 border-b border-line py-1.5">
            <dt className="text-muted">UPI</dt>
            <dd className="font-medium">{payout.upiId ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-line py-1.5">
            <dt className="text-muted">Account name</dt>
            <dd className="font-medium">{payout.bankAccountName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-line py-1.5">
            <dt className="text-muted">Account no.</dt>
            <dd className="font-medium font-mono text-xs">
              {payout.bankAccountNumber ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-line py-1.5">
            <dt className="text-muted">IFSC</dt>
            <dd className="font-medium">{payout.bankIfsc ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-line py-1.5">
            <dt className="text-muted">Bank</dt>
            <dd className="font-medium">{payout.bankName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-line py-1.5">
            <dt className="text-muted">Commission %</dt>
            <dd className="font-medium">{payout.commissionPct}%</dd>
          </div>
        </dl>
        <p className="mt-2 text-[11.5px] text-muted">
          The rates shown are what this shop is on today. The rupee figures above
          are the snapshot taken when this settlement was built — changing a rate
          never rewrites a payout that already exists.
        </p>
        {settlement.paymentRef ? (
          <p className="mt-3 text-sm text-muted">
            UTR / ref:{" "}
            <span className="font-medium text-ink">{settlement.paymentRef}</span>
          </p>
        ) : null}
        {settlement.notes ? (
          <p className="mt-2 text-sm text-muted">Notes: {settlement.notes}</p>
        ) : null}
      </div>

      {/* Console-only: marking a payout paid means typing a UTR against a money
          transfer, and a phone keyboard is the wrong place to get that right.
          Reading the statement is exactly what a phone is for, so it stays. */}
      {settlement.status === "draft" ? (
        <ConsoleOnly
          tool="Settling a payout"
          why="Recording a UTR or voiding a batch is money movement."
        >
          <SettlementActions
            id={settlement.id}
            netPayable={settlement.netPayable}
          />
        </ConsoleOnly>
      ) : null}

      {settlement.lines.length === 1 ? (
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold text-ink">
            Order {settlement.lines[0].code}
          </p>
          <div className="mt-3">
            <OrderPayoutBreakdown
              line={settlement.lines[0]}
              commissionPct={payout.commissionPct}
              commissionGstPct={payout.commissionGstPct}
            />
          </div>
        </div>
      ) : settlement.lines.length > 1 ? (
        <PayoutLinesTable lines={settlement.lines} />
      ) : settlement.status === "void" ? (
        <p className="rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[13px] text-muted">
          Voided — order lines were released so they can be settled again. Header
          totals above are the snapshot from when the draft was created.
        </p>
      ) : null}
    </div>
  );
}
