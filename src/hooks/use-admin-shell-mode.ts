"use client";

import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useAdminShell } from "@/stores/admin-shell-store";
import type { ShellMode } from "@/components/shared/desktop-shell-switcher";

/**
 * The admin shell the operator is actually looking at — not merely the one they
 * once picked.
 *
 * A real phone is always `"app"`: the console layout is not something a handset
 * can cope with, so `AdminShell` forces the phone frame below 480px and the
 * stored preference is ignored. Above 480px the preference wins, defaulting to
 * the console.
 *
 * This is the single source of truth for the question. `AdminShell` renders the
 * chrome from it and `ConsoleOnly` gates page tools on it, so the two can never
 * disagree about which shell is on screen — a notice saying "open the web
 * console" can't appear inside the web console.
 *
 * Fails closed by construction (see AGENTS.md, "never fail open"): SSR,
 * pre-hydration and a blocked localStorage all resolve to `"app"`, i.e. *fewer*
 * tools plus an explanation. A console-grade tool is never rendered into a
 * phone by accident.
 */
export function useAdminShellMode(): ShellMode {
  const mode = useAdminShell((s) => s.mode);
  const isDesktop = useIsDesktop();
  return isDesktop && mode !== "app" ? "web" : "app";
}
