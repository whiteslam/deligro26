import { SectionTitle } from "@/components/roles/role-ui";
import { formatINR } from "@/lib/utils/format";
import { ADMIN_ORDERS, type AdminOrderRow } from "@/lib/roles-data";
import { listAllOrders } from "@/lib/data-access/admin-orders";
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
  let ADMIN_ORDERS_DATA = ADMIN_ORDERS;
  if (isSupabaseConfigured) {
    try {
      const live = await listAllOrders();
      if (live.length > 0) ADMIN_ORDERS_DATA = live;
    } catch {
      // fall back to demo rows
    }
  }
  return renderOrders(ADMIN_ORDERS_DATA);
}

function renderOrders(ADMIN_ORDERS: AdminOrderRow[]) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-heading">All orders</h1>
        <p className="text-sm text-muted">
          Viewing customer data here is audited.
        </p>
      </div>

      <SectionTitle
        right={<span className="text-xs text-muted">{ADMIN_ORDERS.length} orders</span>}
      >
        Live &amp; recent
      </SectionTitle>

      {/* Desktop table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-label border-b border-line text-left">
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Restaurant</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-right font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_ORDERS.map((o) => (
              <tr key={o.code} className="border-b border-line last:border-0">
                <td className="text-data px-4 py-3 font-semibold">{o.code}</td>
                <td className="px-4 py-3">{o.customer}</td>
                <td className="px-4 py-3 text-muted">{o.restaurant}</td>
                <td className="px-4 py-3">
                  <span className={`pill ${STATUS[o.status].cls}`}>
                    {STATUS[o.status].label}
                  </span>
                </td>
                <td className="text-data px-4 py-3 text-right">
                  {formatINR(o.total)}
                </td>
                <td className="px-4 py-3 text-right text-muted">{o.placedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {ADMIN_ORDERS.map((o) => (
          <div key={o.code} className="card flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-data font-semibold">{o.code}</p>
              <p className="truncate text-xs text-muted">
                {o.customer} · {o.restaurant}
              </p>
            </div>
            <span className={`pill ${STATUS[o.status].cls}`}>
              {STATUS[o.status].label}
            </span>
            <span className="text-data text-sm">{formatINR(o.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
