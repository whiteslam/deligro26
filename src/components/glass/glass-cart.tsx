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

// Cart is a persistent sheet, never shown where it would be redundant.
const HIDDEN_ON = ["/checkout"];

export function GlassCart() {
  const pathname = usePathname();

  const lines = useCart((s) => s.lines);
  const restaurantName = useCart((s) => s.restaurantName);
  const setQty = useCart((s) => s.setQty);
  const count = useCart((s) => s.count());
  const subtotal = useCart((s) => s.subtotal());
  const deliveryFee = useCart((s) => s.deliveryFee());
  const taxes = useCart((s) => s.taxes());
  const total = useCart((s) => s.total());

  const cartOpen = useUI((s) => s.cartOpen);
  const openCart = useUI((s) => s.openCart);
  const closeCart = useUI((s) => s.closeCart);

  // Close the sheet on navigation.
  useEffect(() => {
    closeCart();
  }, [pathname, closeCart]);

  if (HIDDEN_ON.includes(pathname)) return null;
  if (count === 0) return null;

  return (
    <>
      {/* Peek bar — floats above the tab bar */}
      {!cartOpen && (
        <button
          onClick={openCart}
          className="press glass animate-slide-up absolute inset-x-3 bottom-[76px] z-30 flex items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-[var(--shadow-md)]"
        >
          <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-[var(--glow-accent)]">
            <ShoppingBag className="size-5" />
            <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-bg">
              {count}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {restaurantName}
            </span>
            <span className="block text-xs text-muted">
              {count} {count === 1 ? "item" : "items"} · {formatINR(subtotal)}
            </span>
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-accent">
            View cart <ChevronRight className="size-4" />
          </span>
        </button>
      )}

      {/* Expanded glass sheet */}
      {cartOpen && (
        <div className="absolute inset-0 z-40">
          <button
            aria-label="Close cart"
            onClick={closeCart}
            className="animate-fade-in absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
          />
          <div className="glass animate-sheet-in absolute inset-x-0 bottom-0 max-h-[86%] overflow-hidden rounded-t-[var(--radius-sheet)] shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <div>
                <h2 className="text-heading">Your order</h2>
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

            <div className="border-t border-line bg-surface/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Link
                href="/checkout"
                onClick={() => closeCart()}
                className="press flex h-14 items-center justify-between rounded-full bg-accent px-6 font-semibold text-white shadow-[var(--glow-accent)]"
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
