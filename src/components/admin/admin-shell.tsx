"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminTabBar } from "@/components/admin/admin-tab-bar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminNavDrawer } from "@/components/admin/admin-nav-drawer";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { DesktopShellSwitcher } from "@/components/shared/desktop-shell-switcher";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useAdminShell } from "@/stores/admin-shell-store";
import type { AdminNavCounts } from "@/lib/data-access/admin-stats";

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
 */
export function AdminShell({
  children,
  counts,
  name,
}: {
  children: React.ReactNode;
  counts: AdminNavCounts;
  name: string;
}) {
  const mode = useAdminShell((s) => s.mode);
  const hydrated = useAdminShell((s) => s.hydrated);
  const setMode = useAdminShell((s) => s.setMode);
  const init = useAdminShell((s) => s.init);
  const isDesktop = useIsDesktop();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const closeNav = useCallback(() => setNavOpen(false), []);

  // Phones never get the console — the switcher is desktop-only.
  const effective = isDesktop && mode !== "app" ? "web" : "app";

  if (effective === "app") {
    return (
      <>
        <div className="device">
          <div className="app-shell">
            <div className="app-scroll no-scrollbar pb-[80px]">
              <AdminHeader />
              <div className="@container px-4 pb-6 pt-4">{children}</div>
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
      <div className="dashboard-shell admin-shell">
        <AdminSidebar counts={counts} />
        <div className="admin-content">
          <AdminTopBar
            counts={counts}
            name={name}
            onMenu={() => setNavOpen(true)}
          />
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
