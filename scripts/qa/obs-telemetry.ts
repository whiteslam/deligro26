/**
 * QA — telemetry redaction, grouping and severity.
 *
 * The observability tables hold whatever the app decides to put in them, and an
 * operator browses those tables. So the three rules that decide what goes in
 * are tested rather than trusted:
 *
 *   1. **Redaction** — a secret that reaches `obs_events` is in the database,
 *      its indexes and every backup, and no amount of masking at render time
 *      takes it back out. This is the security half of the feature and the only
 *      part of it that can fail silently and badly.
 *   2. **Grouping** — a fingerprint that varies per occurrence turns one bug
 *      into a thousand issues, which is the exact failure the issue list exists
 *      to prevent. A fingerprint that varies between the Node and Edge runtimes
 *      splits one issue in two.
 *   3. **Severity** — decides what shows up red, which decides what gets looked
 *      at first during an incident.
 *
 * Runs offline: no Supabase, no network, no server. Everything under test is a
 * pure function, for exactly this reason.
 *
 * Usage:
 *   npm run test:obs
 */
import {
  isDeniedKey,
  redactAttrs,
  redactHeaders,
  redactText,
  redactUrl,
} from "../../src/lib/obs/redact";
import {
  culpritFrame,
  fingerprint,
  issueTitle,
  normaliseMessage,
} from "../../src/lib/obs/fingerprint";
import { classifySeverity } from "../../src/lib/obs/severity";
import { diagnose } from "../../src/lib/obs/diagnose";
import { parseCorrelationId, templateRoute } from "../../src/lib/obs/ids";
import type { ObsEvent } from "../../src/lib/obs/types";

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  if (Object.is(actual, expected)) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(
      `  ✗ ${name}\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(actual)}`
    );
  }
}

/** The assertion that matters most: the secret is not in the output, anywhere. */
function absent(name: string, haystack: string, needle: string): void {
  if (!haystack.includes(needle)) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} — LEAKED "${needle}" in: ${haystack}`);
  }
}

function present(name: string, haystack: string, needle: string): void {
  if (haystack.includes(needle)) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} — expected "${needle}" in: ${haystack}`);
  }
}

/* ============================================================
   1. Redaction — free text
   ============================================================ */
console.log("\n═══ Redaction: secrets in free text ═══");

{
  // A real-shaped Visa test number. Luhn-valid, so it must be masked.
  const card = "4111111111111111";
  const out = redactText(`Payment declined for card ${card} at gateway`);
  absent("Luhn-valid card number is masked", out, card);
  present("…and reads as redacted", out, "[CARD]");
}

{
  // 16 digits that are NOT Luhn-valid: an order reference, a timestamp, an
  // internal id. Masking these would gut every payment message for nothing.
  const notACard = "4111111111111112";
  const out = redactText(`Razorpay order ref ${notACard}`);
  present("non-Luhn digit run is kept", out, notACard);
}

{
  const jwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const out = redactText(`auth failed with ${jwt}`);
  absent("JWT is masked", out, jwt);
  present("…and reads as a JWT", out, "[JWT]");
}

{
  const key = "rzp_live_A1b2C3d4E5f6G7";
  const out = redactText(`Razorpay init with key ${key}`);
  absent("Razorpay key is masked", out, key);
}

{
  const out = redactText("Authorization: Bearer sk_live_abcdef1234567890");
  absent("bearer credential is masked", out, "sk_live_abcdef1234567890");
}

{
  const out = redactText("OTP send failed for +919876543210");
  absent("Indian mobile in E.164 is masked", out, "9876543210");
  present("…and reads as a phone", out, "[PHONE]");
}

{
  const out = redactText("no profile for gaurav@example.com");
  absent("email is masked", out, "gaurav@example.com");
}

{
  // The whole point of the placeholders: the sentence still reads.
  const out = redactText("Could not charge card 4111111111111111 for order 42");
  present("redacted message stays readable", out, "for order 42");
}

/* ============================================================
   2. Redaction — attribute bags
   ============================================================ */
console.log("\n═══ Redaction: attribute allowlist ═══");

check("denied key: password", isDeniedKey("password"), true);
check("denied key: nested casing (razorpayKeySecret)", isDeniedKey("razorpayKeySecret"), true);
check("denied key: x-api-key", isDeniedKey("x-api-key"), true);
check("denied key: otp", isDeniedKey("otp"), true);
check("denied key: cardNumber", isDeniedKey("cardNumber"), true);
check("allowed key is not denied", isDeniedKey("status"), false);

{
  const out = redactAttrs({
    status: 500,
    reason: "payment_timeout",
    password: "hunter2",
    apiKey: "rzp_live_secret",
    // Not denied, but not on the allowlist either. The allowlist is the
    // guarantee: a field nobody thought about is invisible by default.
    customerName: "Asha",
    onesignalPlayerId: "b2f1…",
  });
  check("allowlisted key survives", out.status, 500);
  check("allowlisted string survives", out.reason, "payment_timeout");
  check("denied key is dropped", "password" in out, false);
  check("denied key (apiKey) is dropped", "apiKey" in out, false);
  check("unlisted key is dropped (allowlist, not deny-list)", "customerName" in out, false);
  check("unlisted id is dropped", "onesignalPlayerId" in out, false);
}

