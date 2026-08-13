"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * GET-driven filters: changing vendor/dates navigates so the server can
 * recompute the preview. Creating the draft is a separate form on the preview.
 */
export function NewSettlementForm({
  vendors,
  restaurantId,
  fromDate,
  toDate,
}: {
  vendors: { id: string; name: string; commissionPct: number }[];
  restaurantId: string;
  fromDate: string;
  toDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(next: {
    restaurantId?: string;
    from?: string;
    to?: string;
  }) {
    const usp = new URLSearchParams();
    const rid = next.restaurantId ?? restaurantId;
    const from = next.from ?? fromDate;
    const to = next.to ?? toDate;
    if (rid) usp.set("restaurantId", rid);
    if (from) usp.set("from", from);
    if (to) usp.set("to", to);
    startTransition(() => {
      router.push(`/admin/settlements/new?${usp.toString()}`);
    });
  }

  return (
    <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 @3xl:grid-cols-3">
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-ink">Vendor</span>
        <select
          className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-ink"
          value={restaurantId}
          disabled={pending}
          onChange={(e) => navigate({ restaurantId: e.target.value })}
        >
          <option value="">Select a restaurant…</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.commissionPct}%)
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-ink">From (IST)</span>
        <input
          type="date"
          className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-ink"
          value={fromDate}
          disabled={pending}
          onChange={(e) => navigate({ from: e.target.value })}
        />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-ink">To (IST)</span>
        <input
          type="date"
          className="h-11 w-full rounded-xl border border-line bg-bg px-3 text-ink"
          value={toDate}
          disabled={pending}
          onChange={(e) => navigate({ to: e.target.value })}
        />
      </label>
    </div>
  );
}
