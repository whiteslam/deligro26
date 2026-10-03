# Continuous Order Ringing (Vendor + Rider) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a customer places an order, the restaurant's phone rings continuously, like an incoming call, until someone presses **Accept** or **Reject**. When a rider is offered or assigned a pickup, the rider's phone rings the same way until they accept it or the offer runs out. This works when the app is open, in the background, behind a locked screen, or closed.

**Architecture:** A new **ring protocol** (`src/lib/alerts/ring.ts`) defines a `ringId` per order and role, plus `start`/`stop` payloads. The server adds a `ring: "start"` payload to the existing high-priority OneSignal push for a new order or rider offer. It sends a silent `ring: "stop"` push when the order is accepted, rejected or cancelled, so every phone signed in to that account stops. In the Android Vendor and Rider apps, a OneSignal notification extension catches those payloads and drives a native **`RingService`**: a foreground service that loops an alarm-volume ring and vibration, shows a full-screen/heads-up notification, and stops on `stop` or after a timeout. While the board is open, the web page also starts and stops the native ring for the orders it can see, which covers a push that was lost. In a plain browser, it loops the existing web tone instead of beeping every 25 s.

**Tech Stack:** Next.js 16 (existing), OneSignal REST (existing `sendPush`), Capacitor Android shells (`mobile/`), OneSignal Android SDK 5 (`INotificationServiceExtension`), Android `Service` + `MediaPlayer` + `Vibrator`, `node:test` for `mobile/scripts`, `scripts/qa/*.ts` via `npx tsx`.

**Spec:** Owner request, 2026-10-03: *"when there is an order made by a customer, the restaurant's notification should continuously ring until the owner or any user clicks the button to accept or cancel; same for the rider when he receives one."* These were checked against the code on the same day:
- `src/components/vendor/kitchen-alert.tsx` and `src/components/driver/rider-alert.tsx` already repeat a tone, but only **every 25 s** (`RENOTIFY_MS`), only **while the board page is open and armed**, and only in the page.
- `src/lib/notifications/order-events.ts` `notifyVendorNewOrder` / `notifyDriverPickup*` send **one** normal push that sounds once.
- `mobile/native/DeligroPushPlugin.java` only logs in, logs out and asks for permission. There is no native ringing.
- Rider offers are exclusive for `EXCLUSIVE_OFFER_MS = 180_000` (`src/lib/dispatch/rider-dispatch.ts:67`). There is no rider decline action.
- Ops are alerted when a kitchen hasn't accepted within `KITCHEN_SLOW_MIN = 3` (`src/lib/dispatch/sweep.ts:48`).

**Relation to other plans:** This plan stands alone and does not need `2026-10-03-notification-engine.md`. If the engine plan lands first, move the `ring` fields in Task 2 into that plan's `RULES` table (add `ring?: RingRole`). The protocol in Task 1 doesn't change.

---

## Task 0 — Owner decisions (before any code)

| Decision | Default if owner has no preference |
|---|---|
| When to build | This changes the Vendor and Rider APKs. It is a new feature, but arguably part of making those apps usable for launch. **Owner decides** whether it goes in before or after handover. |
| How long the vendor phone rings | **Until Accept/Reject, at most 5 minutes**, then it stops (ops already get "Kitchen hasn't accepted" at 3 min). With no limit, a closed kitchen's phone would ring all night. |
| How long the rider phone rings | **Until Accept, at most 3 minutes**: the exclusive offer window. After that the order goes to the open pool and the ring has no purpose. A manual assignment by a manager rings until the rider opens the app. |
| Ring on silent mode? | **Yes.** The ring plays on the **alarm** volume, so a phone on silent still rings. Do Not Disturb is respected unless the user allows alarms (most phones do by default). |
| Ring sound | A generated two-tone alarm (Task 3). The owner may supply their own `.mp3` or `.wav` instead. |
| iPhone | **Not possible.** iOS doesn't let a home-screen web app ring continuously. iPhone vendors and riders get the open-board loop (Task 4) and one push sound when the app is closed. Tell the client this plainly. |
| Can staff mute it? | **No mute while an order is waiting.** The existing "Mute" button only switches off the web tone. The native ring stops only on Accept/Reject (rider: Accept), on cancel, or at the timeout. |

## Global Constraints

- **Ringing must never block or roll back an order transition.** Every ring start/stop push goes through `deferNotify()` and swallows its own errors, the same rule as `order-events.ts`.
- **One ring per order per role:** `ringId = "<role>:<orderId>"` with role `vendor` or `rider`. Starting a ring that's already ringing only resets its timeout. Stopping an unknown ring does nothing.
- **Stop is broadcast:** a stop push goes to *every* device signed in as that profile (OneSignal `external_id`), so accepting on the counter tablet silences the owner's phone too.
- **Stop pushes are silent:** `content_available: true`, no `headings` or `contents`. They must never show a visible notification on any device, including old APKs and web push.
- **Ring pushes are high priority:** OneSignal `priority: 10`. Android lets an app start a foreground service from a high-priority FCM message, and that is what the ring relies on.
- **Old APKs keep working:** an APK without the extension ignores `data.ring` and shows the normal push, as today.
- **Native files are shared:** `mobile/native/*.java` are copied into every role's shell, but the ring service, permissions and extension are **declared in the manifest only for roles with `"ring": true`** in `mobile/roles.json` (vendor, rider).
- **Hindi-first copy** on every new screen, with tap targets ≥ 44px.
- **Production is live:** any test that places a real order needs the owner's go-ahead (local env points at the live Supabase).

## Review Focus

