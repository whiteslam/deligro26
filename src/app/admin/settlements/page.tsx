import Link from "next/link";
import { Banknote, CheckCircle2, Plus } from "lucide-react";
import { AdminHero, EmptyState } from "@/components/admin/admin-ui";
import { ConsoleOnly } from "@/components/admin/console-only";
import { StatTile, StatTiles } from "@/components/admin/console-ui";
import {
  DataTable,
  TableFooter,
  type Column,
} from "@/components/admin/data-table";
import { FilterChips } from "@/components/admin/admin-filters";
import {
  getSettlementStats,
  listSettlements,
  listVendorSettlementQueue,
  type SettlementListItem,
  type SettlementStatus,
  type VendorSettlementQueue,
  type VendorSettlementQueueRow,
} from "@/lib/data-access/admin-settlements";
import { formatINR } from "@/lib/utils/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Admin → Settlements. Two lists, in the order the work happens:
 *
 *   1. the queue  — one row per vendor, what is owed right now, unbatched.
 *   2. the ledger — the batches somebody has already built, and their status.
 *
 * The queue comes first because it is the only one that exists on day one: a
 * screen built solely from `vendor_settlements` shows an empty state while
 * twenty shops are owed money, which is the wrong answer to "who do I pay".
 *
 * Money still moves by bank or UPI outside the app. This screen records the
 * decision and the reference; it does not move funds, and the copy below says
 * so — a payout screen that reads as if it transfers is how a vendor gets told
 * they have been paid when nobody has sent anything.
 */
export const dynamic = "force-dynamic";

const STATUS_PILL: Record<SettlementStatus, string> = {
  draft: "pill pill-pop",
  paid: "pill pill-green",
  void: "pill pill-muted",
};

const STATUS_LABEL: Record<SettlementStatus, string> = {
  draft: "Draft",
  paid: "Paid",
  void: "Void",
};

const STATUS_ORDER: SettlementStatus[] = ["draft", "paid", "void"];

const dayFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Kolkata",
});

function shortDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dayFmt.format(d);
}

function waitLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/** The draft builder, pre-filled with exactly the orders this row counted. */
function buildHref(r: VendorSettlementQueueRow): string {
  const params = new URLSearchParams({ restaurantId: r.restaurantId });
  if (r.suggestedFrom) params.set("from", r.suggestedFrom);
  if (r.suggestedTo) params.set("to", r.suggestedTo);
  return `/admin/settlements/new?${params.toString()}`;
}

/** Rows per page. Both tables are scanned, not read, so a screenful is plenty. */
const QUEUE_PAGE_SIZE = 20;
const BATCH_PAGE_SIZE = 20;

function toPage(raw: string | undefined, totalPages: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.trunc(n)), Math.max(1, totalPages));
}

