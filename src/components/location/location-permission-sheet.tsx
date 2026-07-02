"use client";

import { useEffect } from "react";
import { MapPin, Navigation, X } from "lucide-react";
import { useLocation } from "@/stores/location-store";

/**
 * In-app location permission explainer.
 *
 * Raised once on app open (via `maybePrompt`) so the user understands why
 * we want their location before the browser's native OS prompt appears.
 * "Enable" calls `detect`, which fires the real Geolocation request.
 */
export function LocationPermissionSheet() {
  const askOpen = useLocation((s) => s.askOpen);
  const status = useLocation((s) => s.status);
  const maybePrompt = useLocation((s) => s.maybePrompt);
  const detect = useLocation((s) => s.detect);
  const dismiss = useLocation((s) => s.dismiss);

  // Runs once per app load — restores any cached fix and decides whether to ask.
  useEffect(() => {
    maybePrompt();
  }, [maybePrompt]);

  if (!askOpen) return null;

  const loading = status === "loading";

  return (
    <div className="absolute inset-0 z-50">
      <button
        aria-label="Dismiss"
        onClick={dismiss}
        className="animate-fade-in absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Use your location"
        className="glass animate-sheet-in absolute inset-x-0 bottom-0 rounded-t-[var(--radius-sheet)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-lg)]"
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="press absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-surface-2 text-muted"
        >
          <X className="size-5" />
        </button>

        <div className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Navigation className="size-7" />
        </div>

        <h2 className="mt-4 font-serif text-2xl font-medium">
          Deliver to your doorstep
        </h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
          Allow Deligro to detect your current location so we can show
          restaurants that deliver to you and get orders there faster.
        </p>

        <ul className="mt-4 space-y-2 text-sm text-muted">
          <li className="flex items-center gap-2.5">
            <MapPin className="size-4 shrink-0 text-accent" />
            Accurate delivery, no typing your address
          </li>
          <li className="flex items-center gap-2.5">
            <Navigation className="size-4 shrink-0 text-accent" />
            Used only to place your order — never shared
          </li>
        </ul>

        <div className="mt-6 space-y-2.5">
          <button
            onClick={detect}
            disabled={loading}
            className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white shadow-[var(--glow-accent)] hover:brightness-105 disabled:opacity-60"
          >
            <Navigation className="size-5" />
            {loading ? "Detecting…" : "Enable location"}
          </button>
          <button
            onClick={dismiss}
            className="press h-12 w-full rounded-full text-[15px] font-semibold text-muted hover:bg-surface-2"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
