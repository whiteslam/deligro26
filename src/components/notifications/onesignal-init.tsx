"use client";

import Script from "next/script";
import { useEffect } from "react";

/**
 * Loads the OneSignal Web SDK (v16) and, once a browser subscribes, POSTs the
 * player id to /api/notifications/register so the server can push order updates.
 *
 * Renders nothing and does nothing unless NEXT_PUBLIC_ONESIGNAL_APP_ID is set,
 * so dev/demo builds without credentials are unaffected. Mount it once, high in
 * the customer tree (e.g. the customer layout).
 */

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(os: OneSignalApi) => void | Promise<void>>;
  }
}

interface OneSignalApi {
  init: (opts: { appId: string; allowLocalhostAsSecureOrigin?: boolean }) => Promise<void>;
  User: {
    PushSubscription: {
      id?: string | null;
      addEventListener: (
        event: "change",
        cb: (e: { current: { id?: string | null } }) => void
      ) => void;
    };
  };
}

async function savePlayerId(id: string | null | undefined) {
  if (!id) return;
  try {
    await fetch("/api/notifications/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: id }),
    });
  } catch {
    // best-effort — a failed register just means no push until next visit
  }
}

export function OneSignalInit() {
  useEffect(() => {
    if (!APP_ID) return;
    window.OneSignalDeferred = window.OneSignalDeferred ?? [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({
        appId: APP_ID,
        allowLocalhostAsSecureOrigin: true,
      });
      // Persist the id now if already subscribed, and on any later change.
      void savePlayerId(OneSignal.User.PushSubscription.id);
      OneSignal.User.PushSubscription.addEventListener("change", (e) => {
        void savePlayerId(e.current.id);
      });
    });
  }, []);

  if (!APP_ID) return null;

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  );
}
