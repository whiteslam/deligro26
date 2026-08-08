import { Clock, CreditCard, RotateCcw, Wallet } from "lucide-react";
import { listRefunds } from "@/lib/data-access/refunds";
import { RefundCard } from "@/components/admin/refund-card";
import { AdminHero, EmptyState, StatCard } from "@/components/admin/admin-ui";
import { formatINR } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AdminRefundsPage() {
  const refunds = await listRefunds();
  const pending = refunds.filter((r) => r.status === "pending");
  const pendingAmount = pending.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  // Which of the waiting decisions the gateway can actually carry out. The rest
  // are cash (or an online order nobody paid for), and approving one of those
  // obliges a person to hand money back — worth knowing before opening the
  // queue, not after approving twenty of them.
  const gatewayCount = pending.filter(
    (r) => r.paymentMethod === "online" && r.paymentStatus === "paid"
  ).length;
  const manualCount = pending.length - gatewayCount;

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
          description="When a customer requests a refund — or an order they paid for is cancelled — it lands here for your review."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 @3xl:grid-cols-4 @3xl:gap-4">
            <StatCard
              icon={<Clock className="size-4" />}
              tone="accent"
              label="Awaiting"
              value={pending.length}
              hint={manualCount > 0 ? `${manualCount} by hand` : undefined}
            />
            <StatCard
              icon={<Wallet className="size-4" />}
              tone="deal"
              label="Pending value"
              value={formatINR(pendingAmount)}
            />
            <StatCard
              icon={<CreditCard className="size-4" />}
              tone="blue"
              label="Gateway can reverse"
              value={gatewayCount}
            />
            <StatCard
              icon={<RotateCcw className="size-4" />}
              tone="muted"
              label="All requests"
              value={refunds.length}
            />
          </div>

          {/* Says what Approve does, because it does two different things. A
              screen that implies the gateway handles every refund is how a cash
              refund gets marked settled and never paid. */}
          <p className="rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-muted">
            Approving an order that was <strong className="text-ink">paid
            online</strong> returns the money through Razorpay and records the
            gateway&apos;s refund id. A <strong className="text-ink">cash
            order</strong> has nothing to reverse: approving records your
            decision, and the money is settled off-platform by hand.
          </p>

          {/* Two columns on a wide screen, never more: a refund is a decision
              with money attached, and a denser grid invites skimming. */}
          <div className="grid gap-2.5 @3xl:grid-cols-2 @3xl:gap-4">
            {refunds.map((r) => (
              <RefundCard key={r.id} refund={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
