import Link from "next/link";
import { Banknote, Plus } from "lucide-react";
import { AdminHero, EmptyState } from "@/components/admin/admin-ui";
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
  type SettlementListItem,
  type SettlementStatus,
} from "@/lib/data-access/admin-settlements";
import { formatINR } from "@/lib/utils/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Admin → Settlements. One row per vendor payout batch: what the shop sold,
 * what the platform kept, and what is owed either way.
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

export default async function AdminSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
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
  let stats = {
    draftCount: 0,
    paidThisWeek: 0,
    paidThisWeekAmount: 0,
    unsettledOnlineVolume: 0,
    unsettledOrderCount: 0,
  };
  let loadError: string | null = null;

  try {
    [rows, stats] = await Promise.all([listSettlements(), getSettlementStats()]);
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

  const href = (v: string | null) =>
    v ? `/admin/settlements?status=${v}` : "/admin/settlements";

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
        tag={stats.draftCount > 0 ? `${stats.draftCount} draft` : "All settled"}
        subtitle="Vendor payouts and holds, batched by date range"
        action={
          <Link href="/admin/settlements/new" className="c-btn c-btn-dark press">
            <Plus className="size-3.5" strokeWidth={2.4} />
            New settlement
          </Link>
        }
      />

      {loadError ? (
        <p className="rounded-xl border border-deal/30 bg-deal-soft px-3.5 py-3 text-sm text-deal">
          {loadError}
        </p>
      ) : null}

      {counts.length > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterChips
            label="Settlement status"
            options={counts}
            active={status}
            hrefFor={href}
          />
          <p className="text-xs text-muted">
            Transfers are made by bank or UPI outside the app
          </p>
        </div>
      ) : null}

      {rows.length === 0 && !loadError ? (
        <EmptyState
          icon={Banknote}
          title="No settlements yet"
          description="Pick a vendor and a date range to build a draft from delivered orders that have not been settled."
          action={
            <Link href="/admin/settlements/new" className="c-btn c-btn-dark press">
              New settlement
            </Link>
          }
        />
      ) : rows.length > 0 ? (
        <DataTable
          columns={columns}
          rows={shown}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/settlements/${r.id}`}
          caption="Vendor settlements"
          footer={
            <TableFooter
              page={1}
              totalPages={1}
              hrefFor={() => "/admin/settlements"}
              summary={
                status
                  ? `${shown.length} of ${rows.length} batches`
                  : `${rows.length} batch${rows.length === 1 ? "" : "es"}`
              }
            />
          }
        />
      ) : null}

      <StatTiles>
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
      </StatTiles>

      <p className="rounded-xl border border-line bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-muted">
        Online paid orders put food money on the platform — those remits go to
        the vendor. COD orders already left cash with the shop, so their
        commission is <strong className="text-ink">deducted</strong> from the
        period net. Money still moves by bank/UPI outside the app; Mark paid
        records the UTR.
      </p>
    </>
  );
}
