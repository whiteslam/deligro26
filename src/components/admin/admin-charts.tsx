"use client";

import { useId } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/lib/data-access/admin-series";
import { formatINR } from "@/lib/utils/format";

/**
 * The dashboard's chart. Presentational only — every point is counted by
 * `admin-series` on the server, including the zero days, so a quiet week draws
 * as a flat line rather than as a gap.
 *
 * One chart, two series. This replaced a separate revenue area chart, orders
 * bar chart and status donut: three cards asking the operator to correlate by
 * eye what is really one question — did the money follow the volume. Bars carry
 * orders (a count is a quantity), the line carries GMV (money is a continuum),
 * and the mix that used to be a donut is now a stacked share bar in the right
 * rail, where it reads at a glance without a hover.
 *
 * Colours are CSS custom properties, not hex, so the chart follows the theme
 * toggle instead of staying light-mode orange on a dark page.
 */
const C = {
  accent: "var(--accent)",
  muted: "var(--muted)",
  grid: "var(--c-divider)",
  bar: "var(--c-bar)",
  barPeak: "var(--c-bar-peak)",
} as const;

const nf = new Intl.NumberFormat("en-IN");

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl bg-surface-2 px-6 text-center text-[13px] text-muted">
      {label}
    </div>
  );
}

function TooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const find = (key: string) =>
    Number(payload.find((p) => p.dataKey === key)?.value ?? 0);

  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-[var(--shadow-md)]">
      {label ? (
        <p className="mb-1 text-[11px] font-semibold text-muted">{label}</p>
      ) : null}
      <p className="text-data text-[13px] font-bold text-ink">
        {formatINR(find("gmv"))}
      </p>
      <p className="text-data text-[11.5px] text-muted">
        {nf.format(find("orders"))} orders
      </p>
    </div>
  );
}

/** Every nth tick, so a 30-day axis doesn't turn into a smear of dates. */
function tickGap(count: number): number {
  if (count <= 8) return 0;
  return Math.max(1, Math.ceil(count / 8) - 1);
}

/**
 * GMV and orders over the window. Both axes are hidden: the totals live in the
 * card's header, where they can be read rather than estimated off a scale, and
 * two visible axes on one 196px plot is more furniture than signal.
 */
export function GmvOrdersChart({ days }: { days: DailyPoint[] }) {
  const gradientId = useId();
  const peak = days.reduce(
    (best, d) => (d.orders > (best?.orders ?? -1) ? d : best),
    null as DailyPoint | null
  );

  if (!days.some((d) => d.orders > 0 || d.gmv > 0)) {
    return <ChartEmpty label="No orders in this window yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={days} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.accent} stopOpacity={0.16} />
            <stop offset="100%" stopColor={C.accent} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis
          dataKey="label"
          interval={tickGap(days.length)}
          stroke={C.muted}
          fontSize={10.5}
          tickLine={false}
          axisLine={false}
          dy={4}
        />
        <YAxis yAxisId="orders" hide domain={[0, (max: number) => max * 1.14]} />
        <YAxis
          yAxisId="gmv"
          orientation="right"
          hide
          domain={[0, (max: number) => max * 1.06]}
        />
        <Tooltip cursor={{ fill: "var(--c-hover)" }} content={<TooltipBox />} />
        <Bar
          yAxisId="orders"
          dataKey="orders"
          radius={[5, 5, 3, 3]}
          maxBarSize={34}
        >
          {days.map((d) => (
            <Cell
              key={d.date}
              // The busiest day is the one worth finding again; everything else
              // is context for it.
              fill={peak && d.date === peak.date ? C.barPeak : C.bar}
            />
          ))}
        </Bar>
        <Area
          yAxisId="gmv"
          type="monotone"
          dataKey="gmv"
          stroke={C.accent}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
