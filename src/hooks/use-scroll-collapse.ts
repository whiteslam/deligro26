"use client";

import { useEffect, useRef, useState } from "react";

interface Options {
  /** Scroll depth at which the header gives up its top row. */
  collapseAt?: number;
  /** Scroll depth at which it comes back. Must be well below collapseAt. */
  expandAt?: number;
  /** Don't collapse a feed that barely scrolls — see below. */
  minRoom?: number;
}

/**
 * True once the app's scroller has been pulled down past `collapseAt`, false
 * again near the top. Drives the feed header shedding its address row so only
 * the search field stays.
 *
 * Two guards, both there to stop the header oscillating — the failure that got
 * an earlier version of this reverted:
 *
 * - Hysteresis. Collapsing removes the row's height from the scroller, so the
 *   browser can clamp scrollTop down. With a single threshold that clamp lands
 *   back below the line, the row returns, the height comes back, and it flips
 *   forever. Collapsing high and expanding low leaves the clamp somewhere
 *   harmless in between.
 * - A minimum-room check. On a feed with barely more content than screen, the
 *   clamp can be big enough to clear even the low threshold. If there isn't
 *   comfortably more scrollable room than the row is tall, we just don't
 *   collapse — a short feed has no space problem to solve anyway.
 */
export function useScrollCollapse({
  collapseAt = 64,
  expandAt = 16,
  minRoom = 140,
}: Options = {}): boolean {
  const [collapsed, setCollapsed] = useState(false);
  // Scroll fires continuously; only re-render when the state actually flips.
  const collapsedRef = useRef(false);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".app-scroll");
    if (!el) return;

    const apply = (next: boolean) => {
      if (next === collapsedRef.current) return;
      collapsedRef.current = next;
      setCollapsed(next);
    };

    const onScroll = () => {
      const room = el.scrollHeight - el.clientHeight;
      // `room` is measured in the current state: when collapsed it already
      // excludes the row, so compare against the smaller bar to avoid a feed
      // that qualifies expanded but not collapsed (which would itself flip).
      const enoughRoom = room > (collapsedRef.current ? minRoom / 2 : minRoom);
      if (!enoughRoom) return apply(false);

      const y = el.scrollTop;
      if (y > collapseAt) apply(true);
      else if (y < expandAt) apply(false);
    };

    onScroll(); // the scroller may already be restored mid-page
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [collapseAt, expandAt, minRoom]);

  return collapsed;
}
