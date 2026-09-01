"use client";

import { useShellModeState } from "@/components/shared/shell-mode-provider";
import type { ShellMode } from "@/lib/shell-mode";

/**
 * The admin shell the operator is actually looking at — not merely the one they
 * once picked.
 *
 * A real phone is always `"app"`: the console layout is not something a handset
 * can cope with, so the phone frame is forced below 480px (and for a
 * phone-shaped user agent on the server) and the stored preference is ignored.
 * Above that the preference wins, defaulting to the console.
 *
 * This is the single source of truth for the question. `AdminShell` renders the
 * chrome from it and `ConsoleOnly` gates page tools on it, so the two can never
 * disagree about which shell is on screen — a notice saying "open the web
 * console" can't appear inside the web console.
 *
 * The answer is decided **on the server** now, from a cookie plus a user-agent
 * fallback (`lib/shell-mode.server.ts`), and handed down through
 * `ShellModeProvider`. It used to be client-only, which meant SSR had no answer
 * and resolved to `"app"` for everyone: every console page was server-rendered
 * inside the 402px phone frame, bezel and all, and only became the console
 * after hydration.
 *
 * Still fails closed (AGENTS.md, "never fail open"): outside a provider, and on
 * anything that reads as a handset, it resolves to `"app"` — *fewer* tools plus
 * an explanation. A console-grade tool is never rendered into a phone by
 * accident.
 */
export function useAdminShellMode(): ShellMode {
  return useShellModeState().mode;
}
