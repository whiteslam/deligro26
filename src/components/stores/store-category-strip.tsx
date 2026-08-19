import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { STORE_CATEGORIES } from "@/lib/taxonomy";
import { cn } from "@/lib/utils/cn";

/**
 * Storefront types on the Stores tab. Selection lives in the URL (`?category=`)
 * so the filtered list is server-rendered and shareable; tapping the active tile
 * clears it, which is why its href drops the param.
 *
 * `categories` is passed in rather than read from the module constant, because
 * which ones are on offer is an admin setting (see `lib/store-categories.ts`)
 * and this component is rendered from a server page that already knows. It
 * defaults to the full list so demo/mock callers are unaffected.
 */
export function StoreCategoryStrip({
  active,
  categories = STORE_CATEGORIES,
}: {
  active?: string;
  categories?: typeof STORE_CATEGORIES;
}) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
      <Link
        href="/stores"
        aria-current={!active ? "true" : undefined}
        className="press flex w-[68px] shrink-0 flex-col items-center gap-1.5"
      >
        <span
          className={cn(
            "grid size-16 place-items-center rounded-xl transition-colors",
            !active ? "bg-accent-soft ring-2 ring-accent" : "bg-surface-2"
          )}
        >
          <LayoutGrid
            className={cn("size-7", !active ? "text-accent-ink" : "text-ink")}
          />
        </span>
        <span
          className={cn(
            "w-full truncate text-center text-[11px] font-semibold",
            !active ? "text-accent-ink" : "text-ink"
          )}
        >
          All stores
        </span>
      </Link>
      {categories.map((c) => {
        const isActive = c.id === active;
        return (
          <Link
            key={c.id}
            href={isActive ? "/stores" : `/stores?category=${c.id}`}
            aria-current={isActive ? "true" : undefined}
            className="press flex w-[68px] shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                "grid size-16 place-items-center rounded-xl transition-colors",
                isActive
                  ? "bg-accent-soft ring-2 ring-accent"
                  : "bg-surface-2"
              )}
            >
              {/* Emoji, not a photograph. The Home cuisine strip moved to real
                  pictures of food; a storefront TYPE ("Pick & Drop", "Dairy")
                  is a category of shop, not a dish, and there is no honest
                  single photo of one. Revisit if these ever get real shop
                  photography behind them. */}
              <span className="text-4xl" role="img" aria-label={c.label}>
                {c.emoji}
              </span>
            </span>
            <span
              className={cn(
                "w-full truncate text-center text-[11px] font-semibold",
                isActive ? "text-accent-ink" : "text-ink"
              )}
            >
              {c.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
