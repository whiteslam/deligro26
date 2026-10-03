/**
 * The ring protocol: how the server tells a Vendor or Rider phone to start
 * ringing for an order, and to stop.
 *
 * A normal push sounds once. A kitchen with its phone in an apron pocket, or a
 * rider with theirs in a jacket, misses one sound; they do not miss a phone
 * that keeps ringing until somebody deals with the order. The payloads below
 * ride on OneSignal's `data` field and are read on Android by
 * mobile/native/DeligroNotificationExtension.java — scripts/qa/ring-protocol.ts
 * checks the key names still match.
 *
 * Pure: imported by server code and by the board components.
 */

export type RingRole = "vendor" | "rider";

/**
 * The longest a ring lasts with nobody answering. Vendor: 5 min — ops are
 * already alerted at 3 (KITCHEN_SLOW_MIN in lib/dispatch/sweep.ts) and a
 * closed kitchen must not ring all night. Rider: the exclusive offer window
 * (EXCLUSIVE_OFFER_MS in lib/dispatch/rider-dispatch.ts, pinned equal by the
 * QA script); after it the order is in the open pool and ringing one rider
 * means nothing.
 */
export const RING_TIMEOUT_SEC: Record<RingRole, number> = { vendor: 300, rider: 180 };

export const RING_KEYS = { action: "ring", id: "ringId", timeout: "timeoutSec" } as const;

export interface RingStart {
  ring: "start";
  ringId: string;
  timeoutSec: number;
}
export interface RingStop {
  ring: "stop";
  ringId: string;
}

export function ringId(role: RingRole, orderId: string): string {
  return `${role}:${orderId}`;
}

export function ringStartData(role: RingRole, orderId: string, timeoutSec?: number): RingStart {
  const t = Math.round(timeoutSec ?? RING_TIMEOUT_SEC[role]);
  return { ring: "start", ringId: ringId(role, orderId), timeoutSec: Math.min(600, Math.max(1, t)) };
}

export function ringStopData(role: RingRole, orderId: string): RingStop {
  return { ring: "stop", ringId: ringId(role, orderId) };
}
