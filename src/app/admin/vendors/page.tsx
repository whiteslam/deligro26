import Link from "next/link";
import {
  CheckCircle2,
  ListOrdered,
  Plus,
  Store,
  Tags,
  TriangleAlert,
} from "lucide-react";
import {
  getVendorCounts,
  listVendors,
  storefrontGaps,
  type VendorListItem,
  type VendorStatus,
} from "@/lib/data-access/admin-vendors";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { AdminHero, EmptyState } from "@/components/admin/admin-ui";
import { StatTile, StatTiles } from "@/components/admin/console-ui";
import { ConsoleOnly } from "@/components/admin/console-only";
import { VendorAvatar } from "@/components/admin/vendor-avatar";
import { AdminQuickLink } from "@/components/admin/admin-quick-link";
import { ApproveRestaurantButton } from "@/components/admin/approve-restaurant-button";
import { RejectVendorButton } from "@/components/admin/reject-vendor-button";
import { FilterChips } from "@/components/admin/admin-filters";
import {
  DataTable,
  TableFooter,
  type Column,
} from "@/components/admin/data-table";
import { formatWaited } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { VendorSearchBar } from "./vendor-search-bar";
import { PAGE_SIZES } from "./page-sizes";
import { VendorPositionSelect } from "./vendor-position-select";
import { VendorPasswordCell } from "./vendor-password-cell";
import { VendorRowActions } from "./vendor-row-actions";

/**
 * Admin → Vendors: the partner directory, as a table.
 *
 * This used to be a grid of profile cards. Each one was about 280px tall, so a
 * roster of forty shops was a page you scrolled for a minute — and the facts an
 * operator actually opens this screen for (who is waiting, what is this shop's
 * number, what is their password) were spread across three regions of a card
 * that mostly held whitespace. A directory is a table. One row per shop, the
 * columns you can scan down, and the decorative half deleted.
 *
 * The status filter is promoted to tabs, because the queue and the catalogue
 * are two different jobs rather than two parts of one page: **Approvals** is
 * triage with a clock on it and carries its own Approve/Reject column and a
 * waiting time, everything else is browsing. The tab is the same `?status=`
 * that the filter bar writes, so the two can never disagree.
 */
export const dynamic = "force-dynamic";

type Search = { [key: string]: string | string[] | undefined };

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const STATUS_PILL: Record<VendorStatus, string> = {
  active: "pill pill-green",
  pending: "pill pill-pop",
  suspended: "pill pill-deal",
  inactive: "pill pill-muted",
};

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "numeric",
});

/** A signup nobody has ruled on for this long is the queue's real failure mode. */
const OVERDUE_DAYS = 4;

