"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { VendorHeader } from "@/components/vendor/vendor-header";
import { VendorTabBar } from "@/components/vendor/vendor-tab-bar";
import { VendorSidebar } from "@/components/vendor/vendor-sidebar";
import { VendorNavDrawer } from "@/components/vendor/vendor-nav-drawer";
import { VendorTopBar } from "@/components/vendor/vendor-top-bar";
import { DesktopShellSwitcher } from "@/components/shared/desktop-shell-switcher";
import { useVendorShellMode } from "@/hooks/use-vendor-shell-mode";
import { useVendorShell } from "@/stores/vendor-shell-store";
import type { OwnedRestaurant } from "@/lib/data-access/vendor-restaurant";

export type VendorShellProps = {
  restaurantName: string;
  isOpen: boolean;
  restaurants: OwnedRestaurant[];
  activeSlug: string;
  showControls: boolean;
  name: string;
  email: string | null;
  children: React.ReactNode;
};

/**
 * Vendor chrome with an app ↔ web switch (desktop/laptop only).
 *
 * - web (default on a computer): sidebar + top bar console, same structure as
 *   the admin ops console
 * - app: the phone frame, for checking how the portal reads on a handset
 *
 * On a real phone the switcher is hidden and the phone shell is forced.
 * Both branches wrap page content in `@container` so pages size themselves
 * against the column they are in, not the browser window.
 *
 * `console-theme` is on the web branch only, so the phone frame keeps the
 * app's own look.
 */
export function VendorShell({
  children,
  restaurantName,
  isOpen,
  restaurants,
  activeSlug,
  showControls,
  name,
  email,
}: VendorShellProps) {
  const hydrated = useVendorShell((s) => s.hydrated);
  const setMode = useVendorShell((s) => s.setMode);
  const init = useVendorShell((s) => s.init);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const closeNav = useCallback(() => setNavOpen(false), []);
  const effective = useVendorShellMode();

  const shellProps = {
    restaurantName,
    isOpen,
    restaurants,
    activeSlug,
    showControls,
  };

  if (effective === "app") {
    return (
      <>
        <div className="device">
          <div className="app-shell">
            <div className="app-scroll no-scrollbar pb-[80px]">
              <VendorHeader
                title={restaurantName}
                subtitle={isOpen ? "Accepting orders" : "Store paused"}
                isOpen={isOpen}
                showControls={showControls}
              />
              <div className="@container flex flex-col gap-5 px-4 pb-6 pt-4">
                {children}
              </div>
            </div>
            <StatusBar />
            <VendorTabBar />
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
      <div className="console-theme dashboard-shell vendor-shell">
        <VendorSidebar {...shellProps} name={name} email={email} />
        <div className="vendor-content">
          <VendorTopBar {...shellProps} onMenu={() => setNavOpen(true)} />
          <main className="vendor-main @container">{children}</main>
        </div>
      </div>
      <VendorNavDrawer open={navOpen} onClose={closeNav} />
      <DesktopShellSwitcher
        mode="web"
        onChange={setMode}
        hydrated={hydrated}
      />
    </>
  );
}
