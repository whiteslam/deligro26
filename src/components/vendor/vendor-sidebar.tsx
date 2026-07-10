"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  IndianRupee,
  LogOut,
  Store,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { RestaurantOpenToggle } from "@/components/vendor/restaurant-open-toggle";
import { RestaurantSwitcher } from "@/components/vendor/restaurant-switcher";
import { LivePulse } from "@/components/vendor/vendor-ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils/cn";
import type { OwnedRestaurant } from "@/lib/data-access/vendor-restaurant";

const NAV = [
  { href: "/vendor", label: "Orders", icon: ClipboardList },
  { href: "/vendor/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/vendor/earnings", label: "Earnings", icon: IndianRupee },
  { href: "/vendor/profile", label: "Profile", icon: User },
] as const;

export function VendorSidebar({
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
  const pathname = usePathname();

  return (
    <aside className="vendor-sidebar hidden lg:flex">
      <div className="flex h-full w-[248px] flex-col border-r border-line bg-surface p-4">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-sm font-bold text-white shadow-[var(--glow-accent)]">
            D
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Deligro</p>
            <p className="text-[11px] text-muted">Partner hub</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-line bg-surface-2 p-3">
          <div className="flex items-center gap-2">
            <Store className="size-4 shrink-0 text-accent" />
            <p className="truncate text-sm font-semibold">{restaurantName}</p>
          </div>
          {showControls ? (
            <div className="mt-3 space-y-2">
              {restaurants.length > 1 ? (
                <RestaurantSwitcher
                  restaurants={restaurants}
                  activeSlug={activeSlug}
                  fullWidth
                />
              ) : null}
              <RestaurantOpenToggle isOpen={isOpen} />
            </div>
          ) : null}
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Vendor navigation">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                  active
                    ? "bg-accent text-white shadow-[var(--glow-accent)]"
                    : "text-muted hover:bg-surface-2 hover:text-ink"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-line pt-4">
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            {isOpen ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green">
                <LivePulse className="scale-75" />
                Accepting orders
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-muted">Paused</span>
            )}
          </div>
          {isSupabaseConfigured ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="press flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function VendorBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="vendor-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-xl lg:hidden"
      aria-label="Vendor navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-3 pt-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "press relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-all",
                active ? "text-accent" : "text-muted"
              )}
            >
              {active ? (
                <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-accent" />
              ) : null}
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-xl transition-colors",
                  active ? "bg-accent/12" : ""
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 2} />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
