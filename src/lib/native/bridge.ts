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
  requestPermission(): Promise<void>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: Record<string, unknown>;
}

type WindowLike = { Capacitor?: CapacitorGlobal } | undefined;

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
