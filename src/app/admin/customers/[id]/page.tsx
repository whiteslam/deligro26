import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ReceiptText, Wallet, MapPin, CheckCheck } from "lucide-react";
import { AdminHero, Panel, StatCard, EmptyState } from "@/components/admin/admin-ui";
import { formatINR } from "@/lib/utils/format";
import {
  getCustomerDetail,
  type AdminCustomerDetail,
} from "@/lib/data-access/admin-customers";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Customer · Admin · Deligro" };

const STATUS_PILL: Record<
  AdminCustomerDetail["orders"][number]["status"],
  string
> = {
  PLACED: "pill-accent",
  KITCHEN: "pill-accent",
  READY: "pill-accent",
  ON_THE_WAY: "pill-accent",
  DELIVERED: "pill-green",
  CANCELLED: "pill-muted",
};

const STATUS_LABEL: Record<
  AdminCustomerDetail["orders"][number]["status"],
  string
> = {
  PLACED: "Placed",
  KITCHEN: "Preparing",
  READY: "Ready",
  ON_THE_WAY: "On the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Same reasoning as the order detail screen: there is no honest demo version
  // of one real person's order history.
  if (!isSupabaseConfigured) notFound();

  const customer = await getCustomerDetail(id);
  if (!customer) notFound();

  return (
    <div className="admin-measure space-y-4">
      <AdminHero
        title={customer.name}
        subtitle={`Joined ${customer.joinedAt}`}
        backHref="/admin/customers"
        backLabel="Customers"
        action={
          customer.phone ? (
            <a
              href={`tel:${customer.phone}`}
              className="text-data text-sm font-semibold text-ink hover:underline"
            >
              {customer.phone}
            </a>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard
          icon={<ReceiptText className="size-4" />}
          label="Orders"
          value={customer.orderCount}
          tone="accent"
        />
        <StatCard
          icon={<CheckCheck className="size-4" />}
          label="Delivered"
          value={customer.deliveredCount}
          tone="green"
        />
        <StatCard
          icon={<Wallet className="size-4" />}
          label="Lifetime spend"
          value={formatINR(customer.lifetimeSpend)}
          tone="blue"
          hint="delivered only"
        />
        <StatCard
          icon={<MapPin className="size-4" />}
          label="Saved addresses"
          // Null is "could not read", which is not zero — see getCustomerDetail.
          value={customer.savedAddresses ?? "—"}
          tone="muted"
        />
      </div>

      <Panel
        title="Order history"
        subtitle={
          customer.orderCount > customer.orders.length
            ? `Showing the ${customer.orders.length} most recent of ${customer.orderCount}`
            : undefined
        }
      >
        {customer.orders.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No orders yet"
            description="This customer has an account but has never checked out."
          />
        ) : (
          <ul className="space-y-2.5">
            {customer.orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="press block rounded-2xl border border-line bg-surface p-3.5 transition-shadow hover:shadow-[var(--shadow-md)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-data font-bold">{o.code}</p>
                      <p className="mt-0.5 truncate text-sm text-ink">
                        {o.restaurant}
                      </p>
                      <p className="text-xs text-muted">{o.placedAt}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-data text-sm font-bold">
                        {formatINR(o.total)}
                      </p>
                      <span className={`pill mt-1 ${STATUS_PILL[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
