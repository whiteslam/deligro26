"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a server-rendered board live without a manual reload: re-runs the
 * server component (router.refresh) on an interval, so fresh DB data flows back
 * into props. Pauses while the tab is hidden and refreshes immediately when it
 * regains focus — near-realtime for the ops boards, no WebSocket wiring needed.
 */
export function AutoRefresh({ interval = 4000 }: { interval?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) router.refresh();
    };

    const id = setInterval(tick, interval);
    // Catch up the moment the operator returns to the tab.
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [router, interval]);

  return null;
}
