import Link from "next/link";
import { Plus, Store, Tags } from "lucide-react";
import {
  getVendorCounts,
  listAwaitingApproval,
  listVendors,
  type VendorListItem,
  type VendorStatus,
} from "@/lib/data-access/admin-vendors";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { AdminHero, EmptyState } from "@/components/admin/admin-ui";
import { StatTile, StatTiles } from "@/components/admin/console-ui";
import { VendorApprovalCards } from "@/components/admin/vendor-approval-cards";
import {
  DataTable,
  TableFooter,
  type Column,
} from "@/components/admin/data-table";
import { formatWaited } from "@/lib/utils/format";
import { VendorSearchBar } from "./vendor-search-bar";
import { VendorRowActions } from "./vendor-row-actions";
import { VendorPositionSelect } from "./vendor-position-select";

/**
 * Admin → Vendors. Two jobs on one screen, in the order they matter.
 *
 * First the approval backlog as decision cards — the redesign's "clear the
 * queue" screen, which is what an operator opens this page to do on most days.
 * Then the full catalogue as a table, which is the management tool: sorting,
 * paging, featured slots, owner contact, suspend and delete. The design showed
 * only the card grid; a grid cannot hold those columns, and dropping them to
 * match a mockup would take real capability out of an ops console.
 *
 * There is no "Approve all". It would mean approving every unreviewed signup
 * in one unconfirmed click, against a schema with no notion of "already
 * verified" to scope it to — a bulk irreversible write with nothing behind it
 * but a count.
 */
export const dynamic = "force-dynamic";

/** How many signups the approval grid shows before deferring to the table. */
const QUEUE_SHOWN = 6;

