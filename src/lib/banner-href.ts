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
      return value ?? "/";
    default:
      return "/";
  }
}

/** External campaigns open in a new tab; internal routes stay in-app. */
export function bannerIsExternal(banner: Banner): boolean {
  return banner.target.type === "external";
}
