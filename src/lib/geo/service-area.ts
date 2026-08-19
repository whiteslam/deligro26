import { haversineKm } from "@/lib/geo/distance";

/**
 * Is this address inside the shop's delivery area?
 *
 * One rule, shared by the checkout warning and the order API that refuses, so
 * the sentence a customer reads before they commit and the decision made after
 * they tap cannot disagree.
 *
 * `platform_settings.delivery_radius_km` has been admin-configurable and
 * persisted since migration 0015 and was read by nothing at all: orders were
 * accepted from any address at any distance, at the flat delivery fee, and a
 * rider was dispatched on a trip whose economics had never been checked.
 *
 * Straight-line, not road distance — see `haversineKm`. That makes it
 * permissive at the boundary (the road is always at least as long as the crow
 * flies), which is the right direction for a gate that can refuse someone's
 * dinner: it only ever rejects addresses that are out of range by any measure.
 */

export type ServiceAreaStatus = "in_range" | "out_of_range" | "unknown";

export interface ServiceArea {
  status: ServiceAreaStatus;
  /** Straight-line km, or null when either end has no coordinates. */
  distanceKm: number | null;
  /** The configured radius, echoed so callers can write the message. */
  radiusKm: number;
}

export interface Point {
  lat?: number | null;
  lng?: number | null;
}

function coords(p: Point | null | undefined): { lat: number; lng: number } | null {
  if (!p) return null;
  if (typeof p.lat !== "number" || typeof p.lng !== "number") return null;
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
  return { lat: p.lat, lng: p.lng };
}

/**
 * `unknown` is returned whenever the question cannot be answered — no radius
 * configured, an unpinned shop, an address with no pin — and it is deliberately
 * NOT treated as a refusal by the order API.
 *
 * That is a real limitation, stated rather than hidden: a shop the vendor has
 * never pinned still accepts orders from anywhere, because the alternative is
 * refusing every order for every unpinned shop the moment a radius is set, which
 * would take the platform down rather than protect its margin. The gate closes
 * for a given shop as soon as someone pins it. `unknown` is also why the
 * checkout warning tells a customer their address has no pin instead of assuring
 * them it is in range.
 */
export function checkServiceArea(input: {
  shop: Point | null | undefined;
  destination: Point | null | undefined;
  radiusKm: number;
}): ServiceArea {
  const radiusKm = Number.isFinite(input.radiusKm)
    ? Math.max(0, input.radiusKm)
    : 0;

  const from = coords(input.shop);
  const to = coords(input.destination);

  // A radius of 0 is "no limit configured", matching the settings default.
  if (radiusKm <= 0 || !from || !to) {
    return {
      status: "unknown",
      distanceKm: from && to ? haversineKm(from, to) : null,
      radiusKm,
    };
  }

  const distanceKm = haversineKm(from, to);
  return {
    status: distanceKm > radiusKm ? "out_of_range" : "in_range",
    distanceKm,
    radiusKm,
  };
}

/** The sentence a customer gets when their address is outside the area. */
export function outOfRangeMessage(area: ServiceArea): string {
  const distance =
    area.distanceKm === null ? null : Math.round(area.distanceKm * 10) / 10;
  return distance === null
    ? `This address is outside the ${area.radiusKm} km delivery area for this shop.`
    : `This address is about ${distance} km from the shop, outside its ${area.radiusKm} km delivery area.`;
}
