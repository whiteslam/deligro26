/**
 * Reverse geocoding for the delivery header.
 *
 * Google first (same NEXT_PUBLIC_GOOGLE_MAPS_API_KEY the address picker uses),
 * OpenStreetMap Nominatim as a fallback. Nominatim used to be the only path,
 * but its usage policy bars anonymous browser traffic — it rate-limits or drops
 * those requests, which is why the header so often fell back to the generic
 * "Current location" label with no city.
 *
 * Best-effort either way: callers show "Current location" if both fail. Kept out
 * of the render path — it's awaited after we already have a coordinate fix.
 *
 * NOTE: this needs the *Geocoding API* enabled on the key, not just Maps
 * JavaScript API. If Google denies the request we log it once and fall through.
 */

import { isMapsConfigured } from "@/lib/maps/config";
import { loadGoogleMaps } from "@/lib/maps/loader";

export interface Place {
  label: string; // short area, e.g. "Bandra West"
  sublabel: string | null; // "City, State"
}

/** First component matching any of `types`, scanned across every result. */
function component(
  results: google.maps.GeocoderResult[],
  types: string[]
): string | null {
  for (const type of types) {
    for (const result of results) {
      const hit = result.address_components?.find((c) => c.types.includes(type));
      if (hit?.long_name) return hit.long_name;
    }
  }
  return null;
}

async function viaGoogle(lat: number, lng: number): Promise<Place | null> {
  if (!isMapsConfigured) return null;

  await loadGoogleMaps();
  const { results } = await new google.maps.Geocoder().geocode({
    location: { lat, lng },
  });
  if (!results?.length) return null;

  // Neighbourhood-ish first, then progressively coarser, so dense cities get
  // "Bandra West" while a rural fix still resolves to something meaningful.
  const area = component(results, [
    "sublocality_level_1",
    "sublocality",
    "neighborhood",
    "locality",
    "postal_town",
    "administrative_area_level_2",
  ]);
  const city = component(results, [
    "locality",
    "postal_town",
    "administrative_area_level_2",
  ]);
  const state = component(results, ["administrative_area_level_1"]);

  if (!area && !city) return null;

  // Don't repeat the area as its own city (e.g. "Raipur · Raipur, Chhattisgarh").
  const cityPart = city && city !== area ? city : null;
  const sublabel = [cityPart, state].filter(Boolean).join(", ") || null;

  return { label: area ?? city!, sublabel };
}

async function viaNominatim(lat: number, lng: number): Promise<Place | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
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

  const city = a.city || a.town || a.village || a.county || null;
  const cityPart = city && city !== label ? city : null;
  const sublabel = [cityPart, a.state ?? null].filter(Boolean).join(", ") || null;

  return { label, sublabel };
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<Place | null> {
  try {
    const place = await viaGoogle(lat, lng);
    if (place) return place;
  } catch (err) {
    // Most likely: Geocoding API not enabled, key referrer-restricted away from
    // this origin, or over quota. Worth seeing in the console — silent failure
    // here is what made this look like "location isn't working".
    console.warn("[geocode] google reverse geocode failed", err);
  }

  try {
    return await viaNominatim(lat, lng);
  } catch {
    return null;
  }
}
