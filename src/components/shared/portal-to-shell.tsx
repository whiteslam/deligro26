"use client";

import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/pwa/use-is-client";

/**
 * Portals overlays into `.app-shell` when the phone frame is mounted, else
 * `document.body`. `.app-shell` carries a transform, so `position: fixed`
 * descendants must live inside it to stay in the bezel. On the web console
 * there is no frame, so body is the right target — and it also escapes
 * `@container` parents that would otherwise containing-block the overlay.
 *
 * Gated on `useIsClient`, not `typeof document`: the server rendered nothing and
 * the first client render must match it, or React throws a hydration mismatch
 * (it did, on /orders, for the pull-to-refresh indicator).
 */
export function PortalToShell({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  if (!isClient) return null;
  const target = document.querySelector(".app-shell") ?? document.body;
  return createPortal(children, target);
}
