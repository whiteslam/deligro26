"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Search, ReceiptText, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/stores",
    label: "Stores",
    icon: ShoppingBag,
    match: (p: string) => p.startsWith("/stores"),
  },
  {
    href: "/search",
    label: "Search",
    icon: Search,
    match: (p: string) => p.startsWith("/search"),
  },
  {
    href: "/orders",
    label: "Orders",
    icon: ReceiptText,
    match: (p: string) => p.startsWith("/orders"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    match: (p: string) => p.startsWith("/profile"),
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
            className="press relative flex flex-1 flex-col items-center gap-0.5 py-2"
          >
            <Icon
              className={cn(
                "size-5 transition-colors",
                active ? "text-ink" : "text-muted"
              )}
              strokeWidth={active ? 2.6 : 2}
              fill={active ? "currentColor" : "none"}
              fillOpacity={active ? 0.12 : 0}
            />
            <span
              className={cn(
                "text-[10px] transition-colors",
                active
                  ? "font-bold text-ink"
                  : "font-medium text-muted"
              )}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
