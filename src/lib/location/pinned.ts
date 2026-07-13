import type { Coords } from "@/stores/location-store";

/**
 * The delivery location the app assumes when it doesn't have a better one.
 *
 * Deligro currently only operates in Bemetara, so this is the honest default:
 * the header shows it, and every distance is measured from it. It is a
 * *fallback*, not a lock — the moment the customer detects their position or
 * picks a saved address, that becomes the origin instead, and distances follow.
 *
 * When the app goes multi-city, this constant is the only thing that has to
 * change (or be dropped in favour of the customer's own city).
 */
export const PINNED_LOCATION: {
  label: string;
  sublabel: string;
  coords: Coords;
} = {
  label: "Bemetara",
  sublabel: "Chhattisgarh",
  coords: { lat: 21.7157, lng: 81.5335 },
};
