"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tells the kitchen an order has arrived.
 *
 * The board had no alert of any kind: arrival was discovered by an 8-second
 * `router.refresh()` that only ran while the tab was visible. A tablet on
 * another tab, asleep, or simply not being watched accumulated orders in
 * silence — a 3-minute acceptance time turning into 30, and every downstream
 * ETA the customer was promised going with it. Server-side push exists
 * (`notifyVendorNewOrder`) but routes through OneSignal, whose credentials are
 * unset, so `sendPush` returns false and raises nothing.
 *
 * Three channels, because a kitchen defeats any one of them: a tone loud enough
 * to hear over extraction fans, a vibration for a tablet on a steel counter, and
 * a system notification for when the tab is in the background.
 *
 * ## Why this needs a button
 *
 * Neither audio nor notifications can be started by a page on its own — the
 * browser requires a user gesture to unlock an AudioContext, and a user gesture
 * to prompt for Notification permission. So the kitchen arms it once per device
 * and the choice is remembered in localStorage. Nothing here can be enabled
 * behind the operator's back, which is also why the disarmed state is visible
 * rather than silent: a board that looks armed and isn't is the failure this
 * component exists to fix.
 */

const STORAGE_KEY = "deligro-kitchen-alerts";

/**
 * How often an unacknowledged order re-announces itself.
 *
 * One beep is for someone who is present. This is for a tablet on a shelf: the
 * alert repeats until the order leaves the New column, which is to say until a
 * human has actually dealt with it.
 */
const RENOTIFY_MS = 25_000;

/* ------------------------------------------------------------------
 * The armed preference, and whether this device can alert at all, are both
 * external state — localStorage and a browser capability. They are read with
 * `useSyncExternalStore` rather than copied into React state by a mount effect,
 * which is what that hook is for and what keeps the server render (never armed,
 * assume capable) from mismatching the client's.
 *
 * The listener list exists because `storage` events do not fire in the tab that
 * wrote them, so the Mute button has to notify this tab itself.
 * ------------------------------------------------------------------ */

const armedListeners = new Set<() => void>();

function subscribeArmed(cb: () => void): () => void {
  armedListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    armedListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function armedSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    // Private mode / storage disabled. Not armed, and the button still works
    // for this session.
    return false;
  }
}

function armedServerSnapshot(): boolean {
  return false;
}

function writeArmed(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* ignore — the in-memory toggle below still takes effect */
  }
  for (const cb of armedListeners) cb();
}

/** Capability never changes within a page's life, so nothing to subscribe to. */
function subscribeNever(): () => void {
  return () => {};
}

function audioSupported(): boolean {
  return typeof window.AudioContext !== "undefined";
}

function audioSupportedOnServer(): boolean {
  return true;
}

/** A two-tone chime, synthesised — no audio asset to ship, host, or 404 on. */
function playChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Two notes rather than one: a single sine reads as an appliance beep, a
  // rising pair reads as a summons and carries better through kitchen noise.
  for (const [i, freq] of [880, 1318.5].entries()) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.18;
    // Ramped, not switched: a gain that jumps from 0 clicks audibly.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.36);
  }
}

