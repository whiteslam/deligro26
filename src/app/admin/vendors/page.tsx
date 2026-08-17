import Link from "next/link";
import {
  CheckCircle2,
  ListOrdered,
  Plus,
  Store,
  Tags,
} from "lucide-react";
import {
  getVendorCounts,
  listAwaitingApproval,
  listVendors,
  type VendorListItem,
  type VendorStatus,
} from "@/lib/data-access/admin-vendors";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { AdminHero, EmptyState } from "@/components/admin/admin-ui";
import { ConsoleOnly } from "@/components/admin/console-only";
import { VendorApprovalCards } from "@/components/admin/vendor-approval-cards";
import { VendorStorefrontCard } from "@/components/admin/vendor-storefront-card";
import { AdminQuickLink } from "@/components/admin/admin-quick-link";
import { TableFooter } from "@/components/admin/data-table";
import { formatWaited } from "@/lib/utils/format";
import { VendorSearchBar } from "./vendor-search-bar";

/**
 * Admin → Vendors, laid out like a partner storefront rather than a spreadsheet.
 *
 * Cover-first shop cards (the same language as /vendor/profile), a snapshot
 * strip, and the approval queue as mini storefronts. Search, paging, featured
 * slots, suspend and delete stay — they just sit on the card instead of in a
 * 960px table the phone frame cannot hold.
 */
export const dynamic = "force-dynamic";

const QUEUE_SHOWN = 6;

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
  const pageSize = 12;

  const [counts, result, categories, awaiting] = await Promise.all([
    getVendorCounts(),
    listVendors({ q, status, category, sort, page, pageSize }),
    listCategories(),
    listAwaitingApproval().catch(() => [] as VendorListItem[]),
  ]);

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

  const snapshots = [
    {
      label: "All vendors",
      value: String(counts.total),
      hint: "On the platform",
    },
    {
      label: "Active",
      value: String(counts.active),
      hint: "Taking orders",
    },
    {
      label: "Needs attention",
      value: String(counts.inactive + counts.suspended + awaiting.length),
      hint: `${awaiting.length} waiting · ${counts.suspended} suspended`,
    },
    {
      label: "Categories",
      value: String(counts.categories),
      hint: "Used to group the customer feed",
    },
  ];

  return (
    <>
      <AdminHero
        title="Vendors"
        tag={awaiting.length > 0 ? `${awaiting.length} waiting` : "Queue clear"}
        subtitle="Approve signups, then manage each shop like a storefront"
        action={
          <ConsoleOnly tool="Vendor onboarding" notice={false}>
            <Link href="/admin/vendors/new" className="c-btn c-btn-dark press">
              <Plus className="size-3.5" strokeWidth={2.4} /> Add vendor
            </Link>
          </ConsoleOnly>
        }
      />

      <ConsoleOnly
        tool="Vendor onboarding"
        why="Approving, suspending and searching all work here."
      />

      {awaiting.length > 0 ? (
        <section className="vendor-profile-panel flex flex-col gap-4 rounded-[var(--radius-block)] border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm font-bold">
              {awaiting.length} shop{awaiting.length === 1 ? "" : "s"} waiting
              to go live
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {medianWait
                ? `Median wait ${medianWait} · approving puts the storefront on the customer feed immediately`
                : "Approving puts the storefront on the customer feed immediately"}
            </p>
          </div>
          <span className="pill pill-pop shrink-0">
            {awaiting.length} in queue
          </span>
        </section>
      ) : counts.total > 0 ? (
        <section className="vendor-profile-panel flex items-center gap-3 rounded-[var(--radius-block)] border border-green/25 bg-green/5 px-4 py-3">
          <CheckCircle2 className="size-5 shrink-0 text-green" />
          <p className="text-sm font-medium text-green">
            Approval queue is clear — every signup has been reviewed.
          </p>
        </section>
      ) : null}

      {awaiting.length > 0 ? (
        <>
          <VendorApprovalCards vendors={awaiting.slice(0, QUEUE_SHOWN)} />
          {awaiting.length > QUEUE_SHOWN ? (
            <p className="text-xs text-muted">
              Showing the {QUEUE_SHOWN} longest-waiting of {awaiting.length}.
              The rest are in the catalogue below, filtered to Pending.
            </p>
          ) : null}
        </>
      ) : null}

      <section className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        {snapshots.map((m, i) => (
          <div
            key={m.label}
            className="vendor-profile-stat rounded-[var(--radius-block)] border border-line bg-surface p-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <p className="text-label">{m.label}</p>
            <p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              {m.value}
            </p>
            <p className="mt-1 text-[11px] text-muted">{m.hint}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[var(--radius-block)] border border-line bg-surface p-3.5">
        <VendorSearchBar categories={categoryNames} />
      </section>

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
              <ConsoleOnly tool="Vendor onboarding" notice={false}>
                <Link
                  href="/admin/vendors/new"
                  className="c-btn c-btn-dark press"
                >
                  <Plus className="size-3.5" strokeWidth={2.4} /> Add vendor
                </Link>
              </ConsoleOnly>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2 @5xl:grid-cols-3">
          {result.items.map((v) => (
            <VendorStorefrontCard key={v.id} vendor={v} />
          ))}
        </div>
      )}

      {result.items.length > 0 ? (
        <div className="rounded-[var(--radius-block)] border border-line bg-surface px-4 py-3">
          <TableFooter
            page={page}
            totalPages={totalPages}
            hrefFor={pageHref}
            summary={`${result.total} vendor${result.total === 1 ? "" : "s"}${filtered ? " matching" : ""}`}
          />
        </div>
      ) : null}

      <div className="grid gap-2 @3xl:grid-cols-2">
        <AdminQuickLink
          href="/admin/vendors/categories"
          label="Categories"
          hint="Group shops on the customer feed"
          icon={Tags}
        />
        <AdminQuickLink
          href="/admin/vendors/slots"
          label="Featured slots"
          hint="Pin up to ten shops at the top of the feed"
          icon={ListOrdered}
        />
      </div>
    </>
  );
}
