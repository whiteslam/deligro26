"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminTabBar } from "@/components/admin/admin-tab-bar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminNavDrawer } from "@/components/admin/admin-nav-drawer";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { DesktopShellSwitcher } from "@/components/shared/desktop-shell-switcher";
import { useAdminShellMode } from "@/hooks/use-admin-shell-mode";
import { useAdminShell } from "@/stores/admin-shell-store";
import type { AdminNavCounts } from "@/lib/data-access/admin-stats";
import type { ConsoleHealth } from "@/lib/console-health";

/**
 * Admin chrome with an app ↔ web switch (desktop/laptop only).
 *
 * - web (default on a computer): sidebar + top bar console
 * - app: the phone frame, for checking how the portal reads on a handset
 *
 * On a real phone the switcher is hidden and the phone shell is forced, so the
 * console layout is never something a handset has to cope with.
 *
 * Both branches wrap page content in `@container`. Pages therefore size
 * themselves against *the column they are in*, not the browser window — the
 * same table can be a real grid in the console and stacked cards inside the
 * 390px phone frame, on one desktop viewport where a `md:` breakpoint would
 * wrongly report "wide" for both.
 *
 * `console-theme` is on the web branch only. It carries the ops-console
 * palette (see globals.css), so the phone frame keeps the app's own look —
 * which is the honest thing for a preview of a handset to do.
 */
export function AdminShell({
  children,
  counts,
  health,
  name,
  email,
}: {
  children: React.ReactNode;
  counts: AdminNavCounts;
  health: ConsoleHealth;
  name: string;
  email: string | null;
}) {
  const hydrated = useAdminShell((s) => s.hydrated);
  const setMode = useAdminShell((s) => s.setMode);
  const init = useAdminShell((s) => s.init);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const closeNav = useCallback(() => setNavOpen(false), []);

  // Phones never get the console — the switcher is desktop-only. Page tools
  // read the same hook, so a screen can never disagree with its own chrome.
  const effective = useAdminShellMode();

  if (effective === "app") {
    return (
      <>
        <div className="device">
          <div className="app-shell">
            <div className="app-scroll no-scrollbar pb-[80px]">
              <AdminHeader />
              {/* Same vertical rhythm as `.admin-main` in the console, so a
                  screen that returns a list of sections rather than one
                  wrapper div is spaced in both shells. */}
              <div className="@container flex flex-col gap-5 px-4 pb-6 pt-4">
                {children}
              </div>
            </div>
            <StatusBar />
            <AdminTabBar />
          </div>
        </div>
        <DesktopShellSwitcher
          mode="app"
          onChange={setMode}
          hydrated={hydrated}
        />
      </>
    );
  }

  return (
    <>
      <div className="console-theme dashboard-shell admin-shell">
        <AdminSidebar
          counts={counts}
          health={health}
          name={name}
          email={email}
        />
        <div className="admin-content">
          <AdminTopBar counts={counts} onMenu={() => setNavOpen(true)} />
          <main className="admin-main @container">{children}</main>
        </div>
      </div>
      <AdminNavDrawer open={navOpen} onClose={closeNav} counts={counts} />
      <DesktopShellSwitcher
        mode="web"
        onChange={setMode}
        hydrated={hydrated}
      />
    </>
  );
}
