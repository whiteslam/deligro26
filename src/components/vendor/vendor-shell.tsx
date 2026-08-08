"use client";

import { useEffect } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { VendorTopBar } from "@/components/vendor/vendor-top-bar";
import {
  VendorBottomNav,
  VendorSidebar,
} from "@/components/vendor/vendor-sidebar";
import { DesktopShellSwitcher } from "@/components/shared/desktop-shell-switcher";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useVendorShell } from "@/stores/vendor-shell-store";
import type { OwnedRestaurant } from "@/lib/data-access/vendor-restaurant";

export type VendorShellProps = {
  restaurantName: string;
  isOpen: boolean;
  restaurants: OwnedRestaurant[];
  activeSlug: string;
  showControls: boolean;
  children: React.ReactNode;
};

/**
 * Vendor chrome with an app ↔ web switch (desktop/laptop only).
 * - web (default): sidebar + responsive dashboard
 * - app: phone frame with mobile top bar + bottom tabs
 * On real phones the switcher is hidden and the normal mobile dashboard is used.
 */
export function VendorShell({
  children,
  ...shellProps
}: VendorShellProps) {
  const mode = useVendorShell((s) => s.mode);
  const hydrated = useVendorShell((s) => s.hydrated);
  const setMode = useVendorShell((s) => s.setMode);
  const init = useVendorShell((s) => s.init);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    init();
  }, [init]);

  const effective = isDesktop && mode === "app" ? "app" : "web";

  return (
    <>
      {effective === "app" ? (
        <div className="device">
          <div className="app-shell">
            <div className="app-scroll no-scrollbar pb-[88px]">
              <VendorTopBar {...shellProps} phoneFrame />
              <main className="px-4 pb-6 pt-3">{children}</main>
            </div>
            <StatusBar />
            <VendorBottomNav phoneFrame />
          </div>
        </div>
      ) : (
        <div className="dashboard-shell vendor-shell">
          <VendorSidebar {...shellProps} />
          <div className="vendor-content">
            <VendorTopBar {...shellProps} />
            <main className="dashboard-main vendor-main">{children}</main>
          </div>
          <VendorBottomNav />
        </div>
      )}
      <DesktopShellSwitcher
        mode={effective === "app" ? "app" : mode}
        onChange={setMode}
        hydrated={hydrated}
      />
    </>
  );
}
