"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowDown } from "lucide-react";
import { PortalToShell } from "@/components/shared/portal-to-shell";
import { cn } from "@/lib/utils/cn";

/** How far the finger has to travel before letting go actually refreshes. */
const THRESHOLD = 68;

/** Past this the pull stops following the finger — it has made its point. */
const MAX_PULL = 104;

/** Movement under this is a tap or a scroll, not a pull. */
const SLOP = 6;

/**
 * Pull the list down to reload it.
 *
 * `AutoRefresh` keeps a screen live on a timer, but only where one is running:
 * the Orders tab polls while an order is in flight and not otherwise, which is
 * correct — a page of finished orders has nothing to poll for — and leaves the
 * customer with no way to ask. On a phone the way you ask is to pull, and
 * nothing happened, because `.app-scroll` sets `overscroll-behavior: contain`
 * and so even the browser's own gesture is suppressed.
 *
 * Drives `.app-scroll` rather than a wrapper of its own: the shell owns the
 * scroller, the page is rendered inside it, and translating the scroller is
 * what makes the content follow the finger instead of a spinner appearing over
 * a page that did not move. Found by walking up from this component's own node,
 * so a screen that is not inside the phone shell simply renders nothing.
 */
export function PullToRefresh() {
  const anchor = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pull, setPull] = useState(0);

  useEffect(() => {
    const scroller = anchor.current?.closest<HTMLElement>(".app-scroll");
    if (!scroller) return;

    let startY = 0;
    let active = false;
    let distance = 0;

    const move = (to: number) => {
      distance = to;
      setPull(to);
      // The scroller is `position: absolute; inset: 0` inside a shell that
      // clips, so translating it slides the page down and reveals the shell
      // behind it — which is where the indicator below is sitting.
      scroller.style.transform = to ? `translate3d(0, ${to}px, 0)` : "";
      scroller.style.transition = "";
    };

    const release = () => {
      scroller.style.transition = "transform 0.25s ease-out";
      scroller.style.transform = "";
    };

    const onStart = (e: TouchEvent) => {
      active = false;
      distance = 0;
      if (e.touches.length !== 1) return;
      // Only from the very top. Anywhere else this is an ordinary scroll and
      // taking it over would make the list feel broken.
      if (scroller.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      active = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!active || e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - startY;
      if (dy < SLOP) {
        if (distance) move(0);
        // Upward, or barely moved: hand it back to the scroller untouched.
        if (dy < 0) active = false;
        return;
      }
      // Non-passive, so the browser does not also scroll while we pull.
      e.preventDefault();
      // Resistance — the pull gets heavier the further it goes, which is what
      // tells a finger it has reached the end without a number on screen.
      const eased = Math.min(MAX_PULL, dy * 0.5);
      move(eased);
    };

    const onEnd = () => {
      if (!active) return;
      active = false;
      const reached = distance >= THRESHOLD;
      release();
      setPull(0);
      if (!reached) return;
      // `startTransition` marks the refresh pending in this same batch as the
      // reset above, so the indicator changes over without a frame at zero.
      startTransition(() => router.refresh());
    };

    scroller.addEventListener("touchstart", onStart, { passive: true });
    scroller.addEventListener("touchmove", onMove, { passive: false });
    scroller.addEventListener("touchend", onEnd);
    scroller.addEventListener("touchcancel", onEnd);
    return () => {
      scroller.removeEventListener("touchstart", onStart);
      scroller.removeEventListener("touchmove", onMove);
      scroller.removeEventListener("touchend", onEnd);
      scroller.removeEventListener("touchcancel", onEnd);
      scroller.style.transform = "";
      scroller.style.transition = "";
    };
  }, [router]);

  const busy = pending;
  const armed = pull >= THRESHOLD;
  const visible = busy || pull > 0;

  return (
    <div ref={anchor}>
      {/* Portalled out of the scroller on purpose. A transform makes an element
          the containing block for its `fixed` descendants, so an indicator
          rendered inside `.app-scroll` would ride down with the very content it
          is supposed to stay above once the pull starts. */}
      <PortalToShell>
        <div
          aria-live="polite"
          className={cn(
            "pointer-events-none fixed inset-x-0 z-40 flex justify-center transition-opacity",
            visible ? "opacity-100" : "opacity-0"
          )}
          style={{
            top: `calc(var(--status-h) + ${busy ? 12 : Math.max(0, pull - 28)}px)`,
          }}
        >
          <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[12px] font-bold shadow-[var(--shadow-md)]">
            {busy ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Refreshing
              </>
            ) : (
              <>
                <ArrowDown
                  className={cn(
                    "size-3.5 transition-transform",
                    armed && "rotate-180"
                  )}
                />
                {armed ? "Release to refresh" : "Pull to refresh"}
              </>
            )}
          </span>
        </div>
      </PortalToShell>
    </div>
  );
}
