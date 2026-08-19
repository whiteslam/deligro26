import Link from "next/link";
import { CategoryIcon } from "./category-icon";
import type { Category } from "@/types";

/**
 * The Home cuisine strip.
 *
 * Categories are passed in rather than read from the module, because each
 * tile's picture can be replaced by an operator and only a server component can
 * resolve that — see `lib/categories.ts`. Nothing here decides what a tile shows;
 * it lays them out.
 */
export function CategoryStrip({ categories }: { categories: Category[] }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/search?category=${c.id}`}
          className="press flex w-[68px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="block size-16 shrink-0">
            <CategoryIcon
              id={c.id}
              image={c.image}
              tint={c.tint}
              emoji={c.emoji}
              label={c.label}
            />
          </span>
          <span className="w-full truncate text-center text-[11px] font-semibold text-ink">
            {c.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
