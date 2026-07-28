import Link from "next/link";
import {
  Bike,
  IndianRupee,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { Pill } from "@/components/roles/role-ui";
import {
  getAdminDashboard,
  listPendingRestaurants,
} from "@/lib/data-access/admin-stats";
import { ApproveRestaurantButton } from "@/components/admin/approve-restaurant-button";
import { getOperatorMfaGate } from "@/lib/auth/mfa";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatINR } from "@/lib/utils/format";

/**
 * Admin home = the platform dashboard. Every number is counted from the
 * database so an operator can see the current shape of shops, users and orders
 * at a glance.
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

      {/* Platform totals. */}
      <div className="grid grid-cols-2 gap-2.5">
        <TotalCard
          icon={<Store className="size-4" />}
          label="Restaurants"
          value={nf.format(dash.totals.shops)}
          tone="accent"
        />
        <TotalCard
          icon={<Users className="size-4" />}
          label="Users"
          value={nf.format(dash.totals.users)}
          tone="green"
        />
        <TotalCard
          icon={<ReceiptText className="size-4" />}
          label="Orders"
          value={nf.format(dash.totals.orders)}
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
          />
          <Mini
            icon={<IndianRupee className="size-4" />}
            label="GMV"
            value={formatINR(dash.today.gmv)}
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

function TotalCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "accent" | "green";
}) {
  const valueClass =
    tone === "green" ? "text-green" : tone === "accent" ? "text-accent" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </p>
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </p>
      </div>
      <p className="text-data mt-2 text-xl font-bold tracking-tight text-ink">
        {value}
      </p>
    </div>
  );
}
