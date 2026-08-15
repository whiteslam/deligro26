import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Store,
  User,
  MapPin,
  Bike,
  Clock,
  CreditCard,
  Banknote,
} from "lucide-react";
import { AdminHero, Panel } from "@/components/admin/admin-ui";
import { ORDER_STATUS } from "@/components/admin/order-status";
import { OrderIntervention } from "@/components/admin/order-intervention";
import { formatINR } from "@/lib/utils/format";
import { formatDateTime } from "@/lib/utils/relative-time";
import { getAdminOrderDetail } from "@/lib/data-access/admin-orders";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Order · Admin · Deligro" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // No demo fallback. The seed rows in ADMIN_ORDERS have no ids and no line
  // items, so a fabricated detail screen here would be a mock of the one screen
  // whose entire job is to be the record of what actually happened.
  if (!isSupabaseConfigured) notFound();

  const order = await getAdminOrderDetail(id);
  if (!order) notFound();

  return (
    <div className="admin-measure space-y-4">
      <AdminHero
        title={order.code}
        tag={ORDER_STATUS[order.status].label}
        subtitle={`Placed ${order.placedAt}`}
        backHref="/admin/orders"
        backLabel="Orders"
        badge={
          <>
            <span className={`pill ${ORDER_STATUS[order.status].cls}`}>
              {ORDER_STATUS[order.status].label}
            </span>
            {order.lateByMinutes !== null ? (
              <span className="pill pill-deal">
                {order.lateByMinutes} min late
              </span>
            ) : null}
          </>
        }
        action={
          <div className="flex items-center gap-3">
            {order.lateByMinutes !== null ? (
              <span className="pill pill-deal hidden @3xl:inline-flex">
                {order.lateByMinutes} min late
              </span>
            ) : null}
            <div className="text-right">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                Total
              </p>
              <p className="mt-1 text-[21px] font-bold leading-none tracking-[-0.02em] tabular-nums">
                {formatINR(order.total)}
              </p>
            </div>
          </div>
        }
      />

      {/* Who and where — the first three things a support call needs. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel title="Customer">
          {order.customer ? (
            <div className="space-y-1">
              <Link
                href={`/admin/customers/${order.customer.id}`}
                className="inline-flex items-center gap-1.5 font-semibold text-ink hover:underline"
              >
                <User className="size-4 text-muted" />
                {order.customer.name}
              </Link>
              {order.customer.phone ? (
                <a
                  href={`tel:${order.customer.phone}`}
                  className="block text-sm text-muted hover:text-ink"
                >
                  {order.customer.phone}
                </a>
              ) : (
                <p className="text-sm text-muted">No phone on file</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">
              This customer&rsquo;s profile has been removed.
            </p>
          )}
        </Panel>

        <Panel title="Restaurant">
          {order.restaurant ? (
            <Link
              href={`/admin/vendors/${order.restaurant.id}`}
              className="inline-flex items-center gap-1.5 font-semibold text-ink hover:underline"
            >
              <Store className="size-4 text-muted" />
              {order.restaurant.name}
            </Link>
          ) : (
            <p className="text-sm text-muted">Restaurant no longer listed.</p>
          )}
        </Panel>
      </div>

      <Panel title="Delivering to">
        <p className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
          <span>
            {order.address.label ? (
              <span className="font-semibold text-ink">
                {order.address.label}
                {order.address.line ? " · " : ""}
              </span>
            ) : null}
            {order.address.line ?? (
              <span className="text-muted">No address recorded</span>
            )}
          </span>
        </p>
      </Panel>

      {/* What was ordered, and what it cost. */}
      <Panel title="Items" subtitle={`${order.items.length} line${order.items.length === 1 ? "" : "s"}`}>
        {order.items.length === 0 ? (
          <p className="text-sm text-muted">
            No line items recorded against this order.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {order.items.map((item, i) => (
              <li
                key={`${item.name}-${i}`}
                className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted">
                    {item.qty} × {formatINR(item.price)}
                  </p>
                </div>
                <p className="text-data shrink-0 text-sm font-semibold">
                  {formatINR(item.qty * item.price)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          <Charge label="Subtotal" value={formatINR(order.subtotal)} />
          <Charge label="Delivery fee" value={formatINR(order.deliveryFee)} />
          <Charge label="Tax" value={formatINR(order.taxAmount)} />
          {/* Null tip means the column does not exist here, which is not ₹0. */}
          <Charge
            label="Tip"
            value={order.tip === null ? "—" : formatINR(order.tip)}
          />
          <div className="flex items-center justify-between border-t border-line pt-1.5 font-bold">
            <dt>Total</dt>
            <dd className="text-data">{formatINR(order.total)}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Payment">
        {!order.paymentKnown ? (
          <p className="text-sm text-muted">
            This database predates migration 0025, which added the payment
            columns. Every order here is cash on delivery by definition.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink">
              {order.paymentMethod === "online" ? (
                <CreditCard className="size-3.5" />
              ) : (
                <Banknote className="size-3.5" />
              )}
              {order.paymentMethod === "online"
                ? "Online"
                : order.paymentMethod === "cod"
                  ? "Cash on delivery"
                  : "Method not recorded"}
            </span>
            <span
              className={`pill ${
                order.paymentStatus === "paid" ? "pill-green" : "pill-muted"
              }`}
            >
              {order.paymentStatus ?? "unknown"}
            </span>
          </div>
        )}
      </Panel>

      <Panel
        title="Timeline"
        subtitle={
          order.lifecycleKnown
            ? "Stamped by the database on each transition"
            : undefined
        }
      >
        {!order.lifecycleKnown ? (
          <p className="text-sm text-muted">
            This database predates migration 0026, so the accepted / ready /
            cancelled times were never recorded. They are unknown here, not
            un-reached.
          </p>
        ) : (
          <ol className="space-y-2.5">
            <Stage label="Placed" at={order.createdAt} reached />
            <Stage
              label="Accepted by kitchen"
              at={order.acceptedAt}
              reached={Boolean(order.acceptedAt)}
            />
            <Stage
              label="Ready for pickup"
              at={order.readyAt}
              reached={Boolean(order.readyAt)}
            />
            {order.cancelledAt ? (
              <Stage label="Cancelled" at={order.cancelledAt} reached />
            ) : null}
          </ol>
        )}
      </Panel>

      <Panel title="Delivery">
        {!order.delivery ? (
          <p className="text-sm text-muted">
            No rider assigned yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  <Bike className="size-4 text-muted" />
                  {order.delivery.rider?.name ?? "Rider"}
                </p>
                {order.delivery.rider?.phone ? (
                  <a
                    href={`tel:${order.delivery.rider.phone}`}
                    className="text-sm text-muted hover:text-ink"
                  >
                    {order.delivery.rider.phone}
                  </a>
                ) : null}
              </div>
              {order.delivery.status ? (
                <span className="pill pill-muted shrink-0">
                  {order.delivery.status.replace(/_/g, " ")}
                </span>
              ) : null}
            </div>

            <ol className="space-y-2.5 border-t border-line pt-2.5">
              <Stage
                label="Assigned"
                at={order.delivery.assignedAt}
                reached={Boolean(order.delivery.assignedAt)}
              />
              <Stage
                label="Picked up"
                at={order.delivery.pickedUpAt}
                reached={Boolean(order.delivery.pickedUpAt)}
              />
              <Stage
                label="Delivered"
                at={order.delivery.deliveredAt}
                reached={Boolean(order.delivery.deliveredAt)}
              />
            </ol>

            {/* Whether the map the customer watched was real. A row written
                before 0026 cannot answer, and saying "estimated" there would be
                as much of a guess as the dot itself was. */}
            <p className="border-t border-line pt-2.5 text-xs text-muted">
              {!order.delivery.locationSourceKnown
                ? "Rider position source not recorded (pre-0026 delivery row)."
                : order.delivery.locationSource === "gps"
                  ? "Rider position was reported by the courier's device."
                  : "Rider position was estimated — no device fix was ever reported."}
            </p>
          </div>
        )}
      </Panel>

      <Panel
        title="Intervene"
        subtitle="Admin-only. The customer is notified of whatever you do here."
      >
        <OrderIntervention
          orderId={order.id}
          dbStatus={order.dbStatus}
          refundable={
            order.paymentMethod === "online" && order.paymentStatus === "paid"
          }
        />
      </Panel>
    </div>
  );
}

function Charge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted">
      <dt>{label}</dt>
      <dd className="text-data text-ink">{value}</dd>
    </div>
  );
}

/**
 * One row of a timeline. A stage that has not happened is shown greyed with no
 * time rather than hidden, so the gap between "not yet" and "we don't record
 * this" stays visible.
 */
function Stage({
  label,
  at,
  reached,
}: {
  label: string;
  at: string | null;
  reached: boolean;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={`mt-1.5 size-2 shrink-0 rounded-full ${
          reached ? "bg-accent" : "bg-line"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${reached ? "text-ink" : "text-muted"}`}
        >
          {label}
        </p>
        <p className="inline-flex items-center gap-1 text-xs text-muted">
          {at ? (
            <>
              <Clock className="size-3" />
              {formatDateTime(at)}
            </>
          ) : (
            "Not yet"
          )}
        </p>
      </div>
    </li>
  );
}
