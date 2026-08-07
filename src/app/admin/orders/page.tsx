import { ReceiptText } from "lucide-react";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { formatINR } from "@/lib/utils/format";
import { ADMIN_ORDERS, type AdminOrderRow } from "@/lib/roles-data";
import { listAllOrders } from "@/lib/data-access/admin-orders";
import {
  listPendingRestaurants,
  type PendingRestaurant,
} from "@/lib/data-access/admin-stats";
import { PendingApprovals } from "@/components/admin/pending-approvals";
import { AdminHero, EmptyState } from "@/components/admin/admin-ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const STATUS: Record<
  AdminOrderRow["status"],
  { label: string; cls: string }
> = {
  PLACED: { label: "Placed", cls: "pill-accent" },
  KITCHEN: { label: "Preparing", cls: "pill-accent" },
  // READY is its own stage now (0026 / OrderStatus). It used to be folded into
  // KITCHEN, which is why an operator could not tell a kitchen that was still
  // cooking from one whose food had been sitting on the pass. Given a bare
  // `Record`, a missing key is not a blank cell — `STATUS[o.status].cls` throws
  // and takes the whole orders screen down with it.
  READY: { label: "Ready for pickup", cls: "pill-accent" },
  ON_THE_WAY: { label: "On the way", cls: "pill-accent" },
  DELIVERED: { label: "Delivered", cls: "pill-green" },
  CANCELLED: { label: "Cancelled", cls: "pill-muted" },
};

export default async function AdminOrdersPage() {
  if (!isSupabaseConfigured) return renderOrders(ADMIN_ORDERS, []);

  const [live, pending] = await Promise.all([
    listAllOrders(),
    listPendingRestaurants(),
  ]);
  return renderOrders(live, pending);
}

function renderOrders(orders: AdminOrderRow[], pending: PendingRestaurant[]) {
  return (
    <div className="space-y-5">
      {isSupabaseConfigured ? <AutoRefresh interval={4000} /> : null}

      <AdminHero
        title="Orders"
        subtitle="Live &amp; recent, across every restaurant"
        live
        action={
          <div className="text-right">
            <p className="text-data text-xl font-bold leading-none">
              {orders.length}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              orders
            </p>
          </div>
        }
      />

      <PendingApprovals pending={pending} />

      {orders.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No orders yet"
          description="New orders land here in real time as customers check out."
        />
      ) : (
        <ul className="space-y-2.5">
          {orders.map((o) => (
            <li
              key={o.code}
              className="rounded-2xl border border-line bg-surface p-3.5 transition-shadow hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-data font-bold">{o.code}</p>
                  <p className="mt-0.5 truncate text-sm text-ink">
                    {o.customer}
                  </p>
                  <p className="truncate text-xs text-muted">{o.restaurant}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-data text-sm font-bold">
                    {formatINR(o.total)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">{o.placedAt}</p>
                </div>
              </div>
              <div className="mt-2.5">
                <span className={`pill ${STATUS[o.status].cls}`}>
                  {STATUS[o.status].label}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
