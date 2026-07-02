"use client";

import { Star } from "lucide-react";
import type { MenuItem, Restaurant } from "@/types";
import { useCart } from "@/stores/cart-store";
import { QtyStepper } from "@/components/shared/qty-stepper";
import { VegMark } from "@/components/shared/veg-mark";
import { PhotoTile } from "@/components/shared/photo-tile";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function MenuItemRow({
  item,
  restaurant,
}: {
  item: MenuItem;
  restaurant: Restaurant;
}) {
  const qty = useCart((s) => s.qtyOf(item.id));
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

  const ref = { slug: restaurant.slug, name: restaurant.name };

  return (
    <div className={cn("flex gap-3 py-4", item.soldOut && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <VegMark veg={item.veg} className="mb-1.5" />
        <div className="flex items-center gap-1.5">
          <h3 className="text-[16px] font-bold leading-tight">{item.name}</h3>
        </div>
        {item.bestseller ? (
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent">
            <Star className="size-3 fill-accent" /> Bestseller
          </span>
        ) : null}
        <p className="mt-1 text-sm leading-snug text-muted">
          {item.description}
        </p>
        <p className="mt-2 text-data font-semibold">{formatINR(item.price)}</p>
      </div>

      <div className="flex w-[104px] shrink-0 flex-col items-center">
        <PhotoTile
          tint={restaurant.accentTint}
          src={item.image}
          alt={item.name}
          className="h-24 w-[104px] rounded-xl"
        />
        <div className="-mt-5 w-[92px]">
          <QtyStepper
            size="sm"
            soldOut={item.soldOut}
            qty={qty}
            onAdd={() => add(item, ref)}
            onInc={() => setQty(item.id, qty + 1)}
            onDec={() => setQty(item.id, qty - 1)}
          />
        </div>
      </div>
    </div>
  );
}
