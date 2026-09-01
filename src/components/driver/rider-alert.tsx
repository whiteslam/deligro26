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
import { playAlertSound } from "@/lib/alerts/tones";

/**
 * Tells a rider a job has appeared in the available pool.
 *
 * The rider board had no alert of any kind — a rider had to be looking at the
 * screen, or refresh it, to notice a new pickup. Mirrors `kitchen-alert.tsx`
 * exactly (same arm/disarm/localStorage pattern, same three channels: tone,
 * vibration, system notification) rather than sharing code with it, so each
 * stays a single self-contained unit — see that file for the full reasoning
 * on why a button is required at all (a browser will not start audio or ask
 * for notification permission without a user gesture).
 *
 * `incomingIds` is expected to already be empty while the rider has an active
 * delivery — the pool is not something they can act on then, so the caller
 * (driver-board.tsx) passes `[]` rather than this component special-casing it.
 */

const STORAGE_KEY = "deligro-rider-alerts";
const RENOTIFY_MS = 25_000;

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

function subscribeNever(): () => void {
  return () => {};
}

function audioSupported(): boolean {
  return typeof window.AudioContext !== "undefined";
}

function audioSupportedOnServer(): boolean {
  return true;
}

export function RiderAlert({
  /** Ids currently in the available pool. Empty while a delivery is active. */
  incomingIds,
  /** From platform_settings (0044), admin-configured — same for every rider. */
  soundPreset = "chime",
  soundUrl = null,
}: {
  incomingIds: string[];
  soundPreset?: string;
  soundUrl?: string | null;
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
  const [audioFailed, setAudioFailed] = useState(false);
  const on = armed && supported && !audioFailed;

  const audioRef = useRef<AudioContext | null>(null);
  const announced = useRef<Set<string>>(new Set());
  const lastRepeat = useRef(0);
  const seeded = useRef(false);

  const fire = useCallback(
    (count: number) => {
      const ctx = audioRef.current;
      if (ctx) {
        void ctx
          .resume()
          .then(() => playAlertSound(ctx, soundPreset, soundUrl))
          .catch(() => {});
      }

      navigator.vibrate?.([200, 100, 200]);

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(count > 1 ? `${count} jobs available` : "New job available", {
            body: "Open the app to accept it before someone else does.",
            tag: "deligro-new-job",
            requireInteraction: true,
          });
        } catch {
          // Some browsers refuse constructor notifications outside a service
          // worker. The tone and the vibration still did their job.
        }
      }
    },
    [soundPreset, soundUrl]
  );

  async function arm() {
    try {
      const ctx = audioRef.current ?? new AudioContext();
      audioRef.current = ctx;
      await ctx.resume();
      playAlertSound(ctx, soundPreset, soundUrl);
    } catch {
      setAudioFailed(true);
      return;
    }

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
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
      seeded.current = true;
      announced.current = new Set(incomingIds);
      lastRepeat.current = Date.now();
      return;
    }

    const fresh = incomingIds.filter((id) => !announced.current.has(id));
    announced.current = new Set(incomingIds);
    if (fresh.length === 0) return;
    lastRepeat.current = Date.now();
    fire(incomingIds.length);
  }, [incomingIds, on, fire]);

  // Still unclaimed.
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
          "Sound and vibration on for new jobs."
        ) : audioFailed ? (
          <>
            <span className="font-bold">
              This browser wouldn&apos;t start the alert sound.
            </span>{" "}
            New jobs will arrive silently — try again, or check the app
            manually.
          </>
        ) : (
          <>
            <span className="font-bold">Alerts are off.</span> New jobs will
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