{
  // A value that is fine by key but carries a secret in its text.
  const out = redactAttrs({ reason: "declined for card 4111111111111111" });
  absent("value-shape scrub applies inside an allowed key", String(out.reason), "4111111111111111");
}

{
  const out = redactHeaders({
    "user-agent": "Mozilla/5.0",
    authorization: "Bearer abc123",
    cookie: "sb-access-token=xyz",
    "x-razorpay-signature": "9f8e7d…",
    "x-request-id": "req_ABC123DEF456GHJ7",
  });
  check("user-agent kept", out["user-agent"], "Mozilla/5.0");
  check("request id kept", out["x-request-id"], "req_ABC123DEF456GHJ7");
  check("authorization dropped", "authorization" in out, false);
  check("cookie dropped", "cookie" in out, false);
  // The webhook route's own comment: "the signature IS the authentication".
  // Logging it would put a replayable credential in a browsable table.
  check("razorpay signature dropped", "x-razorpay-signature" in out, false);
}

{
  const out = redactUrl("/login?next=/checkout&phone=%2B919876543210");
  absent("query VALUES never survive a URL", out, "919876543210");
  present("query KEYS do, so the shape is still legible", out, "next,phone");
  present("path survives", out, "/login");
}

/* ============================================================
   3. Grouping
   ============================================================ */
console.log("\n═══ Grouping: one bug is one issue ═══");

{
  const a = fingerprint({
    env: "production",
    kind: "error",
    errorType: "PaymentServiceTimeout",
    message: "Order 9f3c1e2a-4b5d-6c7e-8f90-a1b2c3d4e5f6 could not be settled",
    culprit: "lib/data-access/payments.ts:88",
  });
  const b = fingerprint({
    env: "production",
    kind: "error",
    errorType: "PaymentServiceTimeout",
    message: "Order 71ab99cc-0000-1111-2222-333344445555 could not be settled",
    culprit: "lib/data-access/payments.ts:88",
  });
  check("same bug, different order id → one fingerprint", a, b);
}

{
  const prod = fingerprint({
    env: "production",
    kind: "error",
    errorType: "E",
    message: "boom",
    culprit: "x.ts:1",
  });
  const dev = fingerprint({
    env: "development",
    kind: "error",
    errorType: "E",
    message: "boom",
    culprit: "x.ts:1",
  });
  // Otherwise a developer's deliberate test failures inflate a production
  // issue's count — the "no fake data" line, enforced in the grouping key.
  check("production and development never merge", prod === dev, false);
}

{
  const a = fingerprint({
    env: "production",
    kind: "error",
    errorType: "E",
    message: "fail",
    culprit: "lib/a.ts:10",
  });
  const b = fingerprint({
    env: "production",
    kind: "error",
    errorType: "E",
    message: "fail",
    culprit: "lib/b.ts:20",
  });
  check("same message, different culprit → different issues", a === b, false);
}

{
  // A 500 with no exception: "Internal Server Error" is identical across every
  // unrelated failure in the app, so grouping on text would merge all of them.
  const orders = fingerprint({
    env: "production",
    kind: "http",
    message: "Internal Server Error",
    httpMethod: "POST",
    httpRoute: "/api/orders",
    httpStatus: 500,
  });
  const payments = fingerprint({
    env: "production",
    kind: "http",
    message: "Internal Server Error",
    httpMethod: "POST",
    httpRoute: "/api/payments/razorpay/verify",
    httpStatus: 500,
  });
  check("bare 500s group by endpoint, not by message", orders === payments, false);
}

check("fingerprint is 16 hex chars",
  /^[0-9a-f]{16}$/.test(
    fingerprint({ env: "production", kind: "error", message: "x" })
  ),
  true
);

check(
  "normalise collapses ids and numbers",
  normaliseMessage("Rider 42 rejected order 9f3c1e2a-4b5d-6c7e-8f90-a1b2c3d4e5f6"),
  "rider <n> rejected order <uuid>"
);

{
  const stack = [
    "Error: nope",
    "    at handler (/var/task/node_modules/@supabase/postgrest-js/dist/index.js:120:9)",
    "    at settlePayment (/var/task/src/lib/data-access/payments.ts:88:11)",
    "    at POST (/var/task/src/app/api/payments/razorpay/webhook/route.ts:120:5)",
  ].join("\n");
  check(
    "culprit skips node_modules for our first frame",
    culpritFrame(stack),
    "lib/data-access/payments.ts:88"
  );
}

check("culprit of no stack is null", culpritFrame(null), null);

check(
  "issue title keeps the readable message, not the normalised one",
  issueTitle("PaymentServiceTimeout", "Provider did not respond within 10s"),
  "PaymentServiceTimeout: Provider did not respond within 10s"
);

/* ============================================================
   4. Severity
   ============================================================ */
console.log("\n═══ Severity ═══");

function ev(over: Partial<ObsEvent>): ObsEvent {
  return {
    env: "production",
    kind: "error",
    level: "error",
    source: "test",
    message: "m",
    ...over,
  };
}

