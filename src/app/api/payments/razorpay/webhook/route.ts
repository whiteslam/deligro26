import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import {
  isRazorpayWebhookConfigured,
  verifyWebhookSignature,
} from "@/lib/payments/razorpay";
import {
  settlePayment,
  PaymentsNotMigratedError,
} from "@/lib/data-access/payments";
import type { PaymentStatus } from "@/types";

/**
 * POST /api/payments/razorpay/webhook — Razorpay's own notification.
 *
 * The authority on whether an order is paid. The browser callback is a
 * convenience that can be closed, lost or lied about; this arrives from
 * Razorpay, is signed with a secret only the two of us hold, and is retried
 * until we acknowledge it.
 *
 * Consequences of that, all deliberate:
 *
 *   - There is no session here, so the signature IS the authentication. It is
 *     computed over the raw bytes: `request.text()` before any JSON parse,
 *     because re-serialising reorders keys and breaks the digest.
 *   - No secret configured means we cannot tell a real delivery from a forged
 *     one, so the endpoint 503s rather than trusting the body.
 *   - It does NOT check whether online payment is currently switched on. A
 *     payment already in flight when an admin flips the toggle off is still
 *     real money, and refusing to record it would leave a paid order unpaid.
 *   - Anything understood and applied — including a duplicate — answers 2xx, so
 *     Razorpay stops retrying. Only a genuine failure to record gets a 5xx.
 */

/** Razorpay event → the state we store. Unlisted events are acknowledged, not applied. */
const EVENT_STATUS: Record<string, PaymentStatus> = {
  "payment.captured": "paid",
  "payment.authorized": "authorized",
  "payment.failed": "failed",
  "refund.processed": "refunded",
  "refund.created": "refunded",
};

interface RazorpayWebhookBody {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        method?: string;
        error_code?: string | null;
        error_description?: string | null;
      };
    };
    refund?: {
      entity?: { id?: string; payment_id?: string };
    };
  };
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }
  if (!isRazorpayWebhookConfigured) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  // No user to key on, so the source address it is. Generous enough for
  // Razorpay's retry storms, tight enough that the HMAC isn't a free CPU sink.
  const limit = await rateLimit(`pay-webhook:${clientIp(request)}`, 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    // 400, not 401: there is no credential to re-present. Nothing is recorded —
    // an unsigned body is not evidence that anything happened.
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let body: RazorpayWebhookBody;
  try {
    body = JSON.parse(raw) as RazorpayWebhookBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const event = body.event ?? "";
  const status = EVENT_STATUS[event];
  const entity = body.payload?.payment?.entity;
  const providerOrderId = entity?.order_id;

  // Signed, but not something this app acts on (subscription events, disputes,
  // a refund shape with no payment attached). Acknowledged so it stops retrying.
  if (!status || !providerOrderId) {
    return NextResponse.json({ ok: true, ignored: event || "unknown" });
  }

  try {
    const orderId = await settlePayment({
      providerOrderId,
      providerPaymentId: entity?.id ?? null,
      status,
      method: entity?.method ?? null,
      // The delivery itself was signature-checked above.
      signatureVerified: true,
      errorCode: entity?.error_code ?? null,
      errorDescription: entity?.error_description ?? null,
    });

    // A signed event for a Razorpay order we never created. Not an error on
    // Razorpay's side to retry — most likely a second environment pointed at
    // the same webhook — so acknowledge and move on.
    if (!orderId) {
      return NextResponse.json({ ok: true, ignored: "unknown_order" });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PaymentsNotMigratedError) {
      // 503 so Razorpay retries once the migration is applied.
      return NextResponse.json({ error: "payments_unavailable" }, { status: 503 });
    }
    // 5xx on purpose: we could not record real money. Let it be redelivered.
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
