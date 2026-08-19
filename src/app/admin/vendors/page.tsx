import Link from "next/link";
import { CheckCircle2, ListOrdered, Plus, Store, Tags } from "lucide-react";
import {
  getVendorCounts,
  listAwaitingApproval,
  listVendors,
  storefrontGaps,
  type VendorListItem,
  type VendorStatus,
} from "@/lib/data-access/admin-vendors";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { AdminHero, EmptyState } from "@/components/admin/admin-ui";
import { StatTile, StatTiles } from "@/components/admin/console-ui";
import { ConsoleOnly } from "@/components/admin/console-only";
import { VendorApprovalCards } from "@/components/admin/vendor-approval-cards";
import { VendorProfileCard } from "@/components/admin/vendor-profile-card";
import { AdminQuickLink } from "@/components/admin/admin-quick-link";
import { TableFooter } from "@/components/admin/data-table";
import { formatWaited } from "@/lib/utils/format";
import { VendorSearchBar } from "./vendor-search-bar";

/**
 * Admin → Vendors: a directory of partner profiles.
 *
 * Read top to bottom it answers three questions in the order they get asked —
 * who is waiting on me, how is the roster doing, and who am I looking for. The
 * queue is first because it is the only part with a deadline attached; the
 * snapshot tiles are the console's own band (the same ones settlements uses),
 * not a second set of stat cards invented for this page; the catalogue is last
 * because it is browsing, not triage.
 *
 * Each shop renders as a profile rather than a spreadsheet row or a cover
 * photo — see `VendorProfileCard` for why the cover-led version this replaced
 * did not survive contact with a database where most shops have no photo.
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

  // Counted over the page in hand, not the whole roster: a second COUNT query
  // for a nudge is not worth it, and "3 of the 12 shown" is the honest reading
  // of a figure derived from twelve rows.
  const incomplete = result.items.filter((v) => storefrontGaps(v).length > 0);

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

      {/* ---------- the queue: the only part of this page with a clock on it ---------- */}
      {awaiting.length > 0 ? (
        <section className="space-y-2.5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[14.5px] font-bold tracking-[-0.01em]">
                Waiting to go live
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {medianWait ? `Median wait ${medianWait}. ` : ""}
                Approving puts the storefront on the customer feed immediately.
              </p>
            </div>
            <span className="pill pill-pop shrink-0">
              {awaiting.length} in queue
            </span>
          </div>

          <VendorApprovalCards vendors={awaiting.slice(0, QUEUE_SHOWN)} />

          {awaiting.length > QUEUE_SHOWN ? (
            <p className="text-xs text-muted">
              The {QUEUE_SHOWN} longest-waiting of {awaiting.length}.{" "}
              <Link
                href="/admin/vendors?status=pending"
                className="font-medium text-accent-ink"
              >
                See the rest
              </Link>
              .
            </p>
          ) : null}
        </section>
      ) : counts.total > 0 ? (
        <section className="flex items-center gap-2.5 rounded-[var(--radius-block)] border border-green/25 bg-green/5 px-4 py-3">
          <CheckCircle2 className="size-4 shrink-0 text-green" />
          <p className="text-[13px] font-medium text-green">
            Approval queue is clear — every signup has been reviewed.
          </p>
        </section>
      ) : null}

      <StatTiles>
        <StatTile
          label="Partners"
          value={counts.total}
          note={`${counts.active} taking orders`}
        />
        <StatTile
          label="Needs attention"
          value={counts.inactive + counts.suspended + awaiting.length}
          note={`${awaiting.length} waiting · ${counts.suspended} suspended · ${counts.inactive} inactive`}
        />
        <StatTile
          label="Unfinished storefronts"
          value={incomplete.length}
          note={
            incomplete.length
              ? "Missing a photo, address, category or phone — on this page"
              : "Every shop on this page is complete"
          }
        />
        <StatTile
          label="Categories"
          value={counts.categories}
          note="How the customer feed is grouped"
        />
      </StatTiles>

      {/* ---------- the catalogue ---------- */}
      <section className="space-y-3">
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
          <>
            {/* auto-fill, not a fixed column count: the same grid then works in
                the 390px phone frame and across a 1600px console without a
                breakpoint per shell. */}
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(304px,1fr))] gap-3">
              {result.items.map((v) => (
                <li key={v.id} className="flex">
                  <VendorProfileCard vendor={v} />
                </li>
              ))}
            </ul>

            <div className="rounded-[var(--radius-block)] border border-line bg-surface px-4 py-3">
              <TableFooter
                page={page}
                totalPages={totalPages}
                hrefFor={pageHref}
                summary={`${result.total} vendor${result.total === 1 ? "" : "s"}${filtered ? " matching" : ""}`}
              />
            </div>
          </>
        )}
      </section>

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