1. **App swiped away or killed by the battery saver** (Xiaomi/Vivo/Oppo, which are common in Bemetara). The user expects it to still ring. FCM doesn't reach force-stopped apps on these phones unless battery optimisation and autostart are off. Pinned in Task 5 (setup card that detects and fixes this) and the Task 6 device matrix row "swiped away".
2. **Two phones on one vendor account.** The user expects Accept on one to silence the other within seconds. Pinned in Task 2 (`stopVendorRing` called on accept/reject) and the Task 6 matrix row "second device stops".
3. **Customer cancels while the kitchen phone is ringing.** The user expects the ring to stop at once. Pinned in Task 2: the stop is sent inside `notifyVendorOrderCancelled`, which both cancel routes already call.
4. **Two new orders arrive close together.** The user expects one continuous ring that stops only when **both** are handled. Pinned in Task 3: `RingService` keeps a set of active `ringId`s, plus a matrix row.
5. **Stop push shows up as an empty or odd notification on a web-push or old-APK device.** The user expects nothing visible. Pinned in Task 2 Step 5 (manual check on a browser subscriber and on the v1.0.0 APK).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/alerts/ring.ts` (create) | Pure protocol: `RingRole`, `ringId()`, `ringStartData()`, `ringStopData()`, timeouts |
| `scripts/qa/ring-protocol.ts` (create) | Tests the protocol and checks the Java files still match it |
| `src/lib/notifications/onesignal.ts` (modify) | `PushOptions.priority`, `ttlSec`, `silent` |
| `src/lib/notifications/order-events.ts` (modify) | Ring start on new order and rider offers, plus `stopVendorRing`, `stopRiderRing` |
| `src/lib/data-access/vendor-orders.ts` (modify, `announceKitchenTransition` ~L530) | Stop vendor ring on accept/reject |
| `src/app/driver/actions.ts` (modify, `acceptDeliveryAction`) | Stop rider ring on accept |
| `mobile/native/RingService.java` (create) | Foreground service: loop sound + vibration, notification, timeouts, active-ring set |
| `mobile/native/DeligroNotificationExtension.java` (create) | OneSignal extension: `data.ring` start/stop → `RingService` |
| `mobile/native/DeligroPushPlugin.java` (modify) | `startRing`, `stopRing`, `ringSetup`, `openRingSettings` |
| `mobile/scripts/lib.mjs` (modify) | `patchManifestRing()`, `ringWav()` |
| `mobile/scripts/build-apk.mjs` (modify) | Copy new Java + sound, patch manifest for ring roles |
| `mobile/scripts/lib.test.mjs` (modify) | Tests for the two new lib functions |
| `mobile/roles.json` (modify) | `"ring": true` for vendor and rider, version bump |
| `src/lib/native/bridge.ts` (modify) | `NativeRing` interface, `nativeRing()` |
| `scripts/qa/native-bridge.ts` (modify) | Tests for `nativeRing()` |
| `src/components/vendor/kitchen-alert.tsx`, `src/components/driver/rider-alert.tsx` (modify) | Continuous loop on web, native start/stop for visible orders |
| `src/components/notifications/ring-setup.tsx` (create) | "Make sure it rings" card: battery, full-screen and notification permissions |
| `src/components/vendor/vendor-orders-board.tsx` (~L925), `src/components/driver/driver-board.tsx` (~L592) (modify) | Mount `RingSetup` |

---

### Task 1: Ring protocol

**Files:**
- Create: `src/lib/alerts/ring.ts`
- Test: `scripts/qa/ring-protocol.ts`
- Modify: `package.json` (add `"test:ring": "npx tsx scripts/qa/ring-protocol.ts"`)

**Interfaces:**
- Produces: `type RingRole = "vendor" | "rider"`, `RING_TIMEOUT_SEC: Record<RingRole, number>`, `ringId(role, orderId): string`, `ringStartData(role, orderId, timeoutSec?): RingStart`, `ringStopData(role, orderId): RingStop`, `RING_KEYS` (the payload key names the Java side reads).

- [ ] **Step 1: Write the failing test**

`scripts/qa/ring-protocol.ts`:

```ts
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

check("vendor ring id", ringId("vendor", OID) === `vendor:${OID}`);
check("rider ring id", ringId("rider", OID) === `rider:${OID}`);
check("vendor rings at most 5 min", RING_TIMEOUT_SEC.vendor === 300);
check("rider rings for the 3-min offer window", RING_TIMEOUT_SEC.rider === 180);

const start = ringStartData("vendor", OID);
check("start payload", start.ring === "start" && start.ringId === `vendor:${OID}` && start.timeoutSec === 300);
check("start honours a timeout override", ringStartData("rider", OID, 90).timeoutSec === 90);
check("timeout override is clamped to 1..600", ringStartData("rider", OID, 0).timeoutSec === 1 && ringStartData("rider", OID, 9999).timeoutSec === 600);
const stop = ringStopData("rider", OID);
check("stop payload", stop.ring === "stop" && stop.ringId === `rider:${OID}` && !("timeoutSec" in stop));

