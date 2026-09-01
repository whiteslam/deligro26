"use client";

import { useShellModeState } from "@/components/shared/shell-mode-provider";
import type { ShellMode } from "@/lib/shell-mode";

/**
 * The vendor shell the partner is actually looking at — not merely the one they
 * once picked. Mirrors `useAdminShellMode` exactly, including the server-side
 * resolution: a real phone is always `"app"`, because the console layout is not
 * something a handset can cope with.
 *
 * Fails closed (outside a provider, or on anything that reads as a handset) to
 * `"app"`.
 */
export function useVendorShellMode(): ShellMode {
  return useShellModeState().mode;
}
