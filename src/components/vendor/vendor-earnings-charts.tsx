"use client";

import { SectionTitle } from "@/components/roles/role-ui";
import {
  VendorHero,
  VendorMetricCard,
  VendorPanel,
} from "@/components/vendor/vendor-ui";
import type { VendorEarningsSummary } from "@/lib/data-access/vendor-earnings";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function barHeight(value: number, max: number, minPx = 6): number {
  if (max <= 0 || value <= 0) return minPx;
  return Math.max(minPx, Math.round((value / max) * 100));
}

function pctOf(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function ChartLegend({
  items,
}: {
  items: { color: string; label: string; value?: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted"
        >
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ background: item.color }}
          />
          <span>{item.label}</span>
          {item.value ? (
            <span className="text-data font-semibold text-ink">{item.value}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function VerticalBarChart({
  title,
  subtitle,
  totalLabel,
  totalValue,
  bars,
  highlightKey,
  accentClass = "bg-accent/85",
  highlightClass = "bg-green",
  emptyLabel = "No data yet",
  formatValue = formatINR,
}: {
  title: string;
  subtitle?: string;
  totalLabel?: string;
  totalValue?: number;
  bars: { key: string; label: string; value: number }[];
  highlightKey?: string;
  accentClass?: string;
  highlightClass?: string;
  emptyLabel?: string;
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 0);
  const hasData = max > 0;
  const sum = bars.reduce((s, b) => s + b.value, 0);

  return (
    <section className="vendor-panel">
      <SectionTitle
        right={
          <div className="text-right">
            {totalLabel && totalValue !== undefined ? (
              <p className="text-data text-sm font-bold text-ink">
                {formatValue(totalValue)}
              </p>
            ) : null}
            {subtitle ? (
              <p className="text-[11px] font-semibold text-muted">{subtitle}</p>
            ) : null}
          </div>
        }
      >
        {title}
      </SectionTitle>

      {!hasData ? (
        <div className="flex h-36 items-center justify-center rounded-xl bg-surface-2 text-sm text-muted">
          {emptyLabel}
        </div>
      ) : (
        <>
          <div className="flex h-44 items-end justify-between gap-1 sm:gap-2">
            {bars.map((bar) => {
              const highlighted = bar.key === highlightKey && bar.value > 0;
              return (
                <div
                  key={bar.key}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1"
                >
                  <span
                    className={cn(
                      "text-data truncate text-[9px] font-semibold leading-none sm:text-[10px]",
                      highlighted ? "text-green" : "text-muted"
                    )}
                  >
                    {bar.value > 0 ? formatValue(bar.value) : "—"}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={cn(
                        "w-full rounded-t-md transition-[height]",
                        highlighted ? highlightClass : accentClass,
                        !highlighted && accentClass.includes("accent") && "vendor-chart-bar"
                      )}
                      style={{ height: `${barHeight(bar.value, max)}%` }}
                    />
                  </div>
                  <span className="truncate text-[10px] font-medium text-muted sm:text-[11px]">
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>

          <ul className="mt-3 divide-y divide-line border-t border-line">
            {bars.map((bar) => (
              <li
                key={`list-${bar.key}`}
                className="flex items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="font-medium">{bar.label}</span>
                <span className="text-data font-semibold">
                  {bar.value > 0 ? formatValue(bar.value) : "—"}
                  {sum > 0 && bar.value > 0 ? (
                    <span className="ml-1.5 text-xs font-medium text-muted">
                      ({pctOf(bar.value, sum)})
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function DualBarCompare({
  title,
  left,
  right,
  formatValue = formatINR,
}: {
  title: string;
  left: { label: string; value: number };
  right: { label: string; value: number };
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(left.value, right.value, 1);
  const diff = left.value - right.value;

  return (
    <section className="vendor-panel">
      <SectionTitle
        right={
          diff !== 0 ? (
            <span
              className={cn(
                "text-xs font-bold",
                diff > 0 ? "text-green" : "text-red-500"
              )}
            >
              {diff > 0 ? "+" : ""}
              {formatValue(diff)}
            </span>
          ) : null
        }
      >
        {title}
      </SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        {[left, right].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-2">
            <span className="text-data text-sm font-bold sm:text-base">
              {formatValue(item.value)}
            </span>
            <div className="flex h-32 w-full items-end justify-center">
              <div
                className="w-12 max-w-full rounded-t-lg bg-accent/85 sm:w-16"
                style={{ height: `${barHeight(item.value, max, 8)}%` }}
              />
            </div>
            <span className="text-center text-xs font-semibold text-muted">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HorizontalBarRow({
  label,
  value,
  max,
  colorClass,
  formatValue = formatINR,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  colorClass: string;
  formatValue?: (n: number) => string;
  suffix?: string;
}) {
  const width = max > 0 ? Math.max(value > 0 ? 8 : 0, (value / max) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="text-data shrink-0 text-sm font-bold">
          {formatValue(value)}
          {suffix ? (
            <span className="ml-1 text-xs font-medium text-muted">{suffix}</span>
          ) : null}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full transition-[width]", colorClass)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function HorizontalBarChart({
  title,
  rows,
  formatValue = formatINR,
}: {
  title: string;
  rows: { label: string; value: number; colorClass: string; suffix?: string }[];
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <section className="vendor-panel">
      <SectionTitle
        right={
          total > 0 ? (
            <span className="text-data text-sm font-bold">{formatValue(total)}</span>
          ) : null
        }
      >
        {title}
      </SectionTitle>
      <div className="space-y-3">
        {rows.map((row) => (
          <HorizontalBarRow
            key={row.label}
            label={row.label}
            value={row.value}
            max={max}
            colorClass={row.colorClass}
            formatValue={formatValue}
            suffix={row.suffix}
          />
        ))}
      </div>
    </section>
  );
}

function StackedFlowBar({
  title,
  segments,
  totalLabel,
}: {
  title: string;
  segments: { label: string; value: number; color: string }[];
  totalLabel?: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  return (
    <section className="vendor-panel">
      <SectionTitle
        right={
          total > 0 ? (
            <span className="text-data text-sm font-bold">{formatINR(total)}</span>
          ) : null
        }
      >
        {title}
      </SectionTitle>
      {total <= 0 ? (
        <div className="flex h-10 items-center justify-center rounded-full bg-surface-2 text-xs text-muted">
          No activity this week
        </div>
      ) : (
        <>
          <div className="flex h-10 overflow-hidden rounded-full bg-surface-2">
            {segments.map((seg) => {
              const width = (seg.value / total) * 100;
              if (width <= 0) return null;
              return (
                <div
                  key={seg.label}
                  className="relative flex h-full min-w-[4px] items-center justify-center transition-[width]"
                  style={{ width: `${width}%`, background: seg.color }}
                >
                  {width >= 18 ? (
                    <span className="truncate px-1 text-[10px] font-bold text-white">
                      {pctOf(seg.value, total)}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <ChartLegend
            items={segments
              .filter((s) => s.value > 0)
              .map((s) => ({
                color: s.color,
                label: s.label,
                value: `${formatINR(s.value)} · ${pctOf(s.value, total)}`,
              }))}
          />
          {totalLabel ? (
            <p className="mt-2 text-xs text-muted">{totalLabel}</p>
          ) : null}
        </>
      )}
    </section>
  );
}

function WeekProgressRing({
  title,
  weekValue,
  lifetimeValue,
}: {
  title: string;
  weekValue: number;
  lifetimeValue: number;
}) {
  const pct =
    lifetimeValue > 0
      ? Math.min(100, Math.round((weekValue / lifetimeValue) * 100))
      : weekValue > 0
        ? 100
        : 0;

  return (
    <section className="vendor-panel">
      <SectionTitle>{title}</SectionTitle>
      <div className="flex items-center gap-4">
        <div
          className="relative grid size-24 shrink-0 place-items-center rounded-full sm:size-28"
          style={{
            background: `conic-gradient(var(--accent) ${pct * 3.6}deg, var(--surface-2) 0)`,
          }}
        >
          <div className="grid size-[4.5rem] place-items-center rounded-full bg-surface text-center sm:size-20">
            <span className="text-lg font-bold text-accent">{pct}%</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted">This week</span>
              <span className="text-data font-bold">{formatINR(weekValue)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted">Lifetime</span>
              <span className="text-data font-bold">
                {formatINR(lifetimeValue)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full w-full rounded-full bg-green/40" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrendIndicator({
  percent,
  weekTotal,
}: {
  percent: number | null;
  weekTotal: number;
}) {
  return (
    <div className="text-right">
      <p className="text-data text-sm font-bold">{formatINR(weekTotal)}</p>
      {percent === null ? (
        <p className="text-[10px] font-medium text-muted">This week</p>
      ) : (
        <p
          className={cn(
            "text-[10px] font-bold",
            percent >= 0 ? "text-green" : "text-red-500"
          )}
        >
          {percent >= 0 ? "▲" : "▼"} {Math.abs(percent)}% vs last week
        </p>
      )}
    </div>
  );
}

export function VendorEarningsCharts({
  restaurantName,
  stats,
  demo = false,
}: {
  restaurantName?: string;
  stats: VendorEarningsSummary;
  demo?: boolean;
}) {
  const revenueBars = stats.daily.map((d) => ({
    key: d.day,
    label: d.day,
    value: d.amount,
  }));

  const orderBars = stats.daily.map((d) => ({
    key: d.day,
    label: d.day,
    value: d.orders,
  }));

  const bestDayKey =
    stats.bestDayAmount > 0
      ? stats.daily.find((d) => d.amount === stats.bestDayAmount)?.day
      : undefined;

  const maxOrders = Math.max(...stats.daily.map((d) => d.orders), 0);
  const bestOrderDay =
    maxOrders > 0
      ? stats.daily.find((d) => d.orders === maxOrders)?.day
      : undefined;

  const weekMax = Math.max(stats.weekTotal, stats.lastWeekTotal, 1);

  return (
    <div className="space-y-4 lg:space-y-6">
      <VendorHero
        title="Earnings"
        subtitle={
          restaurantName
            ? `${restaurantName} · charts & figures${demo ? " (demo)" : ""}.`
            : `Charts & figures${demo ? " (demo)" : ""}.`
        }
        action={
          <TrendIndicator
            percent={stats.weekChangePercent}
            weekTotal={stats.weekTotal}
          />
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <VendorMetricCard
          label="This week"
          value={formatINR(stats.weekTotal)}
          icon="wallet"
          tone="green"
          barPct={(stats.weekTotal / weekMax) * 100}
          hint={`${stats.orderCount} orders`}
        />
        <VendorMetricCard
          label="Today"
          value={formatINR(stats.todayRevenue)}
          icon="calendar"
          tone="blue"
          barPct={
            stats.weekTotal > 0
              ? (stats.todayRevenue / stats.weekTotal) * 100
              : 0
          }
          hint={`${stats.todayOrders} orders`}
        />
        <VendorMetricCard
          label="Avg order"
          value={formatINR(stats.avgOrderValue)}
          icon="trending"
          tone="accent"
          barPct={
            stats.lifetimeAvgOrderValue > 0
              ? (stats.avgOrderValue / stats.lifetimeAvgOrderValue) * 100
              : 0
          }
        />
        <VendorMetricCard
          label="Lifetime"
          value={formatINR(stats.lifetimeTotal)}
          icon="rupee"
          tone="accent"
          barPct={100}
          hint={`${stats.lifetimeOrders} delivered`}
        />
      </div>

      <VerticalBarChart
        title="Daily revenue"
        subtitle={bestDayKey ? `Peak · ${bestDayKey}` : undefined}
        totalLabel="Week total"
        totalValue={stats.weekTotal}
        bars={revenueBars}
        highlightKey={bestDayKey}
        accentClass="bg-accent/85"
        highlightClass="bg-green"
      />

      <VerticalBarChart
        title="Daily orders"
        subtitle={bestOrderDay ? `Busiest · ${bestOrderDay}` : undefined}
        totalLabel="Week orders"
        totalValue={stats.orderCount}
        bars={orderBars}
        highlightKey={bestOrderDay}
        accentClass="bg-blue/80"
        highlightClass="bg-accent"
        emptyLabel="No orders this week"
        formatValue={(n) => String(n)}
      />

      <DualBarCompare
        title="Week comparison"
        left={{ label: "This week", value: stats.weekTotal }}
        right={{ label: "Last week", value: stats.lastWeekTotal }}
      />

      <HorizontalBarChart
        title="This week breakdown"
        rows={[
          {
            label: "Revenue",
            value: stats.weekTotal,
            colorClass: "bg-green",
          },
          {
            label: "Avg order",
            value: stats.avgOrderValue,
            colorClass: "bg-accent",
          },
          {
            label: "Today",
            value: stats.todayRevenue,
            colorClass: "bg-blue/80",
            suffix: `(${stats.todayOrders})`,
          },
        ]}
      />

      <StackedFlowBar
        title="Order flow this week"
        totalLabel={`${stats.pendingCount} in pipeline · ${stats.cancelledCount} cancelled`}
        segments={[
          {
            label: "Revenue",
            value: stats.weekTotal,
            color: "var(--green)",
          },
          {
            label: "Pipeline",
            value: stats.pendingValue,
            color: "var(--accent)",
          },
          {
            label: "Cancelled",
            value: stats.cancelledValue,
            color: "var(--muted)",
          },
        ]}
      />

      <HorizontalBarChart
        title="Lifetime vs pipeline"
        rows={[
          {
            label: "Lifetime delivered",
            value: stats.lifetimeTotal,
            colorClass: "bg-accent",
            suffix: `(${stats.lifetimeOrders})`,
          },
          {
            label: "In pipeline",
            value: stats.pendingValue,
            colorClass: "bg-blue/80",
            suffix: `(${stats.pendingCount})`,
          },
          {
            label: "Lost (cancelled)",
            value: stats.cancelledValue,
            colorClass: "bg-line",
            suffix: `(${stats.cancelledCount})`,
          },
        ]}
      />

      <WeekProgressRing
        title="Week vs lifetime"
        weekValue={stats.weekTotal}
        lifetimeValue={stats.lifetimeTotal}
      />

      <VendorPanel
        title="Orders volume"
        action={
          <span className="text-data text-sm font-bold">
            {stats.orderCount} this week
          </span>
        }
      >
        <div className="space-y-3">
          {[
            { label: "This week", value: stats.orderCount, color: "bg-green" },
            {
              label: "Last week",
              value: stats.lastWeekOrders,
              color: "bg-accent/80",
            },
            {
              label: "Delivered (lifetime)",
              value: stats.lifetimeOrders,
              color: "bg-blue/80",
            },
            {
              label: "In pipeline",
              value: stats.pendingCount,
              color: "bg-accent",
            },
            {
              label: "Cancelled",
              value: stats.cancelledCount,
              color: "bg-line",
            },
          ].map((row) => (
            <HorizontalBarRow
              key={row.label}
              label={row.label}
              value={row.value}
              max={Math.max(
                stats.orderCount,
                stats.lastWeekOrders,
                stats.lifetimeOrders,
                stats.pendingCount,
                stats.cancelledCount,
                1
              )}
              colorClass={row.color}
              formatValue={(n) => String(n)}
            />
          ))}
        </div>
        <ChartLegend
          items={[
            {
              color: "var(--green)",
              label: "Completed",
              value: String(stats.lifetimeOrders),
            },
            {
              color: "var(--accent)",
              label: "Active",
              value: String(stats.pendingCount),
            },
            {
              color: "var(--muted)",
              label: "Cancelled",
              value: String(stats.cancelledCount),
            },
          ]}
        />
      </VendorPanel>

      {!demo ? (
        <p className="px-2 text-center text-xs text-muted">
          Payout charts will appear here once payouts are configured.
        </p>
      ) : (
        <section className="vendor-panel">
          <SectionTitle
            right={
              <span className="text-data text-sm font-bold text-green">
                {formatINR(72400)}
              </span>
            }
          >
            Recent payouts
          </SectionTitle>
          <div className="space-y-3">
            <HorizontalBarRow
              label="Last week"
              value={72400}
              max={72400}
              colorClass="bg-green"
            />
            <HorizontalBarRow
              label="2 weeks ago"
              value={68150}
              max={72400}
              colorClass="bg-green/70"
            />
          </div>
        </section>
      )}
    </div>
  );
}
