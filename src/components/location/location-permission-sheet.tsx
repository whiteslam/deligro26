"use client";

import { useEffect } from "react";
import { LoaderCircle, Navigation, X } from "lucide-react";
import { useLocation } from "@/stores/location-store";
import { LocationIllustration } from "./location-illustration";

/**
 * In-app location permission explainer.
 *
 * Raised once on app open (via `maybePrompt`) so the user understands why we
 * want their location before the browser's native OS prompt appears. "Enable"
 * calls `detect`, which fires the real Geolocation request — the sheet stays up
 * until the device answers, then reports the outcome here.
 */
export function LocationPermissionSheet() {
  const askOpen = useLocation((s) => s.askOpen);
  const status = useLocation((s) => s.status);
  const error = useLocation((s) => s.error);
  const blocked = useLocation((s) => s.blocked);
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
        className="animate-fade-in absolute inset-0 bg-ink/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Use your location"
        className="glass animate-sheet-in absolute inset-x-0 bottom-0 rounded-t-[var(--radius-sheet)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-center shadow-[var(--shadow-lg)]"
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="press absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-surface-2 text-muted"
        >
          <X className="size-5" />
        </button>

        <LocationIllustration className="mx-auto block w-full max-w-[168px]" />

        <h2 className="mt-3 text-[22px] font-extrabold tracking-tight">
          Where should we deliver?
        </h2>
        <p className="mx-auto mt-2 max-w-[300px] text-[15px] leading-snug text-muted">
          {blocked
            ? "Turn location on for Deligro in your browser or device settings, or enter an address instead."
            : "We'll detect your location to show restaurants that deliver to you."}
        </p>

        {error && !blocked ? (
          <p role="alert" className="mt-3 text-sm font-medium text-accent-ink">
            {error}
          </p>
        ) : null}

        <button
          onClick={detect}
          disabled={loading}
          className="press mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white shadow-[var(--glow-accent)] hover:brightness-105 disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <Navigation className="size-5" />
          )}
          {loading
            ? "Waiting for your device…"
            : blocked
              ? "Try again"
              : "Enable location"}
        </button>

        <button
          onClick={dismiss}
          className="press mt-1.5 h-12 w-full rounded-full text-[15px] font-semibold text-muted hover:bg-surface-2"
        >
          {blocked ? "Enter address manually" : "Not now"}
        </button>

        <p className="mt-1 text-xs text-muted">
          Used only to place your order — never shared.
        </p>
      </div>
    </div>
  );
}
