import Link from "next/link";
import {
  getAdminDashboard,
  getAdminNavCounts,
  listPendingRestaurants,
  type AdminNavCounts,
  type Trend,
} from "@/lib/data-access/admin-stats";
import {
  getAdminSeries,
  getOrderStatusMix,
  type AdminSeries,
  type StatusSlice,
} from "@/lib/data-access/admin-series";
import { getLiveBoard } from "@/lib/data-access/admin-dispatch";
import { getSettlementStats } from "@/lib/data-access/admin-settlements";
import { AdminHero, ChartCard, Panel, RangeTabs } from "@/components/admin/admin-ui";
import {
  DecisionRow,
  KpiStrip,
  ShareBar,
  type Decision,
  type KpiItem,
  type ShareSegment,
} from "@/components/admin/console-ui";
import { GmvOrdersChart } from "@/components/admin/admin-charts";
import { LiveBoard } from "@/components/admin/live-board";
import { ApprovalQueue } from "@/components/admin/approval-queue";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatINR, formatWaited } from "@/lib/utils/format";

/**
 * Admin home = the platform dashboard.
 *
 * The redesign reorganised this around what the operator does rather than what
 * the database can count. Top to bottom: today's five figures with their trend
 * lines, then the two things that need a person right now (what is in flight,
 * and what is queued for a decision), then the shape of the window and the
 * approval queue you can clear without leaving the page.
 *
 * Every number is counted from the database, so a quiet day reads as zero
 * rather than as a busy one. Nothing here is seeded, sampled or rounded up.
 *
 * One page, two shells. In the phone frame the wrapping flex rows collapse to
 * a single column; in the console they are the 1.55/1 split the design calls
 * for. The tables inside scroll sideways rather than squashing.
 */
export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("en-IN");

/** How many rows each dashboard queue shows before deferring to its screen. */
const BOARD_ROWS = 8;
const APPROVALS_SHOWN = 4;

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

const EMPTY_SERIES: AdminSeries = {
  days: [],
  totals: { orders: 0, gmv: 0 },
  peak: null,
};

const NO_COUNTS: AdminNavCounts = {
  pendingApprovals: 0,
  pendingRefunds: 0,
  liveOrders: 0,
};

