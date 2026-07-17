import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { STORE_CATEGORIES } from "@/lib/data";
import { CategoryIcon } from "@/components/home/category-icon";
import { cn } from "@/lib/utils/cn";

/**
 * Storefront types on the Stores tab. Selection lives in the URL (`?category=`)
 * so the filtered list is server-rendered and shareable; tapping the active tile
 * clears it, which is why its href drops the param.
 */
export function StoreCategoryStrip({ active }: { active?: string }) {
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
      {STORE_CATEGORIES.map((c) => {
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
              <CategoryIcon id={c.id} emoji={c.emoji} label={c.label} />
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
