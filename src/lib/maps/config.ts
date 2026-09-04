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
 * A Google Static Maps image for one pin — the thumbnail on a rider's stop card.
 *
 * Returns `null` when there is no browser key, which is the same fallback the
 * map picker takes: the caller renders its no-map placeholder rather than an
 * `<img>` pointed at a URL that would 403. Static Maps authenticates by HTTP
 * referrer like the rest of the key's usage, so an `<img>` request carries what
 * it needs; `https://*.googleapis.com` is already in the CSP's `img-src`.
 *
 * `scale=2` because the card renders this at roughly 400px wide on a phone,
 * where a 1x raster is visibly soft. Only ever called with an exact pin — see
 * the call site in `driver-board.tsx` for why an approximate geocode is worse
 * than no thumbnail at all.
 *
 * Note the Maps Static API is enabled separately from the JS API in the Google
 * Cloud console, even though it shares the same key.
 */
export function staticMapUrl(
  point: { lat: number; lng: number },
  { width = 400, height = 160, zoom = 16 } = {}
): string | null {
  if (!isMapsConfigured) return null;

  const at = `${point.lat},${point.lng}`;
  const params = new URLSearchParams({
    center: at,
    zoom: String(zoom),
    size: `${width}x${height}`,
    scale: "2",
    markers: `color:red|${at}`,
    key: GOOGLE_MAPS_API_KEY,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
}
