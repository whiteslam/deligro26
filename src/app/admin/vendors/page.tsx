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

      {/* Overview cards */}
      <div className="grid grid-cols-3 gap-2.5">
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

      {result.items.length === 0 ? (
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
      ) : (
        <>
          <p className="text-xs text-muted">
            {result.total} vendor{result.total === 1 ? "" : "s"}
          </p>
          <ul className="space-y-2.5">
            {result.items.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </ul>
        </>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-1">
          {page > 1 ? (
            <Link href={pageHref(page - 1)}>
              <Button size="sm" variant="secondary">
                Previous
              </Button>
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)}>
              <Button size="sm" variant="secondary">
                Next
              </Button>
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}

function VendorCard({ vendor: v }: { vendor: VendorListItem }) {
  return (
    <li className="rounded-2xl border border-line bg-surface p-3.5 transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="flex gap-3">
        <div
          className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-cover bg-center text-lg font-bold text-white"
          style={
            v.imageUrl
              ? { backgroundImage: `url(${v.imageUrl})` }
              : { background: v.accentTint ?? "var(--accent)" }
          }
        >
          {v.imageUrl ? "" : v.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-semibold">{v.name}</p>
            <span className={STATUS_PILL[v.status]}>{v.status}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            {v.ownerName ?? "—"}
            {v.ownerMobile ? ` · ${v.ownerMobile}` : ""}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {v.category ?? "Uncategorised"} · {v.commissionPct}% commission
          </p>
          {v.address ? (
            <p className="mt-0.5 truncate text-[11px] text-muted">{v.address}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <VendorPositionSelect id={v.id} position={v.sortPosition} />
          <span className="truncate text-[11px] text-muted">
            {dateFmt.format(new Date(v.createdAt))}
          </span>
        </div>
        <VendorRowActions id={v.id} name={v.name} status={v.status} />
      </div>
    </li>
  );
}
