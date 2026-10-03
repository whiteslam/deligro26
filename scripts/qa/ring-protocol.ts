/**
 * QA — the ring protocol the server sends and the Android apps read.
 * The Java side cannot import TypeScript, so the last block checks the Java
 * sources still name the same keys.
 * Usage: npx tsx scripts/qa/ring-protocol.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ringId, ringStartData, ringStopData, RING_TIMEOUT_SEC, RING_KEYS } from "../../src/lib/alerts/ring";

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
