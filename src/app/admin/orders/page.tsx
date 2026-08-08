import Link from "next/link";
import { AlertTriangle, ReceiptText } from "lucide-react";
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
import { DataTable, type Column } from "@/components/admin/data-table";
import {
  FilterChips,
  FilterSummary,
  SearchForm,
} from "@/components/admin/admin-filters";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Admin → Orders. Every order across every restaurant, newest first, with the
 * in-flight ones pulled forward.
 *
 * Search and status live in the URL so a filtered view is reloadable and
 * shareable. Both are applied to the window this page loads, not to the whole
 * order history — the summary line says which, because "3 orders" meaning
 * "3 in the last 200" and meaning "3, ever" are very different answers.
 */

const STATUS: Record<AdminOrderRow["status"], { label: string; cls: string }> = {
  PLACED: { label: "Placed", cls: "pill-accent" },
  KITCHEN: { label: "Preparing", cls: "pill-accent" },
  // READY is its own stage now (0026 / OrderStatus). It used to be folded into
  // KITCHEN, which is why an operator could not tell a kitchen that was still
  // cooking from one whose food had been sitting on the pass. Given a bare
  // `Record`, a missing key is not a blank cell — `STATUS[o.status].cls` throws
  // and takes the whole orders screen down with it.
  READY: { label: "Ready for pickup", cls: "pill-pop" },
  ON_THE_WAY: { label: "On the way", cls: "pill-accent" },
  DELIVERED: { label: "Delivered", cls: "pill-green" },
  CANCELLED: { label: "Cancelled", cls: "pill-muted" },
};

const STATUS_ORDER: AdminOrderRow["status"][] = [
  "PLACED",
  "KITCHEN",
  "READY",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
];

/** The window we pull. Widened when searching so a query can reach further back. */
const WINDOW = 50;
const SEARCH_WINDOW = 250;

type Search = { q?: string; status?: string };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = STATUS_ORDER.includes(sp.status as AdminOrderRow["status"])
    ? (sp.status as AdminOrderRow["status"])
    : null;

  if (!isSupabaseConfigured) {
    return renderOrders(ADMIN_ORDERS, [], q, status, WINDOW);
  }

  const limit = q ? SEARCH_WINDOW : WINDOW;
  const [live, pending] = await Promise.all([
    listAllOrders(limit),
    listPendingRestaurants(),
  ]);
  return renderOrders(live, pending, q, status, limit);
}

function renderOrders(
  all: AdminOrderRow[],
  pending: PendingRestaurant[],
  q: string,
  status: AdminOrderRow["status"] | null,
  windowSize: number
) {
  const needle = q.toLowerCase();
  const orders = all.filter((o) => {
    if (status && o.status !== status) return false;
    if (!needle) return true;
    return (
      o.code.toLowerCase().includes(needle) ||
      o.customer.toLowerCase().includes(needle) ||
      o.restaurant.toLowerCase().includes(needle)
    );
  });

  const counts = STATUS_ORDER.map((s) => ({
    value: s,
    label: STATUS[s].label,
    count: all.filter((o) => o.status === s).length,
  })).filter((s) => s.count > 0);

  const href = (next: Partial<Search>) => {
    const usp = new URLSearchParams();
    const merged = { q, status: status ?? undefined, ...next };
    if (merged.q) usp.set("q", merged.q);
    if (merged.status) usp.set("status", merged.status);
    const query = usp.toString();
    return query ? `/admin/orders?${query}` : "/admin/orders";
  };

  const columns: Column<AdminOrderRow>[] = [
    {
      key: "code",
      header: "Order",
      role: "title",
      cell: (o) => (
        <div className="min-w-0">
          <p className="text-data font-bold">{o.code}</p>
          <p className="mt-0.5 truncate text-[13px] text-ink @3xl:hidden">
            {o.customer}
          </p>
          <p className="truncate text-xs text-muted @3xl:hidden">
            {o.restaurant}
          </p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      role: "wideOnly",
      cell: (o) => <span className="truncate">{o.customer}</span>,
    },
    {
      key: "restaurant",
      header: "Restaurant",
      role: "wideOnly",
      cell: (o) => <span className="truncate text-muted">{o.restaurant}</span>,
    },
    {
      key: "status",
      header: "Status",
      role: "trailing",
      cell: (o) => (
        <span className="inline-flex flex-col items-end gap-1 @3xl:items-start">
          <span className={`pill ${STATUS[o.status].cls}`}>
            {STATUS[o.status].label}
          </span>
          {o.lateByMinutes ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-deal">
              <AlertTriangle className="size-3" />
              {o.lateByMinutes}m late
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      cell: (o) =>
        o.paymentMethod ? (
          <span className="text-[13px]">
            {o.paymentMethod === "online" ? "Online" : "Cash"}
            {o.paymentStatus && o.paymentStatus !== "paid" ? (
              <span className="ml-1.5 text-[11px] font-bold uppercase text-deal">
                {o.paymentStatus}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "placedAt",
      header: "Placed",
      cell: (o) => <span className="text-muted">{o.placedAt}</span>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (o) => (
        <span className="text-data font-bold">{formatINR(o.total)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {isSupabaseConfigured ? <AutoRefresh interval={4000} /> : null}

      <AdminHero
        title="Orders"
        subtitle="Live &amp; recent, across every restaurant"
        live
        action={
          <div className="text-right">
            <p className="text-data text-xl font-bold leading-none @3xl:text-3xl">
              {all.length}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              in view
            </p>
          </div>
        }
      />

      <PendingApprovals pending={pending} />

      <div className="space-y-3">
        <div className="flex flex-col gap-2 @3xl:flex-row @3xl:items-center">
          <SearchForm
            action="/admin/orders"
            defaultValue={q}
            placeholder="Order code, customer or restaurant"
            carry={{ status: status ?? undefined }}
          />
        </div>

        {counts.length > 1 ? (
          <FilterChips
            label="Order status"
            options={counts}
            active={status}
            hrefFor={(v) => href({ status: v ?? undefined })}
          />
        ) : null}

        <FilterSummary
          shown={orders.length}
          total={all.length}
          noun="order"
          filtered={Boolean(q || status)}
          clearHref="/admin/orders"
        />
      </div>

      <DataTable
        caption="Orders"
        columns={columns}
        rows={orders}
        rowKey={(o) => o.id ?? o.code}
        // The demo seed rows have no id and therefore nothing to open — a link
        // to /admin/orders/undefined would 404 on tap.
        rowHref={(o) => (o.id ? `/admin/orders/${o.id}` : null)}
        empty={
          <EmptyState
            icon={ReceiptText}
            title={q || status ? "No orders match" : "No orders yet"}
            description={
              q || status
                ? `Nothing in the last ${windowSize} orders matches. Older orders are not in this window.`
                : "New orders land here in real time as customers check out."
            }
            action={
              q || status ? (
                <Link
                  href="/admin/orders"
                  className="press rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-bold"
                >
                  Clear filters
                </Link>
              ) : null
            }
          />
        }
      />
    </div>
  );
}
