import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  Clock,
  PauseCircle,
  Plus,
  Store,
  Tags,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getVendorCounts,
  listVendors,
  type VendorListItem,
  type VendorStatus,
} from "@/lib/data-access/admin-vendors";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { AdminHero, EmptyState, StatCard } from "@/components/admin/admin-ui";
import { DataTable, TablePager, type Column } from "@/components/admin/data-table";
import { VendorSearchBar } from "./vendor-search-bar";
import { VendorRowActions } from "./vendor-row-actions";
import { VendorPositionSelect } from "./vendor-position-select";

export const dynamic = "force-dynamic";

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

  const [counts, result, categories] = await Promise.all([
    getVendorCounts(),
    listVendors({ q, status, category, sort, page, pageSize }),
    listCategories(),
  ]);

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
    <div className="space-y-5">
      <AdminHero
        title="Vendors"
        subtitle="Onboard &amp; manage shops"
        action={
          <Link href="/admin/vendors/new">
            <Button size="sm">
              <Plus className="size-4" /> Add
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-2.5 @3xl:grid-cols-6 @3xl:gap-4">
        <StatCard
          icon={<Store className="size-4" />}
          tone="accent"
          label="Total"
          value={counts.total}
        />
        <StatCard
          icon={<CheckCircle2 className="size-4" />}
          tone="green"
          label="Active"
          value={counts.active}
        />
        <StatCard
          icon={<Clock className="size-4" />}
          tone="accent"
          label="Pending"
          value={counts.pending}
        />
        <StatCard
          icon={<PauseCircle className="size-4" />}
          tone="muted"
          label="Inactive"
          value={counts.inactive}
        />
        <StatCard
          icon={<Ban className="size-4" />}
          tone="deal"
          label="Suspended"
          value={counts.suspended}
        />
        <StatCard
          icon={<Tags className="size-4" />}
          tone="blue"
          label="Categories"
          value={counts.categories}
          href="/admin/vendors/categories"
        />
      </div>

      <VendorSearchBar categories={categoryNames} />

      {result.items.length > 0 ? (
        <p className="text-xs text-muted">
          {result.total} vendor{result.total === 1 ? "" : "s"}
          {filtered ? " matching" : ""}
          {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
        </p>
      ) : null}

      <DataTable
        caption="Vendors"
        columns={columns}
        rows={result.items}
        rowKey={(v) => v.id}
        rowHref={(v) => `/admin/vendors/${v.id}?tab=overview`}
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
                <Link href="/admin/vendors/new">
                  <Button size="sm">
                    <Plus className="size-4" /> Add vendor
                  </Button>
                </Link>
              ) : null
            }
          />
        }
      />

      <TablePager page={page} totalPages={totalPages} hrefFor={pageHref} />
    </div>
  );
}
