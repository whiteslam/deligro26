import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { OrderCard } from "@/components/orders/order-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getOrdersPageData } from "@/lib/orders-ui";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/utils/cn";

export default async function OrdersPage() {
  // Order history is per-account — guests are bounced to /login by the proxy;
  // this backstops it server-side.
  await requireUser();
  const { active, past } = await getOrdersPageData();
  const hasOrders = Boolean(active) || past.length > 0;

  return (
    <>
      <div className="glass sticky top-0 z-20 px-4 pb-3 pt-5">
        <h1 className="text-[23px] font-extrabold tracking-tight">Orders</h1>
      </div>

      {hasOrders ? (
        <div className="px-4 pt-2">
          {active ? (
            <>
              <h2 className="mb-1 text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
                Active
              </h2>
              <div className="divide-y divide-line border-b border-line">
                <OrderCard order={active} />
              </div>
            </>
          ) : null}

          {past.length > 0 ? (
            <>
              <h2
                className={cn(
                  "mb-1 text-[13px] font-bold uppercase tracking-[0.06em] text-muted",
                  active ? "mt-5" : ""
                )}
              >
                Past orders
              </h2>
              <div className="divide-y divide-line">
                {past.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </>
          ) : null}
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
