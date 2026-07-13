"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, X, ChevronRight } from "lucide-react";
import { useCart } from "@/stores/cart-store";
import { useUI } from "@/stores/ui-store";
import { QtyStepper } from "@/components/shared/qty-stepper";
import { VegMark } from "@/components/shared/veg-mark";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const HIDDEN_ON = ["/checkout"];

export function GlassCart() {
  const pathname = usePathname();

  const lines = useCart((s) => s.lines);
  const restaurantName = useCart((s) => s.restaurantName);
  const restaurantSlug = useCart((s) => s.restaurantSlug);
  const setQty = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const deliveryFee = lines.length ? 29 : 0;
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryFee + taxes;

  const cartOpen = useUI((s) => s.cartOpen);
  const openCart = useUI((s) => s.openCart);
  const closeCart = useUI((s) => s.closeCart);

  useEffect(() => {
    closeCart();
  }, [pathname, closeCart]);

  if (HIDDEN_ON.includes(pathname)) return null;
  if (count === 0) return null;

  return (
    <>
      {!cartOpen && (
        // A div, not a button: the dismiss control is a button of its own and
        // nesting one inside another is invalid.
        <div className="bolt-basket-bar animate-slide-up absolute inset-x-3 bottom-[68px] z-30">
          <button
            onClick={openCart}
            className="press flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-white/20">
              <ShoppingBag className="size-5" />
              <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-bg">
                {count}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">
                View basket
              </span>
              <span className="block truncate text-xs font-medium text-white/85">
                {restaurantName} · {formatINR(subtotal)}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0" />
          </button>

          <button
            onClick={clear}
            aria-label="Clear basket"
            className="press grid size-8 shrink-0 place-items-center rounded-full bg-white/20"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {cartOpen && (
        <div className="absolute inset-0 z-40">
          <button
            aria-label="Close basket"
            onClick={closeCart}
            className="animate-fade-in absolute inset-0 bg-ink/40"
          />
          <div className="bolt-sheet animate-sheet-in absolute inset-x-0 bottom-0 max-h-[86%] overflow-hidden">
            <div className="bolt-sheet-handle" />
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <div>
                <h2 className="text-heading">Your basket</h2>
                <p className="text-sm text-muted">{restaurantName}</p>
              </div>
              <button
                onClick={closeCart}
                aria-label="Close"
                className="press grid size-9 place-items-center rounded-full bg-surface-2 text-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            {restaurantSlug ? (
              <div className="px-5 pb-2">
                <Link
                  href={`/restaurant/${restaurantSlug}`}
                  onClick={() => closeCart()}
                  className="bolt-section-link"
                >
                  Add more items <ChevronRight className="size-4" />
                </Link>
              </div>
            ) : null}

            <div className="no-scrollbar max-h-[42vh] overflow-y-auto px-5">
              <ul className="divide-y divide-line">
                {lines.map((l) => (
                  <li
                    key={l.itemId}
                    className="flex items-center gap-3 py-3.5"
                  >
                    <VegMark veg={l.veg} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">
                        {l.name}
                      </p>
                      <p className="text-data text-muted">
                        {formatINR(l.price)}
                      </p>
                    </div>
                    <QtyStepper
                      size="sm"
                      qty={l.qty}
                      onAdd={() => setQty(l.itemId, 1)}
                      onInc={() => setQty(l.itemId, l.qty + 1)}
                      onDec={() => setQty(l.itemId, l.qty - 1)}
                    />
                    <span className="w-16 shrink-0 text-right text-data font-semibold">
                      {formatINR(l.price * l.qty)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-1 space-y-2 border-t border-dashed border-line py-4 text-[15px]">
                <Row label="Subtotal" value={formatINR(subtotal)} muted />
                <Row label="Delivery" value={formatINR(deliveryFee)} muted />
                <Row label="Taxes" value={formatINR(taxes)} muted />
                <Row label="Total" value={formatINR(total)} bold />
              </div>
            </div>

            <div className="border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Link
                href="/checkout"
                onClick={() => closeCart()}
                className="press flex h-12 items-center justify-between rounded-full bg-accent px-5 font-bold text-white shadow-[var(--glow-accent)]"
              >
                <span>Go to checkout</span>
                <span className="flex items-center gap-1">
                  {formatINR(total)} <ChevronRight className="size-5" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn(muted && "text-muted", bold && "font-bold")}>
        {label}
      </span>
      <span
        className={cn(
          "text-data",
          muted && "text-muted",
          bold && "text-base font-bold"
        )}
      >
        {value}
      </span>
    </div>
  );
}
