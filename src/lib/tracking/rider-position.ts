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

/**
 * How far along the route an ESTIMATED pin is ever allowed to travel.
 *
 * The estimate used to run the full 0→1 ramp, so a courier who had broken down,
 * gone to the wrong door or stopped for another order was still drawn arriving
 * at the customer's address, exactly on schedule, off nothing but a clock. The
 * caption calls the pin an estimate; it does not stop the estimate asserting an
 * arrival that never happened.
 *
 * Short of 1, arrival can only come from a real signal — a GPS fix, or the
 * delivery being marked complete. The pin says "somewhere along the way", which
 * is the most an interpolation actually knows.
 */
const MAX_ESTIMATED_PROGRESS = 0.85;

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
 *
 * Uses stored GPS when fresh. Past that window it falls back to a point along
 * the straight line between shop and door, derived from elapsed time — an
 * estimate, labelled as one by `riderPositionSourceFor` and captioned as one on
 * the tracking screen.
 *
 * Two things it deliberately does NOT do, both removed because they made the
 * estimate assert more than it knows:
 *
 *  - It does not jitter. Before pickup the pin used to wobble ±0.00008° on a
 *    sine wave, for no reason but to "feel alive" — motion invented to suggest a
 *    courier was moving when we had no idea whether they were.
 *  - It does not arrive. The ramp stops at `MAX_ESTIMATED_PROGRESS`, so the
 *    clock alone can never walk the pin onto the customer's doorstep.
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
    // Heading to the restaurant for pickup. The food is still at the shop and
    // that is the only location this branch can defend, so the pin sits on it
    // and stays put.
    return start;
  }

  const since = input.pickedUpAt ?? input.assignedAt;
  if (!since) {
    return start;
  }

  const elapsed = now - new Date(since).getTime();
  const progress = clamp01(elapsed / etaMs) * MAX_ESTIMATED_PROGRESS;

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
