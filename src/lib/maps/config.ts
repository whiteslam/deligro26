import { PINNED_LOCATION } from "@/lib/location/pinned";

/**
 * Google Maps config. The browser key is public by design (restrict it by HTTP
 * referrer in the Google Cloud console). When it's absent the map picker falls
 * back to a plain text address field, so the checkout still works.
 */
export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export const isMapsConfigured = GOOGLE_MAPS_API_KEY.length > 0;

/**
 * Default map centre, used before we have a fix. Same place the app assumes the
 * customer is (see lib/location/pinned) — one city, one constant.
 */
export const DEFAULT_CENTER = PINNED_LOCATION.coords;

/**
 * A static, non-interactive map image pinned at one point. For a card a rider
 * glances at once (e.g. "is this the right building"), not a map they pan or
 * zoom — that's what the Navigate button is for. Returns null when there's no
 * key configured, same fallback shape as stopDirectionsUrl: the caller renders
 * nothing rather than a broken image.
 *
 * Uses the Maps Static API, which is enabled separately from the JS API in the
 * Google Cloud console even though it shares the same key.
 */
export function staticMapUrl(
  point: { lat: number; lng: number },
  { width = 400, height = 160, zoom = 16 }: { width?: number; height?: number; zoom?: number } = {}
): string | null {
  if (!isMapsConfigured) return null;
  const params = new URLSearchParams({
    center: `${point.lat},${point.lng}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    scale: "2",
    markers: `color:red|${point.lat},${point.lng}`,
    key: GOOGLE_MAPS_API_KEY,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
