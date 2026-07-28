"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  Store,
  Megaphone,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Each tab owns a colour, echoing the dashboard's metric cards
 * (Restaurants = orange, Orders = blue, …). `text`/`chip`/`bar` are written as
 * full static class strings so Tailwind keeps them in the build.
 */
type TabColor = { text: string; chip: string; bar: string };

const COLORS = {
  green: { text: "text-green", chip: "bg-green/15", bar: "bg-green" },
  blue: { text: "text-blue", chip: "bg-blue/15", bar: "bg-blue" },
  accent: { text: "text-accent", chip: "bg-accent/15", bar: "bg-accent" },
  deal: { text: "text-deal", chip: "bg-deal/15", bar: "bg-deal" },
  violet: {
    text: "text-violet-500",
    chip: "bg-violet-500/15",
    bar: "bg-violet-500",
  },
} satisfies Record<string, TabColor>;

const TABS = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p: string) => p === "/admin",
    color: COLORS.green,
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ReceiptText,
    match: (p: string) => p.startsWith("/admin/orders"),
    color: COLORS.blue,
  },
  {
    href: "/admin/vendors",
    label: "Vendor",
    icon: Store,
    match: (p: string) => p.startsWith("/admin/vendors"),
    color: COLORS.accent,
  },
  {
    href: "/admin/banners",
    label: "Ads",
    icon: Megaphone,
    match: (p: string) => p.startsWith("/admin/banners"),
    color: COLORS.deal,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    match: (p: string) => p.startsWith("/admin/settings"),
    color: COLORS.violet,
  },
];

/** Bottom nav for the admin phone shell — mirrors the customer TabBar. */
export function AdminTabBar() {
  const pathname = usePathname();

  // Nested campaign editor: keep tab bar, Ads stays active.
  return (
    <nav
      className="tab-bar-shell absolute inset-x-0 bottom-0 z-30 flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]"
      aria-label="Admin"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "press relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] transition-colors",
              active ? cn("font-bold", tab.color.text) : "font-medium text-muted"
            )}
          >
            {/* Each tab's own colour marks the live tab, like the vendor nav. */}
            {active ? (
              <span
                className={cn(
                  "absolute inset-x-3 top-0 h-0.5 rounded-full",
                  tab.color.bar
                )}
              />
            ) : null}
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl transition-colors",
                active ? tab.color.chip : ""
              )}
            >
              {/* Icon always carries the tab's colour, so the whole bar reads
                  multi-coloured like the dashboard cards. */}
              <Icon
                className={cn("size-5 transition-colors", tab.color.text)}
                strokeWidth={active ? 2.4 : 2}
              />
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
