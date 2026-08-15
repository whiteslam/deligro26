"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils/format";
import { createSettlementAction } from "@/app/admin/settlements/actions";
import type { SettlementPreview } from "@/lib/data-access/admin-settlements";

export function SettlementPreviewPanel({
  preview,
  fromDate,
  toDate,
}: {
  preview: SettlementPreview;
  fromDate: string;
  toDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const create = () =>
    startTransition(async () => {
      setError(null);
      const fd = new FormData();
      fd.set("restaurantId", preview.restaurantId);
      fd.set("fromDate", fromDate);
      fd.set("toDate", toDate);
      if (notes.trim()) fd.set("notes", notes.trim());

      const result = await createSettlementAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.id) router.push(`/admin/settlements/${result.id}`);
    });

  const owesPlatform = preview.netPayable < 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-ink">
              {preview.restaurantName}
            </p>
            <p className="text-sm text-muted">
              {preview.periodLabel} · {preview.lines.length} orders · commission{" "}
              {preview.commissionPct}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {owesPlatform ? "Vendor owes platform" : "Net payable"}
            </p>
            <p
              className={`text-2xl font-bold ${owesPlatform ? "text-deal" : "text-ink"}`}
            >
              {formatINR(Math.abs(preview.netPayable))}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm @3xl:grid-cols-4">
          <div>
            <dt className="text-muted">Food gross</dt>
            <dd className="font-semibold">{formatINR(preview.foodGross)}</dd>
          </div>
          <div>
            <dt className="text-muted">Commission</dt>
            <dd className="font-semibold">{formatINR(preview.commission)}</dd>
          </div>
          <div>
            <dt className="text-muted">Refunds recovered</dt>
            <dd className="font-semibold">
              {formatINR(preview.refundsRecovered)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Payout destination</dt>
            <dd className="font-semibold truncate">
              {preview.payout.upiId ||
                (preview.payout.bankAccountNumber
                  ? `${preview.payout.bankName ?? "Bank"} ···${preview.payout.bankAccountNumber.slice(-4)}`
                  : "Not on file")}
            </dd>
          </div>
        </dl>
      </div>

      {preview.lines.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-sm text-muted">
          No unsettled delivered orders in this range.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2.5 font-medium">Order</th>
                <th className="px-3 py-2.5 font-medium">Pay</th>
                <th className="px-3 py-2.5 font-medium text-right">Food</th>
                <th className="px-3 py-2.5 font-medium text-right">Comm.</th>
                <th className="px-3 py-2.5 font-medium text-right">Refund</th>
                <th className="px-3 py-2.5 font-medium text-right">Line</th>
              </tr>
            </thead>
            <tbody>
              {preview.lines.map((l) => (
                <tr key={l.orderId} className="border-b border-line last:border-0">
                  <td className="px-3 py-2.5 font-medium text-ink">{l.code}</td>
                  <td className="px-3 py-2.5 text-muted">
                    {l.remitsVendor
                      ? "Online"
                      : l.paymentMethod === "cod"
                        ? "COD"
                        : "Other"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatINR(l.foodGross)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatINR(l.commission)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {l.refundRecovered ? formatINR(l.refundRecovered) : "—"}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right tabular-nums font-semibold ${
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
      )}

      {preview.lines.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-ink">Notes (optional)</span>
            <textarea
              className="min-h-[72px] w-full rounded-xl border border-line bg-bg px-3 py-2 text-ink"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Week 32 cycle"
            />
          </label>
          {error ? (
            <p className="text-sm text-deal">{error}</p>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={create}
          >
            {pending ? "Creating…" : "Create draft"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
