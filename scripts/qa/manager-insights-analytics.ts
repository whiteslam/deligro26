/**
 * QA — zone suggestions, vendor benchmarks, SLA stats and target edits
 * (Insights §17.3, §17.5, §17.9). Pure plus file scans; no I/O.
 *
 * Usage: npx tsx scripts/qa/manager-insights-analytics.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  ZONE_RULES,
  zoneSuggestions,
  type CellStat,
  type ZoneStat,
} from "../../src/lib/ops/insights/zone-suggestions";
import { BENCH, benchmark, type VendorBenchRow } from "../../src/lib/ops/insights/benchmarks";
import { SLA_BOUNDS, parseSlaTargetBody, stageStat, sumStages } from "../../src/lib/ops/insights/sla";
import { rollupByCity } from "../../src/lib/ops/area";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
  }
}
const DEVANAGARI = /[ऀ-ॿ]/;

const Z1 = "11111111-1111-4111-8111-111111111111";
const Z2 = "22222222-2222-4222-8222-222222222222";
const CITY = "c1111111-1111-4111-8111-111111111111";

const zone = (over: Partial<ZoneStat> = {}): ZoneStat => ({
  id: Z1, name: "Bemetara", cityId: CITY, cityName: "Durg", center: { lat: 21.7157, lng: 81.5335 }, radiusKm: 6,
  drops: 300, avgDeliveryMinutes: 30, medianDeliveryMinutes: 28, avgDistanceKm: 2.9, outsideRadiusShare: 0, outsideDrops: 0,
  outsideCenter: null, p95DistanceKm: 5.5, ordersPerDay: 20, ...over,
});
const cell = (over: Partial<CellStat> = {}): CellStat => ({
  key: "1:1", bounds: { south: 21, west: 81, north: 21.01, east: 81.01 }, center: { lat: 21.705, lng: 81.505 }, drops: 10,
  avgDeliveryMinutes: 28, medianDeliveryMinutes: 28, avgDistanceKm: 2, nearestZoneId: Z1, distanceToZoneCenterKm: 1, insideZone: true, ...over,
});
const types = (s: { type: string }[]) => s.map((x) => x.type);

console.log("zone suggestions: new_zone");
{
  const tenPct = zoneSuggestions([zone({ drops: 300, outsideDrops: 30, outsideRadiusShare: 0.1, outsideCenter: { lat: 21.742, lng: 81.561 } })], [], 28);
  check("10% outside with 30 drops → new_zone", types(tenPct).includes("new_zone"), JSON.stringify(tenPct));
  const s = tenPct.find((x) => x.type === "new_zone");
  check("...centred on the outside centroid, with plain text", s?.center?.lat === 21.742 && /10% of Bemetara drops are beyond its 6 km radius; consider a zone centred at 21\.742, 81\.561\./.test(s?.text ?? ""), s?.text);
  check("...a warning, tied to the zone", s?.severity === "warning" && s?.zoneId === Z1 && s?.metric.drops === 30);
  const under = zoneSuggestions([zone({ drops: 303, outsideDrops: 30, outsideRadiusShare: 30 / 303, outsideCenter: { lat: 1, lng: 1 } })], [], 28);
  check("9.9% outside → none", !types(under).includes("new_zone"), JSON.stringify(under));
  const few = zoneSuggestions([zone({ drops: 100, outsideDrops: 29, outsideRadiusShare: 0.29, outsideCenter: { lat: 1, lng: 1 } })], [], 28);
  check("29 outside drops → none", !types(few).includes("new_zone"));
  check("the boundary values are the rule's constants", ZONE_RULES.newZoneShare === 0.1 && ZONE_RULES.newZoneMinDrops === 30);
}
console.log("zone suggestions: uncovered_demand");
{
  const out = [cell({ key: "a", drops: 12, insideZone: false, center: { lat: 21.8, lng: 81.6 } }), cell({ key: "b", drops: 8, insideZone: false, center: { lat: 21.8, lng: 81.62 } })];
  const s = zoneSuggestions([zone()], out, 28).find((x) => x.type === "uncovered_demand");
  check("cells outside every zone totalling 20 drops → uncovered_demand", !!s && s.metric.drops === 20, JSON.stringify(s));
  check("...at the drop-weighted centre of those cells", Math.abs((s?.center?.lng ?? 0) - 81.608) < 1e-9, JSON.stringify(s?.center));
  const small = zoneSuggestions([zone()], [cell({ drops: 19, insideZone: false })], 28);
  check("19 drops → none", !types(small).includes("uncovered_demand"));
  const inside = zoneSuggestions([zone()], [cell({ drops: 50, insideZone: true })], 28);
  check("cells inside a zone never count", !types(inside).includes("uncovered_demand"));
}
console.log("zone suggestions: slow_area");
{
  const slow = zoneSuggestions([zone({ medianDeliveryMinutes: 20 })], [cell({ drops: 20, medianDeliveryMinutes: 30 })], 28);
  check("a cell at exactly 1.5× its zone's median with 20 drops → slow_area", types(slow).includes("slow_area"), JSON.stringify(slow));
  const near = zoneSuggestions([zone({ medianDeliveryMinutes: 20 })], [cell({ drops: 20, medianDeliveryMinutes: 29.9 })], 28);
  check("29.9 against 20 → none", !types(near).includes("slow_area"));
  const thin = zoneSuggestions([zone({ medianDeliveryMinutes: 20 })], [cell({ drops: 19, medianDeliveryMinutes: 60 })], 28);
  check("19 drops → none", !types(thin).includes("slow_area"));
  const orphan = zoneSuggestions([zone({ medianDeliveryMinutes: 20 })], [cell({ drops: 40, medianDeliveryMinutes: 60, nearestZoneId: null })], 28);
  check("a cell with no known zone is skipped", !types(orphan).includes("slow_area"));
}
console.log("zone suggestions: resize_zone and merge_zone");
{
  const shrink = zoneSuggestions([zone({ drops: 50, radiusKm: 6, p95DistanceKm: 3.5 })], [], 28);
  check("p95 at 58% of the radius with 50 drops → resize_zone", types(shrink).includes("resize_zone"), JSON.stringify(shrink));
  check("...suggesting the p95 rounded up to half a kilometre", /could shrink to 3\.5 km/.test(shrink.find((x) => x.type === "resize_zone")?.text ?? ""), shrink.find((x) => x.type === "resize_zone")?.text);
  check("p95 at exactly 60% → none", !types(zoneSuggestions([zone({ drops: 50, radiusKm: 10, p95DistanceKm: 6 })], [], 28)).includes("resize_zone"));
  check("49 drops → none", !types(zoneSuggestions([zone({ drops: 49, radiusKm: 6, p95DistanceKm: 1 })], [], 28)).includes("resize_zone"));
  check("a zone with no p95 is skipped", !types(zoneSuggestions([zone({ drops: 90, p95DistanceKm: null })], [], 28)).includes("resize_zone"));
  const merge = zoneSuggestions([zone({ ordersPerDay: 0.9 })], [], 14);
  check("under 1 order a day over 14 days → merge_zone", types(merge).includes("merge_zone"), JSON.stringify(merge));
  check("exactly 1 a day → none", !types(zoneSuggestions([zone({ ordersPerDay: 1 })], [], 14)).includes("merge_zone"));
  check("13 days is too short to say", !types(zoneSuggestions([zone({ ordersPerDay: 0.1 })], [], 13)).includes("merge_zone"));
  const order = zoneSuggestions(
    [zone({ ordersPerDay: 0.5 }), zone({ id: Z2, name: "Saja", drops: 300, outsideDrops: 60, outsideRadiusShare: 0.2, outsideCenter: { lat: 1, lng: 2 } })],
    [], 28
  );
  check("warnings come before info", order[0].severity === "warning" && order[order.length - 1].severity === "info", JSON.stringify(types(order)));
  check("suggestion text is English and has no Devanagari", order.every((x) => !DEVANAGARI.test(x.text)));
}

console.log("vendor benchmarks");
{
  const v = (over: Partial<VendorBenchRow>): VendorBenchRow => ({
    restaurantId: "r", name: "Shop", zoneId: Z1, orders: 20, prepMinutes: 20, acceptMinutes: 2, cancellationRate: 0.05, rating: 4.2, aov: 300, repeatRate: 0.4, ...over,
  });
  const rows = [
    v({ restaurantId: "a", name: "A" }),
    v({ restaurantId: "b", name: "B" }),
    v({ restaurantId: "c", name: "C" }),
    v({ restaurantId: "tiny", name: "Tiny", orders: 4, prepMinutes: 90 }),
  ];
  const r1 = benchmark([...rows, v({ restaurantId: "x", name: "X", prepMinutes: 21.8, rating: 4.25, cancellationRate: 0.06 })], () => ({ id: CITY, name: "Durg" }));
  const x = r1.vendors.find((q) => q.id === "x")!;
  check("the median ignores a vendor with under 5 orders (prep median stays 20)", r1.zones[0].medians.prepMinutes === 20, JSON.stringify(r1.zones[0]));
  check("9% over the median is in_line", x.verdicts.prepMinutes === "in_line", JSON.stringify(x.verdicts));
  const r2 = benchmark([...rows, v({ restaurantId: "x", prepMinutes: 22.2 })], () => null);
  check("11% over the median is worse (lower prep is better)", r2.vendors.find((q) => q.id === "x")!.verdicts.prepMinutes === "worse");
  const r3 = benchmark([...rows, v({ restaurantId: "x", prepMinutes: 17.8 })], () => null);
  check("11% under is better", r3.vendors.find((q) => q.id === "x")!.verdicts.prepMinutes === "better");
  check("rating 4.25 against 4.2 is in_line (within 0.1)", x.verdicts.rating === "in_line");
  const r4 = benchmark([...rows, v({ restaurantId: "x", rating: 4.5 })], () => null);
  check("rating 4.5 against 4.2 is better", r4.vendors.find((q) => q.id === "x")!.verdicts.rating === "better");
  check("a cancellation rate within 2 points is in_line", x.verdicts.cancellationRate === "in_line");
  const r5 = benchmark([...rows, v({ restaurantId: "x", cancellationRate: 0.09 })], () => null);
  check("...4 points over is worse", r5.vendors.find((q) => q.id === "x")!.verdicts.cancellationRate === "worse");
  const r6 = benchmark([...rows, v({ restaurantId: "x", repeatRate: 0.5 })], () => null);
  check("a higher repeat rate by 10 points is better", r6.vendors.find((q) => q.id === "x")!.verdicts.repeatRate === "better");
  const tiny = r1.vendors.find((q) => q.id === "tiny")!;
  check("a vendor with 4 orders is not_enough_data on every metric", Object.values(tiny.verdicts).every((q) => q === "not_enough_data"), JSON.stringify(tiny.verdicts));
  const nullRating = benchmark([...rows, v({ restaurantId: "x", rating: null })], () => null).vendors.find((q) => q.id === "x")!;
  check("a missing value is not_enough_data for that metric only", nullRating.verdicts.rating === "not_enough_data" && nullRating.verdicts.prepMinutes === "in_line");
  check("deltaPct is the percentage from the median", Math.abs((x.deltaPct.prepMinutes ?? 0) - 9) < 0.01, JSON.stringify(x.deltaPct));
  check("...null against a zero median", benchmark([v({ restaurantId: "a", acceptMinutes: 0 }), v({ restaurantId: "b", acceptMinutes: 0 }), v({ restaurantId: "c", acceptMinutes: 0 })], () => null).vendors[0].deltaPct.acceptMinutes === null);
  check("vendorsCompared counts only eligible vendors", r1.zones[0].vendorsCompared === 4, String(r1.zones[0].vendorsCompared));
  check("a city's medians come from its vendors, not from zone medians", r1.cities.length === 1 && r1.cities[0].vendorsCompared === 4);
  check("minimum orders is 5", BENCH.minOrders === 5);
  const two = benchmark(
    [v({ restaurantId: "a", zoneId: Z1 }), v({ restaurantId: "b", zoneId: Z1 }), v({ restaurantId: "c", zoneId: Z2, prepMinutes: 40 }), v({ restaurantId: "d", zoneId: Z2, prepMinutes: 40 })],
    (z) => (z === Z1 ? { id: CITY, name: "Durg" } : { id: "c2222222-2222-4222-8222-222222222222", name: "Raipur" })
  );
  check("each zone has its own median", two.zones.find((z) => z.zoneId === Z2)?.medians.prepMinutes === 40 && two.zones.find((z) => z.zoneId === Z1)?.medians.prepMinutes === 20);
  check("vendors are compared with their own zone, not the whole area", two.vendors.find((q) => q.id === "c")!.verdicts.prepMinutes === "in_line");
}

console.log("SLA stats");
{
  const s = stageStat([6, 3, 3, 3, 3, 2], 5);
  check("6 orders, 1 over a 5-minute target: rate 0.1667, median 3", s.orders === 6 && s.breaches === 1 && s.rate === 0.1667 && s.medianMinutes === 3, JSON.stringify(s));
  check("exactly on the target is not a breach", stageStat([5, 5], 5).breaches === 0);
  const e = stageStat([], 5);
  check("a stage nobody reached is zeros with a null median", e.orders === 0 && e.breaches === 0 && e.rate === 0 && e.medianMinutes === null, JSON.stringify(e));
  const sum = sumStages([
    { orders: 10, breaches: 1, rate: 0.1, medianMinutes: 4 },
    { orders: 30, breaches: 9, rate: 0.3, medianMinutes: 5 },
  ]);
  check("city rollup: counts summed, rate recomputed (10/40 = 0.25, not the 0.2 average)", sum.orders === 40 && sum.breaches === 10 && sum.rate === 0.25, JSON.stringify(sum));
  check("...and the median cannot be summed, so it is null", sum.medianMinutes === null);
  const viaArea = rollupByCity(
    [{ zoneId: Z1, orders: 10, breaches: 1 }, { zoneId: Z2, orders: 30, breaches: 9 }],
    new Map([[Z1, { id: CITY, name: "Durg" }], [Z2, { id: CITY, name: "Durg" }]]),
    { sum: ["orders", "breaches"], ratios: [{ key: "rate", num: "breaches", den: "orders" }] }
  );
  check("rollupByCity agrees", viaArea[0].rate === 0.25);
}

console.log("target edit body");
{
  const ok = { zoneId: Z1, acceptMinutes: 5, prepMinutes: 20, pickupMinutes: 10, deliverMinutes: 45, reason: "Slower here", clientActionId: "9b2a8d3e-1111-4222-8333-444455556666" };
  const good = parseSlaTargetBody(ok);
  check("a good body parses", good.ok && good.value.zoneId === Z1 && good.value.deliverMinutes === 45, JSON.stringify(good));
  check("a null zone is the default (admin-only, enforced by the database)", parseSlaTargetBody({ ...ok, zoneId: null }).ok);
  const bad = (over: Record<string, unknown>) => parseSlaTargetBody({ ...ok, ...over });
  check("accept 0 and 61 are bad_threshold", ![0, 61].some((v) => { const r = bad({ acceptMinutes: v }); return r.ok || r.error !== "bad_threshold"; }));
  check("prep 181 is bad_threshold", (() => { const r = bad({ prepMinutes: 181 }); return !r.ok && r.error === "bad_threshold"; })());
  check("pickup 121 is bad_threshold", (() => { const r = bad({ pickupMinutes: 121 }); return !r.ok && r.error === "bad_threshold"; })());
  check("deliver 9 and 241 are bad_threshold", ![9, 241].some((v) => { const r = bad({ deliverMinutes: v }); return r.ok || r.error !== "bad_threshold"; }));
  check("a fraction is bad_threshold", (() => { const r = bad({ acceptMinutes: 5.5 }); return !r.ok && r.error === "bad_threshold"; })());
  check("a missing reason is reason_required (422)", (() => { const r = bad({ reason: "" }); return !r.ok && r.error === "reason_required" && r.status === 422; })());
  check("a short reason is reason_required", (() => { const r = bad({ reason: "ab" }); return !r.ok && r.error === "reason_required"; })());
  check("a 301-character reason is rejected", (() => { const r = bad({ reason: "x".repeat(301) }); return !r.ok && r.error === "reason_required"; })());
  check("a non-uuid zone is bad_request on zoneId", (() => { const r = bad({ zoneId: "nope" }); return !r.ok && r.error === "bad_request" && r.field === "zoneId"; })());
  check("a missing client action id is bad_request", (() => { const r = bad({ clientActionId: "" }); return !r.ok && r.error === "bad_request" && r.field === "clientActionId"; })());
  check("the bounds are the contract's", SLA_BOUNDS.accept[1] === 60 && SLA_BOUNDS.prep[1] === 180 && SLA_BOUNDS.pickup[1] === 120 && SLA_BOUNDS.deliver[0] === 10 && SLA_BOUNDS.deliver[1] === 240);
}

console.log("routes");
{
  const root = path.resolve(__dirname, "../..");
  const read = (p: string) => (fs.existsSync(path.join(root, p)) ? fs.readFileSync(path.join(root, p), "utf8") : "");
  for (const r of ["zones", "vendors", "sla"]) {
    const src = read(`src/app/api/manager/insights/${r}/route.ts`);
    check(`insights/${r} opens with the insights gate and a range`, /insightsGate\(request, \{[^}]*range: true/.test(src), src.slice(0, 120));
  }
  const t = read("src/app/api/manager/insights/sla-targets/route.ts");
  check("sla-targets needs manager.alerts.configure", /managerApiContext\("manager\.alerts\.configure", request\)/.test(t));
  check("...limits writes", /managerWriteLimit\(/.test(t));
  check("...and goes through the audited RPCs", /ops_set_sla_target/.test(t) && /ops_reset_sla_target/.test(t));
  check("...never writes the table directly", !/\.from\("ops_sla_targets"\)\s*\.(insert|update|delete|upsert)/.test(t));
  check("zones, vendors and sla read through the RPCs", /ops_zone_grid/.test(read("src/lib/data-access/manager-analytics.ts")) && /ops_vendor_benchmarks/.test(read("src/lib/data-access/manager-analytics.ts")) && /ops_sla_breaches/.test(read("src/lib/data-access/manager-analytics.ts")));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
