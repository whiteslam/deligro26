"use client";

import { useSyncExternalStore } from "react";

/** Matches the phone-frame breakpoint in globals.css (≥480px = desktop preview). */
const DESKTOP_MQ = "(min-width: 480px)";

/**
 * True on laptop/desktop viewports where the app↔web layout switcher is useful.
 *
 * Read through `useSyncExternalStore` rather than an effect so the answer is
 * correct on the *first* client render: an effect-based version rendered the
 * phone frame first and swapped to the console a paint later, which read as a
 * flicker on every navigation. The server snapshot is `false`, so SSR output
 * stays deterministic and React reconciles it during hydration instead of
 * warning about a mismatch.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(DESKTOP_MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(DESKTOP_MQ).matches;
}

function getServerSnapshot(): boolean {
  return false;
}
