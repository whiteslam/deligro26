/**
 * QA — the web app detects the Android shell and reaches its push plugin,
 * and behaves exactly as before in a normal browser.
 * Usage: npx tsx scripts/qa/native-bridge.ts
 */
import { isNativeApp, nativePush, nativeSessionSync, pushSupport } from "../../src/lib/native/bridge";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean) {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const plugin = { login: async () => {}, logout: async () => {}, requestPermission: async () => {} };
const shell = { Capacitor: { isNativePlatform: () => true, Plugins: { DeligroPush: plugin } } };
const browser = {};
const webCapacitor = { Capacitor: { isNativePlatform: () => false, Plugins: {} } };
const shellWithoutPlugin = { Capacitor: { isNativePlatform: () => true, Plugins: {} } };

check("shell is native", isNativeApp(shell as never));
check("plain browser is not native", !isNativeApp(browser as never));
check("Capacitor web build is not native", !isNativeApp(webCapacitor as never));
check("undefined window (server render) is not native", !isNativeApp(undefined));
check("shell exposes the push plugin", nativePush(shell as never) === plugin);
check("browser has no push plugin", nativePush(browser as never) === null);
check("an old shell without the plugin returns null, not a crash", nativePush(shellWithoutPlugin as never) === null);

// Signing in on a phone: ties the device to the user AND asks Android 13+
// for notification permission once (no settings nag).
const calls: string[] = [];
const recorder = {
  login: async (o: { userId: string }) => { calls.push(`login:${o.userId}`); },
  logout: async () => { calls.push("logout"); },
  requestPermission: async (o?: { fallbackToSettings?: boolean }) => { calls.push(`perm:${o?.fallbackToSettings}`); },
};

async function main() {
  await nativeSessionSync(recorder, "u1");
  check("signed in: login then a quiet permission request", calls.join(",") === "login:u1,perm:false");
  calls.length = 0;
  await nativeSessionSync(recorder, null);
  check("signed out: logout only (shared phone stops getting pushes)", calls.join(",") === "logout");

  check("push support in the Android shell is native", pushSupport(shell as never) === "native");
  check("push support in a browser with Notification is web", pushSupport({ Notification: function () {} } as never) === "web");
  check("push support with neither is unsupported", pushSupport({} as never) === "unsupported");

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}
void main();
