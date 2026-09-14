"use client";

import { Check, X } from "lucide-react";
import { FOOD_CATEGORIES, type DishSort } from "@/lib/search/dishes";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * Where the search controls went.
 *
 * The screen used to stack four horizontally-scrolling rows of identical
 * capsules — six quick filters, sixteen categories, five search suggestions and
 * four sort options — thirty-three controls between the search field and the
 * first dish, every one of them the same shape while doing five different jobs.
 * "Biryani" appeared twice, two rows apart: once as a filter and once as a word
 * to type, with nothing on screen saying which was which.
 *
 * Two things fix that and both are in here. The filters move behind one labelled
 * button, and inside they are **grouped under headings** — which is the part
 * that was actually missing. A diet chip and a delivery-time chip sat side by
 * side looking identical because nothing ever said they measured different
 * things.
 *
 * Edits apply live to the screen behind the sheet, so there is no draft state,
 * no Apply, and no question about whether a tap counted.
 */

/**
 * The cap behind the "Under ₹200" filter, in whole rupees. It lives beside the
 * label that quotes it, so the number on the button and the number the query
 * uses cannot drift apart.
 */
export const BUDGET_PRICE = 200;

/** The groups, in the order somebody narrows a food search. */
const FILTER_GROUPS: {
  heading: string;
  options: { id: string; label: string }[];
}[] = [
  { heading: "Dietary", options: [{ id: "veg", label: "Pure Veg" }] },
  {
    heading: "Price & speed",
    options: [
      { id: "cheap", label: `Under ${formatINR(BUDGET_PRICE)}` },
      { id: "fast", label: "Under 25 min" },
    ],
  },
  {
    heading: "Worth a look",
    options: [
      { id: "popular", label: "Bestsellers" },
      { id: "rating", label: "Rating 4.5+" },
      { id: "offers", label: "Offers" },
    ],
  },
];

/** Label for an id, for the removable tokens on the screen behind. */
export function filterLabel(id: string): string {
  for (const g of FILTER_GROUPS) {
    const hit = g.options.find((o) => o.id === id);
    if (hit) return hit.label;
  }
  return id;
}

export const SORTS: { id: DishSort; label: string; hint: string }[] = [
  { id: "relevance", label: "Best match", hint: "What fits your search" },
  { id: "price", label: "Price", hint: "Cheapest first" },
  { id: "eta", label: "Fastest", hint: "Shortest delivery time" },
  { id: "rating", label: "Top rated", hint: "Best-reviewed kitchens" },
];

export function sortLabel(sort: DishSort): string {
  return SORTS.find((s) => s.id === sort)?.label ?? "Best match";
}

/** The sheet chrome both of these share. `fixed`, so it covers the phone. */
function Sheet({
  label,
  title,
  onClose,
  children,
  footer,
}: {
  label: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-ink/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="bolt-sheet animate-sheet-in absolute inset-x-0 bottom-0 flex max-h-[86%] flex-col overflow-hidden"
      >
        <div className="bolt-sheet-handle" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 className="text-heading">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press grid size-9 place-items-center rounded-full bg-surface-2 text-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-line px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SearchFilterSheet({
  chips,
  category,
  resultCount,
  resultNoun,
  onToggleChip,
  onSetCategory,
  onClearAll,
  onClose,
}: {
  chips: Set<string>;
  category: string | null;
  resultCount: number;
  /** "dish" / "restaurant" — whichever tab is open behind the sheet. */
  resultNoun: string;
  onToggleChip: (id: string) => void;
  onSetCategory: (id: string | null) => void;
  onClearAll: () => void;
  onClose: () => void;
}) {
  const active = chips.size + (category ? 1 : 0);

  return (
    <Sheet
      label="Filter results"
      title="Filters"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClearAll}
            disabled={active === 0}
            className="press shrink-0 rounded-full border border-line bg-surface px-4 py-3 text-sm font-bold text-ink disabled:opacity-40"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="press flex-1 rounded-full bg-accent py-3 text-sm font-bold text-[var(--on-accent)] shadow-[var(--glow-accent)]"
          >
            {/* The count is live, because the list behind this sheet is too.
                It answers "will this leave me anything?" before the sheet is
                even closed. */}
            Show {resultCount}{" "}
            {resultCount === 1 ? resultNoun : `${resultNoun}s`}
          </button>
        </div>
      }
    >
      {FILTER_GROUPS.map((group) => (
        <section key={group.heading} className="border-b border-line py-3.5">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
            {group.heading}
          </h3>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {group.options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onToggleChip(o.id)}
                aria-pressed={chips.has(o.id)}
                className={cn(
                  "press bolt-chip",
                  chips.has(o.id) && "bolt-chip-on"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="py-3.5">
        <h3 className="flex items-baseline gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
          Category
          {/* Said out loud, because the shape does not say it: every other
              control in this sheet is a toggle and this one is a choice. */}
          <span className="font-medium normal-case tracking-normal">
            pick one
          </span>
        </h3>
        <div className="mt-2.5 flex flex-wrap gap-2 pb-2">
          {FOOD_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSetCategory(category === c.id ? null : c.id)}
              aria-pressed={category === c.id}
              className={cn(
                "press bolt-chip",
                category === c.id && "bolt-chip-on"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>
    </Sheet>
  );
}

export function SearchSortSheet({
  sort,
  onPick,
  onClose,
}: {
  sort: DishSort;
  onPick: (sort: DishSort) => void;
  onClose: () => void;
}) {
  return (
    <Sheet label="Sort results" title="Sort by" onClose={onClose}>
      <ul className="divide-y divide-line pb-3">
        {SORTS.map((s) => {
          const on = s.id === sort;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(s.id);
                  onClose();
                }}
                aria-pressed={on}
                className="press flex w-full items-center gap-3 py-3.5 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[15px]",
                      on ? "font-extrabold" : "font-semibold"
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {s.hint}
                  </span>
                </span>
                {on ? (
                  <Check
                    className="size-5 shrink-0 text-accent"
                    strokeWidth={3}
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