export function KitchenAlert({
  /** Ids currently in the New column. Membership is the alert condition. */
  incomingIds,
  restaurantName,
}: {
  incomingIds: string[];
  restaurantName?: string;
}) {
  const armed = useSyncExternalStore(
    subscribeArmed,
    armedSnapshot,
    armedServerSnapshot
  );
  const supported = useSyncExternalStore(
    subscribeNever,
    audioSupported,
    audioSupportedOnServer
  );
  /** Set only from the arm handler, when the browser refuses to give us audio. */
  const [audioFailed, setAudioFailed] = useState(false);
  const on = armed && supported && !audioFailed;

  const audioRef = useRef<AudioContext | null>(null);
  /**
   * Ids we have already announced. Seeded on arm rather than starting empty, so
   * switching alerts on does not immediately shout about the orders already
   * sitting on the board.
   */
  const announced = useRef<Set<string>>(new Set());
  const lastRepeat = useRef(0);
  /**
   * True until the first announcement pass has run against a board that was
   * already armed on load — so restoring the preference does not immediately
   * shout about orders that were sitting there before the page opened.
   */
  const seeded = useRef(false);

  const fire = useCallback(
    (count: number) => {
      const ctx = audioRef.current;
      if (ctx) {
        // A context can be suspended out from under us (tab backgrounded, OS
        // audio focus lost). Resuming is a no-op when it is already running.
        void ctx.resume().then(() => playChime(ctx)).catch(() => {});
      }

      navigator.vibrate?.([200, 100, 200]);

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(
            count > 1 ? `${count} new orders` : "New order",
            {
              body: restaurantName
                ? `Waiting to be accepted at ${restaurantName}.`
                : "Waiting to be accepted.",
              // Collapses repeats into one notification instead of stacking a
              // wall of them over an unattended lunch rush.
              tag: "deligro-new-order",
              requireInteraction: true,
            }
          );
        } catch {
          // Some browsers refuse constructor notifications outside a service
          // worker. The tone and the vibration still did their job.
        }
      }
    },
    [restaurantName]
  );

  async function arm() {
    try {
      const ctx = audioRef.current ?? new AudioContext();
      audioRef.current = ctx;
      await ctx.resume();
      // Confirms out loud that alerts work — the only way the kitchen learns
      // the volume is up before an order depends on it.
      playChime(ctx);
    } catch {
      setAudioFailed(true);
      return;
    }

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      // Best effort: a refused prompt still leaves sound and vibration.
      try {
        await Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }

    announced.current = new Set(incomingIds);
    seeded.current = true;
    lastRepeat.current = Date.now();
    setAudioFailed(false);
    writeArmed(true);
  }

  function disarm() {
    writeArmed(false);
  }

  // New arrivals.
  useEffect(() => {
    if (!on) return;

    if (!seeded.current) {
      // Armed from a restored preference: adopt what is already on the board
      // without announcing it, then alert on everything after.
      seeded.current = true;
      announced.current = new Set(incomingIds);
      lastRepeat.current = Date.now();
      return;
    }

    const fresh = incomingIds.filter((id) => !announced.current.has(id));
    // Drop ids that have left the column, so an order re-entering it (an undone
    // rejection) announces itself again rather than being silently remembered.
    announced.current = new Set(incomingIds);
    if (fresh.length === 0) return;
    lastRepeat.current = Date.now();
    fire(incomingIds.length);
  }, [incomingIds, on, fire]);

  // Still unaccepted.
  useEffect(() => {
    if (!on || incomingIds.length === 0) return;
    const id = setInterval(() => {
      if (Date.now() - lastRepeat.current < RENOTIFY_MS) return;
      lastRepeat.current = Date.now();
      fire(incomingIds.length);
    }, 5_000);
    return () => clearInterval(id);
  }, [incomingIds, on, fire]);

  if (!supported) return null;

  return (
    <div
      className={
        on
          ? "flex items-center gap-3 rounded-xl border border-green/30 bg-green/10 px-3 py-2.5 text-sm"
          : "flex items-center gap-3 rounded-xl border border-deal/30 bg-deal-soft px-3 py-2.5 text-sm"
      }
    >
      {on ? (
        <BellRing className="size-4 shrink-0 text-green" />
      ) : (
        <BellOff className="size-4 shrink-0 text-deal" />
      )}
      <p className="min-w-0 flex-1 font-medium">
        {on ? (
          "Sound and vibration on for new orders."
        ) : audioFailed ? (
          <>
            <span className="font-bold">
              This browser wouldn&apos;t start the alert sound.
            </span>{" "}
            New orders will arrive silently — try again, or use another device
            for the kitchen display.
          </>
        ) : (
          <>
            <span className="font-bold">Alerts are off.</span> New orders will
            arrive silently on this device.
          </>
        )}
      </p>
      {on ? (
        <Button variant="ghost" size="sm" onClick={disarm} className="shrink-0">
          Mute
        </Button>
      ) : (
        <Button size="sm" onClick={arm} className="shrink-0">
          <Bell className="size-4" /> Turn on alerts
        </Button>
      )}
    </div>
  );
}
