/**
 * QA — the ring protocol the server sends and the Android apps read.
 * The Java side cannot import TypeScript, so the last block checks the Java
 * sources still name the same keys.
 * Usage: npx tsx scripts/qa/ring-protocol.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ringId, ringStartData, ringStopData, RING_TIMEOUT_SEC, RING_KEYS } from "../../src/lib/alerts/ring";
import { pushBody } from "../../src/lib/notifications/push-body";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? " — " + detail : ""}`); }
}
const OID = "3f2a9c1e-0000-4000-8000-000000000001";
const ROOT = join(__dirname, "..", "..");

check("vendor ring id", ringId("vendor", OID) === `vendor:${OID}`);
check("rider ring id", ringId("rider", OID) === `rider:${OID}`);
check("vendor rings at most 5 min", RING_TIMEOUT_SEC.vendor === 300);
check("rider rings for the 3-min offer window", RING_TIMEOUT_SEC.rider === 180);
// order-events cannot import EXCLUSIVE_OFFER_MS (rider-dispatch imports
// order-events), so the rider timeout is pinned to it here instead.
const dispatch = readFileSync(join(ROOT, "src", "lib", "dispatch", "rider-dispatch.ts"), "utf8");
check(
  "rider timeout equals the exclusive offer window",
  dispatch.includes(`EXCLUSIVE_OFFER_MS = ${RING_TIMEOUT_SEC.rider}_000`),
  "change RING_TIMEOUT_SEC.rider with EXCLUSIVE_OFFER_MS"
);

const start = ringStartData("vendor", OID);
check("start payload", start.ring === "start" && start.ringId === `vendor:${OID}` && start.timeoutSec === 300);
check("start honours a timeout override", ringStartData("rider", OID, 90).timeoutSec === 90);
check("timeout override is clamped to 1..600", ringStartData("rider", OID, 0).timeoutSec === 1 && ringStartData("rider", OID, 9999).timeoutSec === 600);
const stop = ringStopData("rider", OID);
check("stop payload", stop.ring === "stop" && stop.ringId === `rider:${OID}` && !("timeoutSec" in stop));

// --- the OneSignal request body a ring rides on ---
const T = { include_aliases: { external_id: ["p1"] }, target_channel: "push" };
const H = { en: "New order 🔔", hi: "नया ऑर्डर 🔔" };
const M = { en: "Order #3F2A9C1E is waiting.", hi: "ऑर्डर #3F2A9C1E इंतज़ार कर रहा है।" };
const normal = pushBody("app", T, H, M, { url: "/vendor" }, "chan");
check("normal push keeps title, text, url and channel",
  normal.headings === H && normal.contents === M && normal.url === "/vendor" && normal.android_channel_id === "chan" && !("content_available" in normal));
const ringing = pushBody("app", T, H, M, { priority: 10, ttlSec: 300, data: { ...ringStartData("vendor", OID) } }, "");
check("ring start is high priority with a ttl and the ring data",
  ringing.priority === 10 && ringing.ttl === 300 && (ringing.data as { ring: string }).ring === "start" && ringing.headings === H);
const silent = pushBody("app", T, { en: "" }, { en: "" }, { silent: true, priority: 10, url: "/vendor", data: { ...ringStopData("vendor", OID) } }, "chan");
check("silent stop shows nothing: no title, text, url or channel",
  !("headings" in silent) && !("contents" in silent) && !("url" in silent) && !("android_channel_id" in silent));
check("silent stop is data-only and still carries the stop", silent.content_available === true && (silent.data as { ring: string }).ring === "stop" && silent.priority === 10);
check("no priority or ttl unless asked", !("priority" in normal) && !("ttl" in normal));

const NATIVE = join(ROOT, "mobile", "native");
const ext = join(NATIVE, "DeligroNotificationExtension.java");
const svc = join(NATIVE, "RingService.java");
if (existsSync(ext) && existsSync(svc)) {
  const javaExt = readFileSync(ext, "utf8");
  for (const k of Object.values(RING_KEYS)) {
    check(`extension reads "${k}"`, javaExt.includes(`"${k}"`));
  }
  check(`extension handles "start"`, javaExt.includes(`"start"`));
  check(`extension handles "stop"`, javaExt.includes(`"stop"`));
  const javaSvc = readFileSync(svc, "utf8");
  check("service plays on the alarm stream", javaSvc.includes("USAGE_ALARM"));
  check("service loops the sound", javaSvc.includes("setLooping(true)"));
} else {
  console.log("  skip Java contract (native files not created yet — Task 3)");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
