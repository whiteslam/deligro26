"use client";

import { useId, useMemo, useState, useTransition } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, IndianRupee } from "lucide-react";
import { SectionTitle } from "@/components/roles/role-ui";
import { Button } from "@/components/ui/button";
import {
  VendorChip,
  VendorHero,
  VendorMetricCard,
  VendorPanel,
} from "@/components/vendor/vendor-ui";
import type {
  EarningsRange,
  VendorEarningsSummary,
} from "@/lib/data-access/vendor-earnings";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const C = {
  accent: "var(--accent)",
  green: "var(--green)",
  blue: "var(--blue)",
  muted: "var(--muted)",
  surface: "var(--surface)",
  line: "var(--line)",
} as const;

const RANGES: { id: EarningsRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "last_30", label: "Last 30 days" },
];

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-52 items-center justify-center rounded-xl bg-surface-2 text-sm text-muted">
      {label}
    </div>
  );
}

function ChartTooltipBox({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  valueFormatter?: (n: number, name?: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-lg">
      {label ? (
        <p className="mb-1 text-[11px] font-semibold text-muted">{label}</p>
      ) : null}
      {payload.map((p, i) => (
        <p key={i} className="text-data text-sm font-bold text-ink">
          <span
            className="mr-1.5 inline-block size-2 rounded-full"
            style={{ background: p.color }}
          />
          {p.name ? `${p.name}: ` : ""}
          {valueFormatter
            ? valueFormatter(Number(p.value) || 0, p.name)
            : String(p.value)}
        </p>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="vendor-panel">
      <SectionTitle
        right={
          hint ? (
            <p className="max-w-[12rem] text-right text-[11px] font-medium leading-snug text-muted">
              {hint}
            </p>
          ) : null
        }
      >
        {title}
      </SectionTitle>
      {children}
    </section>
  );
}

function Donut({
  data,
  centerLabel,
  centerValue,
  emptyLabel,
}: {
  data: { name: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
  emptyLabel: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return <ChartEmpty label={emptyLabel} />;

  return (
    <div className="w-full">
      <div className="relative h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={3}
              stroke={C.surface}
              strokeWidth={3}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltipBox
                  valueFormatter={(n) =>
                    `${formatINR(n)} (${Math.round((n / total) * 100)}%)`
                  }
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-data text-lg font-bold">{centerValue}</p>
          <p className="text-[11px] font-medium text-muted">{centerLabel}</p>
        </div>
      </div>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data
          .filter((d) => d.value > 0)
          .map((d) => (
            <li
              key={d.name}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted"
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: d.color }}
              />
              {d.name}{" "}
              <span className="text-data font-semibold text-ink">
                {formatINR(d.value)}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

function exportEarningsCsv(stats: VendorEarningsSummary) {
  const lines = [
    "section,label,a,b",
    `summary,range,${JSON.stringify(stats.rangeLabel)},`,
    `summary,revenue,${stats.periodRevenue},`,
    `summary,orders,${stats.periodOrders},`,
    `summary,avg_order,${stats.periodAvgOrder},`,
    `summary,items_subtotal,${stats.itemsSubtotal},`,
    `summary,delivery_fees,${stats.deliveryFees},`,
    `summary,tax,${stats.taxAmount},`,
    `summary,cancelled_value,${stats.cancelledValue},`,
    `summary,delivered_revenue,${stats.deliveredRevenue},`,
    "series,label,revenue,orders",
    ...stats.series.map(
      (p) => `series,${JSON.stringify(p.label)},${p.revenue},${p.orders}`
    ),
    "dish,name,qty,revenue",
    ...stats.topDishes.map(
      (d) => `dish,${JSON.stringify(d.name)},${d.qty},${d.revenue}`
    ),
  ];
  const blob = new Blob([`${lines.join("\n")}\n`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `earnings-${stats.range}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function VendorEarningsCharts({
  restaurantName,
  initialStats,
}: {
  restaurantName?: string;
  initialStats: VendorEarningsSummary;
}) {
  const [stats, setStats] = useState(initialStats);
  const [range, setRange] = useState<EarningsRange>(initialStats.range);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const gid = useId().replace(/:/g, "");

  // Adopt fresh server stats during render (not via an effect, which trips
  // react-hooks/set-state-in-effect and flashes the prior range for a frame).
  const [adopted, setAdopted] = useState(initialStats);
  if (adopted !== initialStats) {
    setAdopted(initialStats);
    setStats(initialStats);
    setRange(initialStats.range);
  }

  function loadRange(next: EarningsRange) {
    if (next === range && !pending) return;
    setRange(next);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/vendor/earnings?range=${next}`);
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as VendorEarningsSummary;
        setStats(data);
      } catch {
        setError("Could not load that period. Try again.");
      }
    });
  }

  const feeDonut = useMemo(
    () =>
      [
        { name: "Items", value: stats.itemsSubtotal, color: C.green },
        { name: "Delivery", value: stats.deliveryFees, color: C.blue },
        { name: "Tax", value: stats.taxAmount, color: C.accent },
      ].filter((d) => d.value > 0),
    [stats.itemsSubtotal, stats.deliveryFees, stats.taxAmount]
  );

  const statusDonut = useMemo(
    () =>
      [
        {
          name: "Delivered",
          value: stats.deliveredRevenue,
          color: C.green,
        },
        {
          name: "In pipeline",
          value: stats.pendingValue,
          color: C.accent,
        },
        {
          name: "Cancelled",
          value: stats.cancelledValue,
          color: C.muted,
        },
      ].filter((d) => d.value > 0),
    [stats.deliveredRevenue, stats.pendingValue, stats.cancelledValue]
  );

  const seriesHasData = stats.series.some((p) => p.revenue > 0 || p.orders > 0);
  const peakHour = stats.hourly.reduce(
    (top, h) => (h.orders > top.orders ? h : top),
    stats.hourly[0] ?? { hour: 0, label: "—", orders: 0, revenue: 0 }
  );

  return (
    <>
      <VendorHero
        title="Earnings"
        subtitle={
          restaurantName
            ? `${restaurantName} · revenue, fees & top dishes.`
            : "Revenue, fees & top dishes."
        }
        action={
          <div className="text-right">
            <p className="text-data text-sm font-bold">
              {formatINR(stats.periodRevenue)}
            </p>
            {stats.periodChangePercent === null ? (
              <p className="text-[10px] font-medium text-muted">
                {stats.rangeLabel}
              </p>
            ) : (
              <p
                className={cn(
                  "text-[10px] font-bold",
                  stats.periodChangePercent >= 0 ? "text-green" : "text-red-500"
                )}
              >
                {stats.periodChangePercent >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(stats.periodChangePercent)}% vs prior period
              </p>
            )}
          </div>
        }
      />

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {RANGES.map((r) => (
          <VendorChip
            key={r.id}
            active={range === r.id}
            onClick={() => loadRange(r.id)}
          >
            {r.label}
          </VendorChip>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => exportEarningsCsv(stats)}
        >
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      {pending ? (
        <p className="text-xs font-medium text-muted">Updating {stats.rangeLabel.toLowerCase()}…</p>
      ) : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 @3xl:grid-cols-4">
        <VendorMetricCard
          label={stats.rangeLabel}
          value={formatINR(stats.periodRevenue)}
          icon="wallet"
          tone="green"
          barPct={100}
          hint={`${stats.periodOrders} orders`}
        />
        <VendorMetricCard
          label="Today"
          value={formatINR(stats.todayRevenue)}
          icon="calendar"
          tone="blue"
          barPct={
            stats.periodRevenue > 0
              ? (stats.todayRevenue / stats.periodRevenue) * 100
              : 0
          }
          hint={`${stats.todayOrders} orders`}
        />
        <VendorMetricCard
          label="Avg order"
          value={formatINR(stats.periodAvgOrder)}
          icon="trending"
          tone="accent"
          barPct={
            stats.lifetimeAvgOrderValue > 0
              ? (stats.periodAvgOrder / stats.lifetimeAvgOrderValue) * 100
              : 0
          }
        />
        <VendorMetricCard
          label="Lifetime delivered"
          value={formatINR(stats.lifetimeTotal)}
          icon="rupee"
          tone="accent"
          barPct={100}
          hint={`${stats.lifetimeOrders} orders`}
        />
      </div>

      <div className="grid gap-4 @3xl:grid-cols-2">
        <ChartCard
          title="Revenue trend"
          hint={
            stats.bestBucketRevenue > 0
              ? `Peak · ${stats.bestBucketLabel}`
              : undefined
          }
        >
          {!seriesHasData ? (
            <ChartEmpty label="No revenue in this period" />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.series}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id={`revFill-${gid}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={C.green} stopOpacity={0.4} />
                      <stop
                        offset="100%"
                        stopColor={C.green}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke={C.line}
                    strokeDasharray="3 6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: C.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: C.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                    }
                  />
                  <Tooltip
                    content={
                      <ChartTooltipBox
                        valueFormatter={(n, name) =>
                          name === "Orders" ? String(n) : formatINR(n)
                        }
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke={C.green}
                    strokeWidth={2.5}
                    fill={`url(#revFill-${gid})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Orders trend" hint={`${stats.periodOrders} in period`}>
          {!seriesHasData ? (
            <ChartEmpty label="No orders in this period" />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.series}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={C.line}
                    strokeDasharray="3 6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: C.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: C.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    content={
                      <ChartTooltipBox
                        valueFormatter={(n) => `${n} orders`}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke={C.blue}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: C.blue, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 @3xl:grid-cols-2">
        <ChartCard
          title="Fee breakdown"
          hint="How order totals split in this period"
        >
          <Donut
            data={feeDonut}
            centerLabel="gross"
            centerValue={formatINR(stats.periodRevenue)}
            emptyLabel="No fee data yet"
          />
        </ChartCard>
        <ChartCard
          title="Money flow"
          hint="Period delivered/cancelled · pipeline is all open orders"
        >
          <Donut
            data={statusDonut}
            centerLabel="tracked"
            centerValue={formatINR(
              stats.deliveredRevenue +
                stats.pendingValue +
                stats.cancelledValue
            )}
            emptyLabel="No flow yet"
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Peak hours"
        hint={
          peakHour.orders > 0
            ? `Busiest · ${peakHour.label} (${peakHour.orders} orders)`
            : undefined
        }
      >
        {stats.hourly.every((h) => h.orders === 0) ? (
          <ChartEmpty label="No hourly pattern yet" />
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.hourly}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  stroke={C.line}
                  strokeDasharray="3 6"
                  vertical={false}
                />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: C.muted, fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: C.muted, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  content={
                    <ChartTooltipBox
                      valueFormatter={(n, name) =>
                        name === "Revenue" ? formatINR(n) : `${n} orders`
                      }
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke={C.accent}
                  fill={C.accent}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <div className="grid gap-4 @3xl:grid-cols-2">
        <VendorPanel
          title="Top dishes"
          subtitle="By revenue in this period"
          action={
            <span className="text-data text-xs font-bold">
              {stats.topDishes.length} items
            </span>
          }
        >
          {stats.topDishes.length === 0 ? (
            <div className="flex h-28 items-center justify-center rounded-xl bg-surface-2 text-sm text-muted">
              No dish sales in this period
            </div>
          ) : (
            <ul className="space-y-3">
              {stats.topDishes.map((d, i) => {
                const max = stats.topDishes[0]?.revenue || 1;
                const width = Math.max(8, (d.revenue / max) * 100);
                return (
                  <li key={d.name} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">
                        <span className="text-muted">{i + 1}. </span>
                        {d.name}
                      </span>
                      <span className="text-data shrink-0 font-bold">
                        {formatINR(d.revenue)}
                        <span className="ml-1 text-xs font-medium text-muted">
                          · {d.qty} sold
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </VendorPanel>

        <VendorPanel
          title="Highest orders"
          subtitle="Top tickets in this period"
        >
          {stats.recentOrders.length === 0 ? (
            <div className="flex h-28 items-center justify-center rounded-xl bg-surface-2 text-sm text-muted">
              No orders in this period
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {stats.recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{o.code}</p>
                    <p className="text-[11px] text-muted">{o.placedLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-data text-sm font-bold">
                      {formatINR(o.total)}
                    </p>
                    <p className="text-[10px] font-semibold uppercase text-muted">
                      {o.status.replace(/_/g, " ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </VendorPanel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 @3xl:grid-cols-4">
        <VendorPanel title="Prior period">
          <p className="text-data text-xl font-bold">
            {formatINR(stats.prevPeriodRevenue)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {stats.prevPeriodOrders} orders
          </p>
        </VendorPanel>
        <VendorPanel title="Delivered (period)">
          <p className="text-data text-xl font-bold text-green">
            {formatINR(stats.deliveredRevenue)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {stats.deliveredOrders} completed
          </p>
        </VendorPanel>
        <VendorPanel title="Refunds">
          <p className="text-data text-xl font-bold text-muted">
            {formatINR(stats.refundsPending + stats.refundsApproved)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Managed by Deligro admin · not shown to partners yet
          </p>
        </VendorPanel>
        <VendorPanel title="Settlement">
          <p className="text-sm leading-relaxed text-muted">
            Payouts land after delivered orders clear. Bank settlement is
            configured by Deligro ops.
          </p>
        </VendorPanel>
      </div>

      <VendorPanel
        title="Settlement note"
        subtitle="Bank payouts are not configured in Deligro yet"
        action={<IndianRupee className="size-4 text-muted" />}
      >
        <p className="text-sm text-muted">
          Delivered revenue in this period is{" "}
          <span className="text-data font-bold text-ink">
            {formatINR(stats.deliveredRevenue)}
          </span>
          . Use this as your settlement estimate until payouts go live. Export
          CSV for your accountant.
        </p>
      </VendorPanel>
    </>
  );
}
