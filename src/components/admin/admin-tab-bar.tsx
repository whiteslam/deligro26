"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  RotateCcw,
  Megaphone,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const TABS = [
  {
    href: "/admin",
    label: "Home",
    icon: LayoutDashboard,
    match: (p: string) => p === "/admin",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ReceiptText,
    match: (p: string) => p.startsWith("/admin/orders"),
  },
  {
    href: "/admin/refunds",
    label: "Refunds",
    icon: RotateCcw,
    match: (p: string) => p.startsWith("/admin/refunds"),
  },
  {
    href: "/admin/banners",
    label: "Ads",
    icon: Megaphone,
    match: (p: string) => p.startsWith("/admin/banners"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    match: (p: string) => p.startsWith("/admin/settings"),
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
                active ? "font-bold text-ink" : "font-medium text-muted"
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
