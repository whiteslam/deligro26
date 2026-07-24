import { Pill } from "@/components/roles/role-ui";
import { listRefunds } from "@/lib/data-access/refunds";
import { RefundCard } from "@/components/admin/refund-card";

export const dynamic = "force-dynamic";

export default async function AdminRefundsPage() {
  const refunds = await listRefunds();
  const pending = refunds.filter((r) => r.status === "pending");

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Refunds</h1>
          <p className="mt-0.5 text-sm text-muted">
            Decisions are recorded with your account
          </p>
        </div>
        <Pill tone="accent">{pending.length}</Pill>
      </div>

      {refunds.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-8 text-center text-sm text-muted">
          No refund requests yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          {refunds.map((r) => (
            <RefundCard key={r.id} refund={r} />
          ))}
        </div>
      )}
    </div>
  );
}