/** "+8.4%" / "−2.1%" / "0%" — pre-formatted for the KPI strip. */
function deltaLabel(t: Trend): string {
  if (t.direction === "flat") return "0%";
  return `${t.direction === "up" ? "+" : "−"}${Math.abs(t.pct)}%`;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const requested = Number(daysParam);
  const days = RANGES.some((r) => r.value === requested) ? requested : 7;

  const [dash, pending, series, mix, board, counts, settlements] =
    await Promise.all([
      getAdminDashboard(),
      listPendingRestaurants(),
      isSupabaseConfigured
        ? getAdminSeries(days)
        : Promise.resolve<AdminSeries>(EMPTY_SERIES),
      isSupabaseConfigured
        ? getOrderStatusMix(days)
        : Promise.resolve<StatusSlice[]>([]),
      isSupabaseConfigured
        ? getLiveBoard(BOARD_ROWS)
        : Promise.resolve({ rows: [], inFlight: 0, atRisk: 0, unassigned: 0 }),
      isSupabaseConfigured
        ? getAdminNavCounts().catch(() => NO_COUNTS)
        : Promise.resolve(NO_COUNTS),
      isSupabaseConfigured
        ? getSettlementStats().catch(() => ({ draftCount: 0 }))
        : Promise.resolve({ draftCount: 0 }),
    ]);

  const now = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  const rangeLabel =
    RANGES.find((r) => r.value === days)?.label ?? `${days} days`;
  const rangeHref = (v: number) => (v === 7 ? "/admin" : `/admin?days=${v}`);

  /* ---------- KPI strip ----------
     Five figures, three of which have a history to draw. Riders on delivery
     and orders in flight are instantaneous states — nothing records what they
     were yesterday — so they get no sparkline rather than a fabricated one. */
  const spark = series.days.slice(-7);
  const basketToday =
    dash.today.orders > 0 ? Math.round(dash.today.gmv / dash.today.orders) : 0;

  const kpis: KpiItem[] = [
    {
      label: "Total sales today",
      value: formatINR(dash.today.gmv),
      delta: { label: deltaLabel(dash.trends.gmv), direction: dash.trends.gmv.direction, note: "vs last week" },
      spark: spark.map((d) => d.gmv),
    },
    {
      label: "Orders today",
      value: nf.format(dash.today.orders),
      delta: {
        label: deltaLabel(dash.trends.orders),
        direction: dash.trends.orders.direction,
        note: "vs last week",
      },
      spark: spark.map((d) => d.orders),
    },
    {
      label: "Average order value",
      value: formatINR(basketToday),
      unit: "per order today",
      // Deliberately no delta: a week-over-week average order value is not
      // derivable from the sales and order trends without re-querying, and
      // inferring one from the other two would be arithmetic that looks like a
      // measurement.
      spark: spark.map((d) => (d.orders > 0 ? Math.round(d.gmv / d.orders) : 0)),
    },
    {
      label: "Riders currently delivering",
      value: nf.format(dash.today.activeRiders),
      unit: `out of ${nf.format(dash.totals.drivers)} riders`,
    },
    {
      label: "Orders being delivered now",
      value: nf.format(board.inFlight || counts.liveOrders),
      unit: board.atRisk > 0 ? `${board.atRisk} running late` : "all on time",
    },
  ];

  /* ---------- the decision queue ----------
     Only queues with something in them. A list of zeros is a list an operator
     learns to stop reading. */
  const decisions: Decision[] = [
    {
      href: "/admin/vendors",
      title: "New shops to approve",
      detail: "Waiting for you to let them go live",
      count: pending.length,
      color: "var(--accent)",
    },
    {
      href: "/admin/refunds",
      title: "Refunds to decide",
      detail: "Customers waiting on their money",
      count: counts.pendingRefunds,
      color: "var(--deal)",
    },
    {
      href: "/admin/settlements",
      title: "Shop payments ready",
      detail: "Worked out, not sent yet",
      count: settlements.draftCount,
      color: "var(--pop)",
    },
    {
      href: "/admin/orders",
      title: "Orders with no rider",
      detail: "Nobody assigned after 8 minutes",
      count: board.unassigned,
      color: "var(--blue)",
    },
  ].filter((d) => d.count > 0);

  const decisionTotal = decisions.reduce((sum, d) => sum + d.count, 0);

  /* ---------- outcome mix ---------- */
  const SLICE_COLOR: Record<string, string> = {
    placed: "var(--accent)",
    kitchen: "var(--accent)",
    ready: "var(--pop)",
    on_the_way: "var(--blue)",
    delivered: "var(--green)",
    cancelled: "var(--deal)",
  };
  const segments: ShareSegment[] = mix.map((s) => ({
    label: s.label,
    count: s.count,
    color: SLICE_COLOR[s.status] ?? "var(--c-faint)",
  }));
  const mixTotal = mix.reduce((sum, s) => sum + s.count, 0);

  /* ---------- approvals ---------- */
  const oldestWait = pending.length
    ? formatWaited(
        [...pending].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
          .createdAt
      )
    : null;

  return (
    <>
      <AdminHero
        title="Dashboard"
        tag="Live"
        subtitle={`How things are going right now · ${now} IST`}
        action={
          <div className="hidden @3xl:block">
            <RangeTabs options={RANGES} active={days} hrefFor={rangeHref} />
          </div>
        }
      />

      <KpiStrip items={kpis} />

      {/* Wrapping flex, not a fixed two-column grid: the 1.55/1 ratio has to be
          able to collapse to stacked inside the phone frame. */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 grow-[1.55] basis-[420px]">
          <Panel
            title="Orders happening now"
            subtitle="Anything later than promised is marked for you"
            action={
              <div className="flex items-center gap-2.5">
                {board.atRisk > 0 ? (
                  <span className="pill pill-deal">{board.atRisk} running late</span>
                ) : null}
                <Link
                  href="/admin/orders"
                  className="press text-xs font-semibold text-accent-ink"
                >
                  Open board
                </Link>
              </div>
            }
          >
            <LiveBoard rows={board.rows} />
          </Panel>
        </div>

        <div className="flex min-w-0 grow basis-[300px] flex-col gap-4">
          <Panel
            title="Needs your attention"
            action={
              decisionTotal > 0 ? (
                <span className="text-data rounded-full bg-[var(--c-divider)] px-2 py-0.5 text-[11px] font-semibold text-ink">
                  {decisionTotal}
                </span>
              ) : null
            }
          >
            {decisions.length ? (
              <div className="space-y-2">
                {decisions.map((d) => (
                  <DecisionRow key={d.href} item={d} />
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-surface-2 px-3.5 py-6 text-center text-[13px] text-muted">
                Nothing is waiting on you right now.
              </p>
            )}
          </Panel>

          <Panel
            title="What happened to orders"
            subtitle={`${rangeLabel} · ${nf.format(mixTotal)} orders`}
          >
            <ShareBar segments={segments} />
          </Panel>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-4">
        <div className="flex min-w-0 grow-[1.55] basis-[420px] flex-col">
          <ChartCard
            className="flex-1"
            title="Sales and orders"
            subtitle={`${rangeLabel} · bars are orders, line is sales`}
            height={196}
            action={
              <div className="flex gap-5 text-right">
                <div>
                  <p className="text-[19px] font-bold leading-none tracking-[-0.02em] tabular-nums">
                    {formatINR(series.totals.gmv)}
                  </p>
                  <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                    Sales
                  </p>
                </div>
                <div>
                  <p className="text-[19px] font-bold leading-none tracking-[-0.02em] tabular-nums">
                    {nf.format(series.totals.orders)}
                  </p>
                  <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                    Orders
                  </p>
                </div>
              </div>
            }
          >
            <GmvOrdersChart days={series.days} />
          </ChartCard>
        </div>

        <div className="flex min-w-0 grow basis-[300px] flex-col">
          <Panel
            id="pending"
            className="flex-1"
            title="Shops waiting to go live"
            subtitle={
              oldestWait
                ? `Longest wait first · ${oldestWait}`
                : "None waiting"
            }
            action={
              pending.length > APPROVALS_SHOWN ? (
                <Link
                  href="/admin/vendors"
                  className="press text-xs font-semibold text-accent-ink"
                >
                  All {pending.length}
                </Link>
              ) : null
            }
          >
            <ApprovalQueue pending={pending} limit={APPROVALS_SHOWN} />
          </Panel>
        </div>
      </div>
    </>
  );
}