const NATIVE = join(__dirname, "..", "..", "mobile", "native");
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
```

- [ ] **Step 2: Run it and check that it fails**

Run: `npx tsx scripts/qa/ring-protocol.ts`
Expected: FAIL with `Cannot find module '../../src/lib/alerts/ring'`.

- [ ] **Step 3: Write `ring.ts`**

```ts
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
 * (EXCLUSIVE_OFFER_MS in lib/dispatch/rider-dispatch.ts); after it the order
 * is in the open pool and ringing one rider means nothing.
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
```

- [ ] **Step 4: Run it and check that it passes**

Run: `npx tsx scripts/qa/ring-protocol.ts`
Expected: all `ok`, plus one `skip Java contract` line, then `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/alerts/ring.ts scripts/qa/ring-protocol.ts package.json
git commit -m "feat(ring): ring protocol shared by server and apps"
```

---

### Task 2: Server sends ring start and stop

**Files:**
- Modify: `src/lib/notifications/onesignal.ts` (`PushOptions` ~L26, body build ~L82–90)
- Modify: `src/lib/notifications/order-events.ts`
- Modify: `src/lib/data-access/vendor-orders.ts` (`announceKitchenTransition`, ~L530)
- Modify: `src/app/driver/actions.ts` (`acceptDeliveryAction`, ~L30)

**Interfaces:**
- Consumes: `ringStartData`, `ringStopData` (Task 1); `EXCLUSIVE_OFFER_MS` from `@/lib/dispatch/rider-dispatch`.
- Produces: `PushOptions { url?; data?; priority?: number; ttlSec?: number; silent?: boolean }`, `stopVendorRing(orderId): Promise<void>`, `stopRiderRing(driverId, orderId): Promise<void>`.

- [ ] **Step 1: Extend `PushOptions` and the request body**

In `onesignal.ts`:

```ts
export interface PushOptions {
  /** Deep-link opened when the notification is tapped (e.g. /orders/<id>). */
  url?: string;
  /** Arbitrary payload delivered with the push. */
  data?: Record<string, unknown>;
  /**
   * OneSignal priority; 10 = FCM high priority. Required for a ring: Android
   * only lets an app start its ringing service from a high-priority message.
   */
  priority?: number;
  /** Seconds OneSignal keeps trying a phone that is offline. */
  ttlSec?: number;
  /**
   * Data-only push: no title, no text, nothing shown on any device. Used for
   * "stop ringing", which must stay invisible on web push and on old APKs.
   */
  silent?: boolean;
}
```

Where the body is built (currently `headings: heading, contents: message` and then `if (CHANNEL_ID)`), change it to:

```ts
  const body: Record<string, unknown> = { app_id: APP_ID, ...targeting };
  if (opts.silent) {
    body.content_available = true;
  } else {
    body.headings = heading;
    body.contents = message;
    if (CHANNEL_ID) body.android_channel_id = CHANNEL_ID;
  }
  if (opts.url && !opts.silent) body.url = opts.url;
  if (opts.data) body.data = opts.data;
  if (opts.priority) body.priority = opts.priority;
  if (opts.ttlSec) body.ttl = opts.ttlSec;
```

Read the function's full signature first (it receives `opts` from `sendPush`). Keep the variable names it uses.

- [ ] **Step 2: Pass push options through the private helpers in `order-events.ts`**

Add an optional last parameter `opts: PushOptions = {}` to `pushToUser`, `notifyVendor` and `notifyDriver`, and merge it into the `sendPush` call: `{ url, ...opts }`. Import `type PushOptions` from `./onesignal`, and import from `@/lib/alerts/ring` and `@/lib/dispatch/rider-dispatch`:

```ts
import { ringStartData, ringStopData } from "@/lib/alerts/ring";
import { EXCLUSIVE_OFFER_MS } from "@/lib/dispatch/rider-dispatch";
```

`rider-dispatch.ts` already imports from `order-events.ts`. If importing `EXCLUSIVE_OFFER_MS` back creates a circular-import problem at build time, move the constant into `src/lib/alerts/ring.ts` as `RIDER_OFFER_MS = 180_000`, have `rider-dispatch.ts` re-export it as `EXCLUSIVE_OFFER_MS`, and use it here.

- [ ] **Step 3: Ring on new order and rider offers, stop on the way out**

```ts
const RING = { priority: 10 } as const;

export function notifyVendorNewOrder(orderId: string, itemCount?: number): Promise<void> {
  // ...existing id / itemsEn / itemsHi lines unchanged...
  return notifyVendor(
    orderId,
    { en: "New order 🔔", hi: "नया ऑर्डर 🔔" },
    {
      en: `Order #${id}${itemsEn} is waiting for you to accept.`,
      hi: `ऑर्डर #${id}${itemsHi} आपके स्वीकार करने का इंतज़ार कर रहा है।`,
    },
    { ...RING, ttlSec: 300, data: { ...ringStartData("vendor", orderId) } }
  );
}

/**
 * Every phone signed in to the restaurant stops ringing for this order —
 * accepted on the tablet silences the owner's phone too. Silent: shows nothing.
 */
export function stopVendorRing(orderId: string): Promise<void> {
  return notifyVendor(orderId, { en: "" }, { en: "" }, { ...RING, silent: true, data: { ...ringStopData("vendor", orderId) } });
}

export function stopRiderRing(driverId: string, orderId: string): Promise<void> {
  return notifyDriver(driverId, { en: "" }, { en: "" }, { ...RING, silent: true, data: { ...ringStopData("rider", orderId) } });
}
```

In `notifyDriverPickupOffered` and `notifyDriverPickupReady`, pass as the last `notifyDriver` argument:

```ts
{ ...RING, ttlSec: 180, data: { ...ringStartData("rider", opts.orderId, EXCLUSIVE_OFFER_MS / 1000) } }
```

In `notifyDriverAssigned`, pass `{ ...RING, ttlSec: 180, data: { ...ringStartData("rider", opts.orderId) } }`.

Make `notifyVendorOrderCancelled` `async` and send the stop first: `await stopVendorRing(orderId);`, then `return notifyVendor(...)` as now. Do the same in `notifyDriverOrderCancelled` with `await stopRiderRing(driverId, opts.orderId);`. Await these rather than `void` them: callers schedule these functions through `deferNotify()`, which only keeps the function alive for the promise it is given. Both helpers swallow their own errors.

- [ ] **Step 4: Stop on accept, reject and rider accept**

In `src/lib/data-access/vendor-orders.ts` → `announceKitchenTransition`: in the `accepted` branch (beside `deferNotify(() => notifyOrderAccepted(...))`) and in the reject/cancel branch (beside `deferNotify(() => notifyOrderCancelled(orderId, { byVendor: true, refundQueued }))`), add:

```ts
deferNotify(() => stopVendorRing(orderId));
```

Import `stopVendorRing` from `@/lib/notifications/order-events`.

In `src/app/driver/actions.ts` → `acceptDeliveryAction`, inside `if (result.ok)`:

```ts
deferNotify(() => stopRiderRing(driverId, orderId));
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit -p .` (expect no new errors) and `npx tsx scripts/qa/ring-protocol.ts` (expect 0 failed).

With the owner, send one stop push by hand to the demo vendor profile id: a temporary script that calls `stopVendorRing` for a known order. Check that **nothing appears** on (a) a desktop browser subscribed to web push on `/vendor`, and (b) a phone with the current v1.0.0 Vendor APK. If either shows an empty notification, OneSignal is not treating `content_available` as data-only for that platform. Stop and report it before going further. Don't work around it silently.

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifications/onesignal.ts src/lib/notifications/order-events.ts src/lib/data-access/vendor-orders.ts src/app/driver/actions.ts
git commit -m "feat(ring): send ring start on new order and rider offers, silent stop on accept/reject/cancel"
```

