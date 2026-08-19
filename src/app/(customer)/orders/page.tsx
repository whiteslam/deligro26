import Link from "next/link";
import { ReceiptText, TriangleAlert } from "lucide-react";
import { OrderCard } from "@/components/orders/order-card";
import { EmptyState } from "@/components/shared/empty-state";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { Button } from "@/components/ui/button";
import { getOrdersPageData } from "@/lib/orders-ui";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils/cn";

/**
 * Slower than the 3s poll on /orders/[id]. That screen is someone watching their
 * food arrive; this is a list they glance at. Ten seconds is enough that the
 * status here never visibly disagrees with the tracking screen, which was the
 * actual complaint — the same order showing two different states on two screens
 * reads as a bug, not as a design choice.
 */
const REFRESH_MS = 10_000;

export default async function OrdersPage() {
  // Order history is per-account — guests are bounced to /login by the proxy;
  // this backstops it server-side.
  await requireUser();
  const { active, past, ok } = await getOrdersPageData();
  const hasOrders = Boolean(active) || past.length > 0;

  return (
    <>
      {/* Only while something is actually in flight. A page of delivered orders
          has nothing to refresh, and polling it would be pure cost. */}
      {active && isSupabaseConfigured ? <AutoRefresh interval={REFRESH_MS} /> : null}

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
      ) : !ok ? (
        /* The read failed. Telling someone with food on its way that they have
           never ordered is the worst thing this screen can say, and it is
           exactly what an empty state asserts. */
        <EmptyState
          className="mt-12"
          icon={<TriangleAlert className="size-7" />}
          tone="violet"
          title="Couldn't load your orders"
          description="This is a problem on our side, not a sign that anything is missing. Your orders are safe — try again in a moment."
          action={
            <Link href="/orders">
              <Button>Try again</Button>
            </Link>
          }
        />
      ) : (
        <EmptyState
          className="mt-12"
          icon={<ReceiptText className="size-7" />}
          tone="violet"
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
