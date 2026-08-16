"use client";

import { ShoppingBag } from "lucide-react";
import { useCartSwitch } from "@/stores/cart-switch-store";

/**
 * "Your basket has food from another kitchen." Mounted once at app-shell level,
 * shown only when an Add would replace a basket that already has something in
 * it — see cart-switch-store for why dish-first search made this necessary.
 */
export function CartSwitchDialog() {
  const pending = useCartSwitch((s) => s.pending);
  const confirm = useCartSwitch((s) => s.confirm);
  const cancel = useCartSwitch((s) => s.cancel);

  if (!pending) return null;

  const { currentName, currentCount, restaurant } = pending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-switch-title"
      className="absolute inset-0 z-[60]"
    >
      <button
        aria-label="Keep my basket"
        onClick={cancel}
        className="animate-fade-in absolute inset-0 bg-ink/40"
      />
      <div className="animate-sheet-in bolt-sheet absolute inset-x-0 bottom-0">
        <div className="bolt-sheet-handle" />
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent/12 text-accent">
            <ShoppingBag className="size-7" />
          </span>
          <h2
            id="cart-switch-title"
            className="mt-3 text-[19px] font-extrabold leading-tight tracking-tight"
          >
            Start a new basket?
          </h2>
          <p className="mx-auto mt-2 max-w-[19rem] text-sm leading-relaxed text-muted">
            Your basket has {currentCount}{" "}
            {currentCount === 1 ? "item" : "items"} from{" "}
            <span className="font-semibold text-ink">{currentName}</span>. One
            order comes from one kitchen, so adding this will empty it and start
            again at{" "}
            <span className="font-semibold text-ink">{restaurant.name}</span>.
          </p>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={cancel}
              className="press h-12 flex-1 rounded-full border border-line bg-surface text-[15px] font-bold text-ink"
            >
              Keep basket
            </button>
            <button
              type="button"
              onClick={confirm}
              className="press h-12 flex-1 rounded-full bg-accent text-[15px] font-bold text-[var(--on-accent)] shadow-[var(--glow-accent)]"
            >
              Start new
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