---

### Task 3: Native ringing in the Android apps

**Files:**
- Create: `mobile/native/RingService.java`
- Create: `mobile/native/DeligroNotificationExtension.java`
- Modify: `mobile/native/DeligroPushPlugin.java`
- Modify: `mobile/scripts/lib.mjs`, `mobile/scripts/lib.test.mjs`, `mobile/scripts/build-apk.mjs`, `mobile/roles.json`

**Interfaces:**
- Consumes: payload keys `ring`, `ringId`, `timeoutSec` (Task 1).
- Produces: plugin methods `startRing({ ringId, title, body, timeoutSec })`, `stopRing({ ringId })`, `ringSetup() → { notifications: boolean; fullScreen: boolean; batteryUnrestricted: boolean }`, `openRingSettings({ which: "notifications" | "fullScreen" | "battery" })`. Lib exports `patchManifestRing(xml)`, `ringWav(rate?)`.

- [ ] **Step 1: Write the failing lib tests**

Append to `mobile/scripts/lib.test.mjs` (and add `patchManifestRing, ringWav` to its import list):

```js
const MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="x">
        <activity android:name=".MainActivity" />
    </application>
</manifest>
`;

test("patchManifestRing declares the service, extension and permissions", () => {
  const out = patchManifestRing(MANIFEST);
  assert.match(out, /<service android:name="com\.ractrotech\.deligro\.push\.RingService"[^>]*android:foregroundServiceType="mediaPlayback"/);
  assert.match(out, /com\.onesignal\.NotificationServiceExtension/);
  assert.match(out, /com\.ractrotech\.deligro\.push\.DeligroNotificationExtension/);
  for (const p of ["FOREGROUND_SERVICE", "FOREGROUND_SERVICE_MEDIA_PLAYBACK", "USE_FULL_SCREEN_INTENT", "VIBRATE", "WAKE_LOCK", "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"]) {
    assert.ok(out.includes(`android.permission.${p}"`), p);
  }
  assert.ok(out.indexOf("RingService") < out.indexOf("</application>"));
});

test("patchManifestRing is idempotent", () => {
  const once = patchManifestRing(MANIFEST);
  assert.equal(patchManifestRing(once), once);
});

test("ringWav is a valid 16-bit mono WAV of 2 s", () => {
  const wav = ringWav(8000);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt32LE(24), 8000);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), 8000 * 2 * 2);
  assert.equal(wav.length, 44 + 8000 * 2 * 2);
});

test("loadRoles accepts an optional ring flag", () => {
  const withRing = JSON.parse(good);
  withRing.roles[0].ring = true;
  assert.equal(loadRoles(JSON.stringify(withRing)).roles[0].ring, true);
});
```

- [ ] **Step 2: Run them and check that they fail**

Run: `cd mobile && node --test "scripts/*.test.mjs"`
Expected: FAIL. `patchManifestRing` and `ringWav` are not exported.

- [ ] **Step 3: Implement in `lib.mjs`**

```js
const RING_PERMS = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.VIBRATE",
  "android.permission.WAKE_LOCK",
  "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
];

const RING_APP_ENTRIES = `        <service android:name="com.ractrotech.deligro.push.RingService"
            android:exported="false"
            android:foregroundServiceType="mediaPlayback" />
        <meta-data android:name="com.onesignal.NotificationServiceExtension"
            android:value="com.ractrotech.deligro.push.DeligroNotificationExtension" />
`;

/** Vendor + Rider only: the ringing service, the OneSignal extension, and what they need. */
export function patchManifestRing(xml) {
  let out = xml;
  const missing = RING_PERMS.filter((p) => !out.includes(`"${p}"`));
  if (missing.length > 0) {
    const lines = missing.map((p) => `    <uses-permission android:name="${p}" />`).join("\n");
    out = out.replace(/<\/manifest>\s*$/, `${lines}\n</manifest>\n`);
  }
  if (!out.includes("push.RingService")) {
    out = out.replace(/(\s*)<\/application>/, `\n${RING_APP_ENTRIES}$1</application>`);
  }
  return out;
}

/**
 * The ring: 1.2 s of alternating 880/660 Hz (0.2 s each, 10 ms fades so it
 * doesn't click), then 0.8 s of silence. 2 s total, looped by RingService.
 * Generated rather than shipped so there is no licensing question about it.
 */
export function ringWav(rate = 22050) {
  const n = rate * 2;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let s = 0;
    if (t < 1.2) {
      const local = t % 0.2;
      const f = Math.floor(t / 0.2) % 2 === 0 ? 880 : 660;
      const env = Math.min(1, local / 0.01, (0.2 - local) / 0.01);
      s = Math.sin(2 * Math.PI * f * t) * 0.8 * env;
    }
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0, "ascii");
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8, "ascii");
  h.write("fmt ", 12, "ascii");
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36, "ascii");
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
```

If `loadRoles` rejects unknown keys, allow an optional boolean `ring`. Read its validation first.

- [ ] **Step 4: Run them and check that they pass**

Run: `cd mobile && node --test "scripts/*.test.mjs"`
Expected: all pass.

- [ ] **Step 5: `RingService.java`**

```java
package com.ractrotech.deligro.push;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Rings until somebody deals with the order.
 *
 * Started by DeligroNotificationExtension when a push carries ring=start, or by
 * the open board (DeligroPushPlugin.startRing). Keeps a set of active ring ids
 * — two orders arriving together ring once and stop only when both are handled
 * — each with its own timeout (src/lib/alerts/ring.ts RING_TIMEOUT_SEC).
 *
 * Plays on the ALARM stream so a phone on silent still rings; a kitchen phone
 * on silent is the normal case, not the edge case.
 */
