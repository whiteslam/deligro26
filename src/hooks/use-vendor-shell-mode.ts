"use client";

import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useVendorShell } from "@/stores/vendor-shell-store";
import type { ShellMode } from "@/components/shared/desktop-shell-switcher";

/**
 * The vendor shell the partner is actually looking at — not merely the one they
 * once picked. Mirrors `useAdminShellMode`: a real phone is always `"app"`,
 * because the console layout is not something a handset can cope with.
 *
 * Fails closed (SSR, pre-hydration, blocked localStorage) to `"app"`.
 */
export function useVendorShellMode(): ShellMode {
  const mode = useVendorShell((s) => s.mode);
  const isDesktop = useIsDesktop();
  return isDesktop && mode !== "app" ? "web" : "app";
}
