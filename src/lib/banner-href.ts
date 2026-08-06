import type { Banner } from "@/types";

/**
 * Where a banner's CTA points. Pure and client-safe (no `server-only`) so the
 * carousel can turn a target into an <a href> without a round-trip.
 *
 * Section targets route to a fixed path; entity targets append the slug/id;
 * `external` is passed through verbatim. Anything unknown falls back to home.
 */
export function bannerHref(banner: Banner): string {
  const { type, value } = banner.target;
  switch (type) {
    case "food":
      return "/";
    case "grocery":
      return "/stores?category=groceries";
    case "pick_drop":
      return "/stores?category=pick-drop";
    case "shops":
      return "/stores";
    case "pharmacy":
      return "/stores?category=pharmacy";
    case "membership":
      return "/profile/membership";
    case "refer":
      return "/profile/refer";
    case "restaurant":
      return value ? `/restaurant/${value}` : "/";
    case "store":
      return value ? `/stores/${value}` : "/stores";
    case "product":
      return value ? `/product/${value}` : "/stores";
    case "category":
      return value ? `/search?category=${encodeURIComponent(value)}` : "/search";
    case "external":
      return safeExternalHref(value);
    default:
      return "/";
  }
}

/**
 * Banner targets are admin-authored, but "trusted author" is not a scheme
 * allowlist: a `javascript:` or `data:` value here renders as a live link on
 * every customer's home carousel, which is stored XSS that the CSP cannot catch
 * (javascript: URIs are governed by script-src, and ours still allows
 * 'unsafe-inline'). Only ever emit an absolute http(s) URL.
 */
export function safeExternalHref(value: string | null | undefined): string {
  if (!value) return "/";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "/";
  } catch {
    // Not an absolute URL — so not an external campaign. Don't guess.
    return "/";
  }
}

/** External campaigns open in a new tab; internal routes stay in-app. */
export function bannerIsExternal(banner: Banner): boolean {
  return banner.target.type === "external";
}
