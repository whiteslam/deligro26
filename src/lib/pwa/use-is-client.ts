"use client";

import { useSyncExternalStore } from "react";

/** Nothing to subscribe to — this value flips once, at hydration, and never again. */
const subscribe = () => () => {};

/**
 * False while server-rendering and on the first client render, true afterwards.
 *
 * The PWA overlays all depend on things only a browser knows — `navigator.onLine`,
 * `display-mode`, localStorage — so they must not render until there is a
 * browser. `useSyncExternalStore` is the way to express that in React 19: it
 * uses the server snapshot for hydration and then re-renders with the client
 * one, which is exactly the "mounted" flag people used to write as a
 * `useState` + `useEffect` pair. That pattern is now a lint error
 * (react-hooks/set-state-in-effect) because it costs a cascading render.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
