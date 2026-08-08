"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  ADMIN_NAV,
  ADMIN_NAV_GROUPS,
  type AdminNavItem,
} from "@/components/admin/admin-nav";
import type { AdminNavCounts } from "@/lib/data-access/admin-stats";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils/cn";

/**
 * The web console's left rail — the piece the phone shell has no room for.
 *
 * Grouped rather than flat: an operator scanning for "where do I approve a
 * shop" is looking for a category first and a label second, and the flat
 * five-tab strip this replaces could only ever show five of the seven
 * destinations. Badges are live counts (see getAdminNavCounts) so the rail
 * doubles as the work queue.
 */
export function AdminSidebar({ counts }: { counts: AdminNavCounts }) {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar hidden lg:flex">
      <div className="flex h-full w-[252px] flex-col border-r border-line bg-surface">
        <div className="px-5 pb-5 pt-6">
          <Link href="/admin" className="press flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-sm font-extrabold text-white shadow-[var(--glow-accent)]">
              D
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[17px] font-extrabold leading-none tracking-tight">
                Deligro<span className="text-accent">.</span>
              </span>
              <span className="mt-1 block truncate text-[11px] font-medium text-muted">
                Operations console
              </span>
            </span>
          </Link>
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
                  {items.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        item={item}
                        active={item.match(pathname)}
                        count={item.badge ? counts[item.badge] : 0}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-line px-3 py-3">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[11px] font-medium text-muted">Appearance</span>
            <ThemeToggle />
          </div>
          {isSupabaseConfigured ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="press flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </form>
          ) : null}
          <p className="px-3 pb-1 pt-3 text-[10px] leading-relaxed text-muted">
            Deligro Admin
            <br />
            Every action here is recorded against your account.
          </p>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
  count,
}: {
  item: AdminNavItem;
  active: boolean;
  count: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-accent-soft font-bold text-accent-ink"
          : "font-medium text-muted hover:bg-surface-2 hover:text-ink"
      )}
    >
      {active ? (
        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-accent" />
      ) : null}
      <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count > 0 ? (
        <span
          className={cn(
            "text-data shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
            active ? "bg-accent text-white" : "bg-surface-2 text-muted"
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
