"use client";

import { Share, X } from "lucide-react";

/**
 * The install suggestion.
 *
 * Shown only after the visit threshold in `useInstall`, never on a first visit,
 * and never again once dismissed. Two shapes, because the two platforms install
 * differently: Chromium hands us a real prompt, while iOS Safari has no API at
 * all and can only be told where the button is.
 */
export function InstallPrompt({
  manual,
  onInstall,
  onDismiss,
}: {
  /** iOS: no programmatic prompt exists, so describe the Share-sheet route. */
  manual: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Install Deligro"
      className="pointer-events-auto fixed inset-x-3 z-[88] mx-auto max-w-sm rounded-xl border border-line bg-surface px-3.5 py-3 shadow-[var(--shadow-lg)]"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">Install Deligro</p>
          {manual ? (
            <p className="mt-0.5 text-xs leading-snug text-muted">
              Tap{" "}
              <Share
                className="inline-block size-3.5 -translate-y-px"
                aria-label="the Share button"
              />{" "}
              then <strong className="font-semibold">Add to Home Screen</strong>{" "}
              to open Deligro like an app.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-snug text-muted">
              Add it to your home screen — opens faster, and works even on a weak
              connection.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="press -m-1 rounded-lg p-1 text-muted"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {manual ? null : (
        <button
          type="button"
          onClick={onInstall}
          className="press mt-2.5 inline-flex rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-[color:var(--surface)]"
        >
          Install
        </button>
      )}
    </div>
  );
}
