import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { OrderCard } from "@/components/orders/order-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { getOrdersPageData } from "@/lib/orders-ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function OrdersPage() {
  const { active, past, isDemo } = await getOrdersPageData();
  const hasOrders = Boolean(active) || past.length > 0;

  return (
    <>
      <div className="glass sticky top-0 z-20 flex items-center justify-between px-4 pb-3 pt-4">
        <h1 className="text-heading">Your orders</h1>
        <ThemeToggle />
      </div>

      {hasOrders ? (
        <div className="space-y-6 px-4 pt-4">
          {active ? (
            <section className="space-y-3">
              <h2 className="text-label">Active</h2>
              <OrderCard order={active} />
            </section>
          ) : null}

          {past.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-label">Past orders</h2>
              <div className="space-y-3">
                {past.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <EmptyState
          className="mt-12"
          icon={<ReceiptText className="size-7" />}
          title="No orders yet"
          description={
            isSupabaseConfigured && !isDemo
              ? "Sign in and place your first order — it'll show up here."
              : "Your orders will appear here — track live and reorder in a tap."
          }
          action={
            isSupabaseConfigured && !isDemo ? (
              <Link href="/login?next=/orders">
                <Button>Sign in</Button>
              </Link>
            ) : (
              <Link href="/">
                <Button>Find something to eat</Button>
              </Link>
            )
          }
        />
      )}
    </>
  );
}
