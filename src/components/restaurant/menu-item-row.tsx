"use client";

import { Plus, Minus } from "lucide-react";
import type { MenuItem, Restaurant } from "@/types";
import { useCart } from "@/stores/cart-store";
import { useItemSheet } from "@/stores/item-sheet-store";
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
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const openSheet = useItemSheet((s) => s.open);

  const qty = lines.find((l) => l.itemId === item.id)?.qty ?? 0;
  const ref = { slug: restaurant.slug, name: restaurant.name };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(item, ref);
  };

  return (
    <div className={cn("relative flex gap-3.5 py-3.5 pb-5", item.soldOut && "opacity-60")}>
      <button
        type="button"
        onClick={() => openSheet(item, restaurant)}
        className="min-w-0 flex-1 text-left"
      >
        {item.bestseller || item.popular ? (
          <span className="pill-pop mb-1.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
            Popular
          </span>
        ) : null}
        <div className="flex items-center gap-1.5">
          <VegMark veg={item.veg} />
          <h3 className="text-[15px] font-bold leading-tight">{item.name}</h3>
        </div>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted">
          {item.description}
        </p>
        <p className="mt-1.5 text-[14px] font-extrabold tracking-tight">
          {formatINR(item.price)}
        </p>
      </button>

      <div className="relative z-20 size-24 shrink-0">
        <PhotoTile
          tint={restaurant.accentTint}
          src={item.image}
          alt={item.name}
          className="size-24 rounded-lg"
        />

        {item.soldOut ? (
          <span className="absolute inset-x-0 bottom-0 rounded-b-xl bg-ink/70 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-white">
            Sold out
          </span>
        ) : qty === 0 ? (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Add ${item.name}`}
            className="press bolt-add"
          >
            Add
          </button>
        ) : (
          <div className="bolt-add-qty">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQty(item.id, qty - 1);
              }}
              aria-label="Remove one"
              className="grid size-7 place-items-center rounded-md hover:bg-white/15"
            >
              <Minus className="size-4" strokeWidth={2.75} />
            </button>
            <span className="min-w-4 text-center text-data text-sm font-bold tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQty(item.id, qty + 1);
              }}
              aria-label="Add one"
              className="grid size-7 place-items-center rounded-md hover:bg-white/15"
            >
              <Plus className="size-4" strokeWidth={2.75} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
