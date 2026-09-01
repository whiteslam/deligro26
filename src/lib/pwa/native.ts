"use client";

/**
 * Thin wrappers over the browser capabilities that make a web app feel like an
 * installed one. Every function answers the same shape of question — "can this
 * device do the good version?" — and falls back rather than failing.
 *
 * Nothing here is required for any flow to complete. If a browser supports none
 * of it, the app behaves exactly as it does today.
 */

export interface SharePayload {
  title?: string;
  text?: string;
  url: string;
}

export type ShareResult = "shared" | "copied" | "unavailable";

/**
 * Share via the OS sheet, falling back to copying the link.
 *
 * The two-step fallback matters on desktop, where `navigator.share` exists in
 * Safari and Edge but not Firefox, and on any browser where the user cancels —
 * a cancelled share rejects with AbortError, which is not a failure and must
 * not be reported as one.
 */
export async function shareOrCopy(data: SharePayload): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (err) {
      // The user closing the sheet is a normal outcome, not something to
      // recover from by silently copying to their clipboard instead.
      if (err instanceof DOMException && err.name === "AbortError") {
        return "unavailable";
      }
      // Anything else (permission policy, unsupported payload) falls through.
    }
  }
  return (await copyText(data.url)) ? "copied" : "unavailable";
}

/**
 * Copy text, with a fallback for browsers where the async clipboard is missing
 * or blocked (Firefox without user activation, non-secure origins).
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path.
    }
  }

  if (typeof document === "undefined") return false;
  try {
    const area = document.createElement("textarea");
    area.value = text;
    // Off-screen rather than hidden: `display: none` is not selectable, and
    // scrolling to a focused element would jump the page.
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * App-icon badge — the unread count on an installed app.
 *
 * Chrome and Edge on desktop and Android only; Safari ignores it. Guarded
 * rather than feature-detected once, because the API can exist and still reject
 * (an uninstalled PWA has no icon to badge).
 */
export async function setAppBadge(count: number): Promise<void> {
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0 && nav.setAppBadge) await nav.setAppBadge(count);
    else if (nav.clearAppBadge) await nav.clearAppBadge();
  } catch {
    // ignore
  }
}

export function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
