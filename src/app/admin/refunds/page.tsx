import { SectionTitle, Pill } from "@/components/roles/role-ui";
import { listRefunds } from "@/lib/data-access/refunds";
import { RefundCard } from "@/components/admin/refund-card";

/**
 * The real refund queue.
 *
 * This page used to render three invented refunds from `roles-data`, and its
 * Approve button called nothing — it set a local `decided` map and rendered
 * "Approved · logged". Nothing was approved. Nothing was logged. An admin could
 * walk away believing they had settled a customer's money.
 *
 * Rows now come from the `refunds` table, and deciding one writes `status` and
 * `decided_by` through an RLS-gated server action.
 */
export const dynamic = "force-dynamic";

export default async function AdminRefundsPage() {
  const refunds = await listRefunds();
  const pending = refunds.filter((r) => r.status === "pending");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-heading">Refund queue</h1>
        <p className="text-sm text-muted">
          Deciding a refund records who decided it. Only pending refunds can be
          decided.
        </p>
      </div>

      <SectionTitle right={<Pill tone="accent">{pending.length} pending</Pill>}>
        Requests
      </SectionTitle>

      {refunds.length === 0 ? (
        <p className="card p-4 text-sm text-muted">
          No refund requests. When a customer asks for one it appears here.
        </p>
      ) : (
        <div className="space-y-3">
          {refunds.map((r) => (
            <RefundCard key={r.id} refund={r} />
          ))}
        </div>
      )}
    </div>
  );
}