const STATUS_PILL: Record<VendorStatus, string> = {
  active: "pill pill-green",
  pending: "pill pill-pop",
  inactive: "pill pill-muted",
  suspended: "pill pill-deal",
};

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type Search = { [key: string]: string | string[] | undefined };

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = one(sp.q) ?? "";
  const status = (one(sp.status) as VendorStatus | undefined) ?? undefined;
  const category = one(sp.category);
  const sort = one(sp.sort) as
    | "recent"
    | "oldest"
    | "name"
    | "status"
    | undefined;
  const page = Math.max(1, Number(one(sp.page) ?? "1") || 1);
  const pageSize = 20;

  const [counts, result, categories, awaiting] = await Promise.all([
    getVendorCounts(),
    listVendors({ q, status, category, sort, page, pageSize }),
    listCategories(),
    listAwaitingApproval().catch(() => [] as VendorListItem[]),
  ]);

  // Median, not mean: one shop that signed up in March and was forgotten would
  // drag an average until the figure describes nothing.
  const medianWait = (() => {
    if (!awaiting.length) return null;
    const ages = awaiting
      .map((v) => new Date(v.createdAt).getTime())
      .sort((a, b) => a - b);
    const mid = ages[Math.floor(ages.length / 2)];
    return formatWaited(new Date(mid).toISOString());
  })();

  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const categoryNames = categories.map((c) => c.name);
  const filtered = Boolean(q || status || category);

  const pageHref = (n: number) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (status) usp.set("status", status);
    if (category) usp.set("category", category);
    if (sort) usp.set("sort", sort);
    if (n > 1) usp.set("page", String(n));
    const query = usp.toString();
    return query ? `/admin/vendors?${query}` : "/admin/vendors";
  };

  const columns: Column<VendorListItem>[] = [
    {
      key: "name",
      header: "Shop",
      role: "title",
      cell: (v) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-cover bg-center text-sm font-bold text-white"
            style={
              v.imageUrl
                ? { backgroundImage: `url(${v.imageUrl})` }
                : { background: v.accentTint ?? "var(--accent)" }
            }
          >
            {v.imageUrl ? "" : v.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-semibold">{v.name}</span>
              <span className="shrink-0 @3xl:hidden">
                <span className={STATUS_PILL[v.status]}>{v.status}</span>
              </span>
            </span>
            <span className="block truncate text-xs text-muted">/{v.slug}</span>
          </span>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      cell: (v) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13px]">
            {v.ownerName ?? "—"}
          </span>
          {v.ownerMobile ? (
            <span className="text-data block truncate text-[11px] text-muted">
              {v.ownerMobile}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (v) => (
        <span className="truncate text-[13px] text-muted">
          {v.category ?? "Uncategorised"}
        </span>
      ),
    },
    {
      key: "commission",
      header: "Commission",
      align: "right",
      cell: (v) => (
        <span className="text-data text-[13px] font-semibold">
          {v.commissionPct}%
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      role: "trailing",
      cell: (v) => (
        <span className="hidden @3xl:inline">
          <span className={STATUS_PILL[v.status]}>{v.status}</span>
        </span>
      ),
    },
    {
      key: "created",
      header: "Added",
      cell: (v) => (
        <span className="whitespace-nowrap text-[13px] text-muted">
          {dateFmt.format(new Date(v.createdAt))}
        </span>
      ),
    },
    {
      key: "slot",
      header: "Slot",
      cell: (v) => <VendorPositionSelect id={v.id} position={v.sortPosition} />,
    },
    {
      key: "actions",
      header: "",
      role: "actions",
      align: "right",
      width: "w-[56px]",
      cell: (v) => (
        <VendorRowActions id={v.id} name={v.name} status={v.status} />
      ),
    },
  ];

  return (
    <>
      <AdminHero
        title="Vendors"
        tag={awaiting.length > 0 ? `${awaiting.length} waiting` : "Queue clear"}
        subtitle="Approve restaurant signups, then manage the catalogue"
        action={
          <Link href="/admin/vendors/new" className="c-btn c-btn-dark press">
            <Plus className="size-3.5" strokeWidth={2.4} /> Add vendor
          </Link>
        }
      />

      {awaiting.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2.5 rounded-[11px] bg-ink px-[15px] py-[11px]">
            <p className="text-[12.5px] font-semibold text-[color:var(--surface)]">
              {awaiting.length} shop{awaiting.length === 1 ? "" : "s"} waiting to
              go live
            </p>
            {medianWait ? (
              <p className="text-xs text-[color:var(--c-faint)]">
                Median wait {medianWait}
              </p>
            ) : null}
            <span className="ml-auto text-xs text-[color:var(--c-faint)]">
              Approving puts the storefront on the customer feed immediately
            </span>
          </div>

          <VendorApprovalCards vendors={awaiting.slice(0, QUEUE_SHOWN)} />

          {awaiting.length > QUEUE_SHOWN ? (
            <p className="text-xs text-muted">
              Showing the {QUEUE_SHOWN} longest-waiting of {awaiting.length}. The
              rest are in the table below, filtered to Pending.
            </p>
          ) : null}
        </>
      ) : null}

      <StatTiles>
        <StatTile label="All vendors" value={counts.total} note="On the platform" />
        <StatTile label="Active" value={counts.active} note="Taking orders" />
        <StatTile
          label="Suspended or inactive"
          value={counts.inactive + counts.suspended}
          note={`${counts.suspended} suspended, ${counts.inactive} inactive`}
        />
        <StatTile
          label="Categories"
          value={counts.categories}
          note="Used to group the customer feed"
        />
      </StatTiles>

      <VendorSearchBar categories={categoryNames} />

      <DataTable
        caption="Vendors"
        columns={columns}
        rows={result.items}
        rowKey={(v) => v.id}
        rowHref={(v) => `/admin/vendors/${v.id}?tab=overview`}
        minWidth={960}
        footer={
          <TableFooter
            page={page}
            totalPages={totalPages}
            hrefFor={pageHref}
            summary={`${result.total} vendor${result.total === 1 ? "" : "s"}${filtered ? " matching" : ""}`}
          />
        }
        empty={
          <EmptyState
            icon={Store}
            title={filtered ? "No vendors match" : "No vendors yet"}
            description={
              filtered
                ? "Try a different search or filter."
                : "Add your first shop to start taking orders."
            }
            action={
              !filtered ? (
                <Link href="/admin/vendors/new" className="c-btn c-btn-dark press">
                  <Plus className="size-3.5" strokeWidth={2.4} /> Add vendor
                </Link>
              ) : null
            }
          />
        }
      />

      <Link
        href="/admin/vendors/categories"
        className="press inline-flex items-center gap-1.5 text-xs font-semibold text-accent-ink"
      >
        <Tags className="size-3.5" />
        Manage categories
      </Link>
    </>
  );
}