public class RingService extends Service {
    static final String CHANNEL = "deligro_ring";
    static final int NOTIF_ID = 4711;

    private final Set<String> active = new LinkedHashSet<>();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private Vibrator vibrator;
    private PowerManager.WakeLock wake;

    public static void start(Context ctx, String ringId, String title, String body, int timeoutSec) {
        Intent i = new Intent(ctx, RingService.class).setAction("start")
            .putExtra("ringId", ringId).putExtra("title", title).putExtra("body", body)
            .putExtra("timeoutSec", timeoutSec);
        ContextCompat.startForegroundService(ctx, i);
    }

    public static void stop(Context ctx, String ringId) {
        try {
            ctx.startService(new Intent(ctx, RingService.class).setAction("stop").putExtra("ringId", ringId));
        } catch (IllegalStateException notRunning) {
            // Not ringing, and the app is in the background: nothing to stop.
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? "" : intent.getAction();
        String ringId = intent == null ? "" : intent.getStringExtra("ringId");
        if (ringId == null) ringId = "";

        if ("start".equals(action)) {
            String title = intent.getStringExtra("title");
            String body = intent.getStringExtra("body");
            int timeoutSec = Math.max(1, Math.min(600, intent.getIntExtra("timeoutSec", 180)));
            Notification n = build(title == null ? "Deligro" : title, body == null ? "" : body);
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIF_ID, n);
            }
            final String id = ringId;
            active.add(id);
            handler.removeCallbacksAndMessages(id);
            handler.postAtTime(() -> remove(id), id, android.os.SystemClock.uptimeMillis() + timeoutSec * 1000L);
            startSound();
        } else if ("stop".equals(action)) {
            if ("*".equals(ringId)) {
                active.clear();
                finish();
            } else {
                remove(ringId);
            }
        }
        return START_NOT_STICKY;
    }

    private void remove(String ringId) {
        handler.removeCallbacksAndMessages(ringId);
        active.remove(ringId);
        if (active.isEmpty()) finish();
    }

    private void startSound() {
        if (player != null) return;
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        try {
            int raw = getResources().getIdentifier("deligro_ring", "raw", getPackageName());
            Uri uri = raw != 0
                ? Uri.parse("android.resource://" + getPackageName() + "/" + raw)
                : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            player = new MediaPlayer();
            player.setAudioAttributes(attrs);
            player.setDataSource(this, uri);
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception e) {
            player = null; // vibration and the notification still go ahead
        }
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && Build.VERSION.SDK_INT >= 26) {
            vibrator.vibrate(VibrationEffect.createWaveform(new long[] {0, 800, 600}, 0), attrs);
        }
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "deligro:ring");
            wake.acquire(10 * 60 * 1000L);
        }
    }

    private void finish() {
        if (player != null) {
            try { player.stop(); } catch (Exception ignored) {}
            player.release();
            player = null;
        }
        if (vibrator != null) vibrator.cancel();
        if (wake != null && wake.isHeld()) wake.release();
        stopForeground(true);
        stopSelf();
    }

    private Notification build(String title, String body) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "New orders (ringing)", NotificationManager.IMPORTANCE_HIGH);
            ch.setSound(null, null);      // MediaPlayer plays the ring
            ch.enableVibration(false);    // and the Vibrator vibrates
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.setBypassDnd(true);
            nm.createNotificationChannel(ch);
        }
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch == null) launch = new Intent();
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent open = PendingIntent.getActivity(this, 0, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setContentIntent(open)
            .setFullScreenIntent(open, true)
            .build();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
```

`setBypassDnd` only takes effect if the user allows it in channel settings. It is harmless otherwise.

- [ ] **Step 6: `DeligroNotificationExtension.java`**

Before writing this, check the class and method names against the OneSignal Android SDK 5 docs ("Notification Service Extension"). The names below are SDK 5's (`com.onesignal.notifications.*`).

```java
package com.ractrotech.deligro.push;

import androidx.annotation.NonNull;
import com.onesignal.notifications.INotification;
import com.onesignal.notifications.INotificationReceivedEvent;
import com.onesignal.notifications.INotificationServiceExtension;
import org.json.JSONObject;

/**
 * Turns a ring payload (src/lib/alerts/ring.ts) into RingService start/stop.
 * Any push without "ring" is left alone and shows as normal.
 */
public class DeligroNotificationExtension implements INotificationServiceExtension {
    @Override
    public void onNotificationReceived(@NonNull INotificationReceivedEvent event) {
        INotification n = event.getNotification();
        JSONObject data = n.getAdditionalData();
        if (data == null) return;
        String ring = data.optString("ring", "");
        String ringId = data.optString("ringId", "");
        if (ringId.isEmpty()) return;

        if ("start".equals(ring)) {
            event.preventDefault(); // RingService shows its own notification
            RingService.start(event.getContext(), ringId, n.getTitle(), n.getBody(), data.optInt("timeoutSec", 180));
        } else if ("stop".equals(ring)) {
            event.preventDefault();
            RingService.stop(event.getContext(), ringId);
        }
    }
}
```

- [ ] **Step 7: Plugin methods in `DeligroPushPlugin.java`**

Add these imports: `android.app.NotificationManager`, `android.content.Context`, `android.content.Intent`, `android.net.Uri`, `android.os.Build`, `android.os.PowerManager`, `android.provider.Settings`, `androidx.core.app.NotificationManagerCompat`, `com.getcapacitor.JSObject`. Then add:

```java
    /** The open board starts the ring for an order it can see (covers a lost push). */
    @PluginMethod
    public void startRing(PluginCall call) {
        String ringId = call.getString("ringId", "");
        if (ringId == null || ringId.isEmpty()) { call.reject("ringId is required"); return; }
        RingService.start(getContext(), ringId, call.getString("title", "Deligro"),
            call.getString("body", ""), call.getInt("timeoutSec", 180));
        call.resolve();
    }

    @PluginMethod
    public void stopRing(PluginCall call) {
        RingService.stop(getContext(), call.getString("ringId", "*"));
        call.resolve();
    }

    /** What stands between this phone and a ring that actually wakes it. */
    @PluginMethod
    public void ringSetup(PluginCall call) {
        Context ctx = getContext();
        JSObject out = new JSObject();
        out.put("notifications", NotificationManagerCompat.from(ctx).areNotificationsEnabled());
        boolean fullScreen = true;
        if (Build.VERSION.SDK_INT >= 34) {
            fullScreen = ((NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE)).canUseFullScreenIntent();
        }
        out.put("fullScreen", fullScreen);
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        out.put("batteryUnrestricted", pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName()));
        call.resolve(out);
    }

    @PluginMethod
    public void openRingSettings(PluginCall call) {
        Context ctx = getContext();
        String which = call.getString("which", "notifications");
        Uri pkg = Uri.parse("package:" + ctx.getPackageName());
        Intent i;
        if ("battery".equals(which)) {
            i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pkg);
        } else if ("fullScreen".equals(which) && Build.VERSION.SDK_INT >= 34) {
            i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkg);
        } else {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { ctx.startActivity(i); } catch (Exception e) {
            ctx.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        }
        call.resolve();
    }
