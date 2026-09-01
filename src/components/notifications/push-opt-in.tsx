"use client";

import { useCallback, useState } from "react";
import { useIsClient } from "@/lib/pwa/use-is-client";
import { Bell, BellOff, BellRing } from "lucide-react";

/**
 * The notification opt-in control.
 *
 * The rule this exists to honour: never call `Notification.requestPermission()`
 * on page load. A browser permission prompt has exactly one shot — a reflexive
 * "Block" is permanent from the app's side, recoverable only through browser
 * settings that most of this audience will never find. So the value is stated
 * first, and the prompt only follows a deliberate tap.
 *
 * The subscription itself is OneSignal's (see `onesignal-init.tsx`); this only
 * drives the browser-level permission, which is the gate in front of it.
 */

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";

type Permission = "default" | "granted" | "denied" | "unsupported";

function currentPermission(): Permission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as Permission;
}

export function PushOptIn() {
  // Read during the first client render rather than pushed in from an effect:
  // the server genuinely cannot know this, and a button that appears and then
  // changes shape a frame later reads as a glitch.
  const [permission, setPermission] = useState<Permission>(currentPermission);
  const isClient = useIsClient();
  const [busy, setBusy] = useState(false);

  const enable = useCallback(async () => {
    if (!("Notification" in window)) return;
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as Permission);
      // OneSignal picks the subscription up through its own change listener and
      // POSTs the player id to /api/notifications/register — nothing to do here
      // beyond letting the permission through.
    } catch {
      setPermission(currentPermission());
    } finally {
      setBusy(false);
    }
  }, []);

  if (!isClient) return null;

  // Push is wired to OneSignal; with no app id configured there is no delivery
  // path, so offering to turn it on would be a button that does nothing.
  if (!APP_ID) return null;

  if (permission === "unsupported") {
    return (
      <Row
        icon={<BellOff className="size-4" aria-hidden="true" />}
        title="Not supported on this browser"
        description="Order updates will still appear on the Orders screen whenever you open the app."
      />
    );
  }

  if (permission === "granted") {
    return (
      <Row
        icon={<BellRing className="size-4 text-green" aria-hidden="true" />}
        title="Order updates are on"
        description="We'll notify you when a shop accepts your order and when your rider is on the way. Turn them off in your browser or device settings."
      />
    );
  }

  if (permission === "denied") {
    return (
      <Row
        icon={<BellOff className="size-4" aria-hidden="true" />}
        title="Notifications are blocked"
        description="Your browser is blocking them for this site. You can allow them again from the padlock or site-settings menu in the address bar."
      />
    );
  }

  return (
    <div className="p-3.5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted">
          <Bell className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">
            Get notified about your order
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            One notification when the kitchen accepts, one when your rider sets
            off, one on delivery. Nothing else — no offers, no marketing.
          </p>
          <button
            type="button"
            onClick={() => void enable()}
            disabled={busy}
            className="press mt-2.5 inline-flex rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-[color:var(--surface)] disabled:opacity-50"
          >
            {busy ? "Waiting…" : "Turn on notifications"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5">
      <span className="mt-0.5 text-muted">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  );
}
