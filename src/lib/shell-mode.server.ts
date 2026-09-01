import "server-only";

import { cookies, headers } from "next/headers";
import {
  SHELL_COOKIE,
  parseShellMode,
  shellModeFromUserAgent,
  type ShellMode,
  type ShellPortal,
} from "@/lib/shell-mode";

/**
 * The shell to server-render, decided before a single byte of HTML is written.
 *
 * Order of authority — the same order the client applies after hydration, which
 * is what keeps the two from disagreeing:
 *
 * 1. **A phone-shaped user agent wins outright.** A handset is always the phone
 *    frame; the console is not something a 390px screen can cope with, and the
 *    stored preference is ignored rather than overwritten. This is a layout
 *    decision and nothing else — see the note on `shellModeFromUserAgent`.
 * 2. **The cookie**: the choice the operator made with the Layout switcher.
 * 3. **`"web"`**, because a console is what an admin or vendor portal is for.
 *
 * The client re-derives the same answer from `matchMedia` once mounted, so a
 * user agent this regex does not recognise costs one page load and never
 * repeats. What it must never do is what the previous client-only version did:
 * render the console *as the phone frame* on every single request.
 */
export async function resolveShellMode(portal: ShellPortal): Promise<ShellMode> {
  const [store, h] = await Promise.all([cookies(), headers()]);

  if (shellModeFromUserAgent(h.get("user-agent")) === "app") return "app";

  return parseShellMode(store.get(SHELL_COOKIE[portal])?.value) ?? "web";
}
