"use client";

import { useLocation } from "@/stores/location-store";
import { PINNED_LOCATION } from "@/lib/location/pinned";
import { distanceToShop, formatDistance } from "@/lib/geo/distance";

interface Shop {
  lat?: number | null;
  lng?: number | null;
  /** Seeded number, used only for shops the vendor hasn't pinned yet. */
  distanceKm?: number;
}

/**
 * How far this shop is from the customer, measured live: the origin is the
 * location store, which starts at Bemetara and follows a detected fix or a
 * saved address. Client-side on purpose — the server has no idea where the
 * customer is standing, and the same shop is a different distance for everyone.
 *
 * A shop with no pin has no honest answer, so callers say what to do instead
 * via `fallback`.
 */
export function useShopDistance(shop: Shop): string | null {
  const coords = useLocation((s) => s.coords);
  const km = distanceToShop(coords ?? PINNED_LOCATION.coords, shop);
  return km === null ? null : formatDistance(km);
}

/** Inline "• 1.2 km" for a card's meta row. Renders nothing when unpinned. */
export function ShopDistance({ shop }: { shop: Shop }) {
  const distance = useShopDistance(shop);
  if (!distance) return null;

  return (
    <>
      <span className="text-line">•</span>
      <span>{distance}</span>
    </>
  );
}

/**
 * Bare text for the restaurant page's info card, which has a slot to fill and
 * so can't render nothing — an unpinned shop falls back to its seeded figure.
 */
export function ShopDistanceText({ shop }: { shop: Shop }) {
  const distance = useShopDistance(shop);
  return <>{distance ?? `${shop.distanceKm ?? 2} km`}</>;
}