function isOverdue(createdAt: string): boolean {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Number.isFinite(ms) && ms > OVERDUE_DAYS * 86_400_000;
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
  const pageSize = PAGE_SIZES.includes(Number(one(sp.per)))
    ? Number(one(sp.per))
    : PAGE_SIZES[0];

  const [counts, result, categories] = await Promise.all([
    getVendorCounts(),
    listVendors({ q, status, category, sort, page, pageSize }),
    listCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const categoryNames = categories.map((c) => c.name);
  const filtered = Boolean(q || category);
  const approvals = status === "pending";

  const href = (next: Record<string, string | null>) => {
    const usp = new URLSearchParams();
    const base: Record<string, string | null> = {
      q: q || null,
      status: status ?? null,
      category: category ?? null,
      sort: sort ?? null,
      per: pageSize === PAGE_SIZES[0] ? null : String(pageSize),
      page: page > 1 ? String(page) : null,
      ...next,
    };
    for (const [key, value] of Object.entries(base)) {
      if (value) usp.set(key, value);
    }
    const query = usp.toString();
    return query ? `/admin/vendors?${query}` : "/admin/vendors";
  };

  // Counted over the page in hand, not the whole roster: a second COUNT query
  // for a nudge is not worth it, and "3 of the 25 shown" is the honest reading
  // of a figure derived from twenty-five rows.
  const incomplete = result.items.filter((v) => storefrontGaps(v).length > 0);
  const noEmail = result.items.filter((v) => !v.ownerEmail);

  const columns: Column<VendorListItem>[] = [
    {
      key: "shop",
      header: "Shop",
      role: "title",
      width: "w-[240px]",
      cell: (v) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <VendorAvatar
            name={v.name}
            imageUrl={v.imageUrl}
            accentTint={v.accentTint}
          />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold leading-tight">
              {v.name}
            </p>
            <p className="truncate text-[11px] text-muted">
              /{v.slug}
              {v.category ? ` · ${v.category}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      width: "w-[190px]",
      cell: (v) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium">
            {v.ownerName ?? "—"}
          </p>
          {v.ownerMobile ? (
            <a
              href={`tel:${v.ownerMobile}`}
              className="text-data block truncate text-[11.5px] text-muted hover:text-accent-ink"
            >
              {v.ownerMobile}
            </a>
          ) : (
            <p className="text-[11.5px] text-muted">No mobile</p>
          )}
        </div>
      ),
    },
    {
      key: "email",
      header: "Login email",
      width: "w-[190px]",
      cell: (v) =>
        v.ownerEmail ? (
          <span className="block truncate text-[12px]" title={v.ownerEmail}>
            {v.ownerEmail}
          </span>
        ) : (
          // Not a cosmetic gap: without an email there is no auth account to
          // hang a password on, so this shop cannot be given a login at all.
          <Link
            href={`/admin/vendors/${v.id}/edit`}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-deal hover:underline"
          >
            <TriangleAlert className="size-3" /> Add an email
          </Link>
        ),
    },
    {
      key: "password",
      header: "Password",
      width: "w-[210px]",
      cell: (v) => (
        <VendorPasswordCell id={v.id} name={v.name} password={v.loginPassword} />
      ),
    },
    {
      key: "status",
      header: "Status",
      role: "trailing",
      width: "w-[130px]",
      cell: (v) => {
        const gaps = storefrontGaps(v);
        return (
          <div className="space-y-1">
            <span className={STATUS_PILL[v.status]}>{v.status}</span>
            {gaps.length > 0 ? (
              <p
                className="truncate text-[10.5px] text-muted"
                title={`Missing ${gaps.join(", ")}`}
              >
                No {gaps.join(", ")}
              </p>
            ) : null}
          </div>
        );
      },
    },
    approvals
      ? {
          key: "waiting",
          header: "Waiting",
          width: "w-[110px]",
          cell: (v) => (
            <span
              className={cn(
                "text-[12px] font-semibold",
                isOverdue(v.createdAt) ? "text-deal" : "text-muted"
              )}
            >
              {formatWaited(v.createdAt)}
            </span>
          ),
        }
      : {
          key: "commission",
          header: "Commission",
          align: "right",
          width: "w-[110px]",
          cell: (v) => (
            <div>
              <p className="text-data text-[12.5px] font-semibold">
                {v.effectiveCommissionPct}%
              </p>
              <p className="text-[10.5px] text-muted">
                {v.inheritsPlatformRate ? "Platform" : "Own rate"}
              </p>
            </div>
          ),
        },
    {
      key: "since",
      header: "Since",
      role: "wideOnly",
      width: "w-[92px]",
      cell: (v) => (
        <span className="text-[11.5px] text-muted">
          {dateFmt.format(new Date(v.createdAt))}
        </span>
      ),
    },
    approvals
      ? {
          key: "decision",
          header: "Decision",
          role: "actions",
          width: "w-[190px]",
          cell: (v) => (
            <div className="flex items-center gap-2">
              <ApproveRestaurantButton id={v.id} name={v.name} variant="compact" />
              <RejectVendorButton id={v.id} name={v.name} />
            </div>
          ),
        }
      : {
          key: "slot",
          header: "Feed slot",
          role: "wideOnly",
          width: "w-[110px]",
          cell: (v) => <VendorPositionSelect id={v.id} position={v.sortPosition} />,
        },
    {
      key: "actions",
      header: "",
      role: "actions",
      align: "right",
      width: "w-[176px]",
      cell: (v) => (
        <div className="flex justify-end">
          <VendorRowActions
            id={v.id}
            name={v.name}
            status={v.status}
            showPasswordReset={false}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminHero
        title="Vendors"
        tag={counts.pending > 0 ? `${counts.pending} waiting` : "Queue clear"}
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
        why="Approving a signup, suspending a shop and searching the list all work on a phone — only adding a brand-new vendor needs the desk."
      />

      {/* The one part of this page with a clock on it gets a line of its own on
          every tab, so switching away from Approvals doesn't hide the backlog. */}
      {counts.pending > 0 && !approvals ? (
        <Link
          href="/admin/vendors?status=pending"
          className="press flex items-center gap-2.5 rounded-[var(--radius-block)] border border-pop/30 bg-pop/[0.06] px-4 py-3"
        >
          <TriangleAlert className="size-4 shrink-0 text-pop-ink" />
          <p className="text-[13px] font-medium text-pop-ink">
            {counts.pending} signup{counts.pending === 1 ? "" : "s"} waiting to
            go live — open Approvals to decide.
          </p>
        </Link>
      ) : counts.pending === 0 && counts.total > 0 ? (
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
          value={counts.inactive + counts.suspended + counts.pending}
          note={`${counts.pending} waiting · ${counts.suspended} suspended · ${counts.inactive} inactive`}
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
          label="No login email"
          value={noEmail.length}
          note={
            noEmail.length
              ? "Can't be issued a password until one is added"
              : "Every shop on this page can sign in"
          }
        />
      </StatTiles>

      {/* ---------- the catalogue ---------- */}
      <section className="space-y-3">
        <FilterChips
          label="Vendor status"
          active={status ?? null}
          hrefFor={(value) => href({ status: value, page: null })}
          options={[
            { value: "pending", label: "Approvals", count: counts.pending },
            { value: "active", label: "Active", count: counts.active },
            { value: "inactive", label: "Inactive", count: counts.inactive },
            { value: "suspended", label: "Suspended", count: counts.suspended },
          ]}
        />

        <VendorSearchBar categories={categoryNames} />

        <DataTable
          columns={columns}
          rows={result.items}
          rowKey={(v) => v.id}
          rowHref={(v) => `/admin/vendors/${v.id}?tab=overview`}
          caption="Vendors"
          dense
          minWidth={1240}
          // Tint the rows that are actually a problem — a signup nobody has
          // ruled on for four days, or a shop that cannot be given a login —
          // rather than every row of the Approvals tab, which would tint the
          // whole table and say nothing.
          rowTone={(v) =>
            !v.ownerEmail || (v.status === "pending" && isOverdue(v.createdAt))
              ? "alert"
              : null
          }
          empty={
            <EmptyState
              icon={Store}
              title={
                approvals
                  ? "Nothing waiting"
                  : filtered
                    ? "No vendors match"
                    : "No vendors yet"
              }
              description={
                approvals
                  ? "Every signup has been approved or declined."
                  : filtered
                    ? "Try a different search or filter."
                    : "Add your first shop to start taking orders."
              }
              action={
                !filtered && !approvals ? (
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
          }
          footer={
            <TableFooter
              page={page}
              totalPages={totalPages}
              hrefFor={(n) => href({ page: n > 1 ? String(n) : null })}
              summary={`${result.total} vendor${result.total === 1 ? "" : "s"}${
                filtered || status ? " matching" : ""
              }`}
            />
          }
        />
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
