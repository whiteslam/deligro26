/**
 * Plain-language suggestions from the zone grid (§17.3). Pure: the grid's
 * zone and cell figures in, English sentences out. Every threshold is a
 * constant below so a reader can see exactly when a suggestion fires.
 */

export const ZONE_RULES = {
  minCellDrops: 3,
  newZoneShare: 0.1,
  newZoneMinDrops: 30,
  uncoveredMinDrops: 20,
  slowCellMinDrops: 20,
  slowFactor: 1.5,
  resizeP95Share: 0.6,
  resizeMinDrops: 50,
  mergeOrdersPerDay: 1,
  mergeMinDays: 14,
} as const;

export type LatLng = { lat: number; lng: number };

export type ZoneStat = {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
  center: LatLng;
  radiusKm: number;
  drops: number;
  avgDeliveryMinutes: number | null;
  medianDeliveryMinutes: number | null;
  avgDistanceKm: number | null;
  outsideRadiusShare: number;
  outsideDrops: number;
  /** Where the drops beyond the radius are centred, when there are any. */
  outsideCenter: LatLng | null;
  /** How far 95% of this zone's drops are from its centre. */
  p95DistanceKm: number | null;
  ordersPerDay: number;
};

export type CellStat = {
  key: string;
  bounds: { south: number; west: number; north: number; east: number };
  center: LatLng;
  drops: number;
  avgDeliveryMinutes: number | null;
  medianDeliveryMinutes: number | null;
  avgDistanceKm: number | null;
  nearestZoneId: string | null;
  distanceToZoneCenterKm: number | null;
  insideZone: boolean;
};

export type Suggestion = {
  type: "new_zone" | "uncovered_demand" | "slow_area" | "resize_zone" | "merge_zone";
  severity: "info" | "warning";
  zoneId: string | null;
  text: string;
  center: LatLng | null;
  metric: Record<string, number>;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const km = (n: number) => String(r1(n));
const coord = (p: LatLng) => `${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`;
const TYPE_ORDER: Suggestion["type"][] = ["new_zone", "uncovered_demand", "slow_area", "resize_zone", "merge_zone"];

export function zoneSuggestions(zones: readonly ZoneStat[], cells: readonly CellStat[], rangeDays: number): Suggestion[] {
  const out: Suggestion[] = [];

  for (const z of zones) {
    if (z.outsideRadiusShare >= ZONE_RULES.newZoneShare && z.outsideDrops >= ZONE_RULES.newZoneMinDrops && z.outsideCenter) {
      out.push({
        type: "new_zone",
        severity: "warning",
        zoneId: z.id,
        text: `${Math.round(z.outsideRadiusShare * 100)}% of ${z.name} drops are beyond its ${km(z.radiusKm)} km radius; consider a zone centred at ${coord(z.outsideCenter)}.`,
        center: z.outsideCenter,
        metric: { share: z.outsideRadiusShare, drops: z.outsideDrops },
      });
    }
  }

  const outside = cells.filter((c) => !c.insideZone);
  const outsideDrops = outside.reduce((a, c) => a + c.drops, 0);
  if (outsideDrops >= ZONE_RULES.uncoveredMinDrops) {
    const lat = outside.reduce((a, c) => a + c.center.lat * c.drops, 0) / outsideDrops;
    const lng = outside.reduce((a, c) => a + c.center.lng * c.drops, 0) / outsideDrops;
    out.push({
      type: "uncovered_demand",
      severity: "warning",
      zoneId: null,
      text: `${outsideDrops} deliveries went to places outside every zone, around ${coord({ lat, lng })}.`,
      center: { lat, lng },
      metric: { drops: outsideDrops },
    });
  }

  const byId = new Map(zones.map((z) => [z.id, z]));
  for (const c of cells) {
    const z = c.nearestZoneId ? byId.get(c.nearestZoneId) : undefined;
    if (!z || !z.medianDeliveryMinutes || c.medianDeliveryMinutes === null) continue;
    if (c.drops >= ZONE_RULES.slowCellMinDrops && c.medianDeliveryMinutes >= ZONE_RULES.slowFactor * z.medianDeliveryMinutes) {
      out.push({
        type: "slow_area",
        severity: "warning",
        zoneId: z.id,
        text: `Deliveries around ${coord(c.center)} take ${Math.round(c.medianDeliveryMinutes)} minutes at the median, ${r1(c.medianDeliveryMinutes / z.medianDeliveryMinutes)}× the ${z.name} median of ${Math.round(z.medianDeliveryMinutes)}.`,
        center: c.center,
        metric: { drops: c.drops, medianMinutes: c.medianDeliveryMinutes },
      });
    }
  }

  for (const z of zones) {
    if (z.drops >= ZONE_RULES.resizeMinDrops && z.p95DistanceKm !== null && z.p95DistanceKm < ZONE_RULES.resizeP95Share * z.radiusKm) {
      const shrink = Math.max(0.5, Math.ceil(z.p95DistanceKm * 2) / 2);
      out.push({
        type: "resize_zone",
        severity: "info",
        zoneId: z.id,
        text: `${z.name} drops stay within ${km(z.p95DistanceKm)} km (95% of them), but its radius is ${km(z.radiusKm)} km; it could shrink to ${km(shrink)} km.`,
        center: z.center,
        metric: { p95DistanceKm: z.p95DistanceKm, radiusKm: z.radiusKm },
      });
    }
    if (rangeDays >= ZONE_RULES.mergeMinDays && z.ordersPerDay < ZONE_RULES.mergeOrdersPerDay) {
      out.push({
        type: "merge_zone",
        severity: "info",
        zoneId: z.id,
        text: `${z.name} averaged ${r1(z.ordersPerDay)} orders a day over ${rangeDays} days; consider merging it into a neighbouring zone.`,
        center: z.center,
        metric: { ordersPerDay: z.ordersPerDay, days: rangeDays },
      });
    }
  }

  return out
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const sev = (a.s.severity === "warning" ? 0 : 1) - (b.s.severity === "warning" ? 0 : 1);
      return sev || TYPE_ORDER.indexOf(a.s.type) - TYPE_ORDER.indexOf(b.s.type) || a.i - b.i;
    })
    .map(({ s }) => s);
}
