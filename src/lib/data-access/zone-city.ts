import "server-only";
import { listCitiesWithZones } from "@/lib/data-access/zones";

/**
 * Which city each zone belongs to, for the `city` filter and city rollups.
 * Cities and zones change rarely, so the answer is held for a minute.
 */
export type ZoneCityMap = Map<string, { id: string; name: string }>;

const TTL_MS = 60_000;
let cache: { at: number; value: ZoneCityMap } | null = null;

export async function loadZoneCityMap(now = Date.now()): Promise<ZoneCityMap> {
  if (cache && now - cache.at < TTL_MS) return cache.value;
  const cities = await listCitiesWithZones();
  const value: ZoneCityMap = new Map();
  for (const c of cities) for (const z of c.zones) value.set(z.id, { id: c.id, name: c.name });
  cache = { at: now, value };
  return value;
}

/** zone → city id, the shape `narrowScope` takes. */
export function cityIdsByZone(map: ZoneCityMap): Map<string, string> {
  return new Map([...map].map(([zone, city]) => [zone, city.id]));
}

/** Test seam: forget the cached map. */
export function resetZoneCityCache() {
  cache = null;
}
