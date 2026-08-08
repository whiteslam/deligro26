import Link from "next/link";
import { User, Users } from "lucide-react";
import {
  listCustomers,
  type AdminCustomerRow,
} from "@/lib/data-access/admin-customers";
import { AdminHero, EmptyState } from "@/components/admin/admin-ui";
import { DataTable, type Column } from "@/components/admin/data-table";
import { FilterSummary, SearchForm } from "@/components/admin/admin-filters";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Admin → Customers. The live directory of everyone who has signed up, newest
 * first, so a brand-new registration shows up at the top with a "New" tag.
 * Read-only: the source of truth is `public.profiles`, populated on signup.
 *
 * This is real customer PII on an operator's screen. It stays scoped to what a
 * support call needs — who they are, how to reach them, what they have ordered
 * — and the search runs over the loaded page rather than querying the whole
 * table by phone number.
 */
export const dynamic = "force-dynamic";

/** How many profiles the directory loads. Stated in the UI, not implied. */
const WINDOW = 200;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q: rawQ }, customers] = await Promise.all([
    searchParams,
    isSupabaseConfigured
      ? listCustomers(WINDOW)
      : Promise.resolve<AdminCustomerRow[]>([]),
  ]);
  const q = (rawQ ?? "").trim();
  const needle = q.toLowerCase();

  const rows = needle
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          (c.phone ?? "").toLowerCase().includes(needle)
      )
    : customers;

  const newCount = customers.filter((c) => c.isNew).length;

  const columns: Column<AdminCustomerRow>[] = [
    {
      key: "name",
      header: "Customer",
      role: "title",
      cell: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
            <User className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold">{c.name}</span>
              {c.isNew ? (
                <span className="pill pill-green shrink-0">New</span>
              ) : null}
            </span>
            <span className="block truncate text-xs text-muted @3xl:hidden">
              {c.phone ?? "No phone"}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      role: "wideOnly",
      cell: (c) => (
        <span className="text-data text-[13px]">{c.phone ?? "—"}</span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      cell: (c) => <span className="text-muted">{c.joinedAt}</span>,
    },
    {
      key: "orders",
      header: "Orders",
      align: "right",
      role: "trailing",
      cell: (c) => (
        <span className="text-data text-sm font-bold">{c.orders}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <AdminHero
        title="Customers"
        subtitle={newCount > 0 ? `${newCount} new this week` : "Newest first"}
        badge={
          newCount > 0 ? (
            <span className="pill pill-green">{newCount} new</span>
          ) : null
        }
        action={
          <div className="text-right">
            <p className="text-data text-xl font-bold leading-none @3xl:text-3xl">
              {customers.length}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              loaded
            </p>
          </div>
        }
      />

      {customers.length > 0 ? (
        <div className="space-y-3">
          <SearchForm
            action="/admin/customers"
            defaultValue={q}
            placeholder="Name or phone number"
          />
          <FilterSummary
            shown={rows.length}
            total={customers.length}
            noun="customer"
            filtered={Boolean(q)}
            clearHref="/admin/customers"
          />
        </div>
      ) : null}

      <DataTable
        caption="Customers"
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        rowHref={(c) => `/admin/customers/${c.id}`}
        empty={
          <EmptyState
            icon={Users}
            title={q ? "No customer matches" : "No customers yet"}
            description={
              q
                ? `Nothing in the ${customers.length} most recent signups matches “${q}”.`
                : "Everyone who signs up in the customer app appears here, newest first."
            }
            action={
              q ? (
                <Link
                  href="/admin/customers"
                  className="press rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-bold"
                >
                  Clear search
                </Link>
              ) : null
            }
          />
        }
      />
    </div>
  );
}
