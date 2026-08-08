"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint, StatusSlice } from "@/lib/data-access/admin-series";
import { formatINR } from "@/lib/utils/format";

/**
 * The dashboard's charts. Presentational only — every point is counted by
 * `admin-series` on the server, including the zero days, so a quiet week draws
 * as a flat line rather than as a gap.
 *
 * Colours are CSS custom properties, not hex, so the charts follow the theme
 * toggle instead of staying light-mode orange on a dark page.
 */
const C = {
  accent: "var(--accent)",
  green: "var(--green)",
  blue: "var(--blue)",
  deal: "var(--deal)",
  pop: "var(--pop)",
  muted: "var(--muted)",
  line: "var(--line)",
} as const;

const nf = new Intl.NumberFormat("en-IN");

const AXIS = {
  stroke: C.muted,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl bg-surface-2 px-6 text-center text-sm text-muted">
      {label}
    </div>
  );
}

function TooltipBox({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  format: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-[var(--shadow-md)]">
      {label ? (
        <p className="mb-1 text-[11px] font-semibold text-muted">{label}</p>
      ) : null}
      {payload.map((p, i) => (
        <p key={i} className="text-data text-sm font-bold text-ink">
          <span
            className="mr-1.5 inline-block size-2 rounded-full align-middle"
            style={{ background: p.color }}
          />
          {format(Number(p.value) || 0)}
        </p>
      ))}
    </div>
  );
}

/** Every nth tick, so a 30-day axis doesn't turn into a smear of dates. */
function tickGap(count: number): number {
  if (count <= 8) return 0;
  return Math.max(1, Math.ceil(count / 8) - 1);
}

/** GMV per day — the console's headline trend. */
export function RevenueChart({ days }: { days: DailyPoint[] }) {
  const gradientId = useId();

  if (!days.some((d) => d.gmv > 0)) {
    return <ChartEmpty label="No revenue recorded in this window yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={days} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={C.accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="label" interval={tickGap(days.length)} {...AXIS} />
        <YAxis
          width={54}
          tickFormatter={(v: number) =>
            v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`
          }
          {...AXIS}
        />
        <Tooltip
          cursor={{ stroke: C.accent, strokeDasharray: "3 3" }}
          content={<TooltipBox format={formatINR} />}
        />
        <Area
          type="monotone"
          dataKey="gmv"
          stroke={C.accent}
          strokeWidth={2.25}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Orders per day. Bars, because a count is a quantity, not a continuum. */
export function OrdersChart({ days }: { days: DailyPoint[] }) {
  if (!days.some((d) => d.orders > 0)) {
    return <ChartEmpty label="No orders in this window yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={days} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="label" interval={tickGap(days.length)} {...AXIS} />
        <YAxis width={36} allowDecimals={false} {...AXIS} />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={<TooltipBox format={(n) => `${nf.format(n)} orders`} />}
        />
        <Bar dataKey="orders" fill={C.blue} radius={[5, 5, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Stage colours, matching the status pills used on the Orders screen. */
const SLICE_COLORS: Record<string, string> = {
  placed: C.accent,
  kitchen: C.pop,
  ready: C.blue,
  on_the_way: C.blue,
  delivered: C.green,
  cancelled: C.deal,
};

/**
 * How the window's orders are distributed across stages. The centre shows the
 * total so the ring is readable without hovering every slice.
 */
export function StatusDonut({ slices }: { slices: StatusSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.count, 0);

  if (!total) {
    return <ChartEmpty label="No orders in this window to break down." />;
  }

  return (
    <div className="flex h-full flex-col gap-3 @md:flex-row @md:items-center">
      <div className="relative h-[168px] w-full @md:w-[168px] @md:shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((s) => (
                <Cell key={s.status} fill={SLICE_COLORS[s.status] ?? C.muted} />
              ))}
            </Pie>
            <Tooltip
              content={<TooltipBox format={(n) => `${nf.format(n)} orders`} />}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-data text-xl font-extrabold leading-none">
              {nf.format(total)}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              orders
            </p>
          </div>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((s) => (
          <li key={s.status} className="flex items-center gap-2 text-[13px]">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: SLICE_COLORS[s.status] ?? C.muted }}
            />
            <span className="min-w-0 flex-1 truncate text-muted">{s.label}</span>
            <span className="text-data shrink-0 font-bold">
              {nf.format(s.count)}
            </span>
            <span className="w-10 shrink-0 text-right text-[11px] text-muted">
              {Math.round((s.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
