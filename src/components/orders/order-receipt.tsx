"use client";

import { Printer } from "lucide-react";
import type { UiOrder } from "@/lib/utils/order-map";
import { shortOrderId } from "@/lib/utils/order-map";
import { formatINR } from "@/lib/utils/format";

/**
 * What the customer paid, itemised, on a page that survives leaving the screen.
 *
 * There was no receipt anywhere in the customer app. Every number needed for
 * one was already on the order — line items, delivery fee, tax, tip, discount,
 * the coupon code, how it was paid — and the only place any of it appeared was
 * a single "Total (Cash)" line on the tracking screen. Anyone who had to expense
 * a delivery, or reconcile a card statement, had nothing to produce.
 *
 * Print rather than a generated PDF, for the same reason the admin reports
 * print (see globals.css): the browser already has a typesetter and a
 * PDF writer, and every phone's share sheet offers "Save as PDF" from it. A
 * bundled renderer would ship a megabyte to reproduce that badly.
 */
export function OrderReceipt({
  order,
  placedOn,
}: {
  order: UiOrder;
  /**
   * The full date, formatted on the server so it does not depend on the
   * device's locale settings for a document meant to be filed.
   */
  placedOn: string;
}) {
  const charges = order.charges;
  const paidWith =
    order.paymentMethod === "online"
      ? order.paymentStatus === "paid"
        ? "Paid online"
        : "Online payment"
      : "Cash on delivery";

  return (
    <div className="admin-measure mx-auto px-4 pb-8">
      <div className="card mt-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
              Deligro
            </p>
            <h1 className="mt-1 text-[22px] font-extrabold tracking-tight">
              Receipt
            </h1>
          </div>
          <div className="text-right">
            <p className="text-data text-[13px] font-extrabold tracking-[0.1em]">
              {shortOrderId(order.id)}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">{placedOn}</p>
          </div>
        </div>

        <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Restaurant</dt>
            <dd className="text-right font-semibold">{order.restaurantName}</dd>
          </div>
          {order.address?.line ? (
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-muted">Delivered to</dt>
              <dd className="text-right font-semibold">
                {order.address.label ? `${order.address.label} — ` : ""}
                {order.address.line}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Payment</dt>
            <dd className="text-right font-semibold">{paidWith}</dd>
          </div>
        </dl>

        <table className="mt-5 w-full text-[14px]">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-[0.06em] text-muted">
              <th className="pb-2 text-left font-bold">Item</th>
              <th className="pb-2 text-right font-bold">Qty</th>
              <th className="pb-2 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => (
              <tr key={l.itemId} className="border-b border-line/60">
                <td className="py-2 pr-2">{l.name}</td>
                <td className="py-2 text-right text-muted">{l.qty}</td>
                <td className="text-data py-2 text-right">
                  {formatINR(l.price * l.qty)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Absent on a mock order, and on a database that predates the
            migrations these fields arrived in. The total is always real, so a
            receipt without the breakdown still says what was paid rather than
            inventing the parts. */}
        {charges ? (
          <dl className="mt-4 space-y-1.5 text-[14px]">
            <Row label="Subtotal" value={charges.subtotal} />
            {charges.discount > 0 ? (
              <Row
                label={
                  charges.couponCode
                    ? `Discount (${charges.couponCode})`
                    : "Discount"
                }
                value={-charges.discount}
              />
            ) : null}
            <Row label="Delivery" value={charges.deliveryFee} />
            {charges.tax > 0 ? <Row label="Taxes" value={charges.tax} /> : null}
            {charges.tip > 0 ? (
              <Row label="Tip for the rider" value={charges.tip} />
            ) : null}
          </dl>
        ) : null}

        <div className="mt-3 flex justify-between border-t border-line pt-3">
          <span className="text-[15px] font-extrabold">Total</span>
          <span className="text-data text-[17px] font-extrabold">
            {formatINR(order.total)}
          </span>
        </div>

        <p className="mt-5 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
          This is a customer receipt for an order placed through Deligro. Prices
          are in Indian rupees and include any taxes shown above.
        </p>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        data-print="hide"
        className="press mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-sm font-bold text-[var(--on-accent)] shadow-[var(--glow-accent)]"
      >
        <Printer className="size-4" />
        Print or save as PDF
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-data">
        {value < 0 ? `−${formatINR(-value)}` : formatINR(value)}
      </dd>
    </div>
  );
}