```

Also update the class doc comment's method list.

- [ ] **Step 8: Build script and roles**

In `build-apk.mjs` step 4, after the existing `copyFileSync(... "DeligroPushPlugin.java" ...)`:

```js
  for (const f of ["RingService.java", "DeligroNotificationExtension.java"]) {
    copyFileSync(join(MOBILE, "native", f), join(pluginDir, f));
  }
  if (role.ring) {
    const rawDir = join(appDir, "android", "app", "src", "main", "res", "raw");
    mkdirSync(rawDir, { recursive: true });
    const custom = ["deligro_ring.mp3", "deligro_ring.wav"].map((f) => join(MOBILE, "native", f)).find(existsSync);
    if (custom) copyFileSync(custom, join(rawDir, custom.endsWith(".mp3") ? "deligro_ring.mp3" : "deligro_ring.wav"));
    else writeFileSync(join(rawDir, "deligro_ring.wav"), ringWav());
  }
```

Change the manifest line to:

```js
  let manifest = patchManifestPermissions(readFileSync(manifestPath, "utf8"));
  if (role.ring) manifest = patchManifestRing(manifest);
  writeFileSync(manifestPath, manifest);
```

Import `patchManifestRing, ringWav` from `./lib.mjs`.

In `mobile/roles.json`, add `"ring": true` to the vendor and rider entries, and bump both to `"versionCode": 2, "versionName": "1.1.0"`.

- [ ] **Step 9: Build and check**

Run: `cd mobile && node --test "scripts/*.test.mjs"` (expect pass), then `npx tsx ../scripts/qa/ring-protocol.ts` from `mobile/` (the Java contract block now runs; expect 0 failed). Then `node mobile/scripts/build-apk.mjs vendor` and `node mobile/scripts/build-apk.mjs rider` using the env from `mobile/README.md`. Expected: two signed APKs in `mobile/dist/` with no Gradle errors. If `androidx.core` is missing, add `implementation 'androidx.core:core:1.13.1'` through `patchAppGradle` in the same way as the OneSignal dependency.

- [ ] **Step 10: Commit**

```bash
git add mobile/native/RingService.java mobile/native/DeligroNotificationExtension.java mobile/native/DeligroPushPlugin.java mobile/scripts/lib.mjs mobile/scripts/lib.test.mjs mobile/scripts/build-apk.mjs mobile/roles.json
git commit -m "feat(mobile): native continuous ring for vendor and rider apps"
```

---

### Task 4: Boards start and stop the ring, and loop in the browser

**Files:**
- Modify: `src/lib/native/bridge.ts`
- Modify: `scripts/qa/native-bridge.ts`
- Modify: `src/components/vendor/kitchen-alert.tsx`
- Modify: `src/components/driver/rider-alert.tsx`

**Interfaces:**
- Consumes: plugin methods (Task 3), `ringId`, `RING_TIMEOUT_SEC` (Task 1).
- Produces: `interface NativeRing { startRing(o: { ringId: string; title: string; body: string; timeoutSec: number }): Promise<void>; stopRing(o: { ringId: string }): Promise<void>; ringSetup(): Promise<RingSetup>; openRingSettings(o: { which: "notifications" | "fullScreen" | "battery" }): Promise<void> }`, `interface RingSetup { notifications: boolean; fullScreen: boolean; batteryUnrestricted: boolean }`, `nativeRing(win?): NativeRing | null`, and the pure helper `ringDiff(prev: string[], next: string[]): { started: string[]; stopped: string[] }`.

- [ ] **Step 1: Failing bridge tests**

Append to `scripts/qa/native-bridge.ts` (add `nativeRing, ringDiff` to the import):

```ts
const ringPlugin = { ...plugin, startRing: async () => {}, stopRing: async () => {}, ringSetup: async () => ({ notifications: true, fullScreen: true, batteryUnrestricted: true }), openRingSettings: async () => {} };
const ringShell = { Capacitor: { isNativePlatform: () => true, Plugins: { DeligroPush: ringPlugin } } };
check("new APK exposes the ring", nativeRing(ringShell as never) === ringPlugin);
check("old APK (no stopRing) has no ring", nativeRing(shell as never) === null);
check("browser has no ring", nativeRing(browser as never) === null);
const d = ringDiff(["a", "b"], ["b", "c"]);
check("ringDiff starts new ids", d.started.join() === "c");
check("ringDiff stops departed ids", d.stopped.join() === "a");
check("ringDiff with no change does nothing", ringDiff(["a"], ["a"]).started.length === 0 && ringDiff(["a"], ["a"]).stopped.length === 0);
```

Run: `npx tsx scripts/qa/native-bridge.ts`. It should fail because the exports are missing.

- [ ] **Step 2: Implement in `bridge.ts`**

```ts
export interface RingSetup {
  notifications: boolean;
  fullScreen: boolean;
  batteryUnrestricted: boolean;
}

