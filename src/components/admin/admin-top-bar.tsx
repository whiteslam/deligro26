"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  ReceiptText,
  RotateCcw,
  Search,
  Store,
  X,
} from "lucide-react";
import { activeNavItem } from "@/components/admin/admin-nav";
import type { AdminNavCounts } from "@/lib/data-access/admin-stats";
import { cn } from "@/lib/utils/cn";

/** Where the search box can send you — each is a page that really filters on `q`. */
const SCOPES = [
  { id: "vendors", label: "Vendors", href: "/admin/vendors" },
  { id: "orders", label: "Orders", href: "/admin/orders" },
  { id: "customers", label: "Customers", href: "/admin/customers" },
] as const;

type ScopeId = (typeof SCOPES)[number]["id"];

/**
 * The console's top bar: what you're looking at, a search that goes somewhere
 * real, and the three queues that need a human.
 *
 * The quick-action buttons are counts, not decoration — each is a live figure
 * from `getAdminNavCounts` and each links to the screen that clears it. A badge
 * with no queue behind it renders as a plain icon rather than a zero.
 */
export function AdminTopBar({
  counts,
  name,
  onMenu,
}: {
  counts: AdminNavCounts;
  name: string;
  onMenu: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [scope, setScope] = useState<ScopeId>("vendors");
  const [query, setQuery] = useState("");

  const active = activeNavItem(pathname);
  const target = SCOPES.find((s) => s.id === scope) ?? SCOPES[0];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `${target.href}?q=${encodeURIComponent(q)}` : target.href);
  };

  return (
    <header className="admin-top-bar sticky top-0 z-30 border-b border-line bg-[color:var(--bg)]/90 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-7">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation"
          className="press grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        <p className="shrink-0 text-[15px] font-extrabold tracking-tight lg:hidden">
          {active?.label ?? "Admin"}
        </p>

        <form
          onSubmit={submit}
          className="ml-auto hidden min-w-0 flex-1 items-center gap-2 sm:flex lg:ml-0 lg:max-w-[520px]"
          role="search"
        >
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
            <Search className="size-4 shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${target.label.toLowerCase()}…`}
              aria-label={`Search ${target.label.toLowerCase()}`}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="press grid size-5 shrink-0 place-items-center rounded-full bg-surface text-muted"
              >
                <X className="size-3" />
              </button>
            ) : null}
            {/* The scope is part of the query, not a filter applied after it —
                the three lists live on different pages. */}
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ScopeId)}
              aria-label="Search in"
              className="shrink-0 rounded-lg bg-surface px-1.5 py-1 text-[11px] font-bold text-muted outline-none"
            >
              {SCOPES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-0">
          <QuickAction
            href="/admin/orders"
            label="Live orders"
            count={counts.liveOrders}
            tone="blue"
            icon={<ReceiptText className="size-[18px]" />}
          />
          <QuickAction
            href="/admin/vendors"
            label="Pending approvals"
            count={counts.pendingApprovals}
            tone="accent"
            icon={<Store className="size-[18px]" />}
          />
          <QuickAction
            href="/admin/refunds"
            label="Refunds waiting"
            count={counts.pendingRefunds}
            tone="deal"
            icon={<RotateCcw className="size-[18px]" />}
          />

          <div className="ml-1.5 flex items-center gap-2.5 border-l border-line pl-3">
            <span className="hidden text-right leading-tight xl:block">
              <span className="block text-[11px] text-muted">Signed in as</span>
              <span className="block max-w-[140px] truncate text-[13px] font-bold">
                {name}
              </span>
            </span>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-extrabold text-white">
              {initials(name)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

const TONES = {
  blue: "bg-blue/12 text-blue",
  accent: "bg-accent/12 text-accent",
  deal: "bg-deal/12 text-deal",
} as const;

function QuickAction({
  href,
  label,
  count,
  tone,
  icon,
}: {
  href: string;
  label: string;
  count: number;
  tone: keyof typeof TONES;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={count > 0 ? `${label}: ${count}` : label}
      title={count > 0 ? `${label}: ${count}` : label}
      className={cn(
        "press relative grid size-9 place-items-center rounded-xl transition-colors",
        count > 0 ? TONES[tone] : "bg-surface-2 text-muted hover:text-ink"
      )}
    >
      {icon}
      {count > 0 ? (
        <span className="text-data absolute -right-1 -top-1 min-w-[17px] rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-[17px] text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

/** "Gaurav Mirjha" → "GM". Falls back to a single letter, never to empty. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
