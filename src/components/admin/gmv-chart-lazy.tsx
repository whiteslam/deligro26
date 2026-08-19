"use client";

import dynamic from "next/dynamic";
import type { DailyPoint } from "@/lib/data-access/admin-series";

/**
 * Recharts, off the admin dashboard's critical path.
 *
 * The library is roughly 400KB and was imported statically into a page that
 * also carries the stat tiles, the live board and the approval queue — all of
 * which are the things an operator actually opens this page for, and all of
 * which waited on it to hydrate. The chart is below them and is decoration: the
 * totals it plots are already readable in the card header above it.
 *
 * `ssr: false` needs a client component to live in, which is the only reason
 * this wrapper exists — `src/app/admin/page.tsx` is a server component and
 * cannot pass that option itself.
 *
 * Second benefit, and the larger one on a phone: the real `GmvOrdersChart` sits
 * inside `<ConsoleOnly>`, which blocks the client mount at phone width. Because
 * the chunk is fetched on mount rather than on import, a handset now never
 * downloads Recharts at all instead of downloading it and rendering nothing.
 */
const GmvOrdersChartImpl = dynamic(
  () => import("./admin-charts").then((m) => m.GmvOrdersChart),
  {
    ssr: false,
    // Matches the chart's own height so the card does not resize when it lands.
    loading: () => (
      <div
        className="h-[196px] w-full animate-pulse rounded-xl bg-surface-2"
        aria-hidden
      />
    ),
  }
);

export function GmvOrdersChart({ days }: { days: DailyPoint[] }) {
  return <GmvOrdersChartImpl days={days} />;
}