/** Present only in APKs built with RingService (Vendor/Rider ≥ 1.1.0). */
export interface NativeRing {
  startRing(o: { ringId: string; title: string; body: string; timeoutSec: number }): Promise<void>;
  stopRing(o: { ringId: string }): Promise<void>;
  ringSetup(): Promise<RingSetup>;
  openRingSettings(o: { which: "notifications" | "fullScreen" | "battery" }): Promise<void>;
}

export function nativeRing(win: WindowLike = defaultWindow()): NativeRing | null {
  const p = nativePush(win) as unknown as Partial<NativeRing> | null;
  return p && typeof p.stopRing === "function" && typeof p.startRing === "function" ? (p as NativeRing) : null;
}

/** Which orders just appeared on the board, and which just left it. */
export function ringDiff(prev: string[], next: string[]): { started: string[]; stopped: string[] } {
  const a = new Set(prev);
  const b = new Set(next);
  return { started: next.filter((x) => !a.has(x)), stopped: prev.filter((x) => !b.has(x)) };
}
```

Run the bridge test again. Expected: 0 failed.

- [ ] **Step 3: `kitchen-alert.tsx`**

1. Replace `const RENOTIFY_MS = 25_000;` and its comment with:

```ts
/**
 * How often the tone repeats while an order waits. It used to be 25 s — a beep
 * now and then, easy to miss over a busy kitchen. The owner asked for a ring
 * that does not stop until somebody accepts or rejects, so in a browser the
 * tone now repeats back-to-back. Inside the Android app the native ring does
 * this instead (lib/alerts/ring.ts) and the web tone stays quiet, so the two
 * never play over each other.
 */
const RING_REPEAT_MS = 2_500;
```

2. Add these imports: `import { nativeRing, ringDiff } from "@/lib/native/bridge";` and `import { ringId, RING_TIMEOUT_SEC } from "@/lib/alerts/ring";`.

3. Split `fire` so the repeats don't create a new system notification every 2.5 s. Keep `fire(count)` as it is for the **first** announcement, and add:

```ts
  const ringTone = useCallback(() => {
    const ctx = audioRef.current;
    if (ctx) void ctx.resume().then(() => playAlertSound(ctx, soundPreset, soundUrl)).catch(() => {});
    navigator.vibrate?.([200, 100, 200]);
  }, [soundPreset, soundUrl]);
```

4. Replace the "Still unaccepted" effect:

```ts
  // Still unaccepted — ring until the New column is empty.
  useEffect(() => {
    if (!on || incomingIds.length === 0 || nativeRing()) return;
    const id = setInterval(() => {
      if (Date.now() - lastRepeat.current < RING_REPEAT_MS) return;
      lastRepeat.current = Date.now();
      ringTone();
    }, 500);
    return () => clearInterval(id);
  }, [incomingIds, on, ringTone]);
```

5. Add the native start/stop effect. It runs whether or not the web alert is armed, because the native ring doesn't need a browser gesture:

```ts
  // Inside the Android app: ring natively for every order in New, stop the
  // moment it leaves (accepted, rejected, or cancelled by the customer).
  const nativeSeen = useRef<string[]>([]);
  useEffect(() => {
    const ring = nativeRing();
    if (!ring) return;
    const { started, stopped } = ringDiff(nativeSeen.current, incomingIds);
    nativeSeen.current = incomingIds;
    for (const id of started) {
      void ring.startRing({
        ringId: ringId("vendor", id),
        title: "नया ऑर्डर 🔔 New order",
        body: restaurantName ? `${restaurantName} — स्वीकार करें / Accept` : "स्वीकार करें / Accept",
        timeoutSec: RING_TIMEOUT_SEC.vendor,
      }).catch(() => {});
    }
    for (const id of stopped) void ring.stopRing({ ringId: ringId("vendor", id) }).catch(() => {});
  }, [incomingIds, restaurantName]);
