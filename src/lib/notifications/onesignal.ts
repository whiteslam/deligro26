import "server-only";
import { recordProvider } from "@/lib/obs/emit";

/**
 * OneSignal push — server-side sender.
 *
 * The legacy site pushed order updates through OneSignal (which sits on top of
 * FCM / APNs / web-push and bundles the service worker + VAPID keys), so we
 * reuse the same project. Credentials come from the environment:
 *
 *   ONESIGNAL_APP_ID          — public app id (also exposed to the client SDK)
 *   ONESIGNAL_REST_API_KEY    — SECRET. Server only. Never NEXT_PUBLIC_.
 *
 * If either is unset the sender is a silent no-op, so dev/demo and the build
 * work without credentials (mirrors the Supabase "demo mode" guard).
 */

const APP_ID = process.env.ONESIGNAL_APP_ID ?? process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";
const REST_KEY = process.env.ONESIGNAL_REST_API_KEY ?? "";
const CHANNEL_ID = process.env.ONESIGNAL_ANDROID_CHANNEL_ID ?? "";

export const isPushConfigured = APP_ID.length > 0 && REST_KEY.length > 0;

const ENDPOINT = "https://onesignal.com/api/v1/notifications";

export interface PushOptions {
  /** Deep-link opened when the notification is tapped (e.g. /orders/<id>). */
  url?: string;
  /** Arbitrary payload delivered with the push. */
  data?: Record<string, unknown>;
}

/**
 * Send a push to one or more OneSignal player ids. Best-effort: never throws
 * into the caller's request path — a failed push must not fail an order update.
 * Returns true if OneSignal accepted the request.
 */
export async function sendPush(
  playerIds: string | Array<string | null | undefined>,
  heading: string,
  message: string,
  opts: PushOptions = {}
): Promise<boolean> {
  const ids = (Array.isArray(playerIds) ? playerIds : [playerIds])
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (!isPushConfigured || ids.length === 0) return false;

  const body: Record<string, unknown> = {
    app_id: APP_ID,
    include_player_ids: ids,
    headings: { en: heading },
    contents: { en: message },
  };
  if (CHANNEL_ID) body.android_channel_id = CHANNEL_ID;
  if (opts.url) body.url = opts.url;
  if (opts.data) body.data = opts.data;

  // Fire-and-forget still has to be observable. Before this, a push that
  // OneSignal rejected and a push that was never attempted looked identical
  // from outside — `false`, and nothing else — so "customers stopped being told
  // their order was on its way" was not a question anyone could answer. The
  // return value is unchanged; only the record is new.
  const started = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${REST_KEY}`,
      },
      body: JSON.stringify(body),
      // Don't let a slow provider hang the caller.
      signal: AbortSignal.timeout(8000),
    });
    recordProvider(
      "onesignal",
      "notifications.create",
      {
        ok: res.ok,
        durationMs: Date.now() - started,
        status: res.status,
        // The status line, not the body: OneSignal echoes the notification
        // payload back on some errors, and that payload contains player ids.
        detail: res.ok ? undefined : res.statusText,
      },
      { attrs: { itemCount: ids.length } }
    );
    return res.ok;
  } catch (err) {
    // Network error / timeout / abort — swallowed as before, but no longer
    // silent. A timeout here is the 8s abort above, which is a different
    // diagnosis to a 400 and needs to be told apart from one.
    recordProvider(
      "onesignal",
      "notifications.create",
      {
        ok: false,
        durationMs: Date.now() - started,
        detail: err instanceof Error ? err.name : "network_error",
      },
      { attrs: { itemCount: ids.length } }
    );
    return false;
  }
}
