"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { activeVendorNavItem } from "@/components/vendor/vendor-nav";
import { RestaurantOpenToggle } from "@/components/vendor/restaurant-open-toggle";
import { RestaurantSwitcher } from "@/components/vendor/restaurant-switcher";
import type { OwnedRestaurant } from "@/lib/data-access/vendor-restaurant";

/**
 * The console's top bar: current page, store switcher, live status, and the
 * open/closed control. Account lives on the rail, matching the admin console.
 */
export function VendorTopBar({
  restaurantName,
  isOpen,
  restaurants,
  activeSlug,
  showControls,
  onMenu,
}: {
  restaurantName: string;
  isOpen: boolean;
  restaurants: OwnedRestaurant[];
  activeSlug: string;
  showControls: boolean;
  onMenu: () => void;
}) {
  const pathname = usePathname();
  const active = activeVendorNavItem(pathname);
  const multiStore = restaurants.length > 1;

  return (
    <header className="vendor-top-bar sticky top-0 z-30 border-b border-line bg-[color:var(--bg)]/92 backdrop-blur-lg">
      <div className="flex items-center gap-3.5 px-4 py-[11px] lg:px-6">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation"
          className="press grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        <p className="shrink-0 text-[15px] font-bold tracking-tight lg:hidden">
          {active?.label ?? "Vendor"}
        </p>

        {showControls && multiStore ? (
          <div className="hidden min-w-0 sm:block lg:ml-0">
            <RestaurantSwitcher
              restaurants={restaurants}
              activeSlug={activeSlug}
            />
          </div>
        ) : (
          <p className="hidden min-w-0 truncate text-[13px] font-medium text-muted lg:block">
            {restaurantName}
          </p>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {isOpen ? (
            <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink sm:inline-flex">
              <span className="c-dot bg-green" />
              Accepting orders
            </span>
          ) : (
            <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-muted sm:inline-flex">
              Store paused
            </span>
          )}

          {/* Theme and sign-out are the rail's, not this bar's — VendorTopBar
              only ever renders beside VendorSidebar (see VendorShell), and the
              same two controls in both places was one pair too many. */}
          {showControls ? <RestaurantOpenToggle isOpen={isOpen} /> : null}
        </div>
      </div>
    </header>
  );
}
