"use client";

import { useEffect } from "react";
import { useUI } from "@/stores/ui-store";
import { useOnboarding } from "@/stores/onboarding-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * First-run onboarding carousel. Three brand slides shown once per device.
 * Signed-in users skip it (server auth → `authed` prop); guests are gated on
 * localStorage so returning visitors never see it again.
 *
 * The illustrations are the designed hero art (extracted from the source
 * splash SVGs, text/brand stripped) with light + dark variants so the flow
 * inherits whatever theme the pre-paint bootstrap chose. Copy, wordmark, dots
 * and the primary action are native, so they use the app's type + tokens.
 */

type Slide = {
  art: string; // basename in /public/onboarding (sans -light/-dark.webp)
  title: string;
  body: string;
  cta: string;
};

const SLIDES: Slide[] = [
  {
    art: "find",
    title: "Find food you love",
    body: "Thousands of dishes from the best local kitchens, all in one place.",
    cta: "Next",
  },
  {
    art: "delivery",
    title: "Fast delivery",
    body: "Freshly made and delivered warm to your door — usually in under 30 minutes.",
    cta: "Next",
  },
  {
    art: "welcome",
    title: "Welcome to Deligro",
    body: "Your cravings, sorted. Order in a few taps and track every bite to your doorstep.",
    cta: "Start now",
  },
];

export function Onboarding({ authed = false }: { authed?: boolean }) {
  const theme = useUI((s) => s.theme);
  const initTheme = useUI((s) => s.initTheme);

  const open = useOnboarding((s) => s.open);
  const index = useOnboarding((s) => s.index);
  const leaving = useOnboarding((s) => s.leaving);
  const maybeShow = useOnboarding((s) => s.maybeShow);
  const next = useOnboarding((s) => s.next);
  const finish = useOnboarding((s) => s.finish);

  // Runs once per app load — sync theme, then decide if this is a first run.
  // Signed-in users skip the carousel entirely (and latch the flag so it never
  // reappears if they later sign out on this device).
  useEffect(() => {
    initTheme();
    maybeShow(authed);
  }, [initTheme, maybeShow, authed]);

  if (!open) return null;

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <div
      className="onboarding"
      data-leaving={leaving}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Deligro"
    >
      {!isLast && (
        <button className="onboarding-skip press" onClick={finish}>
          Skip
        </button>
      )}

      <div className="onboarding-art">
        {/* eslint-disable-next-line @next/next/no-img-element -- static hero art, matches the app's <img> usage */}
        <img
          key={`${slide.art}-${theme}`}
          src={`/onboarding/${slide.art}-${theme}.webp`}
          alt=""
          aria-hidden
          className="onboarding-img animate-fade-in"
          draggable={false}
        />
      </div>

      <div key={index} className="onboarding-panel animate-slide-up">
        <h2 className="text-display onboarding-title">{slide.title}</h2>
        <p className="text-body onboarding-body">{slide.body}</p>

        <div className="onboarding-dots" role="tablist" aria-hidden>
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={cn("onboarding-dot", i === index && "is-active")}
            />
          ))}
        </div>

        <Button size="lg" className="w-full" onClick={next}>
          {slide.cta}
        </Button>
      </div>
    </div>
  );
}
