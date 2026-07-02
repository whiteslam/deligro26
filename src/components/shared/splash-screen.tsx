"use client";

import { useEffect, useState } from "react";

/**
 * Cold-start splash. Overlays the app shell, then fades out.
 * Lives in the persistent customer layout, so it mounts once per load
 * (native-style) and never replays on client navigation.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setHiding(true), 1650);
    const remove = setTimeout(() => setVisible(false), 2250);
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
      aria-label="Deligro"
    >
      <div className="splash-glow" aria-hidden />
      <div className="splash-inner">
        <div className="splash-word">Deligro</div>
        <div className="splash-rule" aria-hidden />
        <p className="splash-tag text-label">Craving to doorstep</p>
      </div>
      <div className="splash-loader" aria-hidden />
    </div>
  );
}
