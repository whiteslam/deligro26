"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ADMIN_NAV, ADMIN_NAV_GROUPS } from "@/components/admin/admin-nav";
import type { AdminNavCounts } from "@/lib/data-access/admin-stats";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils/cn";

/**
 * The sidebar, as a slide-over, for web-mode viewports too narrow to hold a
 * permanent rail (roughly 480–1024px — a small laptop or a tablet). Below 480
 * the shell falls back to the phone frame entirely, so this never has to serve
 * as a phone menu.
 *
 * Closes on route change: without it, tapping a destination leaves the panel
 * covering the page you just asked for.
 */
export function AdminNavDrawer({
  open,
  onClose,
  counts,
}: {
  open: boolean;
  onClose: () => void;
  counts: AdminNavCounts;
}) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        aria-label="Close navigation"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-ink/45"
      />
      <div className="absolute inset-y-0 left-0 flex w-[272px] max-w-[85vw] flex-col border-r border-line bg-surface shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-sm font-extrabold text-white">
            D
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-extrabold leading-none tracking-tight">
              Deligro<span className="text-accent">.</span>
            </span>
            <span className="mt-1 block truncate text-[11px] text-muted">
              Operations console
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="press grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav
          className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4"
          aria-label="Admin navigation"
        >
          {ADMIN_NAV_GROUPS.map((group) => {
            const items = ADMIN_NAV.filter((i) => i.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="mb-4 last:mb-0">
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active = item.match(pathname);
                    const count = item.badge ? counts[item.badge] : 0;
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                            active
                              ? "bg-accent-soft font-bold text-accent-ink"
                              : "font-medium text-muted hover:bg-surface-2 hover:text-ink"
                          )}
                        >
                          <Icon className="size-[18px] shrink-0" />
                          <span className="min-w-0 flex-1 truncate">
                            {item.label}
                          </span>
                          {count > 0 ? (
                            <span className="text-data shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                              {count > 99 ? "99+" : count}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
          <ThemeToggle className="size-9" />
          {isSupabaseConfigured ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="press flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
