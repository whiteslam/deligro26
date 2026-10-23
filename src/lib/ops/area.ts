/**
 * The area filter: a screen looks at all of a manager's zones, one city, or
 * one zone (§17.8). Pure — the server wiring is in manager-api.server.ts.
 *
 * `city` can only narrow what the caller already holds; `zone` wins when both
 * are sent (see `narrowScope`).
 */
import { isUuid, type ManagerScope } from "@/lib/auth/manager-scope";

export { narrowScope } from "@/lib/auth/manager-scope";

export type AreaQuery = { zone?: string | null; city?: string | null };

/** Both parts as the strict, lower-cased values they were, or the field to blame. */
export function parseAreaQuery(
  sp: URLSearchParams
): { zone: string | null; city: string | null } | { error: "bad_request"; field: "zone" | "city" } {
  const read = (name: "zone" | "city"): string | null | "bad" => {
    const raw = sp.get(name);
    if (raw === null || raw.trim() === "") return null;
    return isUuid(raw.trim()) ? raw.trim().toLowerCase() : "bad";
  };
  const zone = read("zone");
  if (zone === "bad") return { error: "bad_request", field: "zone" };
  const city = read("city");
  if (city === "bad") return { error: "bad_request", field: "city" };
  return { zone, city };
}

export type AreaLabel = { type: "scope" | "city" | "zone"; id: string | null; name: string };

/** The `Area` object every insight payload carries. */
export function areaLabel(
  _scope: ManagerScope,
  area: AreaQuery,
  names: { zones: ReadonlyMap<string, string>; cities: ReadonlyMap<string, string> }
): AreaLabel {
  if (area.zone) return { type: "zone", id: area.zone, name: names.zones.get(area.zone) ?? "Zone" };
  if (area.city) return { type: "city", id: area.city, name: names.cities.get(area.city) ?? "City" };
  return { type: "scope", id: null, name: "All my zones" };
}

export type CityRollup = { cityId: string; name: string } & Record<string, number | string | null>;

/**
 * Sum the counts of every zone in a city and RECOMPUTE the rates from the sums.
 * Averaging zone percentages is wrong (1/10 and 9/30 is 25 %, not the 20 % mean
 * of 10 % and 30 %). A zero denominator is `null`, never NaN. A zone with no
 * known city is left out rather than guessed at.
 */
export function rollupByCity<R extends { zoneId: string }>(
  rows: readonly R[],
  zoneCity: ReadonlyMap<string, { id: string; name: string }>,
  spec: {
    sum: (keyof R)[];
    ratios?: { key: string; num: keyof R; den: keyof R }[];
  }
): CityRollup[] {
  const cities = new Map<string, CityRollup>();
  for (const row of rows) {
    const city = zoneCity.get(row.zoneId);
    if (!city) continue;
    let acc = cities.get(city.id);
    if (!acc) {
      acc = { cityId: city.id, name: city.name };
      for (const k of spec.sum) acc[k as string] = 0;
      cities.set(city.id, acc);
    }
    for (const k of spec.sum) {
      const v = Number(row[k]);
      acc[k as string] = (acc[k as string] as number) + (Number.isFinite(v) ? v : 0);
    }
  }
  for (const acc of cities.values()) {
    for (const r of spec.ratios ?? []) {
      const num = Number(acc[r.num as string]);
      const den = Number(acc[r.den as string]);
      acc[r.key] = den > 0 && Number.isFinite(num) ? num / den : null;
    }
  }
  return [...cities.values()];
}
