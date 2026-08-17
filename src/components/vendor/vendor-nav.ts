import {
  ClipboardList,
  IndianRupee,
  LayoutDashboard,
  Settings,
  User,
  UtensilsCrossed,
} from "lucide-react";

/**
 * One nav definition, three consumers: the web sidebar, the phone bottom tabs,
 * and the top bar's page title. The phone frame can only carry five tabs, so
 * `primary` marks the five that earn a slot there — Settings lives on the rail
 * and is one tap away from Profile.
 */
export interface VendorNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  group: "Overview" | "Kitchen" | "Catalogue" | "Money" | "Account";
  /** Shown on the phone's five-slot bottom bar. */
  primary?: boolean;
  tone: "green" | "blue" | "accent" | "deal" | "violet";
  match: (pathname: string) => boolean;
}

export const VENDOR_NAV: VendorNavItem[] = [
  {
    href: "/vendor",
    label: "Orders",
    icon: ClipboardList,
    group: "Kitchen",
    primary: true,
    tone: "accent",
    match: (p) => p === "/vendor",
  },
  {
    href: "/vendor/overview",
    label: "Overview",
    icon: LayoutDashboard,
    group: "Overview",
    primary: true,
    tone: "green",
    match: (p) => p.startsWith("/vendor/overview"),
  },
  {
    href: "/vendor/menu",
    label: "Menu",
    icon: UtensilsCrossed,
    group: "Catalogue",
    primary: true,
    tone: "blue",
    match: (p) => p.startsWith("/vendor/menu"),
  },
  {
    href: "/vendor/earnings",
    label: "Earnings",
    icon: IndianRupee,
    group: "Money",
    primary: true,
    tone: "green",
    match: (p) => p.startsWith("/vendor/earnings"),
  },
  {
    href: "/vendor/profile",
    label: "Profile",
    icon: User,
    group: "Account",
    primary: true,
    tone: "violet",
    match: (p) => p.startsWith("/vendor/profile"),
  },
  {
    href: "/vendor/settings",
    label: "Settings",
    icon: Settings,
    group: "Account",
    tone: "blue",
    match: (p) => p.startsWith("/vendor/settings"),
  },
];

export const VENDOR_NAV_GROUPS = [
  "Overview",
  "Kitchen",
  "Catalogue",
  "Money",
  "Account",
] as const;

/** The five that fit the phone's bottom bar. */
export const VENDOR_PHONE_TABS = VENDOR_NAV.filter((i) => i.primary);

/** Longest matching route wins, so /vendor doesn't claim /vendor/menu. */
export function activeVendorNavItem(pathname: string): VendorNavItem | null {
  const hits = VENDOR_NAV.filter((i) => i.match(pathname));
  if (!hits.length) return null;
  return hits.reduce((best, i) => (i.href.length > best.href.length ? i : best));
}
