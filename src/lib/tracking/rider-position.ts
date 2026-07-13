/** Haversine distance in km between two WGS84 points. */
function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Smooth step for natural-looking movement on the map. */
function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

export interface TrackPoint {
  lat: number;
  lng: number;
}

export interface RiderPositionInput {
  orderStatus: string;
  deliveryStatus: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  restaurant: TrackPoint;
  destination: TrackPoint;
  storedRider: (TrackPoint & { at: string | null }) | null;
  etaMinutes: number;
  now?: number;
}

/**
 * Returns where the rider pin should sit right now.
 * Uses stored GPS when fresh; otherwise interpolates along the route so the
 * customer map feels live even between driver pings.
 */
export function computeRiderPosition(input: RiderPositionInput): TrackPoint | null {
  const now = input.now ?? Date.now();

  if (
    input.storedRider?.lat != null &&
    input.storedRider?.lng != null &&
    input.storedRider.at
  ) {
    const age = now - new Date(input.storedRider.at).getTime();
    if (age < 45_000) {
      return { lat: input.storedRider.lat, lng: input.storedRider.lng };
    }
  }

  const activeDelivery =
    input.deliveryStatus === "assigned" || input.deliveryStatus === "picked_up";
  const onTheWay =
    input.orderStatus === "on_the_way" || input.deliveryStatus === "picked_up";

  if (!activeDelivery && input.orderStatus !== "on_the_way") {
    return null;
  }

  const start = input.restaurant;
  const end = input.destination;
  const etaMs = Math.max(input.etaMinutes, 8) * 60_000;

  if (!onTheWay) {
    // Heading to restaurant for pickup — small jitter so the pin feels alive.
    const t = (now % 12_000) / 12_000;
    const jitter = 0.00008 * Math.sin(t * Math.PI * 2);
    return {
      lat: start.lat + jitter,
      lng: start.lng + jitter * 0.7,
    };
  }

  const since = input.pickedUpAt ?? input.assignedAt;
  if (!since) {
    return start;
  }

  const elapsed = now - new Date(since).getTime();
  const raw = clamp01(elapsed / etaMs);
  const progress = ease(raw);

  return {
    lat: lerp(start.lat, end.lat, progress),
    lng: lerp(start.lng, end.lng, progress),
  };
}

/** Offset restaurant pin slightly from destination when coords collide. */
export function restaurantPointForOrder(
  restaurantId: string,
  destination: TrackPoint,
  fallback: TrackPoint
): TrackPoint {
  if (distanceKm(destination, fallback) > 0.05) {
    return fallback;
  }
  const hash = [...restaurantId].reduce((n, c) => n + c.charCodeAt(0), 0);
  const angle = (hash % 360) * (Math.PI / 180);
  const km = 0.8;
  const dLat = (km / 111) * Math.cos(angle);
  const dLng = (km / (111 * Math.cos((destination.lat * Math.PI) / 180))) * Math.sin(angle);
  return {
    lat: destination.lat + dLat,
    lng: destination.lng + dLng,
  };
}
