import { AutoRefresh } from "@/components/shared/auto-refresh";
import { formatINR } from "@/lib/utils/format";
import { ADMIN_ORDERS, type AdminOrderRow } from "@/lib/roles-data";
import { listAllOrders } from "@/lib/data-access/admin-orders";
import {
  listPendingRestaurants,
  type PendingRestaurant,
} from "@/lib/data-access/admin-stats";
import { PendingApprovals } from "@/components/admin/pending-approvals";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const STATUS: Record<
  AdminOrderRow["status"],
  { label: string; cls: string }
> = {
  PLACED: { label: "Placed", cls: "pill-accent" },
  KITCHEN: { label: "Preparing", cls: "pill-accent" },
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
    <div className="space-y-4">
      {isSupabaseConfigured ? <AutoRefresh interval={4000} /> : null}

      <PendingApprovals pending={pending} />

      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Orders</h1>
          <p className="mt-0.5 text-sm text-muted">Live &amp; recent</p>
        </div>
        <span className="text-xs font-semibold text-muted">
          {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-8 text-center text-sm text-muted">
          No orders yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li
              key={o.code}
              className="rounded-2xl border border-line bg-surface p-3.5"
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
