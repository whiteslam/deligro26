import Link from "next/link";
import { Plus, Store, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getVendorCounts,
  listVendors,
  vendorsBackendReady,
  type VendorListItem,
  type VendorStatus,
} from "@/lib/data-access/admin-vendors";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { VendorSearchBar } from "./vendor-search-bar";
import { VendorRowActions } from "./vendor-row-actions";

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

  const [counts, result, backendReady, categories] = await Promise.all([
    getVendorCounts(),
    listVendors({ q, status, category, sort, page, pageSize }),
    vendorsBackendReady(),
    listCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const categoryNames = categories.map((c) => c.name);

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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight">Vendors</h1>
          <p className="mt-0.5 text-sm text-muted">Onboard &amp; manage shops</p>
        </div>
        <Link href="/admin/vendors/new" className="shrink-0">
          <Button size="sm">
            <Plus className="size-4" /> Add
          </Button>
        </Link>
      </div>

      {!backendReady ? (
        <p className="rounded-2xl border border-pop/40 bg-pop/10 px-3.5 py-3 text-sm font-medium text-ink">
          Preview mode — apply{" "}
          <code className="rounded bg-surface-2 px-1 text-xs">
            0017_vendor_management.sql
          </code>{" "}
          to load vendors.
        </p>
      ) : null}

      {/* Overview cards */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Active" value={counts.active} tone="green" />
        <StatCard label="Pending" value={counts.pending} tone="accent" />
        <StatCard label="Inactive" value={counts.inactive} />
        <StatCard label="Suspended" value={counts.suspended} tone="deal" />
        <StatCard
          label="Categories"
          value={counts.categories}
          href="/admin/vendors/categories"
          icon={<Tags className="size-3.5" />}
        />
      </div>

      <VendorSearchBar categories={categoryNames} />

      {result.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-10 text-center">
          <Store className="size-8 text-muted" />
          <p className="font-semibold">
            {q || status || category ? "No vendors match" : "No vendors yet"}
          </p>
          <p className="text-sm text-muted">
            {q || status || category
              ? "Try a different search or filter."
              : "Add your first shop to start taking orders."}
          </p>
          {!q && !status && !category ? (
            <Link href="/admin/vendors/new">
              <Button size="sm">
                <Plus className="size-4" /> Add vendor
              </Button>
            </Link>
          ) : null}
        </div>
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

function StatCard({
  label,
  value,
  tone,
  href,
  icon,
}: {
  label: string;
  value: number;
  tone?: "green" | "accent" | "deal";
  href?: string;
  icon?: React.ReactNode;
}) {
  const valueClass =
    tone === "green"
      ? "text-green"
      : tone === "accent"
        ? "text-accent"
        : tone === "deal"
          ? "text-deal"
          : "text-ink";
  const inner = (
    <div className="rounded-2xl border border-line bg-surface p-2.5">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </p>
      <p className={`text-data mt-1 text-xl font-extrabold leading-none ${valueClass}`}>
        {value}
      </p>
    </div>
  );
  return href ? (
    <Link href={href} className="press block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function VendorCard({ vendor: v }: { vendor: VendorListItem }) {
  return (
    <li className="rounded-2xl border border-line bg-surface p-3.5">
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
        <span className="text-[11px] text-muted">
          {dateFmt.format(new Date(v.createdAt))}
        </span>
        <VendorRowActions id={v.id} name={v.name} status={v.status} />
      </div>
    </li>
  );
}
