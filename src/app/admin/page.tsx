import Link from "next/link";
import {
  Bike,
  ChevronRight,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  getAdminDashboard,
  listPendingRestaurants,
} from "@/lib/data-access/admin-stats";
import {
  getAdminSeries,
  getOrderStatusMix,
  type AdminSeries,
  type StatusSlice,
} from "@/lib/data-access/admin-series";
import { ApproveRestaurantButton } from "@/components/admin/approve-restaurant-button";
import {
  ChartCard,
  LiveDot,
  Panel,
  RangeTabs,
  StatCard,
  TrendPill,
} from "@/components/admin/admin-ui";
import {
  OrdersChart,
  RevenueChart,
  StatusDonut,
} from "@/components/admin/admin-charts";
import { getOperatorMfaGate } from "@/lib/auth/mfa";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * Admin home = the platform dashboard.
 *
 * Top-to-bottom it tells a story: today's live pulse, then the all-time totals
 * with week-over-week movement, then how the last N days actually went, then the
 * one queue that needs a human. Every number is counted from the database, so a
 * quiet day reads as zero rather than as a busy one.
 *
 * One page, two layouts. In the phone frame it is a single column of cards; in
 * the console the same content becomes a hero-plus-KPI-row over a chart grid.
 * The switch is a container query (`@3xl`), so the phone-frame preview keeps the
 * phone layout even though the browser window around it is wide.
 */
export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("en-IN");

