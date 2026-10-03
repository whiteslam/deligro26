"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  missingRingSettings,
  nativeRing,
  type RingSetting,
  type RingSetup as Setup,
} from "@/lib/native/bridge";

/**
 * The phone settings that silently stop the order ring. Budget Android phones
 * (Xiaomi, Vivo, Oppo — most of Bemetara) kill a backgrounded app to save
 * battery, and a killed app never hears the push. Shown only inside the
 * Vendor/Rider app, only while something is missing, and re-checked when the
 * user comes back from Settings.
 */
const LABEL: Record<RingSetting, string> = {
  notifications: "सूचनाएं चालू करें · Allow notifications",
  battery: "बैटरी सेवर से हटाएं · Remove from battery saver",
  fullScreen: "लॉक स्क्रीन पर दिखाएं · Show on lock screen",
  autostart: "ऑटोस्टार्ट चालू करें · Turn on Autostart",
};

/** Autostart cannot be read back, so a tap on its button is taken as "done". */
const AUTOSTART_KEY = "deligro-ring-autostart-done";

function autostartDone(): boolean {
  try {
    return window.localStorage.getItem(AUTOSTART_KEY) === "1";
  } catch {
    return false;
  }
}

export function RingSetup() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [acked, setAcked] = useState(false);

  const refresh = useCallback(() => {
    const ring = nativeRing();
    if (!ring) return;
    ring.ringSetup().then(setSetup).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  if (!setup) return null;
  const missing = missingRingSettings(setup, { autostartDone: acked || autostartDone() });
  if (missing.length === 0) return null;

  return (
    <div className="rounded-xl border border-deal/30 bg-deal-soft p-3">
      <p className="flex items-center gap-2 text-base font-bold">
        <BellRing className="size-5 shrink-0 text-deal" />
        फ़ोन बंद होने पर भी घंटी बजे
      </p>
      <p className="mt-1 text-sm text-muted">
        नीचे दी गई सेटिंग चालू करें, नहीं तो ऑर्डर की घंटी नहीं बजेगी। · Turn
        these on or the order ring may not reach you.
      </p>
      <div className="mt-3 grid gap-2">
        {missing.map((which) => (
          <Button
            key={which}
            className="min-h-11 justify-start"
            onClick={() => {
              if (which === "autostart") {
                try {
                  window.localStorage.setItem(AUTOSTART_KEY, "1");
                } catch {
                  /* the button still opens the screen */
                }
                setAcked(true);
              }
              void nativeRing()?.openRingSettings({ which }).catch(() => {});
            }}
          >
            {LABEL[which]}
          </Button>
        ))}
      </div>
      {missing.includes("autostart") ? (
        <p className="mt-2 text-xs text-muted">
          खुलने वाली स्क्रीन में Deligro के आगे <b>Autostart</b> चालू करें। · In
          the screen that opens, switch Autostart on for Deligro.
        </p>
      ) : null}
    </div>
  );
}
