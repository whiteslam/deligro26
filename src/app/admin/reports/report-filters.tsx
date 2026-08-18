"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { fieldCls, labelCls } from "@/components/ui/field";
import {
  REPORT_KINDS,
  type PaymentFilter,
  type ReportKind,
} from "@/lib/reports/kinds";

/**
 * Report type, dates, shop and payment method — all in the URL.
 *
 * GET-driven so a report is a link. "Send me the earnings for last month for
 * Sharma Foods" is then a URL someone can paste, which is the difference
 * between a report screen and a report.
 */
export function ReportFilters({
  vendors,
  kind,
  from,
  to,
  vendorId,
  payment,
}: {
  vendors: { id: string; name: string }[];
  kind: ReportKind;
  from: string;
  to: string;
  vendorId: string;
  payment: PaymentFilter;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const navigate = (patch: Record<string, string>) => {
    const usp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v && v !== "all") usp.set(k, v);
      else usp.delete(k);
    }
    start(() => router.push(`/admin/reports?${usp.toString()}`));
  };

  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap gap-2">
        {REPORT_KINDS.map((r) => (
          <button
            key={r.value}
            type="button"
            disabled={pending}
            onClick={() => navigate({ kind: r.value })}
            className={
              "press rounded-xl px-3.5 py-2 text-[13px] font-semibold " +
              (kind === r.value
                ? "bg-accent-soft text-accent-ink"
                : "bg-surface-2 text-muted")
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 @xl:grid-cols-2 @4xl:grid-cols-4">
        <label className="block space-y-1.5">
          <span className={labelCls}>From</span>
          <input
            type="date"
            className={fieldCls}
            value={from}
            disabled={pending}
            onChange={(e) => navigate({ from: e.target.value })}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>To</span>
          <input
            type="date"
            className={fieldCls}
            value={to}
            disabled={pending}
            onChange={(e) => navigate({ to: e.target.value })}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Shop</span>
          <select
            className={fieldCls}
            value={vendorId}
            disabled={pending}
            onChange={(e) => navigate({ vendor: e.target.value })}
          >
            <option value="">All shops</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Payment</span>
          <select
            className={fieldCls}
            value={payment}
            disabled={pending}
            onChange={(e) => navigate({ payment: e.target.value })}
          >
            <option value="all">Cash and online</option>
            <option value="cod">Cash on delivery only</option>
            <option value="online">Online only</option>
          </select>
        </label>
      </div>
    </div>
  );
}