/** How many approvals to surface inline before deferring to the vendors list. */
const APPROVALS_SHOWN = 6;

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

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const requested = Number(daysParam);
  const days = RANGES.some((r) => r.value === requested) ? requested : 7;

  const [dash, pending, mfa, series, mix] = await Promise.all([
    getAdminDashboard(),
    listPendingRestaurants(),
    isSupabaseConfigured
      ? getOperatorMfaGate()
      : Promise.resolve({ ok: true as const, currentLevel: null }),
    isSupabaseConfigured
      ? getAdminSeries(days)
      : Promise.resolve<AdminSeries>(EMPTY_SERIES),
    isSupabaseConfigured
      ? getOrderStatusMix(days)
      : Promise.resolve<StatusSlice[]>([]),
  ]);

  const mfaActive = mfa.ok && mfa.currentLevel === "aal2";
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());

  const shown = pending.slice(0, APPROVALS_SHOWN);
  const overflow = pending.length - shown.length;
  const rangeLabel =
    RANGES.find((r) => r.value === days)?.label ?? `${days} days`;
  const rangeHref = (v: number) => (v === 7 ? "/admin" : `/admin?days=${v}`);

  return (
    <div className="space-y-5 @3xl:space-y-6">
      {/* ---------- page header ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight @3xl:text-[30px]">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Platform pulse · {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden @3xl:block">
            <RangeTabs options={RANGES} active={days} hrefFor={rangeHref} />
          </div>
          {mfaActive ? (
            <span className="pill pill-green shrink-0">
              <ShieldCheck className="size-3.5" /> MFA
            </span>
          ) : (
            <Link
              href="/mfa/setup?next=/admin"
              className="pill pill-deal shrink-0"
            >
              <ShieldAlert className="size-3.5" /> MFA
            </Link>
          )}
        </div>
      </div>

      {/* ---------- 1. today, live and money-first ---------- */}
      <section className="admin-today relative overflow-hidden rounded-[var(--radius-sheet)] border border-line p-4 @3xl:p-5">
        <div className="vendor-hero-glow pointer-events-none absolute inset-0" />
        <div className="relative @3xl:flex @3xl:items-center @3xl:gap-8">
          <div className="@3xl:min-w-[240px]">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green/15 px-2.5 py-1 text-[11px] font-bold text-green">
                <LiveDot />
                Live
              </span>
              <span className="text-[11px] font-medium text-muted @3xl:hidden">
                {today}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-label">Today&rsquo;s GMV</p>
              <div className="@3xl:hidden">
                <TrendPill trend={dash.trends.gmv} />
              </div>
            </div>
            <p className="text-data mt-1 text-[34px] font-extrabold leading-none tracking-tight text-accent @3xl:text-[40px]">
              {formatINR(dash.today.gmv)}
            </p>
            <div className="mt-2 hidden @3xl:block">
              <TrendPill trend={dash.trends.gmv} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-line border-t border-line pt-3.5 @3xl:mt-0 @3xl:flex-1 @3xl:border-l @3xl:border-t-0 @3xl:pl-8 @3xl:pt-0">
            <HeroMini
              icon={<ReceiptText className="size-3" />}
              label="Orders"
              value={nf.format(dash.today.orders)}
            />
            <HeroMini
              icon={<Bike className="size-3" />}
              label="Riders"
              value={nf.format(dash.today.activeRiders)}
            />
            <HeroMini
              icon={<Store className="size-3" />}
              label="Awaiting"
              value={nf.format(dash.today.pendingApprovals)}
              href={dash.today.pendingApprovals > 0 ? "#pending" : undefined}
            />
          </div>
        </div>
      </section>

      {/* ---------- 2. platform totals ---------- */}
      <section>
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="text-label">Platform</h2>
          <span className="text-[11px] font-medium text-muted">vs last week</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 @3xl:grid-cols-4 @3xl:gap-4">
          <StatCard
            icon={<Store className="size-4" />}
            tone="accent"
            label="Restaurants"
            value={nf.format(dash.totals.shops)}
            trend={dash.trends.shops}
            href="/admin/vendors"
          />
          <StatCard
            icon={<Users className="size-4" />}
            tone="green"
            label="Users"
            value={nf.format(dash.totals.users)}
            trend={dash.trends.users}
            href="/admin/customers"
          />
          <StatCard
            icon={<ReceiptText className="size-4" />}
            tone="blue"
            label="Orders"
            value={nf.format(dash.totals.orders)}
            trend={dash.trends.orders}
            href="/admin/orders"
          />
          <StatCard
            icon={<Bike className="size-4" />}
            tone="muted"
            label="Riders"
            value={nf.format(dash.totals.drivers)}
          />
        </div>
      </section>

      {/* ---------- 3. the window ---------- */}
      <section className="space-y-3 @3xl:space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-label">Last {rangeLabel}</h2>
          <div className="@3xl:hidden">
            <RangeTabs options={RANGES} active={days} hrefFor={rangeHref} />
          </div>
        </div>

        <div className="grid gap-3 @3xl:grid-cols-3 @3xl:gap-4">
          <ChartCard
            className="@3xl:col-span-2"
            title="Revenue"
            subtitle={
              series.peak
                ? `${formatINR(series.totals.gmv)} in ${rangeLabel} · busiest ${series.peak.label}`
                : `${formatINR(series.totals.gmv)} in ${rangeLabel}`
            }
            action={
              <span className="hidden items-center gap-1 text-[11px] font-semibold text-muted @sm:inline-flex">
                <TrendingUp className="size-3.5" />
                GMV per day
              </span>
            }
          >
            <RevenueChart days={series.days} />
          </ChartCard>

          <ChartCard
            title="Order mix"
            subtitle={`Where ${rangeLabel} of orders ended up`}
          >
            <StatusDonut slices={mix} />
          </ChartCard>

          <ChartCard
            className="@3xl:col-span-3"
            title="Orders per day"
            subtitle={`${nf.format(series.totals.orders)} orders in ${rangeLabel}`}
            height={230}
          >
            <OrdersChart days={series.days} />
          </ChartCard>
        </div>
      </section>

      {/* ---------- 4. the one queue that needs a human ---------- */}
      <Panel
        id="pending"
        title="Pending approvals"
        subtitle="Restaurants waiting to go live"
        action={
          pending.length > 0 ? (
            <span className="pill pill-accent">{pending.length}</span>
          ) : null
        }
      >
        {pending.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-green/15 text-green">
              <ShieldCheck className="size-4" />
            </span>
            <p className="text-sm text-muted">
              All clear. New restaurants stay hidden until you approve them.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line @3xl:grid @3xl:grid-cols-2 @3xl:gap-x-6 @3xl:divide-y-0">
              {shown.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 py-3 first:pt-0 @3xl:border-b @3xl:border-line @3xl:first:pt-3"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                    <Store className="size-4" />
                  </span>
                  <Link
                    href={`/admin/vendors/${r.id}?tab=overview`}
                    className="press min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <p className="truncate text-xs text-muted">/{r.slug}</p>
                  </Link>
                  <ApproveRestaurantButton id={r.id} name={r.name} />
                </li>
              ))}
            </ul>
            {overflow > 0 ? (
              <Link
                href="/admin/vendors"
                className="press mt-1 flex items-center justify-center gap-1 border-t border-line pt-3 text-sm font-semibold text-accent-ink"
              >
                View all {pending.length} in Vendors
                <ChevronRight className="size-4" />
              </Link>
            ) : null}
          </>
        )}
      </Panel>
    </div>
  );
}

/**
 * One of the three small "today" figures inside the hero. Rendered flat — no
 * card of its own — so it reads as part of the hero container, split only by a
 * hairline divider.
 */
function HeroMini({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </span>
      <span className="text-data mt-1.5 block text-lg font-extrabold leading-none text-ink @3xl:text-2xl">
        {value}
      </span>
    </>
  );
  const className = "px-3 first:pl-0 last:pr-0 @3xl:px-6";
  return href ? (
    <Link href={href} className={cn("press block", className)}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
