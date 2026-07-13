import type { Coords } from "@/stores/location-store";

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle distance in km. Straight-line, not road distance — good enough
 * to sort a feed and to tell someone a shop is "1.2 km" away; it is NOT what a
 * delivery fee should ever be computed from.
 */
export function haversineKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Distance from the customer to a shop, or `null` when the shop has never been
 * pinned — callers fall back to the seeded `distanceKm` rather than inventing
 * a number.
 */
export function distanceToShop(
  origin: Coords,
  shop: { lat?: number | null; lng?: number | null }
): number | null {
  if (typeof shop.lat !== "number" || typeof shop.lng !== "number") return null;
  return haversineKm(origin, { lat: shop.lat, lng: shop.lng });
}

/** "800 m" under a km, "1.2 km" above — how a rider would say it. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 100) * 10} m`;
  return `${km.toFixed(1)} km`;
}