check(
  "settlement failure is critical (money taken, order unpaid)",
  classifySeverity(ev({ kind: "domain", source: "payment.settle" })),
  "critical"
);
check(
  "OTP failure is critical (nobody can sign in)",
  classifySeverity(ev({ kind: "domain", source: "auth.otp" })),
  "critical"
);
check(
  "order creation failure is high",
  classifySeverity(ev({ kind: "domain", source: "order.created" })),
  "high"
);
check(
  "rate limiter degrading is high, not a footnote",
  classifySeverity(ev({ kind: "domain", source: "ratelimit.degraded" })),
  "high"
);
check(
  "Razorpay failure outranks a push failure",
  classifySeverity(ev({ kind: "provider", provider: "razorpay" })),
  "high"
);
check(
  "push failure is medium",
  classifySeverity(ev({ kind: "provider", provider: "onesignal" })),
  "medium"
);
check(
  "a 4xx is the caller's problem, not an issue",
  classifySeverity(ev({ kind: "http", level: "info", httpStatus: 429 })),
  "low"
);
check(
  "a 5xx is ours",
  classifySeverity(ev({ kind: "http", httpStatus: 500 })),
  "high"
);
check(
  "fatal always wins",
  classifySeverity(ev({ kind: "client", level: "fatal" })),
  "critical"
);
check(
  "schema degradation is visible but not urgent",
  classifySeverity(ev({ kind: "domain", level: "warn", source: "schema.degraded" })),
  "low"
);

/* ============================================================
   5. Diagnosis — the rules, and the refusal to invent
   ============================================================ */
console.log("\n═══ Diagnosis ═══");

function dx(over: Partial<Parameters<typeof diagnose>[0]> = {}) {
  return diagnose({
    kind: "error",
    source: "test",
    errorType: null,
    message: "something",
    provider: null,
    httpRoute: null,
    httpStatus: null,
    severity: "medium",
    deployMinutesBefore: null,
    providerErrorRate: null,
    ...over,
  });
}

check(
  "a missing table is confirmed, not guessed",
  dx({ errorType: "pg_42P01" }).confidence,
  "confirmed"
);
check(
  "…and attributed to configuration, not to our code",
  dx({ errorType: "pg_42P01" }).attribution,
  "configuration"
);
check(
  "an RLS refusal is confirmed",
  dx({ errorType: "pg_42501" }).confidence,
  "confirmed"
);
check(
  "settlement failure is attributed to us",
  dx({ source: "payment.settle", message: "could not record" }).attribution,
  "deligro"
);
check(
  "a webhook signature failure is a configuration lead, not an accusation",
  dx({ source: "payment.webhook", message: "signature did not verify" }).attribution,
  "configuration"
);
check(
  "a high provider failure rate is attributed to the provider",
  dx({ kind: "provider", provider: "razorpay", providerErrorRate: 45 }).attribution,
  "provider"
);
check(
  "a LOW provider failure rate is not blamed on them",
  dx({ kind: "provider", provider: "razorpay", providerErrorRate: 3 }).attribution,
  "unknown"
);
check(
  "nothing recognised reports Unknown rather than a guess",
  dx({ message: "an entirely novel failure" }).confidence,
  "unknown"
);
check(
  "…and Unknown still gives the operator somewhere to start",
  dx({ message: "an entirely novel failure" }).nextSteps.length > 0,
  true
);

{
  // The rule the whole module exists for: a deploy nearby is EVIDENCE, and it
  // must never be promoted into the statement as a cause.
  const withDeploy = dx({ errorType: "pg_42P01", deployMinutesBefore: 7 });
  const without = dx({ errorType: "pg_42P01" });
  check(
    "a nearby deploy adds evidence",
    withDeploy.evidence.length,
    without.evidence.length + 1
  );
  check(
    "…but never changes the statement",
    withDeploy.statement,
    without.statement
  );
  absent(
    "…and never claims the deploy caused it",
    withDeploy.evidence.join(" ").toLowerCase(),
    "caused by"
  );
}

/* ============================================================
   6. Correlation ids and route templating
   ============================================================ */
console.log("\n═══ Correlation ids ═══");

check(
  "well-formed trace id is accepted",
  parseCorrelationId("trace_ABCDEFGH12345678JKMN", "trace"),
  "trace_ABCDEFGH12345678JKMN"
);
check(
  "wrong prefix is refused",
  parseCorrelationId("req_ABCDEFGH12345678JKMN", "trace"),
  null
);
check(
  "lowercase / out-of-alphabet is refused",
  parseCorrelationId("trace_abcdefgh12345678jkmn", "trace"),
  null
);
check("empty is refused", parseCorrelationId("", "trace"), null);

check(
  "concrete order path collapses to a template",
  templateRoute("/api/orders/9f3c1e2a-4b5d-6c7e-8f90-a1b2c3d4e5f6/status"),
  "/api/orders/[id]/status"
);
check(
  "a slug is not an id",
  templateRoute("/api/restaurants/spice-garden/serviceability"),
  "/api/restaurants/spice-garden/serviceability"
);

/* ============================================================ */
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
