/**
 * The Android apps are Capacitor shells that load this site (mobile/). Inside
 * one, `window.Capacitor` is injected and `isNativePlatform()` is true; in a
 * browser it is absent. Push must go through the native `DeligroPush` plugin
 * there, because the OneSignal web SDK cannot receive push inside a WebView.
 *
 * Every function takes the window explicitly so it can be tested without a
 * DOM (scripts/qa/native-bridge.ts) and is safe during server render.
 */
export interface NativePush {
  login(options: { userId: string }): Promise<void>;
  logout(): Promise<void>;
  /**
   * `fallbackToSettings`: when permission was already denied, open the app's
   * Android settings. True only for an explicit tap — never on app open.
   */
  requestPermission(options?: { fallbackToSettings?: boolean }): Promise<void>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: Record<string, unknown>;
}

type WindowLike = { Capacitor?: CapacitorGlobal; Notification?: unknown } | undefined;

function defaultWindow(): WindowLike {
  return typeof window === "undefined" ? undefined : (window as unknown as WindowLike);
}

export function isNativeApp(win: WindowLike = defaultWindow()): boolean {
  try {
    return Boolean(win?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function nativePush(win: WindowLike = defaultWindow()): NativePush | null {
  if (!isNativeApp(win)) return null;
  const plugin = win?.Capacitor?.Plugins?.DeligroPush as NativePush | undefined;
  return plugin && typeof plugin.login === "function" ? plugin : null;
}

/**
 * Keep the phone's push identity in step with who is signed in.
 *   signed in  → tie the device to the user, and ask Android 13+ once for
 *                notification permission (quietly: no settings redirect).
 *   signed out → detach, so a shared kitchen or rider phone stops getting
 *                the previous person's orders.
 */
export async function nativeSessionSync(native: NativePush, userId: string | null): Promise<void> {
  if (userId) {
    await native.login({ userId });
    await native.requestPermission({ fallbackToSettings: false });
  } else {
    await native.logout();
  }
}

/**
 * Which push path this device has. The Android WebView has no
 * `window.Notification`, so without this check the customer app told
 * everyone push was "not supported" and never offered the native prompt.
 */
export function pushSupport(win: WindowLike = defaultWindow()): "native" | "web" | "unsupported" {
  if (nativePush(win)) return "native";
  if (win && typeof win === "object" && "Notification" in win) return "web";
  return "unsupported";
}

export interface RingSetup {
  notifications: boolean;
  fullScreen: boolean;
  batteryUnrestricted: boolean;
}

/**
 * The continuous order ring (lib/alerts/ring.ts). Present only in Vendor and
 * Rider APKs built with RingService (≥ 1.1.0); older shells answer null and
 * the board falls back to its own repeating tone.
 */
export interface NativeRing {
  startRing(o: { ringId: string; title: string; body: string; timeoutSec: number }): Promise<void>;
  stopRing(o: { ringId: string }): Promise<void>;
  ringSetup(): Promise<RingSetup>;
  openRingSettings(o: { which: RingSetting }): Promise<void>;
}

export function nativeRing(win: WindowLike = defaultWindow()): NativeRing | null {
  const p = nativePush(win) as unknown as Partial<NativeRing> | null;
  return p && typeof p.startRing === "function" && typeof p.stopRing === "function"
    ? (p as NativeRing)
    : null;
}

/** Which orders just appeared on the board, and which just left it. */
export function ringDiff(prev: string[], next: string[]): { started: string[]; stopped: string[] } {
  const before = new Set(prev);
  const after = new Set(next);
  return {
    started: next.filter((id) => !before.has(id)),
    stopped: prev.filter((id) => !after.has(id)),
  };
}

export type RingSetting = "notifications" | "battery" | "fullScreen";

/**
 * The settings still standing between this phone and a ring that wakes it,
 * most important first: with notifications off nothing works at all; with the
 * battery saver on, budget phones kill the app and the push never arrives;
 * without full-screen permission (Android 14+) it rings but shows only a
 * banner over the lock screen.
 */
export function missingRingSettings(s: RingSetup): RingSetting[] {
  const out: RingSetting[] = [];
  if (!s.notifications) out.push("notifications");
  if (!s.batteryUnrestricted) out.push("battery");
  if (!s.fullScreen) out.push("fullScreen");
  return out;
}
