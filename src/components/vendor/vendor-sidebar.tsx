"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  VENDOR_NAV,
  VENDOR_NAV_GROUPS,
  activeVendorNavItem,
} from "@/components/vendor/vendor-nav";
import { RestaurantSwitcher } from "@/components/vendor/restaurant-switcher";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { OwnedRestaurant } from "@/lib/data-access/vendor-restaurant";

/**
 * The web console's left rail — dark against a light page, matching the admin
 * ops console. Grouped nav, a store-status card, and the account row at the
 * foot so the rail isn't empty on a short list.
 */
export function VendorSidebar({
  restaurantName,
  isOpen,
  restaurants = [],
  activeSlug = "",
  showControls,
  name,
  email,
}: {
  restaurantName: string;
  isOpen: boolean;
  restaurants?: OwnedRestaurant[];
  activeSlug?: string;
  showControls: boolean;
  name: string;
  email: string | null;
}) {
  const pathname = usePathname();
  const current = activeVendorNavItem(pathname);
  const multiStore = restaurants.length > 1;

  return (
    <aside className="vendor-sidebar hidden lg:flex">
      <div className="flex h-full w-[216px] flex-col bg-[var(--sb-bg)]">
        <div className="flex items-center gap-[9px] px-4 pb-4 pt-[18px]">
          <Link href="/vendor" className="press flex items-center gap-[9px]">
            <span className="grid size-[26px] shrink-0 place-items-center rounded-[7px] bg-accent text-sm font-bold text-[var(--on-accent)]">
              D
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-none tracking-[-0.01em] text-white">
                Deligro
              </span>
              <span className="mt-1 block truncate text-[10px] font-medium uppercase leading-none tracking-[0.06em] text-[var(--sb-group)]">
                Partner hub
              </span>
            </span>
          </Link>
        </div>

        <nav
          className="no-scrollbar flex-1 overflow-y-auto px-2 py-1"
          aria-label="Vendor navigation"
        >
          {VENDOR_NAV_GROUPS.map((group) => {
            const items = VENDOR_NAV.filter((i) => i.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <p className="px-2 pb-[5px] pt-3.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--sb-group)]">
                  {group}
                </p>
                <ul className="space-y-px">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={current?.href === item.href ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-[9px] rounded-[7px] px-[9px] py-[7px] text-[13px] transition-colors duration-[120ms]",
                          current?.href === item.href
                            ? "bg-[var(--sb-active)] font-semibold text-[var(--sb-text-active)]"
                            : "font-medium text-[var(--sb-text)] hover:bg-[var(--sb-hover)] hover:text-white"
                        )}
                      >
                        <item.icon className="size-[15px] shrink-0" strokeWidth={1.7} />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2.5 p-3">
          <StoreCard
            restaurantName={restaurantName}
            isOpen={isOpen}
            showControls={showControls}
            restaurants={restaurants}
            activeSlug={activeSlug}
            multiStore={multiStore}
          />

          <div className="flex items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-[11px] font-bold text-[var(--on-accent)]">
              {initials(name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white">
                {name}
              </span>
              {email ? (
                <span className="block truncate text-[10.5px] leading-tight text-[var(--sb-meta)]">
                  {email}
                </span>
              ) : null}
            </span>
            <ThemeToggle className="size-[26px] shrink-0 rounded-md border-0 bg-transparent text-[var(--sb-meta)] hover:bg-[var(--sb-hover)]" />
          </div>

          {isSupabaseConfigured ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="press flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-xs font-semibold text-[var(--sb-meta)] transition-colors hover:bg-[var(--sb-hover)] hover:text-white"
              >
                <LogOut className="size-[15px]" strokeWidth={1.7} />
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function StoreCard({
  restaurantName,
  isOpen,
  showControls,
  restaurants,
  activeSlug,
  multiStore,
}: {
  restaurantName: string;
  isOpen: boolean;
  showControls: boolean;
  restaurants: OwnedRestaurant[];
  activeSlug: string;
  multiStore: boolean;
}) {
  return (
    <div className="rounded-[9px] border border-[var(--sb-border)] px-[11px] py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--sb-group)]">
          Store
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold",
            isOpen ? "text-[var(--sb-ok)]" : "text-[#ffa060]"
          )}
        >
          <span
            className="c-dot"
            style={{
              background: isOpen ? "var(--sb-ok)" : "#ffa060",
            }}
          />
          {isOpen ? "Open" : "Paused"}
        </span>
      </div>
      {showControls && multiStore && activeSlug ? (
        <div className="mt-2">
          <RestaurantSwitcher
            restaurants={restaurants}
            activeSlug={activeSlug}
            fullWidth
            className="w-full rounded-md border border-[var(--sb-border)] bg-transparent px-2 py-1.5 text-[12px] font-medium text-white outline-none"
          />
        </div>
      ) : (
        <p className="mt-2 truncate text-[12px] font-semibold text-[#e8e6e1]">
          {restaurantName}
        </p>
      )}
    </div>
  );
}
