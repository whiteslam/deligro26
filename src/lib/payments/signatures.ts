import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay signature verification — pure functions over an explicit secret.
 *
 * Split out of `razorpay.ts` deliberately. That module binds the environment's
 * secrets and carries `server-only`; this one holds the arithmetic and takes
 * the secret as an argument, so the security-critical part can be exercised
 * directly by `npm run test:payments` without Next's bundler in the loop. The
 * thing standing between a claimed payment and a paid order should be the
 * tested code, not a slightly different copy of it.
 *
 * No `server-only` marker here, and none needed: every function requires a
 * secret to do anything, and `node:crypto` does not resolve in a browser bundle
 * regardless.
 */

/** Constant-time compare of two hex digests of possibly differing length. */
function hexEquals(a: string, b: string): boolean {
  if (!a || !b) return false;

  let left: Buffer;
  let right: Buffer;
  try {
    left = Buffer.from(a, "hex");
    right = Buffer.from(b, "hex");
  } catch {
    return false;
  }

  // Buffer.from ignores trailing garbage rather than throwing, so a non-hex
  // input arrives here as a short buffer. The length check below rejects it.
  //
  // timingSafeEqual throws on a length mismatch, so lengths must be compared
  // first. That leaks only the digest length, which is a constant.
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Verify the signature the browser checkout hands back on success.
 *
 * Razorpay signs `${razorpay_order_id}|${razorpay_payment_id}` with the key
 * secret. This is the only thing separating a real payment from a client
 * POSTing whatever ids it likes — the callback arrives over the customer's own
 * session, so it is attacker-controlled input until this returns true.
 *
 * Note what it does NOT prove: which of *our* orders was paid. The signature
 * covers Razorpay's ids only, so the caller must still check that the provider
 * order belongs to the Deligro order being settled.
 */
export function verifyCheckoutSignature(
  keySecret: string,
  input: {
    providerOrderId: string;
    providerPaymentId: string;
    signature: string;
  }
): boolean {
  if (!keySecret) return false;
  if (!input.providerOrderId || !input.providerPaymentId || !input.signature) {
    return false;
  }

  const expected = createHmac("sha256", keySecret)
    .update(`${input.providerOrderId}|${input.providerPaymentId}`)
    .digest("hex");

  return hexEquals(expected, input.signature);
}

/**
 * Verify a webhook delivery. Signed over the EXACT bytes Razorpay sent, so the
 * caller must pass the raw body — a JSON round-trip reorders keys and changes
 * whitespace, and the digest stops matching.
 */
export function verifyWebhookSignature(
  webhookSecret: string,
  rawBody: string,
  signature: string | null
): boolean {
  if (!webhookSecret || !signature) return false;

  const expected = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return hexEquals(expected, signature);
}

/** Rupees (how the app stores money) → paise (how Razorpay bills it). */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
