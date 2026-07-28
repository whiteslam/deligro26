"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Search, ReceiptText, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Each tab owns a colour, matching the admin nav's treatment. `text`/`chip`/`bar`
 * are full static class strings so Tailwind keeps them in the build.
 */
type TabColor = { text: string; chip: string; bar: string };

const COLORS = {
  accent: { text: "text-accent", chip: "bg-accent/15", bar: "bg-accent" },
  green: { text: "text-green", chip: "bg-green/15", bar: "bg-green" },
  blue: { text: "text-blue", chip: "bg-blue/15", bar: "bg-blue" },
  violet: {
    text: "text-violet-500",
    chip: "bg-violet-500/15",
    bar: "bg-violet-500",
  },
  deal: { text: "text-deal", chip: "bg-deal/15", bar: "bg-deal" },
} satisfies Record<string, TabColor>;

const TABS = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    match: (p: string) => p === "/",
    color: COLORS.accent,
  },
  {
    href: "/stores",
    label: "Stores",
    icon: ShoppingBag,
    match: (p: string) => p.startsWith("/stores"),
    color: COLORS.green,
  },
  {
    href: "/search",
    label: "Search",
    icon: Search,
    match: (p: string) => p.startsWith("/search"),
    color: COLORS.blue,
  },
  {
    href: "/orders",
    label: "Orders",
    icon: ReceiptText,
    match: (p: string) => p.startsWith("/orders"),
    color: COLORS.violet,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    match: (p: string) => p.startsWith("/profile"),
    color: COLORS.deal,
  },
];

const HIDDEN_ON = ["/checkout"];

export function TabBar() {
  const pathname = usePathname();

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <nav
      className="tab-bar-shell absolute inset-x-0 bottom-0 z-30 flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
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
            {/* Each tab's own colour marks the live tab, like the admin nav. */}
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
