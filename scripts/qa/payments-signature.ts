/**
 * QA — Razorpay signature verification.
 *
 * The only thing standing between "a request claims a payment happened" and
 * "an order is marked paid" is an HMAC. Both callers are attacker-reachable:
 * the checkout callback runs on the customer's own session, and the webhook has
 * no session at all. So the verifier is tested rather than trusted.
 *
 * Runs offline — no Supabase, no network, no Razorpay account, no secrets from
 * the environment. Tests `lib/payments/signatures.ts`, which is the code the
 * routes actually run; `razorpay.ts` only binds this environment's secrets to it.
 *
 * Usage:
 *   npm run test:payments
 */
import { createHmac } from "node:crypto";
import {
  toPaise,
  verifyCheckoutSignature as verifyCheckout,
  verifyWebhookSignature as verifyWebhook,
} from "../../src/lib/payments/signatures";

const KEY_SECRET = "qa_key_secret_do_not_use_in_production";
const WEBHOOK_SECRET = "qa_webhook_secret_do_not_use_in_production";

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} — expected ${expected}, got ${actual}`);
  }
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

const ORDER = "order_QaTestOrder001";
const PAYMENT = "pay_QaTestPayment001";

console.log("\n═══ Checkout callback signature ═══");

const goodCheckout = sign(KEY_SECRET, `${ORDER}|${PAYMENT}`);

check(
  "a correctly signed callback verifies",
  verifyCheckout(KEY_SECRET, {
    providerOrderId: ORDER,
    providerPaymentId: PAYMENT,
    signature: goodCheckout,
  }),
  true
);

check(
  "a signature from a different key secret is refused",
  verifyCheckout(KEY_SECRET, {
    providerOrderId: ORDER,
    providerPaymentId: PAYMENT,
    signature: sign("someone_elses_secret", `${ORDER}|${PAYMENT}`),
  }),
  false
);

check(
  "a signature is bound to its order id (replay onto another order fails)",
  verifyCheckout(KEY_SECRET, {
    providerOrderId: "order_SomeOtherOrder",
    providerPaymentId: PAYMENT,
    signature: goodCheckout,
  }),
  false
);

check(
  "a signature is bound to its payment id",
  verifyCheckout(KEY_SECRET, {
    providerOrderId: ORDER,
    providerPaymentId: "pay_SomeOtherPayment",
    signature: goodCheckout,
  }),
  false
);

check(
  "an empty signature is refused",
  verifyCheckout(KEY_SECRET, {
    providerOrderId: ORDER,
    providerPaymentId: PAYMENT,
    signature: "",
  }),
  false
);

check(
  "a non-hex signature is refused rather than throwing",
  verifyCheckout(KEY_SECRET, {
    providerOrderId: ORDER,
    providerPaymentId: PAYMENT,
    signature: "not-a-hex-digest-at-all",
  }),
  false
);

check(
  "a truncated but matching-prefix signature is refused",
  verifyCheckout(KEY_SECRET, {
    providerOrderId: ORDER,
    providerPaymentId: PAYMENT,
    signature: goodCheckout.slice(0, 32),
  }),
  false
);

console.log("\n═══ Webhook signature ═══");

// Deliberately awkward: key order and spacing must survive verbatim, which is
// exactly why the route signs the raw body instead of a re-serialised object.
const rawBody = JSON.stringify({
  event: "payment.captured",
  payload: { payment: { entity: { id: PAYMENT, order_id: ORDER } } },
});

check(
  "a correctly signed webhook verifies",
  verifyWebhook(WEBHOOK_SECRET, rawBody, sign(WEBHOOK_SECRET, rawBody)),
  true
);

check(
  "the webhook secret is not the key secret",
  verifyWebhook(WEBHOOK_SECRET, rawBody, sign(KEY_SECRET, rawBody)),
  false
);

check(
  "a tampered body invalidates the signature",
  verifyWebhook(
    WEBHOOK_SECRET,
    rawBody.replace(PAYMENT, "pay_Injected"),
    sign(WEBHOOK_SECRET, rawBody)
  ),
  false
);

check(
  "a re-serialised body does NOT verify (raw bytes matter)",
  verifyWebhook(
    WEBHOOK_SECRET,
    JSON.stringify(JSON.parse(rawBody), null, 2),
    sign(WEBHOOK_SECRET, rawBody)
  ),
  false
);

check(
  "a missing signature header is refused",
  verifyWebhook(WEBHOOK_SECRET, rawBody, null),
  false
);

console.log("\n═══ Amount conversion ═══");
check("₹1 is 100 paise", toPaise(1), 100);
check("₹249 is 24900 paise", toPaise(249), 24900);
check("a fractional rupee rounds to whole paise", toPaise(10.005), 1001);

console.log(
  `\n${failed === 0 ? "PASS" : "FAIL"} — ${passed} passed, ${failed} failed\n`
);
process.exit(failed === 0 ? 0 : 1);
