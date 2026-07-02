import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { ACTIVE_ORDER, PAST_ORDERS } from "@/lib/data";
import { OrderCard } from "@/components/orders/order-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function OrdersPage() {
  const hasOrders = Boolean(ACTIVE_ORDER) || PAST_ORDERS.length > 0;

  return (
    <>
      <div className="glass sticky top-0 z-20 flex items-center justify-between px-4 pb-3 pt-4">
        <h1 className="text-heading">Your orders</h1>
        <ThemeToggle />
      </div>

      {hasOrders ? (
        <div className="space-y-6 px-4 pt-4">
          <section className="space-y-3">
            <h2 className="text-label">Active</h2>
            <OrderCard order={ACTIVE_ORDER} />
          </section>

          <section className="space-y-3">
            <h2 className="text-label">Past orders</h2>
            <div className="space-y-3">
              {PAST_ORDERS.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </div>
          </section>
        </div>
      ) : (
        <EmptyState
          className="mt-12"
          icon={<ReceiptText className="size-7" />}
          title="No orders yet"
          description="Your orders will appear here — track live and reorder in a tap."
          action={
            <Link href="/">
              <Button>Find something to eat</Button>
            </Link>
          }
        />
      )}
    </>
  );
}
