import { User, Users } from "lucide-react";
import {
  listCustomers,
  type AdminCustomerRow,
} from "@/lib/data-access/admin-customers";
import { AdminHero, EmptyState } from "@/components/admin/admin-ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Admin → Customers. The live directory of everyone who has signed up, newest
 * first, so a brand-new registration shows up at the top with a "New" tag.
 * Read-only: the source of truth is `public.profiles`, populated on signup.
 */
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = isSupabaseConfigured ? await listCustomers() : [];
  return renderCustomers(customers);
}

function renderCustomers(customers: AdminCustomerRow[]) {
  const newCount = customers.filter((c) => c.isNew).length;

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
            <p className="text-data text-xl font-bold leading-none">
              {customers.length}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              total
            </p>
          </div>
        }
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Everyone who signs up in the customer app appears here, newest first."
        />
      ) : (
        <ul className="space-y-2.5">
          {customers.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-line bg-surface p-3.5 transition-shadow hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                  <User className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{c.name}</p>
                    {c.isNew ? (
                      <span className="pill pill-green shrink-0">New</span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted">
                    {c.phone ?? "No phone"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-data text-sm font-bold">{c.orders}</p>
                  <p className="text-[11px] text-muted">
                    {c.orders === 1 ? "order" : "orders"}
                  </p>
                </div>
              </div>
              <p className="mt-2.5 border-t border-line pt-2.5 text-[11px] text-muted">
                Joined {c.joinedAt}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
