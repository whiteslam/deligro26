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
import { StatTile, StatTiles } from "@/components/admin/console-ui";
import {
  ORDER_STATUS,
  ORDER_STATUS_ORDER,
} from "@/components/admin/order-status";
import {
  DataTable,
  TableFooter,
  type Column,
} from "@/components/admin/data-table";
import {
  FilterChips,
  SearchForm,
} from "@/components/admin/admin-filters";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Admin → Orders. Every order across every restaurant, newest first, with the
 * in-flight ones pulled forward and the late ones pulled forward of those.
 *
 * Search and status live in the URL so a filtered view is reloadable and
 * shareable. Both are applied to the window this page loads, not to the whole
 * order history — the footer says which, because "3 orders" meaning "3 in the
 * last 200" and meaning "3, ever" are very different answers.
 */

/** The window we pull. Widened when searching so a query can reach further back. */
const WINDOW = 50;
const SEARCH_WINDOW = 250;

/** Matches the AutoRefresh interval below; stated in the UI, not implied. */
const REFRESH_MS = 4000;

const IN_FLIGHT: AdminOrderRow["status"][] = [
  "PLACED",
  "KITCHEN",
  "READY",
  "ON_THE_WAY",
];

type Search = { q?: string; status?: string };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = ORDER_STATUS_ORDER.includes(sp.status as AdminOrderRow["status"])
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

  const counts = ORDER_STATUS_ORDER.map((s) => ({
    value: s,
    label: ORDER_STATUS[s].short,
    count: all.filter((o) => o.status === s).length,
  })).filter((s) => s.count > 0);

  // Summary figures describe the loaded window, which is what the operator can
  // actually see and act on — not an all-time aggregate they cannot reach.
  const inFlight = all.filter((o) => IN_FLIGHT.includes(o.status)).length;
  const late = all.filter((o) => (o.lateByMinutes ?? 0) > 0).length;
  const worst = all.reduce((m, o) => Math.max(m, o.lateByMinutes ?? 0), 0);
  const cancelled = all.filter((o) => o.status === "CANCELLED").length;
  const value = all.reduce((sum, o) => sum + o.total, 0);

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
      width: "w-[150px]",
      cell: (o) => (
        <div className="min-w-0">
          <p className="text-data text-xs font-semibold text-ink">{o.code}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-muted">{o.restaurant}</p>
          <p className="truncate text-[13px] text-ink @3xl:hidden">{o.customer}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      role: "wideOnly",
      cell: (o) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-ink">{o.customer}</p>
          {o.paymentMethod ? (
            <p className="truncate text-[11.5px] text-muted">
              {o.paymentMethod === "online" ? "Paid online" : "Cash on delivery"}
              {o.paymentStatus && o.paymentStatus !== "paid" ? (
                <span className="ml-1 font-semibold uppercase text-deal">
                  {o.paymentStatus}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Stage",
      role: "trailing",
      width: "w-[128px]",
      cell: (o) => (
        <span className="inline-flex flex-col items-end gap-1 @3xl:items-start">
          <span className={`pill ${ORDER_STATUS[o.status].cls}`}>
            {ORDER_STATUS[o.status].short}
          </span>
          {o.lateByMinutes ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-deal">
              <AlertTriangle className="size-3" />
              {o.lateByMinutes}m late
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "placedAt",
      header: "Placed",
      width: "w-[110px]",
      cell: (o) => (
        <span className="text-data whitespace-nowrap text-[11.5px] text-muted">
          {o.placedAt}
        </span>
      ),
    },
    {
      key: "total",
      header: "Value",
      align: "right",
      width: "w-[96px]",
      cell: (o) => (
        <span className="text-data text-[13px] font-semibold tabular-nums">
          {formatINR(o.total)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      role: "actions",
      align: "right",
      width: "w-[80px]",
      // Open only. An admin-initiated refund has no server action behind it —
      // refunds are raised against an order and then decided on the Refunds
      // screen — and a button that cannot do the thing it names is worse than
      // no button.
      cell: (o) =>
        o.id ? (
          <Link href={`/admin/orders/${o.id}`} className="c-btn-affirm press">
            Open
          </Link>
        ) : null,
    },
  ];

  const filtered = Boolean(q || status);

  return (
    <>
      {isSupabaseConfigured ? <AutoRefresh interval={REFRESH_MS} /> : null}

      <AdminHero
        title="Orders"
        tag={inFlight > 0 ? `${inFlight} in flight` : "All settled"}
        subtitle={`The last ${windowSize} orders, plus everything still moving`}
        live
      />

      <div className="flex flex-col gap-2.5">
        <SearchForm
          action="/admin/orders"
          defaultValue={q}
          placeholder="Order code, customer or restaurant"
          carry={{ status: status ?? undefined }}
        />

        {counts.length > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FilterChips
              label="Order status"
              options={counts}
              active={status}
              hrefFor={(v) => href({ status: v ?? undefined })}
            />
            <p className="text-xs text-muted">
              Auto-refreshing every {Math.round(REFRESH_MS / 1000)}s
            </p>
          </div>
        ) : null}
      </div>

      <DataTable
        caption="Orders"
        columns={columns}
        rows={orders}
        rowKey={(o) => o.id ?? o.code}
        // The demo seed rows have no id and therefore nothing to open — a link
        // to /admin/orders/undefined would 404 on tap.
        rowHref={(o) => (o.id ? `/admin/orders/${o.id}` : null)}
        rowTone={(o) => ((o.lateByMinutes ?? 0) > 0 ? "alert" : null)}
        footer={
          <TableFooter
            page={1}
            totalPages={1}
            hrefFor={() => "/admin/orders"}
            summary={
              filtered
                ? `${orders.length} of ${all.length} in this window`
                : `${all.length} order${all.length === 1 ? "" : "s"} in this window`
            }
          />
        }
        empty={
          <EmptyState
            icon={ReceiptText}
            title={filtered ? "No orders match" : "No orders yet"}
            description={
              filtered
                ? `Nothing in the last ${windowSize} orders matches. Older orders are not in this window.`
                : "New orders land here in real time as customers check out."
            }
            action={
              filtered ? (
                <Link href="/admin/orders" className="c-btn c-btn-outline press">
                  Clear filters
                </Link>
              ) : null
            }
          />
        }
      />

      <StatTiles>
        <StatTile
          label="In flight"
          value={inFlight}
          note="Placed, cooking, ready or on the way"
        />
        <StatTile
          label="Past promise time"
          value={late}
          note={late > 0 ? `Worst is ${worst}m over` : "Everything is on time"}
        />
        <StatTile
          label="Cancelled"
          value={cancelled}
          note="In this window"
        />
        <StatTile
          label="Value in window"
          value={formatINR(value)}
          note={`Across ${all.length} order${all.length === 1 ? "" : "s"}`}
        />
      </StatTiles>

      <PendingApprovals pending={pending} />
    </>
  );
}
