"use client";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { RestaurantOpenToggle } from "@/components/vendor/restaurant-open-toggle";
import { RestaurantSwitcher } from "@/components/vendor/restaurant-switcher";
import { LivePulse } from "@/components/vendor/vendor-ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { OwnedRestaurant } from "@/lib/data-access/vendor-restaurant";
import Link from "next/link";
import { LogOut } from "lucide-react";

export function VendorTopBar({
  restaurantName,
  isOpen,
  restaurants,
  activeSlug,
  showControls,
}: {
  restaurantName: string;
  isOpen: boolean;
  restaurants: OwnedRestaurant[];
  activeSlug: string;
  showControls: boolean;
}) {
  const multiStore = restaurants.length > 1;

  return (
    <header className="vendor-top-bar glass sticky top-0 z-30 border-x-0 border-t-0 lg:hidden">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isOpen ? <LivePulse className="scale-90" /> : null}
            <p className="truncate text-sm font-bold">{restaurantName}</p>
          </div>
          <p className="text-[11px] text-muted">
            {isOpen ? "Accepting orders" : "Store paused"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {showControls ? <RestaurantOpenToggle isOpen={isOpen} /> : null}
          <ThemeToggle />
          {isSupabaseConfigured ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="press grid size-9 place-items-center rounded-full border border-line bg-surface text-muted"
                aria-label="Sign out"
              >
                <LogOut className="size-3.5" />
              </button>
            </form>
          ) : (
            <Link
              href="/"
              className="press rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted"
            >
              Exit
            </Link>
          )}
        </div>
      </div>
      {showControls && multiStore ? (
        <div className="border-t border-line px-4 py-2">
          <RestaurantSwitcher
            restaurants={restaurants}
            activeSlug={activeSlug}
            fullWidth
          />
        </div>
      ) : null}
    </header>
  );
}
