"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils/format";
import {
  PayoutLinesTable,
  PayoutTotals,
} from "@/components/admin/payout-breakdown";
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

        <div className="mt-4 border-t border-line pt-3">
          <PayoutTotals
            totals={{
              foodGross: preview.foodGross,
              commission: preview.commission,
              commissionGst: preview.commissionGst,
              otherCharges: preview.otherCharges,
              refundsRecovered: preview.refundsRecovered,
              netPayable: preview.netPayable,
            }}
            commissionPct={preview.commissionPct}
            commissionGstPct={preview.commissionGstPct}
            orderCount={preview.lines.length}
          />
        </div>

        <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-muted">
          Pay to:{" "}
          <span className="font-medium text-ink">
            {preview.payout.upiId ||
              (preview.payout.bankAccountNumber
                ? `${preview.payout.bankName ?? "Bank"} ···${preview.payout.bankAccountNumber.slice(-4)}`
                : "No payout account on file")}
          </span>
        </p>
      </div>

      {preview.lines.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-sm text-muted">
          No unpaid delivered orders in this range.
        </p>
      ) : (
        <PayoutLinesTable lines={preview.lines} />
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
