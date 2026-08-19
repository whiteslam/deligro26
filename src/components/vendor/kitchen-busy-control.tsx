"use client";

import { useState, useTransition } from "react";
import { Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setVendorBusyAction } from "@/app/vendor/actions";

/**
 * Tell customers the kitchen is running long, before they order.
 *
 * A shop's `eta_min`/`eta_max` are typed once when the store is set up, so a
 * kitchen with forty tickets on the rail kept advertising "22–28 min" on every
 * search card and the customer found out only afterwards. There was no
 * peak-hour bump, no per-shift override and no "add 15 minutes" anywhere in the
 * product — the only ETA control a vendor had was a static band.
 *
 * The bump expires by itself (migration 0036). That is deliberate: an
 * indefinite "busy" flag is one more thing to forget to switch off, which is the
 * same failure as a shop left `is_open` at 2 a.m. — so the vendor buys an hour
 * at a time and taps again if the rush outlasts it.
 */

const OPTIONS = [10, 20, 30] as const;
const WINDOW_MINUTES = 60;

export function KitchenBusyControl({
  /** Minutes currently being added, 0 when not busy. */
  extraMinutes,
  /** ISO, when the bump lapses. Null when not busy. */
  until,
}: {
  extraMinutes: number;
  until: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Resolved server-side by `getVendorPace`, which returns a null `until` and
  // zero minutes once the bump has lapsed — so this is a prop check, not a clock
  // read. (Reading the clock during render is impure and would disagree with
  // whatever the server rendered anyway; the board's 8s refresh re-resolves it.)
  const busy = extraMinutes > 0 && until !== null;

  function apply(minutes: number) {
    setError(null);
    startTransition(async () => {
      try {
        await setVendorBusyAction(minutes, WINDOW_MINUTES);
      } catch {
        setError("Couldn't update. Try again.");
      }
    });
  }

  return (
    <div
      className={
        busy
          ? "rounded-xl border border-deal/40 bg-deal-soft px-3 py-2.5"
          : "rounded-xl border border-line bg-surface px-3 py-2.5"
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Timer
          className={busy ? "size-4 shrink-0 text-deal" : "size-4 shrink-0 text-muted"}
        />
        <p className="min-w-0 flex-1 text-sm font-medium">
          {busy ? (
            <>
              Quoting <span className="font-bold">+{extraMinutes} min</span> to
              customers until{" "}
              {new Date(until).toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
              })}
              .
            </>
          ) : (
            <>
              Running behind? Add time to what customers are quoted, for the next
              hour.
            </>
          )}
        </p>

        <div className="flex shrink-0 items-center gap-1.5">
          {OPTIONS.map((m) => (
            <Button
              key={m}
              size="sm"
              variant={busy && extraMinutes === m ? "primary" : "outline"}
              disabled={pending}
              onClick={() => apply(m)}
            >
              +{m}
            </Button>
          ))}
          {busy ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => apply(0)}
              aria-label="Back to normal"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="mt-1.5 text-xs text-deal">{error}</p> : null}
    </div>
  );
}
