"use client";

import { Eye, Star, X } from "lucide-react";
import { VegMark } from "@/components/shared/veg-mark";
import { Button } from "@/components/ui/button";
import type { VendorMenuItem } from "@/lib/data-access/vendor-menu";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Customer-style preview of a dish (no cart actions). */
export function MenuCustomerPreview({
  open,
  item,
  restaurantName,
  restaurantSlug,
  onClose,
}: {
  open: boolean;
  item: VendorMenuItem | null;
  restaurantName: string;
  restaurantSlug?: string;
  onClose: () => void;
}) {
  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div
        className="card w-full max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-preview-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <p
              id="menu-preview-title"
              className="flex items-center gap-1.5 text-sm font-bold"
            >
              <Eye className="size-4 text-accent" />
              Customer preview
            </p>
            <p className="truncate text-xs text-muted">{restaurantName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press rounded-full p-2 text-muted"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div
          className={cn(
            "flex gap-3 p-4",
            item.soldOut && "opacity-60"
          )}
        >
          <div className="min-w-0 flex-1">
            <VegMark veg={item.veg} className="mb-1.5" />
            <h3 className="text-[16px] font-bold leading-tight">{item.name}</h3>
            {item.bestseller ? (
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                <Star className="size-3 fill-accent" /> Bestseller
              </span>
            ) : null}
            {item.popular && !item.bestseller ? (
              <span className="mt-1 inline-block text-xs font-semibold text-accent">
                Popular
              </span>
            ) : null}
            {item.description ? (
              <p className="mt-1 text-sm leading-snug text-muted">
                {item.description}
              </p>
            ) : null}
            <p className="text-data mt-2 font-semibold">
              {formatINR(item.price)}
            </p>
            {item.soldOut ? (
              <p className="mt-2 text-xs font-bold uppercase text-muted">
                Sold out
              </p>
            ) : (
              <span className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[var(--glow-accent)]">
                ADD
              </span>
            )}
          </div>
          <div className="w-[104px] shrink-0">
            {item.image ? (
              <img
                src={item.image}
                alt=""
                className="h-24 w-[104px] rounded-xl object-cover"
              />
            ) : (
              <div className="grid h-24 w-[104px] place-items-center rounded-xl bg-surface-2 text-2xl">
                🍽️
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-line p-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          {restaurantSlug ? (
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                window.open(`/restaurant/${restaurantSlug}`, "_blank", "noopener");
              }}
            >
              Open storefront
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
