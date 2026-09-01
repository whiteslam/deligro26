"use client";

import { useEffect } from "react";
import { installClientErrorReporting } from "@/lib/obs/client";

/**
 * Attaches the global browser error listeners, once, from the root layout.
 *
 * Renders nothing and holds no state — it exists only for its effect, so it
 * costs a mount and nothing else. Placed alongside `PwaProvider` for the same
 * reason that one is: every surface of this app shares the root layout, so this
 * covers the customer app, the vendor board, the rider board and the admin
 * console without four separate wirings to keep in step.
 *
 * Error boundaries report separately, by calling `reportClientError` directly.
 * They have to: a boundary catches the error *instead of* the window, so
 * `window.onerror` never sees it, and the boundary is the only place the
 * `digest` — the string that ties a browser's error screen to the server event
 * underneath it — is available at all.
 */
export function ErrorReporter() {
  useEffect(() => installClientErrorReporting(), []);
  return null;
}
