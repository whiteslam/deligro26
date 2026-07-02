"use client";

import { RotateCcw } from "lucide-react";
import type { Order } from "@/types";
import { useCart } from "@/stores/cart-store";
import { useUI } from "@/stores/ui-store";
import { cartLinesFromOrder, getRestaurant } from "@/lib/data";
import { formatINR } from "@/lib/utils/format";

/** One-tap reorder → pre-fills the cart and surfaces the glass sheet. */
export function ReorderBlock({
  order,
  title,
}: {
  order: Order;
  title: string;
}) {
  const reorder = useCart((s) => s.reorder);
  const openCart = useUI((s) => s.openCart);

  const image = getRestaurant(order.restaurantSlug)?.image;
  const itemCount = order.lines.reduce((n, l) => n + l.qty, 0);

  const handle = () => {
    reorder(
      { slug: order.restaurantSlug, name: order.restaurantName },
      cartLinesFromOrder(order)
    );
    openCart();
  };

  return (
    <button
      onClick={handle}
      className="press card relative flex flex-col justify-between overflow-hidden p-3.5 text-left"
    >
      {/* Restaurant photo backdrop — dimmed so the text stays legible */}
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-15"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-surface via-surface/85 to-surface/60" />
        </>
      ) : null}
      <span className="relative flex items-center justify-between">
        <span className="text-label">Reorder</span>
        <RotateCcw className="size-4 text-accent" />
      </span>
      <span className="relative mt-3">
        <span className="block truncate text-[15px] font-bold">{title}</span>
        <span className="block text-xs text-muted">
          {order.restaurantName}
        </span>
      </span>
      <span className="relative mt-2 text-data text-muted">
        {itemCount} items · {formatINR(order.total)}
      </span>
    </button>
  );
}
