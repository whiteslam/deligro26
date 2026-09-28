import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { OrderReceipt } from "@/components/orders/order-receipt";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getOrderForTracking } from "@/lib/orders-ui";
import { formatIst } from "@/lib/utils/ist-time";

/**
 * The receipt for one order.
 *
 * Its own route rather than a sheet on the tracking screen, because a receipt
 * is a document: it wants a URL somebody can return to, a back button, and a
 * page the browser can print without the phone frame around it (the `@media
 * print` block in globals.css unwinds the shell for exactly this).
 *
 * Authorization is `getOrderForTracking`, which reads through the caller's own
 * client — RLS returns nothing for an order that is not theirs, and this page
 * turns that into the same 404 a non-existent order gets. No id in a URL buys
 * anyone else's bill.
 */
export default async function OrderReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderForTracking(id);
  if (!order) notFound();

  const placedOn = order.createdAt
    ? // IST explicitly: this page renders on the server, which runs in UTC,
      // and an en-IN locale does not change the clock — the receipt printed
      // 7:42 am for an order placed at 1:12 pm.
      formatIst(order.createdAt, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : order.placedAt;

  return (
    <>
      <PageHeader title="Receipt" subtitle={order.restaurantName} />

      {order.status === "DELIVERED" ? (
        <OrderReceipt order={order} placedOn={placedOn} />
      ) : (
        /* A receipt is a record of a completed sale. Producing one for an order
           that was cancelled — or is still being cooked — would be a document
           asserting a transaction that has not happened, and it is the kind of
           document people forward to an accountant. */
        <EmptyState
          className="mt-12"
          icon={<ReceiptText className="size-7" />}
          tone="violet"
          title="No receipt yet"
          description={
            order.status === "CANCELLED"
              ? "This order was cancelled, so there is nothing to receipt. If money was taken, the refund is on the order screen."
              : "A receipt is issued once the order has been delivered."
          }
          action={
            <Link href={`/orders/${order.id}`}>
              <Button>Back to the order</Button>
            </Link>
          }
        />
      )}
    </>
  );
}