```

The first run starts rings for orders already sitting in New when the app opens. That is intended: they are still unanswered.

6. In the `fire` call inside the "New arrivals" effect, leave the system `Notification` as it is (first arrival only).

- [ ] **Step 4: `rider-alert.tsx`**

Make the same five changes, with `ringId("rider", id)`, `RING_TIMEOUT_SEC.rider`, title `"नया पिकअप 🛵 New pickup"` and body `"स्वीकार करें / Accept"`. The caller already passes `[]` while the rider has an active delivery (`driver-board.tsx:592`), so accepting one order stops every ring.

- [ ] **Step 5: Verify in a browser (no live writes)**

`npm run dev`, then open `/vendor` as the demo vendor and arm alerts. While an order is in New, the tone should repeat about every 2.5 s, and it should stop when the column empties. Use an order that's already in the live New column, or wait for one. Don't create one without the owner's go-ahead.

- [ ] **Step 6: Commit**

```bash
git add src/lib/native/bridge.ts scripts/qa/native-bridge.ts src/components/vendor/kitchen-alert.tsx src/components/driver/rider-alert.tsx
git commit -m "feat(ring): boards ring until accepted — native in the app, looping tone in the browser"
```

---

### Task 5: "Make sure it rings" setup card

**Files:**
- Create: `src/components/notifications/ring-setup.tsx`
- Modify: `src/components/vendor/vendor-orders-board.tsx` (~L925, next to `<KitchenAlert`)
- Modify: `src/components/driver/driver-board.tsx` (~L592, next to `<RiderAlert`)

**Interfaces:**
- Consumes: `nativeRing`, `RingSetup` (Task 4).

- [ ] **Step 1: Component**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nativeRing, type RingSetup as Setup } from "@/lib/native/bridge";

/**
 * The phone settings that silently stop a ring. Budget Android phones (Xiaomi,
 * Vivo, Oppo — most of Bemetara) kill a backgrounded app to save battery, and
 * a killed app never hears the push. Shown only inside the Android app, only
 * while something is missing, and re-checked when the user comes back from
 * Settings.
 */
const ROWS: { key: keyof Setup; which: "notifications" | "fullScreen" | "battery"; hi: string; en: string }[] = [
  { key: "notifications", which: "notifications", hi: "सूचनाएं चालू करें", en: "Allow notifications" },
  { key: "batteryUnrestricted", which: "battery", hi: "बैटरी सेवर से हटाएं", en: "Remove from battery saver" },
  { key: "fullScreen", which: "fullScreen", hi: "लॉक स्क्रीन पर दिखाएं", en: "Show on lock screen" },
];

export function RingSetup() {
  const [setup, setSetup] = useState<Setup | null>(null);

  const refresh = useCallback(() => {
    const ring = nativeRing();
    if (!ring) return;
    ring.ringSetup().then(setSetup).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  if (!setup) return null;
  const missing = ROWS.filter((r) => !setup[r.key]);
  if (missing.length === 0) return null;

  return (
    <div className="rounded-xl border border-deal/30 bg-deal-soft p-3">
      <p className="flex items-center gap-2 text-base font-bold">
        <BellRing className="size-5 shrink-0 text-deal" />
        फ़ोन बंद होने पर भी घंटी बजे
      </p>
      <p className="mt-1 text-sm text-muted">
        नीचे दी गई सेटिंग चालू करें, नहीं तो ऑर्डर की घंटी नहीं बजेगी। · Turn these on or the order ring may not reach you.
      </p>
      <div className="mt-3 grid gap-2">
        {missing.map((r) => (
          <Button
            key={r.key}
            className="min-h-11 justify-start"
            onClick={() => void nativeRing()?.openRingSettings({ which: r.which })}
          >
            {r.hi} · {r.en}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Xiaomi / Vivo / Oppo: Settings → Apps → Deligro → <b>Autostart</b> भी चालू करें।
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Mount it**

In `vendor-orders-board.tsx`, put `<RingSetup />` directly above `<KitchenAlert`. In `driver-board.tsx`, put it directly above `<RiderAlert`. Import from `@/components/notifications/ring-setup`.

- [ ] **Step 3: Verify**

In a desktop browser the card must not render (`nativeRing()` is null). Check with `npm run dev`. On a phone with the 1.1.0 Vendor APK and battery optimisation on, the card shows the "बैटरी सेवर से हटाएं" button. Tapping it opens the system dialog, and after allowing and coming back, that row disappears.

- [ ] **Step 4: Commit**

```bash
git add src/components/notifications/ring-setup.tsx src/components/vendor/vendor-orders-board.tsx src/components/driver/driver-board.tsx
git commit -m "feat(ring): setup card so budget phones don't silence the ring"
```

---

### Task 6: Device test matrix and release

**Files:**
- Modify: `package.json` (`test:ring` already added), `scripts/qa/run-all.sh` (add `ring-protocol.ts` to the pure tests at the top and renumber the headers)
- Modify: `mobile/README.md` ("Release a new version": note that vendor/rider 1.1.0 need reinstalling or the in-app update)

- [ ] **Step 1: Wire the QA pack and commit**

```bash
git add scripts/qa/run-all.sh mobile/README.md
git commit -m "test(qa): ring protocol in the QA pack; release notes for 1.1.0"
```

- [ ] **Step 2: Deploy the web part**

The server and board changes (Tasks 1, 2, 4, 5) go out with a normal Vercel deploy. Old APKs and browsers behave as described in Global Constraints ("Old APKs keep working").

- [ ] **Step 3: Device matrix (with owner, live, real test orders)**

Install Vendor 1.1.0 and Rider 1.1.0 on at least one **Xiaomi/Redmi or Vivo/Oppo** phone (Android 12–14) and one **Samsung**. Place each test order as the demo customer at Saffron Kitchen, then cancel it through admin.

| # | Situation | Expected |
|---|---|---|
| 1 | Vendor app open on the board | Rings continuously; stops within ~1 s of **Accept** |
| 2 | App in background, screen on | Heads-up "नया ऑर्डर" + continuous ring; stops on Accept in the app |
| 3 | Screen locked | Full-screen or heads-up over the lock screen + ring; tapping opens the board |
| 4 | Phone on silent | Still rings (alarm volume) |
| 5 | App swiped away from recents | Still rings, **after** the setup card's battery/autostart steps. Record which phones fail before those steps |
| 6 | Same vendor signed in on two phones | Both ring; Accept on one stops the other within ~5 s |
| 7 | **Reject** instead of Accept | Stops |
| 8 | Customer cancels while ringing | Stops |
| 9 | Nobody answers | Stops at 5 min; ops "Kitchen hasn't accepted" already arrived at 3 min |
| 10 | Two orders 10 s apart | One ring; accepting the first keeps ringing; accepting the second stops it |
| 11 | Rider offered a pickup | Rings; stops on Accept, or at 3 min |
| 12 | Order cancelled while the rider's phone rings | Stops |
| 13 | Old v1.0.0 APK on another phone | One normal push as before, and **no** visible notification for the stop |
| 14 | Desktop browser, vendor board armed | Tone repeats about every 2.5 s until the column is empty |

Write the results (phone model, Android version, pass/fail per row) into `docs/delivery/ring-test-results.md` and commit them.

- [ ] **Step 4: Ship the APKs**

Send Vendor and Rider 1.1.0 to the client. For the rider app, update the APK version/URL in Admin → Settings so installed apps are told to update (`mobile/README.md`). Tell the client in plain words:
- The phone now rings until the order is accepted or rejected.
- Open the app once and finish the yellow "फ़ोन बंद होने पर भी घंटी बजे" card.
- On iPhone it beeps only while the board is open.
