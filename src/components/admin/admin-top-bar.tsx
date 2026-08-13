"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Plus,
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
 * real, the live figure, and the queues that need a human.
 *
 * The quick-action buttons are counts, not decoration — each is a live figure
 * from `getAdminNavCounts` and each links to the screen that clears it. A badge
 * with no queue behind it renders as a plain icon rather than a zero. The
 * account block used to live up here; the redesign moves it to the foot of the
 * rail, which is where it stops the rail's empty space being empty.
 */
export function AdminTopBar({
  counts,
  onMenu,
}: {
  counts: AdminNavCounts;
  onMenu: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [scope, setScope] = useState<ScopeId>("vendors");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const active = activeNavItem(pathname);
  const target = SCOPES.find((s) => s.id === scope) ?? SCOPES[0];

  // The ⌘K hint in the field is a promise, so it has to be kept. Bound here
  // rather than globally: this bar is mounted on every console screen and
  // unmounted in phone mode, which is exactly the shortcut's scope.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `${target.href}?q=${encodeURIComponent(q)}` : target.href);
  };

  return (
    <header className="admin-top-bar sticky top-0 z-30 border-b border-line bg-[color:var(--bg)]/92 backdrop-blur-lg">
      <div className="flex items-center gap-3.5 px-4 py-[11px] lg:px-6">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation"
          className="press grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        <p className="shrink-0 text-[15px] font-bold tracking-tight lg:hidden">
          {active?.label ?? "Admin"}
        </p>

        <form
          onSubmit={submit}
          className="ml-auto hidden min-w-0 shrink items-center sm:flex lg:ml-0 lg:basis-[380px]"
          role="search"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-[7px]">
            <Search className="size-3.5 shrink-0 text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${target.label.toLowerCase()}…`}
              aria-label={`Search ${target.label.toLowerCase()}`}
              aria-keyshortcuts="Meta+K Control+K"
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="press grid size-4 shrink-0 place-items-center rounded-full bg-surface-2 text-muted"
              >
                <X className="size-2.5" />
              </button>
            ) : (
              <kbd className="text-data hidden shrink-0 rounded border border-line px-1 py-px text-[10px] text-muted md:block">
                ⌘K
              </kbd>
            )}
            {/* The scope is part of the query, not a filter applied after it —
                the three lists live on different pages. */}
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ScopeId)}
              aria-label="Search in"
              className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted outline-none"
            >
              {SCOPES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {counts.liveOrders > 0 ? (
            <Link
              href="/admin/orders"
              className="press hidden items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-[var(--c-border-hover)] xl:inline-flex"
            >
              <span className="c-dot bg-green" />
              {counts.liveOrders} order{counts.liveOrders === 1 ? "" : "s"} in
              flight
            </Link>
          ) : null}

          <QuickAction
            href="/admin/orders"
            label="Live orders"
            count={counts.liveOrders}
            tone="blue"
            icon={<ReceiptText className="size-[17px]" strokeWidth={1.8} />}
          />
          <QuickAction
            href="/admin/vendors"
            label="Pending approvals"
            count={counts.pendingApprovals}
            tone="accent"
            icon={<Store className="size-[17px]" strokeWidth={1.8} />}
          />
          <QuickAction
            href="/admin/refunds"
            label="Refunds waiting"
            count={counts.pendingRefunds}
            tone="deal"
            icon={<RotateCcw className="size-[17px]" strokeWidth={1.8} />}
          />

          <Link
            href="/admin/banners/new"
            className="c-btn c-btn-dark press ml-1.5 hidden sm:inline-flex"
          >
            <Plus className="size-3.5" strokeWidth={2.4} />
            New campaign
          </Link>
        </div>
      </div>
    </header>
  );
}

const TONES = {
  blue: "bg-[var(--c-tint-blue)] text-blue",
  accent: "bg-accent-soft text-accent-ink",
  deal: "bg-deal-soft text-deal",
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
        "press relative grid size-9 place-items-center rounded-lg transition-colors",
        count > 0
          ? TONES[tone]
          : "border border-line bg-surface text-muted hover:border-[var(--c-border-hover)] hover:text-ink"
      )}
    >
      {icon}
      {count > 0 ? (
        <span className="text-data absolute -right-1 -top-1 min-w-[17px] rounded-full bg-ink px-1 text-center text-[10px] font-bold leading-[17px] text-[color:var(--surface)]">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
