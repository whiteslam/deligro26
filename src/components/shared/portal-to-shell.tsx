"use client";

import { createPortal } from "react-dom";

/**
 * Portals overlays into `.app-shell` when the phone frame is mounted, else
 * `document.body`. `.app-shell` carries a transform, so `position: fixed`
 * descendants must live inside it to stay in the bezel. On the web console
 * there is no frame, so body is the right target — and it also escapes
 * `@container` parents that would otherwise containing-block the overlay.
 */
export function PortalToShell({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  const target = document.querySelector(".app-shell") ?? document.body;
  return createPortal(children, target);
}
