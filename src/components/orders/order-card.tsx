"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, RotateCcw, ChevronRight, Dot } from "lucide-react";
import type { Order } from "@/types";
import { useCart } from "@/stores/cart-store";
import { useUI } from "@/stores/ui-store";
import { cartLinesFromOrder, getRestaurant } from "@/lib/data";
import { STATUS_META } from "@/lib/utils/order-status";
import { PhotoTile } from "@/components/shared/photo-tile";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const reorder = useCart((s) => s.reorder);
  const openCart = useUI((s) => s.openCart);

  const meta = STATUS_META[order.status];
  const live = order.status === "ON_THE_WAY" || order.status === "KITCHEN";
  const restaurant = getRestaurant(order.restaurantSlug);
  const tint =
    order.restaurantAccent ??
    restaurant?.accentTint ??
    "linear-gradient(135deg,#f6c453,#e8552d)";
  const image = order.restaurantImage ?? restaurant?.image;
  const itemsLabel = order.lines
    .map((l) => `${l.qty}× ${l.name}`)
    .join(", ");

  const handleReorder = () => {
    reorder(
      { slug: order.restaurantSlug, name: order.restaurantName },
      cartLinesFromOrder(order)
    );
    openCart();
  };

  return (
    <div className={cn("card overflow-hidden", live && "border-accent/40")}>
      <div className="flex items-center gap-3 p-3.5">
        <PhotoTile
          tint={tint}
          src={image}
          alt={order.restaurantName}
          className="size-14 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-bold",
                meta.tone === "accent" && "text-accent",
                meta.tone === "green" && "text-green",
                meta.tone === "muted" && "text-muted"
              )}
            >
              {live ? (
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-accent" />
              ) : null}
              {meta.label}
            </span>
            <Dot className="size-3 text-line" />
            <span className="truncate text-xs text-muted">
              {order.placedAt}
            </span>
          </div>
          <h3 className="mt-0.5 truncate text-[15px] font-bold">
            {order.restaurantName}
          </h3>
          <p className="truncate text-xs text-muted">{itemsLabel}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line px-3.5 py-2.5">
        <span className="text-data font-semibold">
          {formatINR(order.total)}
        </span>

        {live ? (
          <Link
            href={`/orders/${order.id}`}
            className="press flex items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[var(--glow-accent)]"
          >
            Track order <ChevronRight className="size-4" />
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/orders/${order.id}`)}
              className="press flex items-center gap-1 rounded-full border border-line px-3.5 py-2 text-sm font-semibold text-ink"
            >
              <Star className="size-4" /> Rate
            </button>
            <button
              onClick={handleReorder}
              className="press flex items-center gap-1 rounded-full bg-surface-2 px-3.5 py-2 text-sm font-semibold text-ink"
            >
              <RotateCcw className="size-4 text-accent" /> Reorder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
