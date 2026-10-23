/**
 * Vendor benchmarking (§17.5): each shop against the median of its zone (and
 * its city). Pure: the per-shop rows from ops_vendor_benchmarks in, medians and
 * verdicts out.
 *
 * A shop with fewer than five orders in the range is shown but not judged, and
 * is left out of every median so a single order cannot move the yardstick.
 */

export const BENCH = { minOrders: 5, inLinePct: 10, inLineRating: 0.1, inLineRatePp: 0.02 } as const;

export type MetricKey = "prepMinutes" | "acceptMinutes" | "cancellationRate" | "rating" | "aov" | "repeatRate";
export type Verdict = "better" | "worse" | "in_line" | "not_enough_data";

export const BENCH_METRICS: { key: MetricKey; label: string; unit: "minutes" | "ratio" | "stars" | "rupees"; better: "lower" | "higher" }[] = [
  { key: "prepMinutes", label: "Prep time", unit: "minutes", better: "lower" },
  { key: "acceptMinutes", label: "Accept time", unit: "minutes", better: "lower" },
  { key: "cancellationRate", label: "Cancellations", unit: "ratio", better: "lower" },
  { key: "rating", label: "Rating", unit: "stars", better: "higher" },
  { key: "aov", label: "Average order value", unit: "rupees", better: "higher" },
  { key: "repeatRate", label: "Repeat customers", unit: "ratio", better: "higher" },
];

export type VendorBenchRow = {
  restaurantId: string;
  name: string;
  zoneId: string | null;
  orders: number;
} & Record<MetricKey, number | null>;

export type Medians = Record<MetricKey, number | null>;
export type ZoneMedians = { zoneId: string; vendorsCompared: number; medians: Medians };
export type CityMedians = { cityId: string; name: string; vendorsCompared: number; medians: Medians };
export type VendorBench = {
  id: string;
  name: string;
  zoneId: string | null;
  orders: number;
  values: Record<MetricKey, number | null>;
  verdicts: Record<MetricKey, Verdict>;
  deltaPct: Record<MetricKey, number | null>;
};

const KEYS = BENCH_METRICS.map((m) => m.key);
const round1 = (n: number) => Math.round(n * 10) / 10;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mediansOf(rows: readonly VendorBenchRow[]): Medians {
  const out = {} as Medians;
  for (const k of KEYS) {
    const vals = rows.map((r) => r[k]).filter((v): v is number => v !== null && Number.isFinite(v));
    out[k] = median(vals);
  }
  return out;
}

function judge(key: MetricKey, value: number | null, med: number | null, orders: number): Verdict {
  if (orders < BENCH.minOrders || value === null || med === null) return "not_enough_data";
  const eps = 1e-9;
  let inLine: boolean;
  if (key === "rating") inLine = Math.abs(value - med) <= BENCH.inLineRating + eps;
  else if (key === "cancellationRate" || key === "repeatRate") inLine = Math.abs(value - med) <= BENCH.inLineRatePp + eps;
  else inLine = Math.abs(value - med) <= (Math.abs(med) * BENCH.inLinePct) / 100 + eps;
  if (inLine) return "in_line";
  const higherIsBetter = BENCH_METRICS.find((m) => m.key === key)!.better === "higher";
  return value > med === higherIsBetter ? "better" : "worse";
}

/**
 * `cityOf` says which city a zone is in (for the city medians); null leaves the
 * city list empty.
 */
export function benchmark(
  rows: readonly VendorBenchRow[],
  cityOf: (zoneId: string) => { id: string; name: string } | null
): { zones: ZoneMedians[]; cities: CityMedians[]; vendors: VendorBench[] } {
  const eligible = rows.filter((r) => r.orders >= BENCH.minOrders && r.zoneId);

  const byZone = new Map<string, VendorBenchRow[]>();
  const byCity = new Map<string, { name: string; rows: VendorBenchRow[] }>();
  for (const r of eligible) {
    const z = r.zoneId!;
    byZone.set(z, [...(byZone.get(z) ?? []), r]);
    const c = cityOf(z);
    if (c) byCity.set(c.id, { name: c.name, rows: [...(byCity.get(c.id)?.rows ?? []), r] });
  }

  const zones: ZoneMedians[] = [...byZone].map(([zoneId, rs]) => ({ zoneId, vendorsCompared: rs.length, medians: mediansOf(rs) }));
  const cities: CityMedians[] = [...byCity].map(([cityId, c]) => ({ cityId, name: c.name, vendorsCompared: c.rows.length, medians: mediansOf(c.rows) }));
  const zoneMedians = new Map(zones.map((z) => [z.zoneId, z.medians]));

  const vendors: VendorBench[] = rows.map((r) => {
    const meds = r.zoneId ? zoneMedians.get(r.zoneId) : undefined;
    const values = {} as Record<MetricKey, number | null>;
    const verdicts = {} as Record<MetricKey, Verdict>;
    const deltaPct = {} as Record<MetricKey, number | null>;
    for (const k of KEYS) {
      const v = r[k] !== null && Number.isFinite(r[k] as number) ? (r[k] as number) : null;
      const m = meds?.[k] ?? null;
      values[k] = v;
      verdicts[k] = judge(k, v, m, r.orders);
      deltaPct[k] = v !== null && m !== null && m !== 0 && r.orders >= BENCH.minOrders ? round1(((v - m) / m) * 100) : null;
    }
    return { id: r.restaurantId, name: r.name, zoneId: r.zoneId, orders: r.orders, values, verdicts, deltaPct };
  });

  return { zones, cities, vendors };
}
