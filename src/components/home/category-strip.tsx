import Link from "next/link";
import { CATEGORIES } from "@/lib/data";
import { CategoryIcon } from "./category-icon";

export function CategoryStrip() {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
      {CATEGORIES.map((c) => (
        <Link
          key={c.id}
          href={`/search?category=${c.id}`}
          className="press flex w-[68px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="grid size-[68px] place-items-center">
            <CategoryIcon id={c.id} emoji={c.emoji} label={c.label} />
          </span>
          <span className="text-xs font-medium text-muted">{c.label}</span>
        </Link>
      ))}
    </div>
  );
}
