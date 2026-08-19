"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a server-rendered board live without a manual reload: re-runs the
 * server component (router.refresh) on an interval, so fresh DB data flows back
 * into props. Pauses while the tab is hidden and refreshes immediately when it
 * regains focus — near-realtime for the ops boards, no WebSocket wiring needed.
 *
 * `whenHidden` opts out of the pause. Set it where nobody is looking at the tab
 * and that is exactly the problem: the kitchen display is a tablet that spends
 * its day on another tab or asleep, and pausing there meant new orders were not
 * merely un-announced but undiscovered until someone touched the device.
 */
export function AutoRefresh({
  interval = 4000,
  whenHidden = false,
}: {
  interval?: number;
  whenHidden?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (whenHidden || !document.hidden) router.refresh();
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
  }, [router, interval, whenHidden]);

  return null;
}
