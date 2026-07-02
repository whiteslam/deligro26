/**
 * Lightweight reverse geocoding via OpenStreetMap Nominatim (no API key).
 *
 * Best-effort only: if the request fails or is rate-limited, callers fall back
 * to a generic "Current location" label. Kept out of the render path — it's
 * awaited after we already have a coordinate fix.
 */

export interface Place {
  label: string; // short area, e.g. "Bandra West"
  sublabel: string | null; // "City, State"
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<Place | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const a = data?.address ?? {};

    const label =
      a.suburb ||
      a.neighbourhood ||
      a.village ||
      a.town ||
      a.city_district ||
      a.city ||
      a.county ||
      "Current location";

    const cityPart = a.city || a.town || a.village || a.county || null;
    const statePart = a.state || null;
    const sublabel =
      [cityPart, statePart].filter(Boolean).join(", ") || null;

    return { label, sublabel };
  } catch {
    return null;
  }
}
