/**
 * The pinned JSON of the zone map, vendor benchmark and SLA screens. Pure: the
 * database's jsonb in, the contract's shapes out, every number finite.
 */
import { addDays } from "@/lib/metrics/ist";
import { benchmark, BENCH, BENCH_METRICS, type VendorBenchRow } from "@/lib/ops/insights/benchmarks";
import type { Area } from "@/lib/ops/insights/forecast";
import type { StageStat } from "@/lib/ops/insights/sla";
import { ZONE_RULES, zoneSuggestions, type CellStat, type ZoneStat } from "@/lib/ops/insights/zone-suggestions";

const r1 = (n: number) => Math.round(n * 10) / 10;
const r4 = (n: number) => Math.round(n * 10_000) / 10_000;
const num = (v: unknown): number | null => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
const n0 = (v: unknown): number => num(v) ?? 0;
const round = (v: unknown, f: (n: number) => number): number | null => {
  const n = num(v);
  return n === null ? null : f(n);
};

export type Range = { from: string; to: string };

/** Days from `from` to `to`, both inclusive. */
export function rangeDays(range: Range): number {
  return Math.round((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000) + 1;
}

// ── zones ───────────────────────────────────────────────────────────────────

type GridJson = {
  rangeDays?: number;
  zones?: Record<string, unknown>[];
  cities?: Record<string, unknown>[];
  cells?: Record<string, unknown>[];
};

export function zonesPayload(input: { now: Date; area: Area; range: Range; grid: GridJson }) {
  const g = input.grid ?? {};
  const zoneStats: ZoneStat[] = (g.zones ?? []).map((z) => {
    const oc = z.outsideCenter as { lat: unknown; lng: unknown } | null;
    return {
      id: String(z.id),
      name: String(z.name),
      cityId: String(z.cityId),
      cityName: String(z.cityName),
      center: { lat: n0(z.centerLat), lng: n0(z.centerLng) },
      radiusKm: n0(z.radiusKm),
      drops: n0(z.drops),
      avgDeliveryMinutes: round(z.avgDeliveryMinutes, r1),
      medianDeliveryMinutes: round(z.medianDeliveryMinutes, r1),
      avgDistanceKm: round(z.avgDistanceKm, r1),
      outsideRadiusShare: r4(n0(z.outsideRadiusShare)),
      outsideDrops: n0(z.outsideDrops),
      outsideCenter: oc && num(oc.lat) !== null && num(oc.lng) !== null ? { lat: Number(oc.lat), lng: Number(oc.lng) } : null,
      p95DistanceKm: round(z.p95DistanceKm, r1),
      ordersPerDay: r1(n0(z.ordersPerDay)),
    };
  });

  const cellStats: CellStat[] = (g.cells ?? []).map((c) => {
    const b = c.bounds as Record<string, unknown>;
    const ctr = c.center as Record<string, unknown>;
    return {
      key: String(c.key),
      bounds: { south: n0(b.south), west: n0(b.west), north: n0(b.north), east: n0(b.east) },
      center: { lat: n0(ctr.lat), lng: n0(ctr.lng) },
      drops: n0(c.drops),
      avgDeliveryMinutes: round(c.avgDeliveryMinutes, r1),
      medianDeliveryMinutes: round(c.medianDeliveryMinutes, r1),
      avgDistanceKm: round(c.avgDistanceKm, r1),
      nearestZoneId: typeof c.nearestZoneId === "string" ? c.nearestZoneId : null,
      distanceToZoneCenterKm: round(c.distanceToZoneCenterKm, r1),
      insideZone: c.insideZone === true,
    };
  });

  const days = rangeDays(input.range);
  return {
    generatedAt: input.now.toISOString(),
    range: input.range,
    area: input.area,
    cellKm: 1,
    minCellDrops: ZONE_RULES.minCellDrops,
    zones: zoneStats.map((z) => ({
      id: z.id,
      name: z.name,
      cityId: z.cityId,
      cityName: z.cityName,
      center: z.center,
      radiusKm: z.radiusKm,
      drops: z.drops,
      avgDeliveryMinutes: z.avgDeliveryMinutes,
      medianDeliveryMinutes: z.medianDeliveryMinutes,
      avgDistanceKm: z.avgDistanceKm,
      outsideRadiusShare: z.outsideRadiusShare,
      ordersPerDay: z.ordersPerDay,
    })),
    cities: (g.cities ?? []).map((c) => ({
      id: String(c.id),
      name: String(c.name),
      drops: n0(c.drops),
      avgDeliveryMinutes: round(c.avgDeliveryMinutes, r1),
      medianDeliveryMinutes: round(c.medianDeliveryMinutes, r1),
      avgDistanceKm: round(c.avgDistanceKm, r1),
      outsideRadiusShare: r4(n0(c.outsideRadiusShare)),
      ordersPerDay: r1(n0(c.ordersPerDay)),
    })),
    cells: cellStats,
    suggestions: zoneSuggestions(zoneStats, cellStats, days),
  };
}

// ── vendors ─────────────────────────────────────────────────────────────────

export function parseBenchRows(json: unknown): VendorBenchRow[] {
  const rows = Array.isArray(json) ? (json as Record<string, unknown>[]) : [];
  return rows.map((r) => ({
    restaurantId: String(r.restaurantId),
    name: String(r.name ?? "Shop"),
    zoneId: typeof r.zoneId === "string" ? r.zoneId : null,
    orders: n0(r.orders),
    prepMinutes: round(r.prepMinutes, r1),
    acceptMinutes: round(r.acceptMinutes, r1),
    cancellationRate: round(r.cancellationRate, r4),
    rating: round(r.rating, (n) => Math.round(n * 100) / 100),
    aov: round(r.aov, (n) => Math.round(n)),
    repeatRate: round(r.repeatRate, r4),
  }));
}

export function vendorsPayload(input: {
  now: Date;
  area: Area;
  range: Range;
  rows: VendorBenchRow[];
  zoneNames: ReadonlyMap<string, string>;
  cityOf: (zoneId: string) => { id: string; name: string } | null;
  vendor: string | null;
  page: number;
  pageSize: number;
}) {
  const b = benchmark(input.rows, input.cityOf);
  const sorted = [...b.vendors].sort((a, c) => c.orders - a.orders || a.name.localeCompare(c.name));
  const filtered = input.vendor ? sorted.filter((v) => v.id === input.vendor) : sorted;
  const start = (input.page - 1) * input.pageSize;
  return {
    generatedAt: input.now.toISOString(),
    range: input.range,
    area: input.area,
    minOrders: BENCH.minOrders,
    metrics: BENCH_METRICS.map((m) => ({ key: m.key, label: m.label, unit: m.unit, better: m.better })),
    zones: b.zones.map((z) => ({ zoneId: z.zoneId, name: input.zoneNames.get(z.zoneId) ?? "Zone", vendorsCompared: z.vendorsCompared, medians: z.medians })),
    cities: b.cities.map((c) => ({ cityId: c.cityId, name: c.name, vendorsCompared: c.vendorsCompared, medians: c.medians })),
    vendors: filtered.slice(start, start + input.pageSize),
    page: input.page,
    pageSize: input.pageSize,
    total: filtered.length,
  };
}

// ── SLA ─────────────────────────────────────────────────────────────────────

export type SlaTargetRow = {
  zone_id: string | null;
  accept_minutes: number;
  prep_minutes: number;
  pickup_minutes: number;
  deliver_minutes: number;
  updated_by: string | null;
  updated_at: string | null;
};

export type SlaTarget = {
  zoneId: string | null;
  inherited: boolean;
  acceptMinutes: number;
  prepMinutes: number;
  pickupMinutes: number;
  deliverMinutes: number;
  updatedBy: { id: string; name: string } | null;
  updatedAt: string | null;
};

/** The default, then one entry per zone in scope: its own row or the inherited default. */
export function slaTargets(
  rows: readonly SlaTargetRow[],
  zoneIds: readonly string[],
  people: ReadonlyMap<string, string>
): SlaTarget[] {
  const def = rows.find((r) => r.zone_id === null);
  const base = def ?? { zone_id: null, accept_minutes: 5, prep_minutes: 20, pickup_minutes: 10, deliver_minutes: 45, updated_by: null, updated_at: null };
  const shape = (r: SlaTargetRow, zoneId: string | null, inherited: boolean): SlaTarget => ({
    zoneId,
    inherited,
    acceptMinutes: r.accept_minutes,
    prepMinutes: r.prep_minutes,
    pickupMinutes: r.pickup_minutes,
    deliverMinutes: r.deliver_minutes,
    updatedBy: !inherited && r.updated_by ? { id: r.updated_by, name: people.get(r.updated_by) ?? "Staff" } : null,
    updatedAt: inherited ? null : r.updated_at,
  });
  return [
    shape(base, null, false),
    ...zoneIds.map((z) => {
      const own = rows.find((r) => r.zone_id === z);
      return own ? shape(own, z, false) : shape(base, z, true);
    }),
  ];
}

type SlaJson = {
  overall?: Record<string, StageStat>;
  byZone?: unknown[];
  byCity?: unknown[];
  byVendor?: unknown[];
  byRider?: unknown[];
  daily?: unknown[];
};

const STAGES = ["accept", "prep", "pickup", "deliver"] as const;
const emptyStage = (): StageStat => ({ orders: 0, breaches: 0, rate: 0, medianMinutes: null });

export function slaPayload(input: { now: Date; area: Area; range: Range; sla: SlaJson; targets: SlaTarget[] }) {
  const s = input.sla ?? {};
  const overall = Object.fromEntries(STAGES.map((k) => [k, s.overall?.[k] ?? emptyStage()]));
  return {
    generatedAt: input.now.toISOString(),
    range: input.range,
    area: input.area,
    targets: input.targets,
    overall,
    byZone: s.byZone ?? [],
    byCity: s.byCity ?? [],
    byVendor: s.byVendor ?? [],
    byRider: s.byRider ?? [],
    daily: s.daily ?? [],
  };
}

/** The exclusive end of an inclusive IST day range, as the next day's key. */
export function rangeEndExclusive(range: Range): string {
  return addDays(range.to, 1);
}
