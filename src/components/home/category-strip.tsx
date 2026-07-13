import Link from "next/link";
import { CATEGORIES } from "@/lib/data";
import { CategoryIcon } from "./category-icon";

export function CategoryStrip() {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
      {CATEGORIES.map((c) => (
        <Link
          key={c.id}
          href={`/search?category=${c.id}`}
          className="press flex w-[68px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="grid size-16 place-items-center rounded-xl bg-surface-2">
            <CategoryIcon id={c.id} emoji={c.emoji} label={c.label} />
          </span>
          <span className="w-full truncate text-center text-[11px] font-semibold text-ink">
            {c.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
