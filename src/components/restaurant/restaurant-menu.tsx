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
      {/* Category filter chips */}
      <div className="no-scrollbar sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-bg/85 px-4 py-3 backdrop-blur">
        {restaurant.categories.map((c) => {
          const on = c === active;
          return (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={cn(
                "press shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold",
                on
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-surface text-muted"
              )}
            >
              {c}
            </button>
          );
        })}
      </div>

      <h2 className="px-1 pb-1 pt-1 text-label">
        {active} · {items.length} items
      </h2>

      <div className="divide-y divide-line">
        {items.map((item) => (
          <MenuItemRow key={item.id} item={item} restaurant={restaurant} />
        ))}
      </div>
    </div>
  );
}
