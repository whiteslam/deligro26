"use client";

import { useRouter } from "next/navigation";
import { RotateCcw, ChevronRight } from "lucide-react";
import type { Order } from "@/types";
import { useCart } from "@/stores/cart-store";
import { useUI } from "@/stores/ui-store";
import { STATUS_META, isOrderInFlight } from "@/lib/utils/order-status";
import { orderLinesToCartLines } from "@/lib/utils/cart";
import { PhotoTile } from "@/components/shared/photo-tile";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Bolt-style order row: thumbnail, name + price, date + status, reorder/track. */
export function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const reorder = useCart((s) => s.reorder);
  const openCart = useUI((s) => s.openCart);

  const meta = STATUS_META[order.status];
  // Every stage that hasn't finished, from one shared definition. The old
  // literal list named only KITCHEN and ON_THE_WAY, so an order that was still
  // waiting on the restaurant — or was packed and waiting for a rider, once
  // READY stopped being disguised as KITCHEN — was offered "Order again"
  // instead of a way to track the one already on its way.
  const live = isOrderInFlight(order.status);
  const cancelled = order.status === "CANCELLED";
  const tint =
    order.restaurantAccent ??
    "linear-gradient(135deg,#34e39a,#17b26a)";
  const image = order.restaurantImage;

  const handleReorder = () => {
    reorder(
      { slug: order.restaurantSlug, name: order.restaurantName },
      orderLinesToCartLines(order)
    );
    openCart();
  };

  return (
    <div className="flex items-center gap-3 py-3.5">
      <button
        onClick={() => router.push(`/orders/${order.id}`)}
        className="press flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <PhotoTile
          tint={tint}
          src={image}
          alt={order.restaurantName}
          className="size-12 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-[15px] font-extrabold tracking-tight">
              {order.restaurantName}
            </h3>
            <span className="shrink-0 text-data font-bold">
              {formatINR(order.total)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {order.placedAt}{" "}
            <span
              className={cn(
                "font-semibold",
                live && "text-green",
                cancelled && "text-deal",
                meta.tone === "muted" && !cancelled && "text-ink"
              )}
            >
              {live ? (
                <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-green align-middle" />
              ) : null}
              {meta.label}
            </span>
          </p>
        </div>
      </button>

      {live ? (
        <button
          onClick={() => router.push(`/orders/${order.id}`)}
          aria-label="Track order"
          className="press grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white shadow-[var(--glow-accent)]"
        >
          <ChevronRight className="size-5" />
        </button>
      ) : (
        <button
          onClick={handleReorder}
          aria-label="Order again"
          className="press grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink"
        >
          <RotateCcw className="size-5" />
        </button>
      )}
    </div>
  );
}
