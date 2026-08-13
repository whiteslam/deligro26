import { notFound } from "next/navigation";
import { AdminHero } from "@/components/admin/admin-ui";
import { StatTile, StatTiles } from "@/components/admin/console-ui";
import {
  getSettlement,
  type SettlementStatus,
} from "@/lib/data-access/admin-settlements";
import { formatINR } from "@/lib/utils/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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

      <StatTiles>
        <StatTile
          label="Food gross"
          value={formatINR(settlement.foodGross)}
          note="What the shop sold in this period"
        />
        <StatTile
          label="Commission"
          value={formatINR(settlement.commission)}
          note="Kept by the platform"
        />
        <StatTile
          label="Refunds recovered"
          value={formatINR(settlement.refundsRecovered)}
          note="Deducted from the payout"
        />
        <StatTile
          label="Orders"
          value={settlement.orderCount}
          note="In this batch"
        />
      </StatTiles>

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

      {settlement.status === "draft" ? (
        <SettlementActions
          id={settlement.id}
          netPayable={settlement.netPayable}
        />
      ) : null}

      {settlement.lines.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <caption className="sr-only">Orders in this settlement</caption>
              <thead>
                <tr className="border-b border-[color:var(--c-divider)] bg-surface-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5">Pay</th>
                  <th className="px-4 py-2.5 text-right">Food</th>
                  <th className="px-4 py-2.5 text-right">Comm.</th>
                  <th className="px-4 py-2.5 text-right">Refund</th>
                  <th className="px-4 py-2.5 text-right">Line</th>
                </tr>
              </thead>
              <tbody>
                {settlement.lines.map((l) => (
                  <tr
                    key={l.orderId}
                    className="c-rowin border-b border-[color:var(--c-divider-2)] transition-colors last:border-b-0 hover:bg-[var(--c-hover)]"
                  >
                    <td className="text-data px-4 py-2.5 text-xs text-ink">
                      {l.code}
                    </td>
                    <td className="px-4 py-2.5 text-[12.5px] text-muted">
                      {l.remitsVendor
                        ? "Online"
                        : l.paymentMethod === "cod"
                          ? "COD"
                          : "Other"}
                    </td>
                    <td className="text-data px-4 py-2.5 text-right text-[12.5px] tabular-nums">
                      {formatINR(l.foodGross)}
                    </td>
                    <td className="text-data px-4 py-2.5 text-right text-[12.5px] tabular-nums">
                      {formatINR(l.commission)}
                    </td>
                    <td className="text-data px-4 py-2.5 text-right text-[12.5px] tabular-nums">
                      {l.refundRecovered ? (
                        formatINR(l.refundRecovered)
                      ) : (
                        <span className="text-[color:var(--c-faint)]">—</span>
                      )}
                    </td>
                    <td
                      className={`text-data px-4 py-2.5 text-right text-[13px] font-semibold tabular-nums ${
                        l.contribution < 0 ? "text-deal" : "text-ink"
                      }`}
                    >
                      {formatINR(l.contribution)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : settlement.status === "void" ? (
        <p className="rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[13px] text-muted">
          Voided — order lines were released so they can be settled again. Header
          totals above are the snapshot from when the draft was created.
        </p>
      ) : null}
    </div>
  );
}
