import Link from "next/link";
import { ShieldCheck, AlertTriangle, Check } from "lucide-react";
import { StatCard, SectionTitle, Pill } from "@/components/roles/role-ui";
import { Button } from "@/components/ui/button";
import { ADMIN_METRICS, PENDING_APPROVALS } from "@/lib/roles-data";

export default function AdminOverviewPage() {
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
        {ADMIN_METRICS.map((m) => (
          <StatCard
            key={m.label}
            label={m.label}
            value={m.value}
            delta={m.delta}
            tone={m.tone}
          />
        ))}
      </div>

      {/* Alerts */}
      <section>
        <SectionTitle>Alerts</SectionTitle>
        <div className="space-y-2">
          <div className="card flex items-start gap-3 border-l-4 border-l-accent p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" />
            <div>
              <p className="text-sm font-semibold">
                Coupon abuse pattern flagged
              </p>
              <p className="text-xs text-muted">
                Order #P-3301 — large coupon against a near-zero total. Held for
                review.
              </p>
            </div>
          </div>
          <div className="card flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted" />
            <div>
              <p className="text-sm font-semibold">Failed-login spike</p>
              <p className="text-xs text-muted">
                18 failed admin logins in 10 min from 3 IPs — rate limiter
                engaged.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Approvals */}
      <section>
        <SectionTitle
          right={<Pill tone="accent">{PENDING_APPROVALS.length}</Pill>}
        >
          Pending approvals
        </SectionTitle>
        <div className="card divide-y divide-line">
          {PENDING_APPROVALS.map((a) => (
            <div
              key={a.name}
              className="flex items-center gap-3 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {a.name}{" "}
                  <span className="text-xs font-normal text-muted">
                    · {a.type}
                  </span>
                </p>
                <p className="truncate text-xs text-muted">{a.detail}</p>
              </div>
              <span className="hidden text-xs text-muted sm:block">
                {a.submitted}
              </span>
              <Button size="sm" variant="outline">
                Review
              </Button>
            </div>
          ))}
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

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <Check className="size-3.5" /> Every admin action here is logged and
        audited server-side.
      </p>
    </div>
  );
}
