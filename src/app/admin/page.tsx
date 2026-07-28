import Link from "next/link";
import {
  Bike,
  ChevronRight,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import {
  getAdminDashboard,
  listPendingRestaurants,
} from "@/lib/data-access/admin-stats";
import { ApproveRestaurantButton } from "@/components/admin/approve-restaurant-button";
import {
  LiveDot,
  Panel,
  StatCard,
  TrendPill,
} from "@/components/admin/admin-ui";
import { getOperatorMfaGate } from "@/lib/auth/mfa";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * Admin home = the platform dashboard, built from the shared admin-ui so it
 * reads as one product with the rest of the section. Top-to-bottom it tells a
 * story: Today's live pulse, then all-time totals with week-over-week movement,
 * then the one queue that needs a human. Every number is counted from the
 * database, so a quiet day reads as zero.
 */
export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("en-IN");

/** How many approvals to surface inline before deferring to the vendors list. */
const APPROVALS_SHOWN = 6;

export default async function AdminOverviewPage() {
  const [dash, pending, mfa] = await Promise.all([
    getAdminDashboard(),
    listPendingRestaurants(),
    isSupabaseConfigured
      ? getOperatorMfaGate()
      : Promise.resolve({ ok: true as const, currentLevel: null }),
  ]);
  const mfaActive = mfa.ok && mfa.currentLevel === "aal2";
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());

  const shown = pending.slice(0, APPROVALS_SHOWN);
  const overflow = pending.length - shown.length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted">Platform pulse</p>
        </div>
        {mfaActive ? (
          <span className="pill pill-green shrink-0">
            <ShieldCheck className="size-3.5" /> MFA
          </span>
        ) : (
          <Link href="/mfa/setup?next=/admin" className="pill pill-deal shrink-0">
            <ShieldAlert className="size-3.5" /> MFA
          </Link>
        )}
      </div>

      {/* 1. Today — the gradient hero, live and money-first. */}
      <section className="vendor-hero relative overflow-hidden rounded-[var(--radius-sheet)] border border-line p-4">
        <div className="vendor-hero-glow pointer-events-none absolute inset-0" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green/15 px-2.5 py-1 text-[11px] font-bold text-green">
              <LiveDot />
              Live
            </span>
            <span className="text-[11px] font-medium text-muted">{today}</span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-label">Today&rsquo;s GMV</p>
            <TrendPill trend={dash.trends.gmv} />
          </div>
          <p className="text-data mt-1 text-[34px] font-extrabold leading-none tracking-tight text-accent">
            {formatINR(dash.today.gmv)}
          </p>

          <div className="mt-4 grid grid-cols-3 divide-x divide-line border-t border-line pt-3.5">
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

      {/* 2. Platform — all-time totals, each carrying its week-over-week arrow. */}
      <section>
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="text-label">Platform</h2>
          <span className="text-[11px] font-medium text-muted">vs last week</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            icon={<Store className="size-4" />}
            tone="accent"
            label="Restaurants"
            value={nf.format(dash.totals.shops)}
            trend={dash.trends.shops}
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
          />
          <StatCard
            icon={<Bike className="size-4" />}
            tone="muted"
            label="Riders"
            value={nf.format(dash.totals.drivers)}
          />
        </div>
      </section>

      {/* 3. Approvals — the one queue that needs a human. */}
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
            <ul className="divide-y divide-line">
              {shown.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 py-3 first:pt-0"
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
      <span className="text-data mt-1.5 block text-lg font-extrabold leading-none text-ink">
        {value}
      </span>
    </>
  );
  const className = "px-3 first:pl-0 last:pr-0";
  return href ? (
    <Link href={href} className={cn("press block", className)}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
