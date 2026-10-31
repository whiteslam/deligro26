"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";

const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True only on the client, and only when the visitor has not asked for reduced motion. */
function useMotionAllowed() {
  return useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(REDUCE).matches,
    () => false
  );
}

/**
 * The landing hero's background loop.
 *
 * Never autoplays from markup: the poster is what renders on the server, with
 * scripting off, and for anyone who has asked their OS for reduced motion. Only
 * when motion is allowed does the effect start the loop, and the loop always
 * carries a pause control (a moving background with no way to stop it fails
 * WCAG 2.2.2). Play state is read back from the element's own events, so the
 * button never disagrees with what is on screen.
 */
export function HeroVideo({
  webm,
  mp4,
  poster,
}: {
  webm: string;
  mp4: string;
  poster: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const motionAllowed = useMotionAllowed();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (motionAllowed) {
      video.play().catch(() => {
        // Autoplay refused (data saver, power mode): the poster stays, and the
        // button still offers play.
      });
    } else {
      video.pause();
    }
  }, [motionAllowed]);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  }

  return (
    <>
      <video
        ref={ref}
        className="landing-hero__video"
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={webm} type="video/webm" />
        <source src={mp4} type="video/mp4" />
      </video>
      {motionAllowed && (
        <button
          type="button"
          className="landing-hero__pause"
          onClick={toggle}
          aria-label={playing ? "Pause background video" : "Play background video"}
        >
          {playing ? <Pause aria-hidden size={18} /> : <Play aria-hidden size={18} />}
        </button>
      )}
    </>
  );
}
