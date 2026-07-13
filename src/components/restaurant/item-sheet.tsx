"use client";

import { useState } from "react";
import { X, Plus, Minus } from "lucide-react";
import { useCart } from "@/stores/cart-store";
import { useItemSheet } from "@/stores/item-sheet-store";
import { PhotoTile } from "@/components/shared/photo-tile";
import { VegMark } from "@/components/shared/veg-mark";
import { formatINR } from "@/lib/utils/format";

/**
 * Bolt-style product detail popup. Mounted once at app-shell level so it
 * overlays the whole frame; opened via the item-sheet store from a menu row.
 * Modifiers/toppings arrive in a later phase — the layout leaves room for them.
 */
export function ItemSheet() {
  const item = useItemSheet((s) => s.item);
  const restaurant = useItemSheet((s) => s.restaurant);

  if (!item || !restaurant) return null;
  return <ItemSheetInner key={item.id} />;
}

function ItemSheetInner() {
  const item = useItemSheet((s) => s.item)!;
  const restaurant = useItemSheet((s) => s.restaurant)!;
  const onClose = useItemSheet((s) => s.close);

  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const lines = useCart((s) => s.lines);
  const inCart = lines.find((l) => l.itemId === item.id)?.qty ?? 0;

  const [qty, setLocalQty] = useState(Math.max(inCart, 1));

  const ref = { slug: restaurant.slug, name: restaurant.name };

  const commit = () => {
    add(item, ref); // ensure the line exists
    setQty(item.id, qty); // then set the exact quantity
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50">
      <button
        aria-label="Close"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-ink/40"
      />
      <div className="animate-sheet-in bolt-sheet absolute inset-x-0 bottom-0 max-h-[92%] overflow-hidden">
        <div className="bolt-sheet-handle" />
        <div className="no-scrollbar max-h-[92vh] overflow-y-auto">
          {/* Hero image with close */}
          <div className="relative">
            <PhotoTile
              tint={restaurant.accentTint}
              src={item.image}
              alt={item.name}
              className="h-56 w-full"
            />
            <button
              onClick={onClose}
              aria-label="Close"
              className="press absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-surface text-ink shadow-[var(--shadow-md)]"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="px-5 pb-5 pt-4">
            {item.bestseller || item.popular ? (
              <span className="pill-pop mb-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                Popular
              </span>
            ) : null}

            <div className="flex items-center gap-2">
              <VegMark veg={item.veg} />
              <h2 className="text-[22px] font-extrabold leading-tight tracking-tight">
                {item.name}
              </h2>
            </div>
            <p className="mt-1 text-[17px] font-extrabold tracking-tight">
              {formatINR(item.price)}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {item.description}
            </p>
          </div>
        </div>

        {/* Footer: quantity + add */}
        <div className="flex items-center gap-3 border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex h-12 shrink-0 items-center gap-1 rounded-full border border-line px-1">
            <button
              onClick={() => setLocalQty((q) => Math.max(1, q - 1))}
              aria-label="Remove one"
              className="press grid size-11 place-items-center rounded-full text-ink hover:bg-surface-2"
            >
              <Minus className="size-5" strokeWidth={2.5} />
            </button>
            <span className="min-w-8 text-center text-data text-lg font-bold tabular-nums">
              {qty}
            </span>
            <button
              onClick={() => setLocalQty((q) => q + 1)}
              aria-label="Add one"
              className="press grid size-11 place-items-center rounded-full text-ink hover:bg-surface-2"
            >
              <Plus className="size-5" strokeWidth={2.5} />
            </button>
          </div>

          <button
            onClick={commit}
            disabled={item.soldOut}
            className="press flex h-12 flex-1 items-center justify-between rounded-full bg-accent px-5 text-[16px] font-bold text-white shadow-[var(--glow-accent)] disabled:opacity-50"
          >
            <span>{item.soldOut ? "Sold out" : "Add"}</span>
            {!item.soldOut ? <span>{formatINR(item.price * qty)}</span> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
