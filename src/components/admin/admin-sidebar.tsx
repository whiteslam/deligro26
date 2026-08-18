"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, UtensilsCrossed } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  ADMIN_NAV,
  ADMIN_NAV_GROUPS,
  activeNavItem,
  type AdminNavItem,
  type BadgeKey,
} from "@/components/admin/admin-nav";
import type { AdminNavCounts } from "@/lib/data-access/admin-stats";
import type { ConsoleHealth } from "@/lib/console-health";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * The web console's left rail — the piece the phone shell has no room for.
 *
 * Grouped rather than flat: an operator scanning for "where do I approve a
 * shop" is looking for a category first and a label second, and the flat
 * five-tab strip this replaces could only ever show five of the nine
 * destinations. Badges are live counts (see getAdminNavCounts) so the rail
 * doubles as the work queue.
 *
 * Dark against a light page, at both theme settings — it is chrome, not
 * content, and the redesign leans on that contrast to stop the eye at the
 * page edge. The foot of the rail carries a system card and the account row,
 * which is what stops 60% of its height being empty on a short nav list.
 */
export function AdminSidebar({
  counts,
  health,
  name,
  email,
}: {
  counts: AdminNavCounts;
  health: ConsoleHealth;
  name: string;
  email: string | null;
}) {
  const pathname = usePathname();
  // One winner per route. Settings matches its own sub-pages, so asking each
  // item independently would highlight both Settings and Team on /settings/employees.
  const current = activeNavItem(pathname);

  return (
    <aside className="admin-sidebar hidden lg:flex">
      <div className="flex h-full w-[216px] flex-col bg-[var(--sb-bg)]">
        <div className="flex items-center gap-[9px] px-4 pb-4 pt-[18px]">
          <Link href="/admin" className="press flex items-center gap-[9px]">
            <span className="grid size-[26px] shrink-0 place-items-center rounded-[7px] bg-accent text-sm font-bold text-[var(--on-accent)]">
              D
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-none tracking-[-0.01em] text-white">
                Deligro
              </span>
              <span className="mt-1 block truncate text-[10px] font-medium uppercase leading-none tracking-[0.06em] text-[var(--sb-group)]">
                Ops console
              </span>
            </span>
          </Link>
        </div>

        <nav
          className="no-scrollbar flex-1 overflow-y-auto px-2 py-1"
          aria-label="Admin navigation"
        >
          {ADMIN_NAV_GROUPS.map((group) => {
            const items = ADMIN_NAV.filter((i) => i.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <p className="px-2 pb-[5px] pt-3.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--sb-group)]">
                  {group}
                </p>
                <ul className="space-y-px">
                  {items.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        item={item}
                        active={current?.href === item.href}
                        count={item.badge ? counts[item.badge] : 0}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2.5 p-3">
          <SystemCard health={health} />

          <div className="flex items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-[11px] font-bold text-[var(--on-accent)]">
              {initials(name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white">
                {name}
              </span>
              {email ? (
                <span className="block truncate text-[10.5px] leading-tight text-[var(--sb-meta)]">
                  {email}
                </span>
              ) : null}
            </span>
            <ThemeToggle className="size-[26px] shrink-0 rounded-md border-0 bg-transparent text-[var(--sb-meta)] hover:bg-[var(--sb-hover)]" />
          </div>

          {/* The way back to the app. An operator here is often also a customer
              — the owner's phone is both — and leaving the console used to mean
              signing out of it. Same session, different surface. */}
          <Link
            href="/"
            className="press flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-xs font-semibold text-[var(--sb-meta)] transition-colors hover:bg-[var(--sb-hover)] hover:text-white"
          >
            <UtensilsCrossed className="size-[15px]" strokeWidth={1.7} />
            Customer app
          </Link>

          {isSupabaseConfigured ? (
            <form action="/auth/signout?next=/admin/login" method="post">
              <button
                type="submit"
                className="press flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-xs font-semibold text-[var(--sb-meta)] transition-colors hover:bg-[var(--sb-hover)] hover:text-white"
              >
                <LogOut className="size-[15px]" strokeWidth={1.7} />
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

/**
 * Which queues read as urgent. Approvals and refunds are work sitting on a
 * person; live orders is activity, not a to-do, so it stays neutral however
 * high it climbs — an orange 60 next to Orders on a busy evening would train
 * the operator to ignore the colour that matters.
 */
const HOT: BadgeKey[] = ["pendingApprovals", "pendingRefunds"];

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
  const hot = item.badge ? HOT.includes(item.badge) : false;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-[9px] rounded-[7px] px-[9px] py-[7px] text-[13px] transition-colors duration-[120ms]",
        active
          ? "bg-[var(--sb-active)] font-semibold text-[var(--sb-text-active)]"
          : "font-medium text-[var(--sb-text)] hover:bg-[var(--sb-hover)] hover:text-white"
      )}
    >
      <Icon className="size-[15px] shrink-0" strokeWidth={1.7} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count > 0 ? (
        <span
          className={cn(
            "text-data shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-semibold tabular-nums",
            hot
              ? "bg-accent/25 text-[#ff9a5a]"
              : "bg-white/10 text-[var(--sb-text)]"
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

/** Configuration health for this deployment — see lib/console-health. */
function SystemCard({ health }: { health: ConsoleHealth }) {
  const bad = health.rows.filter((r) => !r.ok).length;
  return (
    <div className="rounded-[9px] border border-[var(--sb-border)] px-[11px] py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--sb-group)]">
          System
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold",
            health.ok ? "text-[var(--sb-ok)]" : "text-[#ffa060]"
          )}
        >
          <span
            className="c-dot"
            style={{
              background: health.ok ? "var(--sb-ok)" : "#ffa060",
            }}
          />
          {health.ok ? "All green" : `${bad} to set up`}
        </span>
      </div>
      <dl className="mt-2 space-y-1">
        {health.rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-2">
            <dt className="text-[11px] text-[var(--sb-meta)]">{row.label}</dt>
            <dd
              className={cn(
                "text-data truncate text-[11px]",
                row.ok ? "text-[#e8e6e1]" : "text-[#ffa060]"
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

