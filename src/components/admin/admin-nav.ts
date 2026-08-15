import {
  Banknote,
  LayoutDashboard,
  Megaphone,
  ReceiptText,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Store,
  UserCog,
  Users,
} from "lucide-react";

/**
 * One nav definition, three consumers: the web sidebar, the phone bottom tabs,
 * and the top bar's page title. The phone frame can only carry five tabs, so
 * `primary` marks the five that earn a slot there — everything else is still
 * one tap away inside Settings and on the sidebar.
 *
 * Team and Platform configuration are settings *sub*-pages that the rail lists
 * directly: the console has the room, and burying a daily job like creating a
 * staff login two taps deep is only a phone compromise. The Settings menu drops
 * those rows in web mode (see admin/settings/page.tsx) so the rail is the one
 * place they appear there.
 */
export type BadgeKey = "pendingApprovals" | "pendingRefunds" | "liveOrders";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Which sidebar group it sits under. */
  group: "Overview" | "Operations" | "Catalogue" | "People" | "System";
  /** Shown on the phone's five-slot bottom bar. */
  primary?: boolean;
  /** Live count rendered as a pill. */
  badge?: BadgeKey;
  /** Colour used by the phone tab bar and the sidebar's active state. */
  tone: "green" | "blue" | "accent" | "deal" | "violet" | "pop";
  match: (pathname: string) => boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "Overview",
    primary: true,
    tone: "green",
    match: (p) => p === "/admin",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ReceiptText,
    group: "Operations",
    primary: true,
    badge: "liveOrders",
    tone: "blue",
    match: (p) => p.startsWith("/admin/orders"),
  },
  {
    href: "/admin/refunds",
    label: "Refunds",
    icon: RotateCcw,
    group: "Operations",
    badge: "pendingRefunds",
    tone: "deal",
    match: (p) => p.startsWith("/admin/refunds"),
  },
  {
    href: "/admin/settlements",
    label: "Settlements",
    icon: Banknote,
    group: "Operations",
    tone: "green",
    match: (p) => p.startsWith("/admin/settlements"),
  },
  {
    href: "/admin/vendors",
    label: "Vendors",
    icon: Store,
    group: "Catalogue",
    primary: true,
    badge: "pendingApprovals",
    tone: "accent",
    match: (p) => p.startsWith("/admin/vendors"),
  },
  {
    href: "/admin/banners",
    label: "Campaigns",
    icon: Megaphone,
    group: "Catalogue",
    primary: true,
    tone: "pop",
    match: (p) => p.startsWith("/admin/banners"),
  },
  {
    href: "/admin/customers",
    label: "Customers",
    icon: Users,
    group: "People",
    tone: "green",
    match: (p) => p.startsWith("/admin/customers"),
  },
  {
    href: "/admin/settings/employees",
    label: "Team",
    icon: UserCog,
    group: "People",
    tone: "blue",
    match: (p) => p.startsWith("/admin/settings/employees"),
  },
  {
    href: "/admin/settings/platform",
    label: "Platform config",
    icon: SlidersHorizontal,
    group: "System",
    tone: "blue",
    match: (p) => p.startsWith("/admin/settings/platform"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    group: "System",
    primary: true,
    tone: "violet",
    // Deliberately broad: it also covers /admin/settings/security, which has no
    // rail entry of its own. Where a sub-page *does* have one, activeNavItem's
    // longest-href rule hands the highlight to that entry instead — which is
    // why consumers must resolve the active item through it, not by calling
    // match() per item.
    match: (p) => p.startsWith("/admin/settings"),
  },
];

export const ADMIN_NAV_GROUPS = [
  "Overview",
  "Operations",
  "Catalogue",
  "People",
  "System",
] as const;

/** The five that fit the phone's bottom bar. */
export const ADMIN_PHONE_TABS = ADMIN_NAV.filter((i) => i.primary);

/** Longest matching route wins, so /admin doesn't claim /admin/orders. */
export function activeNavItem(pathname: string): AdminNavItem | null {
  const hits = ADMIN_NAV.filter((i) => i.match(pathname));
  if (!hits.length) return null;
  return hits.reduce((best, i) => (i.href.length > best.href.length ? i : best));
}
