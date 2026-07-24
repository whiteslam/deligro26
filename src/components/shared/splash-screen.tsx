"use client";

import { useEffect, useState } from "react";

/**
 * Has the splash already played during this page load? Module-level, so it
 * survives client navigation (welcome → login → the feed all share one JS
 * runtime) but resets on a real cold start. This lets the splash live on the
 * entry pages AND the customer shell without ever double-playing: whichever
 * screen mounts first shows it, the rest see the flag already set.
 */
let played = false;

/**
 * Cold-start splash. Overlays the app shell (or whichever entry screen loads
 * first), then fades out — so it appears before the login/welcome screen, the
 * way a native app does, not after it.
 *
 * Brand splash: solid Deligro orange with the wordmark and delivery-rider
 * artwork. Both raster pieces were cropped from the source and sharpened;
 * the background is a live CSS fill so it stays crisp on every screen.
 */
export function SplashScreen() {
  // First mount this load → visible; any later mount (client nav) → skip.
  const [visible, setVisible] = useState(!played);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (!visible) return;
    played = true;
    const fade = setTimeout(() => setHiding(true), 1450);
    const remove = setTimeout(() => setVisible(false), 2000);
    return () => {
      clearTimeout(fade);
      clearTimeout(remove);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="splash"
      data-hiding={hiding}
      role="status"
      aria-label="Deligro — all in one delivery app"
    >
      <div className="splash-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="splash-logo"
          src="/splash-logo.webp"
          alt="Deligro"
          decoding="async"
        />
        <p className="splash-credit">Phoxera Solutions Private Limited</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="splash-art"
        src="/splash-art.webp"
        alt=""
        aria-hidden
        decoding="async"
      />
    </div>
  );
}
