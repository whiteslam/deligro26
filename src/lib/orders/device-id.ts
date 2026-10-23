/**
 * The install id behind coupon-sharing detection (section 17.6), and the hash
 * that is all the server ever keeps of it.
 *
 * The customer app sends a random id, made once per install, in `x-device-id`;
 * the website carries one in a first-party `dlg_did` cookie. The order route
 * stores sha256(id + a server secret) with the order. The id itself is never
 * stored, the hash cannot be turned back into it, and without the secret
 * (`DEVICE_HASH_PEPPER`) nothing is stored at all: coupon-sharing detection
 * then relies on the drop point alone.
 *
 * Pure: no I/O, so the rules are tested offline.
 */
import { createHash, randomUUID } from "node:crypto";

export const DEVICE_HEADER = "x-device-id";
export const DEVICE_COOKIE = "dlg_did";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Shorter secrets are not secrets. */
const MIN_PEPPER = 16;

export function isDeviceId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * Which id this request carries.
 *   * A header (the app): used if it is a uuid; a header that is not one is
 *     ignored silently - no id, nothing recorded, no cookie.
 *   * No header, a valid cookie (the website): that id.
 *   * Neither: a fresh id, which the caller sets as the cookie.
 */
export function resolveDeviceId(
  header: string | null | undefined,
  cookie: string | null | undefined,
  make: () => string = randomUUID
): { id: string | null; fresh: boolean } {
  if (header !== null && header !== undefined && header !== "") {
    return isDeviceId(header) ? { id: header.toLowerCase(), fresh: false } : { id: null, fresh: false };
  }
  if (isDeviceId(cookie)) return { id: cookie.toLowerCase(), fresh: false };
  return { id: make(), fresh: true };
}

/** sha256(id + pepper) as 64 hex characters, or null when it must not be stored. */
export function computeDeviceHash(deviceId: string | null | undefined, pepper: string | null | undefined): string | null {
  if (!isDeviceId(deviceId)) return null;
  if (typeof pepper !== "string" || pepper.length < MIN_PEPPER) return null;
  return createHash("sha256").update(`${deviceId.toLowerCase()}${pepper}`).digest("hex");
}

/** One cookie out of a Cookie header. */
export function cookieValue(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim() || null;
  }
  return null;
}
