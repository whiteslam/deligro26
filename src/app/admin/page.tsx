import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bike,
  IndianRupee,
  Megaphone,
  Minus,
  ReceiptText,
  RotateCcw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { Pill } from "@/components/roles/role-ui";
import {
  getAdminDashboard,
  listPendingRestaurants,
  type Trend,
} from "@/lib/data-access/admin-stats";
import { ApproveRestaurantButton } from "@/components/admin/approve-restaurant-button";
import { getOperatorMfaGate } from "@/lib/auth/mfa";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatINR } from "@/lib/utils/format";

/**
 * Admin home = the platform dashboard. Every number is counted from the
 * database; the arrows compare this week with the week before, so an operator
 * can see at a glance whether shops, users and orders are growing or sliding.
 */
export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("en-IN");

export default async function AdminOverviewPage() {
  const [dash, pending, mfa] = await Promise.all([
    getAdminDashboard(),
    listPendingRestaurants(),
    isSupabaseConfigured
      ? getOperatorMfaGate()
      : Promise.resolve({ ok: true as const, currentLevel: null }),
  ]);
  const mfaActive = mfa.ok && mfa.currentLevel === "aal2";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted">
            Platform pulse · vs last week
          </p>
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

      {/* Platform totals with growth arrows. */}
      <div className="grid grid-cols-2 gap-2.5">
        <TotalCard
          icon={<Store className="size-4" />}
          label="Restaurants"
          value={nf.format(dash.totals.shops)}
          trend={dash.trends.shops}
          tone="accent"
        />
        <TotalCard
          icon={<Users className="size-4" />}
          label="Users"
          value={nf.format(dash.totals.users)}
          trend={dash.trends.users}
          tone="green"
        />
        <TotalCard
          icon={<ReceiptText className="size-4" />}
          label="Orders"
          value={nf.format(dash.totals.orders)}
          trend={dash.trends.orders}
        />
        <TotalCard
          icon={<Bike className="size-4" />}
          label="Delivery boys"
          value={nf.format(dash.totals.drivers)}
        />
      </div>

      {/* Today's pulse. */}
      <section>
        <h2 className="text-label mb-2.5">Today</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Mini
            icon={<ReceiptText className="size-4" />}
            label="Orders"
            value={nf.format(dash.today.orders)}
            trend={dash.trends.orders}
          />
          <Mini
            icon={<IndianRupee className="size-4" />}
            label="GMV"
            value={formatINR(dash.today.gmv)}
            trend={dash.trends.gmv}
          />
          <Mini
            icon={<Bike className="size-4" />}
            label="Riders on a job"
            value={nf.format(dash.today.activeRiders)}
          />
          <Mini
            icon={<Store className="size-4" />}
            label="Awaiting approval"
            value={nf.format(dash.today.pendingApprovals)}
          />
        </div>
      </section>

      {/* Jump-off points. */}
      <div className="grid grid-cols-2 gap-2.5">
        <QuickLink href="/admin/vendors" icon={Store} label="Vendors" />
        <QuickLink href="/admin/orders" icon={ReceiptText} label="All orders" />
        <QuickLink href="/admin/refunds" icon={RotateCcw} label="Refunds" />
        <QuickLink href="/admin/banners" icon={Megaphone} label="Campaigns" />
        <QuickLink href="/admin/settings" icon={Settings} label="Settings" />
      </div>

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-label">Pending approvals</h2>
          <Pill tone="accent">{pending.length}</Pill>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {pending.length === 0 ? (
            <p className="px-4 py-5 text-sm text-muted">
              Nothing waiting. New restaurants stay hidden until you approve them.
            </p>
          ) : (
            pending.map((r, i) => (
              <div
                key={r.id}
                className={
                  "flex items-center gap-3 px-4 py-3.5" +
                  (i > 0 ? " border-t border-line" : "")
                }
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Store className="size-4" />
                </div>
                <Link
                  href={`/admin/vendors/${r.id}?tab=overview`}
                  className="press min-w-0 flex-1"
                >
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="truncate text-xs text-muted">/{r.slug}</p>
                </Link>
                <ApproveRestaurantButton id={r.id} name={r.name} />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

/** Green up / red down / muted flat — the growth indicator. */
function TrendArrow({ trend }: { trend: Trend }) {
  if (trend.direction === "flat") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-muted">
        <Minus className="size-3.5" />
        0%
      </span>
    );
  }
  const up = trend.direction === "up";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={
        "inline-flex items-center gap-0.5 text-xs font-bold " +
        (up ? "text-green" : "text-deal")
      }
    >
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {trend.pct}%
    </span>
  );
}

function TotalCard({
  icon,
  label,
  value,
  trend,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: Trend;
  tone?: "accent" | "green";
}) {
  const valueClass =
    tone === "green" ? "text-green" : tone === "accent" ? "text-accent" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted">
          {icon}
          <p className="text-[11px] font-semibold uppercase tracking-wide">
            {label}
          </p>
        </div>
        {trend ? <TrendArrow trend={trend} /> : null}
      </div>
      <p
        className={`text-data mt-2 text-[26px] font-extrabold leading-none tracking-tight ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function Mini({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: Trend;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </p>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="text-data text-xl font-bold tracking-tight text-ink">
          {value}
        </p>
        {trend ? <TrendArrow trend={trend} /> : null}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof ReceiptText;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="press flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-3"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-ink">
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-bold">{label}</span>
    </Link>
  );
}
