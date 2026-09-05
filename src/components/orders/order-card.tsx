"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ChevronRight, Loader2 } from "lucide-react";
import type { Order } from "@/types";
import { useCart } from "@/stores/cart-store";
import { useUI } from "@/stores/ui-store";
import { useReorderReview } from "@/stores/reorder-review-store";
import { STATUS_META, isOrderInFlight } from "@/lib/utils/order-status";
import {
  orderLinesToCartLines,
  reconcileReorder,
  type CurrentMenuItem,
} from "@/lib/utils/cart";
import { PhotoTile } from "@/components/shared/photo-tile";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Bolt-style order row: thumbnail, name + price, date + status, reorder/track. */
export function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const reorder = useCart((s) => s.reorder);
  const openCart = useUI((s) => s.openCart);
  const showReorderReview = useReorderReview((s) => s.show);
  const [reordering, setReordering] = useState(false);

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

  const handleReorder = async () => {
    const restaurant = { slug: order.restaurantSlug, name: order.restaurantName };
    const lines = orderLinesToCartLines(order);
    setReordering(true);
    try {
      const res = await fetch(
        `/api/restaurants/${encodeURIComponent(restaurant.slug)}/menu-prices`
      );
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        items?: CurrentMenuItem[];
      } | null;

      // A failed price check must not silently ship stale prices — fall back
      // to the plain reorder rather than pretend nothing could have changed.
      if (!data?.ok || !data.items) {
        reorder(restaurant, lines);
        openCart();
        return;
      }

      const diff = reconcileReorder(lines, data.items);
      if (diff.removed.length === 0 && diff.repriced.length === 0) {
        reorder(restaurant, diff.lines);
        openCart();
      } else {
        showReorderReview({ restaurant, ...diff });
      }
    } finally {
      setReordering(false);
    }
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
          sizes="48px"
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
          className="press grid size-10 shrink-0 place-items-center rounded-full bg-accent text-[var(--on-accent)] shadow-[var(--glow-accent)]"
        >
          <ChevronRight className="size-5" />
        </button>
      ) : (
        <button
          onClick={handleReorder}
          disabled={reordering}
          aria-label="Order again"
          className="press grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink disabled:opacity-60"
        >
          {reordering ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <RotateCcw className="size-5" />
          )}
        </button>
      )}
    </div>
  );
}
