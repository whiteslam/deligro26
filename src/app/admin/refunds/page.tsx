import { Clock, RotateCcw, Wallet } from "lucide-react";
import { listRefunds } from "@/lib/data-access/refunds";
import { RefundCard } from "@/components/admin/refund-card";
import { AdminHero, EmptyState, StatCard } from "@/components/admin/admin-ui";
import { formatINR } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AdminRefundsPage() {
  const refunds = await listRefunds();
  const pending = refunds.filter((r) => r.status === "pending");
  const pendingAmount = pending.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return (
    <div className="space-y-5">
      <AdminHero
        title="Refunds"
        subtitle="Decisions are recorded with your account"
        badge={
          pending.length > 0 ? (
            <span className="pill pill-accent">{pending.length} pending</span>
          ) : null
        }
      />

      {refunds.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No refund requests"
          description="When a customer requests a refund it lands here for your review."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <StatCard
              icon={<Clock className="size-4" />}
              tone="accent"
              label="Awaiting"
              value={pending.length}
            />
            <StatCard
              icon={<Wallet className="size-4" />}
              tone="deal"
              label="Pending value"
              value={formatINR(pendingAmount)}
            />
          </div>

          <div className="space-y-2.5">
            {refunds.map((r) => (
              <RefundCard key={r.id} refund={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
