"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VENDOR_PHONE_TABS } from "@/components/vendor/vendor-nav";
import { cn } from "@/lib/utils/cn";

/**
 * Bottom nav for the phone shell. Five slots is all a handset has room for, so
 * it renders `VENDOR_PHONE_TABS`. The console's rail carries the full set.
 */
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
} as const;

export function VendorTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="tab-bar-shell absolute inset-x-0 bottom-0 z-30 flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]"
      aria-label="Vendor"
    >
      {VENDOR_PHONE_TABS.map((tab) => {
        const active = tab.match(pathname);
        const color = COLORS[tab.tone];
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "press relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] transition-colors",
              active ? cn("font-bold", color.text) : "font-medium text-muted"
            )}
          >
            {active ? (
              <span
                className={cn(
                  "absolute inset-x-3 top-0 h-0.5 rounded-full",
                  color.bar
                )}
              />
            ) : null}
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl transition-colors",
                active ? color.chip : ""
              )}
            >
              <Icon
                className={cn("size-5 transition-colors", color.text)}
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
