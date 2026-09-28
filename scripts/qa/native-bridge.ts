/**
 * QA — the web app detects the Android shell and reaches its push plugin,
 * and behaves exactly as before in a normal browser.
 * Usage: npx tsx scripts/qa/native-bridge.ts
 */
import { isNativeApp, nativePush } from "../../src/lib/native/bridge";

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

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