export default async function AdminSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; batch?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <AdminHero
        title="Settlements"
        subtitle="Connect Supabase to settle vendors."
      />
    );
  }

  const sp = await searchParams;
  const status = STATUS_ORDER.includes(sp.status as SettlementStatus)
    ? (sp.status as SettlementStatus)
    : null;

  let rows: SettlementListItem[] = [];
  let queue: VendorSettlementQueue = {
    rows: [],
    scanned: 0,
    truncated: false,
  };
  let stats = {
    draftCount: 0,
    paidThisWeek: 0,
    paidThisWeekAmount: 0,
    unsettledOnlineVolume: 0,
    unsettledOrderCount: 0,
  };
  let loadError: string | null = null;

  try {
    [rows, stats, queue] = await Promise.all([
      listSettlements(),
      getSettlementStats(),
      listVendorSettlementQueue(),
    ]);
  } catch {
    loadError =
      "Could not load settlements. Apply migration 0028_vendor_settlements.sql if you have not yet.";
  }

  const shown = status ? rows.filter((r) => r.status === status) : rows;

  const counts = STATUS_ORDER.map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
    count: rows.filter((r) => r.status === s).length,
  })).filter((s) => s.count > 0);

  const drafts = rows.filter((r) => r.status === "draft");
  const draftTotal = drafts.reduce((sum, r) => sum + r.netPayable, 0);
  const commission = rows.reduce((sum, r) => sum + r.commission, 0);
  const recovered = rows.reduce((sum, r) => sum + r.refundsRecovered, 0);

  // Queue roll-ups. Payable and recoverable are kept apart on purpose: netting
  // them would hide "₹40k to send out" behind "₹6k owed back" and make the
  // number nobody can act on the only one on screen.
  const queuePayable = queue.rows
    .filter((r) => r.netPayable > 0)
    .reduce((sum, r) => sum + r.netPayable, 0);
  const queueRecoverable = queue.rows
    .filter((r) => r.netPayable < 0)
    .reduce((sum, r) => sum - r.netPayable, 0);
  const queueOrders = queue.rows.reduce((sum, r) => sum + r.orderCount, 0);
  const queueCommission = queue.rows.reduce(
    (sum, r) => sum + r.commission + r.commissionGst,
    0
  );
  const queueFoodGross = queue.rows.reduce((sum, r) => sum + r.foodGross, 0);
  const queueDeductions = queue.rows.reduce(
    (sum, r) => sum + r.commission + r.commissionGst + r.otherCharges,
    0
  );
  const overdue = queue.rows.filter((r) => r.overdue).length;
  const noPayoutDetails = queue.rows.filter((r) => !r.hasPayoutDetails).length;

  // Paging lives in the URL because this page is a server component: the two
  // tables page independently, and each link carries the other's position so
  // turning one page does not silently reset the other.
  const queueTotalPages = Math.max(
    1,
    Math.ceil(queue.rows.length / QUEUE_PAGE_SIZE)
  );
  const batchTotalPages = Math.max(1, Math.ceil(shown.length / BATCH_PAGE_SIZE));
  const queuePage = toPage(sp.page, queueTotalPages);
  const batchPage = toPage(sp.batch, batchTotalPages);

  const linkTo = (next: {
    status?: string | null;
    page?: number;
    batch?: number;
  }) => {
    const params = new URLSearchParams();
    const s = next.status === undefined ? status : next.status;
    const p = next.page ?? queuePage;
    const b = next.batch ?? batchPage;
    if (s) params.set("status", s);
    if (p > 1) params.set("page", String(p));
    if (b > 1) params.set("batch", String(b));
    const qs = params.toString();
    return qs ? `/admin/settlements?${qs}` : "/admin/settlements";
  };

  // A status filter re-cuts the batch list, so it starts that table at page 1.
  const href = (v: string | null) => linkTo({ status: v, batch: 1 });

  const queueRows = queue.rows.slice(
    (queuePage - 1) * QUEUE_PAGE_SIZE,
    queuePage * QUEUE_PAGE_SIZE
  );
  const batchRows = shown.slice(
    (batchPage - 1) * BATCH_PAGE_SIZE,
    batchPage * BATCH_PAGE_SIZE
  );

  const queueColumns: Column<VendorSettlementQueueRow>[] = [
    {
      key: "vendor",
      header: "Vendor",
      role: "title",
      width: "w-[200px]",
      cell: (r) => (
        // Capped rather than left to fill: a shop name is an identifier here,
        // not the content, and letting it take a third of the table pushes the
        // figures somebody actually came to compare off the right edge.
        <div className="min-w-0 max-w-[190px]">
          <p className="truncate text-[12.5px] font-semibold leading-tight text-ink">
            {r.restaurantName}
          </p>
          <p className="truncate text-[11px] leading-tight text-muted">
            {r.commissionPct}% ·{" "}
            {r.settlementCycle === "monthly" ? "Monthly" : "Weekly"}
            {r.vendorStatus !== "active" ? ` · ${r.vendorStatus}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "orders",
      header: "Unsettled",
      width: "w-[124px]",
      cell: (r) => (
        <div className="min-w-0">
          <p className="text-data whitespace-nowrap text-[12.5px] leading-tight tabular-nums text-ink">
            {r.orderCount}
            {r.orderCount ? (
              <span className="text-muted"> · {formatINR(r.foodGross)}</span>
            ) : null}
          </p>
          <p className="truncate text-[11px] leading-tight text-muted">
            {r.orderCount
              ? `${r.onlineOrders} online · ${r.cashOrders} cash`
              : "Nothing to batch"}
          </p>
        </div>
      ),
    },
    {
      key: "waiting",
      header: "Waiting",
      width: "w-[100px]",
      cell: (r) => (
        <div className="min-w-0">
          <p
            className={
              r.overdue
                ? "text-data whitespace-nowrap text-[12.5px] font-semibold leading-tight tabular-nums text-deal"
                : "text-data whitespace-nowrap text-[12.5px] leading-tight tabular-nums text-ink"
            }
          >
            {r.orderCount ? waitLabel(r.waitingDays) : "—"}
          </p>
          <p className="truncate text-[11px] leading-tight text-muted">
            {r.orderCount
              ? `Since ${shortDay(r.oldestUnsettledAt)}`
              : r.lastPaidAt
                ? `Paid ${shortDay(r.lastPaidAt)}`
                : "Never paid"}
          </p>
        </div>
      ),
    },
    {
      key: "deductions",
      header: "Platform keeps",
      align: "right",
      width: "w-[116px]",
      role: "meta",
      cell: (r) => (
        <div className="min-w-0">
          <p className="text-data whitespace-nowrap text-[12.5px] leading-tight tabular-nums text-ink">
            {formatINR(r.commission + r.commissionGst + r.otherCharges)}
          </p>
          <p className="truncate text-[11px] leading-tight text-muted">
            {r.refundsRecovered
              ? `${formatINR(r.refundsRecovered)} refunds`
              : "Commission + GST"}
          </p>
        </div>
      ),
    },
    {
      key: "flags",
      header: "Status",
      role: "trailing",
      width: "w-[118px]",
      cell: (r) => (
        <div className="flex flex-wrap items-center justify-end gap-1">
          {r.openDrafts > 0 ? (
            <span className="pill pill-pop whitespace-nowrap">
              {r.openDrafts === 1 ? "Draft open" : `${r.openDrafts} drafts`}
            </span>
          ) : null}
          {!r.hasPayoutDetails ? (
            <span className="pill pill-deal whitespace-nowrap">No payout</span>
          ) : null}
          {r.openDrafts === 0 && r.hasPayoutDetails ? (
            <span
              className={
                r.overdue
                  ? "pill pill-deal whitespace-nowrap"
                  : "pill pill-muted whitespace-nowrap"
              }
            >
              {r.overdue ? "Overdue" : "Ready"}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "net",
      header: "Net payable",
      align: "right",
      width: "w-[124px]",
      cell: (r) => (
        <div className="min-w-0">
          <p
            className={
              r.netPayable < 0
                ? "text-data whitespace-nowrap text-[13px] font-semibold leading-tight tabular-nums text-deal"
                : "text-data whitespace-nowrap text-[13px] font-semibold leading-tight tabular-nums text-ink"
            }
          >
            {formatINR(Math.abs(r.netPayable))}
          </p>
          <p className="truncate text-[11px] leading-tight text-muted">
            {r.netPayable < 0 ? "Owed back" : "To send out"}
          </p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      role: "actions",
      align: "right",
      width: "w-[168px]",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <Link
            href={`/admin/settlements/orders?vendor=${r.restaurantId}&state=unpaid`}
            className="c-btn press whitespace-nowrap"
          >
            Orders
          </Link>
          {r.orderCount > 0 ? (
            <Link
              href={buildHref(r)}
              className="c-btn-affirm press whitespace-nowrap"
            >
              Build draft
            </Link>
          ) : null}
        </div>
      ),
    },
  ];

  // Column-aligned, so each figure sits under the column it totals — and it is
  // the WHOLE queue, not the page being viewed. A total that changes when you
  // turn the page is worse than no total.
  const queueTotals = {
    label: `All ${queue.rows.length} vendor${queue.rows.length === 1 ? "" : "s"}`,
    cells: {
      orders: (
        <span className="whitespace-nowrap">
          {queueOrders} · {formatINR(queueFoodGross)}
        </span>
      ),
      deductions: formatINR(queueDeductions),
      net: (
        <span className="whitespace-nowrap">
          {formatINR(queuePayable)}
          {queueRecoverable ? (
            <span className="ml-1 font-normal text-muted">
              / {formatINR(queueRecoverable)} back
            </span>
          ) : null}
        </span>
      ),
    },
  };

  const columns: Column<SettlementListItem>[] = [
    {
      key: "vendor",
      header: "Vendor",
      role: "title",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">
            {r.restaurantName}
          </p>
          <p className="text-data truncate text-[11.5px] text-muted">
            {r.periodLabel}
          </p>
        </div>
      ),
    },
    {
      key: "orders",
      header: "Orders",
      width: "w-[96px]",
      cell: (r) => (
        <div className="min-w-0">
          <p className="text-data text-[12.5px] tabular-nums text-ink">
            {r.orderCount}
          </p>
          <p className="text-data truncate text-[11.5px] text-muted">
            {formatINR(r.foodGross)} gross
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      role: "trailing",
      width: "w-[118px]",
      cell: (r) => (
        <span className={STATUS_PILL[r.status]}>{STATUS_LABEL[r.status]}</span>
      ),
    },
    {
      key: "commission",
      header: "Commission",
      align: "right",
      width: "w-[110px]",
      cell: (r) => (
        <span className="text-data text-[12.5px] tabular-nums text-muted">
          {formatINR(r.commission)}
        </span>
      ),
    },
    {
      key: "net",
      header: "Net payable",
      align: "right",
      width: "w-[118px]",
      cell: (r) => (
        <span
          className={
            r.netPayable < 0
              ? "text-data text-[13px] font-semibold tabular-nums text-deal"
              : "text-data text-[13px] font-semibold tabular-nums text-ink"
          }
        >
          {formatINR(r.netPayable)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      role: "actions",
      align: "right",
      width: "w-[100px]",
      cell: (r) => (
        <Link href={`/admin/settlements/${r.id}`} className="c-btn-affirm press">
          Statement
        </Link>
      ),
    },
  ];

  return (
    <>
      <AdminHero
        title="Settlements"
        tag={
          queue.rows.length > 0
            ? `${queue.rows.length} vendor${queue.rows.length === 1 ? "" : "s"} to pay`
            : stats.draftCount > 0
              ? `${stats.draftCount} draft`
              : "All settled"
        }
        subtitle="What each vendor is owed right now, and the batches already built"
        action={
          <div className="flex items-center gap-2">
            {/* Reading a payout is phone work; composing a batch is not, so
                only the second one drops out. `notice={false}` — the header has
                no room for the explanation, and it is given once in the body. */}
            <Link href="/admin/settlements/orders" className="c-btn press">
              Order payouts
            </Link>
            <ConsoleOnly tool="Building a settlement" notice={false}>
              <Link href="/admin/settlements/new" className="c-btn c-btn-dark press">
                <Plus className="size-3.5" strokeWidth={2.4} />
                New settlement
              </Link>
            </ConsoleOnly>
          </div>
        }
      />

      {loadError ? (
        <p className="rounded-xl border border-deal/30 bg-deal-soft px-3.5 py-3 text-sm text-deal">
          {loadError}
        </p>
      ) : null}

      {/* Reading payouts works on a phone; composing a batch is console work,
          so the New settlement button drops out of the header and the reason is
          given here once, rather than at each of its call sites. */}
      <ConsoleOnly
        tool="Building a settlement"
        why="Reading and tracking existing payouts works fine here."
      />

      {/* The figures come first: what is owed in total, before the list of who
          it is owed to. Below the tables they were three scrolls away on a
          ledger of any real size. */}
      <StatTiles>
        <StatTile
          label="Pending payout"
          value={formatINR(queuePayable)}
          note={`${queueOrders} order${queueOrders === 1 ? "" : "s"} across ${queue.rows.length} vendor${queue.rows.length === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Recoverable from cash"
          value={formatINR(queueRecoverable)}
          note="Deductions on COD orders, taken off the next payout"
        />
        <StatTile
          label="Commission pending"
          value={formatINR(queueCommission)}
          note="Including GST, on orders not yet batched"
        />
        <StatTile
          label="Drafts outstanding"
          value={formatINR(draftTotal)}
          note={`${stats.draftCount} batch${stats.draftCount === 1 ? "" : "es"} built, not yet paid`}
        />
        <StatTile
          label="Commission earned"
          value={formatINR(commission)}
          note="Across every batch on this screen"
        />
        <StatTile
          label="Recovered from refunds"
          value={formatINR(recovered)}
          note="Deducted from vendor payouts"
        />
        <StatTile
          label="Unsettled online food"
          value={formatINR(stats.unsettledOnlineVolume)}
          note={`${stats.unsettledOrderCount} order${stats.unsettledOrderCount === 1 ? "" : "s"} not in a batch yet`}
        />
        <StatTile
          label="Paid this week"
          value={formatINR(stats.paidThisWeekAmount)}
          note={`${stats.paidThisWeek} batch${stats.paidThisWeek === 1 ? "" : "es"} marked paid since Monday`}
        />
      </StatTiles>

      {/* ---------- the queue: who is owed what, before any batch exists ---------- */}
      <section className="space-y-2.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[14.5px] font-bold tracking-[-0.01em]">
              Needs settlement
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Delivered orders not in any batch yet, priced at each vendor&apos;s
              own rate
            </p>
          </div>
          {queue.rows.length ? (
            <p className="text-xs text-muted">
              {overdue > 0 ? `${overdue} overdue · ` : ""}
              {noPayoutDetails > 0
                ? `${noPayoutDetails} without payout details · `
                : ""}
              {formatINR(queuePayable)} to send out
            </p>
          ) : null}
        </div>

        {queue.truncated ? (
          <p className="rounded-xl border border-pop/40 bg-pop/10 px-3.5 py-2.5 text-[13px] text-ink">
            Only the oldest {queue.scanned.toLocaleString("en-IN")} delivered
            orders were scanned, so these figures are a floor. Settle the backlog
            and the rest will appear.
          </p>
        ) : null}

        {queue.rows.length === 0 && !loadError ? (
          <EmptyState
            icon={CheckCircle2}
            title="Every vendor is settled"
            description="Delivered orders will show up here as soon as there are any that no settlement batch covers."
            action={
              <Link
                href="/admin/settlements/new"
                className="c-btn c-btn-dark press"
              >
                New settlement
              </Link>
            }
          />
        ) : (
          <DataTable
            columns={queueColumns}
            rows={queueRows}
            rowKey={(r) => r.restaurantId}
            caption="Vendors needing settlement"
            minWidth={960}
            dense
            totals={queueTotals}
            rowTone={(r) => (r.overdue || !r.hasPayoutDetails ? "alert" : null)}
            footer={
              <TableFooter
                page={queuePage}
                totalPages={queueTotalPages}
                hrefFor={(p) => linkTo({ page: p })}
                summary={`Showing ${(queuePage - 1) * QUEUE_PAGE_SIZE + 1}–${Math.min(queuePage * QUEUE_PAGE_SIZE, queue.rows.length)} of ${queue.rows.length} vendors`}
              />
            }
          />
        )}
      </section>

      {/* ---------- the ledger: batches already built ---------- */}
      {rows.length > 0 ? (
        <section className="space-y-2.5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[14.5px] font-bold tracking-[-0.01em]">
                Settlement batches
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Transfers are made by bank or UPI outside the app
              </p>
            </div>
            {counts.length > 1 ? (
              <FilterChips
                label="Settlement status"
                options={counts}
                active={status}
                hrefFor={href}
              />
            ) : null}
          </div>

          <DataTable
            columns={columns}
            rows={batchRows}
            rowKey={(r) => r.id}
            rowHref={(r) => `/admin/settlements/${r.id}`}
            caption="Vendor settlements"
            dense
            totals={{
              label: status
                ? `All ${shown.length} ${STATUS_LABEL[status].toLowerCase()}`
                : `All ${rows.length} batch${rows.length === 1 ? "" : "es"}`,
              cells: {
                orders: `${shown.reduce((s, r) => s + r.orderCount, 0)}`,
                commission: formatINR(
                  shown.reduce((s, r) => s + r.commission, 0)
                ),
                net: formatINR(shown.reduce((s, r) => s + r.netPayable, 0)),
              },
            }}
            empty={
              <EmptyState
                icon={Banknote}
                title="No batches with that status"
                description="Clear the filter to see every settlement built so far."
              />
            }
            footer={
              <TableFooter
                page={batchPage}
                totalPages={batchTotalPages}
                hrefFor={(p) => linkTo({ batch: p })}
                summary={`Showing ${(batchPage - 1) * BATCH_PAGE_SIZE + 1}–${Math.min(batchPage * BATCH_PAGE_SIZE, shown.length)} of ${shown.length}${status ? ` ${STATUS_LABEL[status].toLowerCase()} of ${rows.length}` : ""} batch${shown.length === 1 ? "" : "es"}`}
              />
            }
          />
        </section>
      ) : null}

      <p className="rounded-xl border border-line bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-muted">
        Orders paid online put the food money on the platform, so that money is
        sent to the shop. Cash orders already left the money with the shop, so
        the commission, its GST and any other charges are{" "}
        <strong className="text-ink">taken off</strong> the next payout instead —
        which is why a vendor&apos;s net can read as owed back. Money still moves
        by bank or UPI outside the app; Mark paid records the reference. To pay a
        single order early, use{" "}
        <Link
          href="/admin/settlements/orders"
          className="font-medium text-accent-ink"
        >
          Order payouts
        </Link>
        .
      </p>
    </>
  );
}
