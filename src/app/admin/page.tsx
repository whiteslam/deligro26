import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { StatCard, SectionTitle, Pill } from "@/components/roles/role-ui";
import { Button } from "@/components/ui/button";
import {
  getAdminMetrics,
  listPendingRestaurants,
} from "@/lib/data-access/admin-stats";
import { ApproveRestaurantButton } from "@/components/admin/approve-restaurant-button";
import { formatINR } from "@/lib/utils/format";

/**
 * Platform health, counted from the database.
 *
 * Everything here used to come from `roles-data`: "1,284 orders today", "₹4.9L
 * GMV", "86 active riders", plus two invented security alerts ("18 failed admin
 * logins in 10 min from 3 IPs") — under a footer promising that every admin
 * action was logged and audited. There was no Supabase branch at all, so an
 * operator was reading fiction and could act on it.
 *
 * The alerts are removed rather than reimplemented: there is no alerting
 * pipeline, and no section is honest where an invented incident is not.
 */
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [metrics, pending] = await Promise.all([
    getAdminMetrics(),
    listPendingRestaurants(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-heading">Overview</h1>
          <p className="text-sm text-muted">Platform health · today</p>
        </div>
        <span className="pill pill-green">
          <ShieldCheck className="size-3.5" /> MFA · session active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Orders today"
          value={String(metrics.ordersToday)}
          tone="accent"
        />
        <StatCard label="GMV today" value={formatINR(metrics.gmvToday)} />
        <StatCard
          label="Riders on a job"
          value={String(metrics.activeRiders)}
          tone="green"
        />
        <StatCard
          label="Awaiting approval"
          value={String(metrics.pendingApprovals)}
        />
      </div>

      <section>
        <SectionTitle right={<Pill tone="accent">{pending.length}</Pill>}>
          Pending approvals
        </SectionTitle>
        <div className="card divide-y divide-line">
          {pending.length === 0 ? (
            <p className="p-4 text-sm text-muted">
              Nothing waiting. A new restaurant lands here and stays invisible to
              customers until it is approved.
            </p>
          ) : (
            pending.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="truncate text-xs text-muted">/{r.slug}</p>
                </div>
                <ApproveRestaurantButton id={r.id} name={r.name} />
              </div>
            ))
          )}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders">
          <Button variant="secondary" size="sm">
            All orders
          </Button>
        </Link>
        <Link href="/admin/refunds">
          <Button variant="secondary" size="sm">
            Refund queue
          </Button>
        </Link>
      </section>
    </div>
  );
}
