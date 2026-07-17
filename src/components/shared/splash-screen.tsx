"use client";

import { useEffect, useState } from "react";

/**
 * Cold-start splash. Overlays the app shell, then fades out.
 * Lives in the persistent customer layout, so it mounts once per load
 * (native-style) and never replays on client navigation.
 *
 * Brand splash: solid Deligro orange with the wordmark and delivery-rider
 * artwork. Both raster pieces were cropped from the source and sharpened;
 * the background is a live CSS fill so it stays crisp on every screen.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setHiding(true), 1450);
    const remove = setTimeout(() => setVisible(false), 2000);
    return () => {
      clearTimeout(fade);
      clearTimeout(remove);
    };
  }, []);

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
