"use client";

import { useMemo, useState } from "react";
import type { Restaurant } from "@/types";
import { MenuItemRow } from "@/components/restaurant/menu-item-row";
import { cn } from "@/lib/utils/cn";

export function RestaurantMenu({ restaurant }: { restaurant: Restaurant }) {
  const [active, setActive] = useState(restaurant.categories[0]);

  const items = useMemo(() => {
    if (active === "Popular") {
      return restaurant.menu.filter((m) => m.popular || m.bestseller);
    }
    return restaurant.menu.filter((m) => m.category === active);
  }, [active, restaurant.menu]);

  return (
    <div>
      {/* Category tabs — Bolt-style text tabs with an underline indicator */}
      <div className="no-scrollbar sticky top-0 z-10 flex gap-5 overflow-x-auto border-b border-line bg-bg px-4">
        {restaurant.categories.map((c) => {
          const on = c === active;
          return (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={cn(
                "press relative shrink-0 whitespace-nowrap py-3 text-[15px] transition-colors",
                on ? "font-bold text-ink" : "font-medium text-muted"
              )}
            >
              {c}
              {on ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ink" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="px-4">
        <h2 className="pb-1 pt-5 text-[22px] font-extrabold tracking-tight">
          {active}
        </h2>

        <div className="divide-y divide-line">
          {items.map((item) => (
            <MenuItemRow key={item.id} item={item} restaurant={restaurant} />
          ))}
        </div>
      </div>
    </div>
  );
}
