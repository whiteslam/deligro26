"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Restaurant } from "@/types";
import { MenuItemRow } from "@/components/restaurant/menu-item-row";
import { EmptyState } from "@/components/shared/empty-state";
import { POPULARITY_WINDOW_DAYS } from "@/lib/popularity";
import { useMenuSearch } from "@/stores/menu-search-store";
import { cn } from "@/lib/utils/cn";

export function RestaurantMenu({ restaurant }: { restaurant: Restaurant }) {
  const [active, setActive] = useState(restaurant.categories[0]);

  const open = useMenuSearch((s) => s.open);
  const query = useMenuSearch((s) => s.query);
  const setQuery = useMenuSearch((s) => s.setQuery);
  const close = useMenuSearch((s) => s.close);
  const reset = useMenuSearch((s) => s.reset);
  const inputRef = useRef<HTMLInputElement>(null);

  // The store outlives this screen, so a query typed at one restaurant would
  // otherwise still be filtering the next one you open.
  useEffect(() => reset(), [restaurant.slug, reset]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const q = query.trim().toLowerCase();
  const searching = open && q.length > 0;

  // Search spans the whole menu, not the open tab — hunting for "paneer" should
  // find it wherever the kitchen filed it.
  const results = useMemo(() => {
    if (!searching) return [];
    return restaurant.menu.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [searching, q, restaurant.menu]);

  const items = useMemo(() => {
    if (active === "Popular") return restaurant.menu.filter((m) => m.popular);
    return restaurant.menu.filter((m) => m.category === active);
  }, [active, restaurant.menu]);

  return (
    <div>
      {/* Category tabs — Bolt-style text tabs with an underline indicator */}
      {/* Sticks below the status bar, not under it — the hero runs full-bleed to
          the top, so top-0 would park this strip beneath the clock. z-30 clears
          the item photos, which carry z-20 so their ADD pill can overhang the
          row below; anything lower and they scroll over these tabs. */}
      <div className="no-scrollbar sticky top-[var(--status-h)] z-30 flex gap-4 overflow-x-auto border-b border-line bg-bg px-4">
        {restaurant.categories.map((c) => {
          const on = c === active && !searching;
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                close();
                setActive(c);
              }}
              className={cn(
                "press relative shrink-0 whitespace-nowrap py-3 text-[14px] transition-colors",
                on ? "font-extrabold text-ink" : "font-semibold text-muted"
              )}
            >
              {c}
              {on ? (
                <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-ink" />
              ) : null}
            </button>
          );
        })}
      </div>

      {open ? (
        <div className="px-4 pt-3">
          <div className="bolt-search w-full">
            <Search className="size-5 shrink-0" strokeWidth={2.25} />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${restaurant.name}'s menu`}
              aria-label={`Search ${restaurant.name}'s menu`}
            />
            <button
              type="button"
              onClick={close}
              aria-label="Close menu search"
              className="press grid size-6 shrink-0 place-items-center rounded-full bg-surface text-muted"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="px-4">
        {searching ? (
          <>
            <h2 className="pb-1 pt-4 text-[20px] font-extrabold tracking-tight">
              {results.length} {results.length === 1 ? "dish" : "dishes"}
            </h2>
            {results.length ? (
              <div className="divide-y divide-line">
                {results.map((item) => (
                  <MenuItemRow key={item.id} item={item} restaurant={restaurant} />
                ))}
              </div>
            ) : (
              <EmptyState
                className="py-10"
                icon={<Search className="size-7" />}
                title="Nothing on this menu matches"
                description={`No dish here is called "${query.trim()}". Try a shorter word.`}
              />
            )}
          </>
        ) : (
          <>
            <h2 className="pb-1 pt-4 text-[20px] font-extrabold tracking-tight">
              {active}
            </h2>

            {/* Popular is the one tab nobody assembled by hand, so it's the one
                that has to explain itself — and say which of the two it shows. */}
            {active === "Popular" ? (
              <p className="pb-2 text-[13px] font-medium leading-snug text-muted">
                {restaurant.popularBasis === "orders"
                  ? `The dishes ordered most here in the last ${POPULARITY_WINDOW_DAYS} days. Updates automatically as orders come in.`
                  : "Hand-picked by the kitchen — there aren't enough orders yet to rank this menu by what sells."}
              </p>
            ) : null}

            <div className="divide-y divide-line">
              {items.map((item) => (
                <MenuItemRow key={item.id} item={item} restaurant={restaurant} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
