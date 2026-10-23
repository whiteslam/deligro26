/**
 * QA — the demand forecast with its honest backtest, and riders needed by hour
 * (Insights §17.1–17.2). Pure: no I/O.
 *
 * Usage: npx tsx scripts/qa/manager-forecast.ts
 */
import {
  FORECAST,
  RIDERS,
  backtest,
  demandPayload,
  errorMetrics,
  forecastHours,
  istParts,
  productivity,
  ridersPayload,
  ridersPlan,
  weightedBase,
  type HourlyPoint,
} from "../../src/lib/ops/insights/forecast";
import { parseInsightsQuery } from "../../src/lib/ops/insights/insights-contract";

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
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;

const H = 3_600_000;
const WEEK = 168 * H;
const IST = 19_800_000;
/** The instant an IST wall-clock hour began. */
const at = (y: number, m: number, d: number, h: number) => new Date(Date.UTC(y, m - 1, d, h) - IST);
/** Monday 19 Oct 2026, 00:00 IST. */
const START = at(2026, 10, 19, 0);
const TARGET = new Date(START.getTime() + 43 * H); // Tuesday 19:00 IST
const back = (d: Date, weeks: number) => new Date(d.getTime() - weeks * WEEK);

/** Every JSON number in a value is finite; a NaN would serialise as null and hide. */
function allFinite(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(allFinite);
  if (v && typeof v === "object") return Object.values(v as Record<string, unknown>).every(allFinite);
  return true;
}

console.log("istParts");
{
  const p = istParts(at(2026, 10, 20, 23));
  check("23:00 IST Tuesday", p.date === "2026-10-20" && p.hour === 23 && p.weekday === 2, JSON.stringify(p));
  const q = istParts(new Date(at(2026, 10, 20, 23).getTime() + H));
  check("the next hour is 00:00 on Wednesday", q.date === "2026-10-21" && q.hour === 0 && q.weekday === 3, JSON.stringify(q));
  check("Sunday is weekday 7", istParts(at(2026, 10, 25, 12)).weekday === 7);
  check("Monday is weekday 1", istParts(at(2026, 10, 19, 0)).weekday === 1);
}

console.log("weightedBase");
{
  const sum = Array.from({ length: 8 }, (_, k) => FORECAST.decay ** k).reduce((a, b) => a + b, 0);
  check("weights 0.75^(k-1): 8,0,…,0 gives 8 / Σw", near(weightedBase([8, 0, 0, 0, 0, 0, 0, 0]), 8 / sum, 1e-12), String(weightedBase([8, 0, 0, 0, 0, 0, 0, 0])));
  check("...which is 2.22 to two places", weightedBase([8, 0, 0, 0, 0, 0, 0, 0]).toFixed(2) === "2.22");
  check("a week left out (null) is not counted as zero", near(weightedBase([4, null, 4]), 4));
  check("nothing included gives 0", weightedBase([null, null]) === 0);
}

console.log("forecastHours");
{
  // 5 orders every Tuesday 19:00 for the 8 Tuesdays before the target.
  const hist: HourlyPoint[] = [];
  for (let k = 1; k <= 8; k++) hist.push({ hourStart: back(TARGET, k), orders: 5 });
  const f = forecastHours(hist, START, 168);
  const tgt = f.points[43];
  check("168 points", f.points.length === 168);
  check("a constant weekly 5 forecasts 5.0", tgt.orders === 5 && tgt.hourStart.getTime() === TARGET.getTime(), JSON.stringify(tgt));
  check("...with a neutral trend", near(f.trend.factor, 1) && f.trend.last4Weeks === 20 && f.trend.prior4Weeks === 20, JSON.stringify(f.trend));
  check("...and enough history", f.insufficientHistory === false && f.weeksOfHistory >= 2, JSON.stringify({ i: f.insufficientHistory, w: f.weeksOfHistory }));
  check("an hour with no history at all forecasts 0", f.points[0].orders === 0);

  // Weights: week 1 has 8, the others none, with data present all eight weeks.
  const h2: HourlyPoint[] = [{ hourStart: back(TARGET, 1), orders: 8 }];
  h2.push({ hourStart: new Date(START.getTime() - 8 * WEEK), orders: 8 }); // proves history reaches 8 weeks back; balances the trend
  const f2 = forecastHours(h2, START, 168);
  check("8,0,…,0 forecasts 2.2 (2.22 rounded to one place)", f2.points[43].orders === 2.2, String(f2.points[43].orders));

  // Trend clamp.
  const h3: HourlyPoint[] = [
    { hourStart: new Date(START.getTime() - 3 * WEEK), orders: 120 }, // weeks 1–4
    { hourStart: new Date(START.getTime() - 7 * WEEK), orders: 80 }, // weeks 5–8
  ];
  const f3 = forecastHours(h3, START, 1);
  check("120 vs 80 is 1.5, clamped to 1.25", f3.trend.factor === 1.25 && f3.trend.last4Weeks === 120 && f3.trend.prior4Weeks === 80, JSON.stringify(f3.trend));
  const f4 = forecastHours([{ hourStart: new Date(START.getTime() - 3 * WEEK), orders: 120 }], START, 1);
  check("no prior weeks leaves the trend at 1", f4.trend.factor === 1);
  const f5 = forecastHours(
    [
      { hourStart: new Date(START.getTime() - 3 * WEEK), orders: 10 },
      { hourStart: new Date(START.getTime() - 7 * WEEK), orders: 80 },
    ],
    START,
    1
  );
  check("a falling trend clamps at 0.75", f5.trend.factor === 0.75, JSON.stringify(f5.trend));

  // Ten days of history is not enough.
  const ten: HourlyPoint[] = [];
  for (let i = 1; i <= 240; i++) ten.push({ hourStart: new Date(START.getTime() - i * H), orders: 2 });
  const f6 = forecastHours(ten, START, 168);
  check("10 days of history is insufficient", f6.insufficientHistory === true && f6.weeksOfHistory === 1, JSON.stringify({ i: f6.insufficientHistory, w: f6.weeksOfHistory }));
  check("...but still returns a forecast", f6.points.length === 168);

  const none = forecastHours([], START, 168);
  check("no history at all: insufficient, all zero, no NaN", none.insufficientHistory === true && none.weeksOfHistory === 0 && none.points.every((p) => p.orders === 0) && allFinite(none));
}

console.log("errorMetrics / backtest");
{
  const m = errorMetrics([
    { forecast: 4, actual: 2 },
    { forecast: 2, actual: 2 },
  ]);
  check("f=4,a=2 and f=2,a=2 → mape 0.5, wape 0.5", near(m.mape ?? -1, 0.5) && near(m.wape ?? -1, 0.5), JSON.stringify(m));
  check("...over two hours with orders", m.hoursCompared === 2);
  const z = errorMetrics([{ forecast: 3, actual: 0 }, { forecast: 0, actual: 0 }]);
  check("all-zero actuals: mape and wape are null, not 0 or Infinity", z.mape === null && z.wape === null && z.hoursCompared === 0, JSON.stringify(z));
  check("no pairs at all is also null", errorMetrics([]).mape === null);

  // A perfect weekly pattern, 12 weeks.
  const now = at(2026, 10, 22, 10);
  const perfect: HourlyPoint[] = [];
  for (let w = 0; w < 12; w++) {
    for (let d = 0; d < 7; d++) {
      for (let hr = 0; hr < 24; hr++) {
        const t = new Date(at(2026, 10, 19, 0).getTime() - w * WEEK + (d * 24 + hr) * H);
        if (t.getTime() < now.getTime()) perfect.push({ hourStart: t, orders: 1 + ((d * 7 + hr) % 9) });
      }
    }
  }
  const b = backtest(perfect, now);
  check("a perfectly periodic history backtests to mape 0 and wape 0", b.mape === 0 && b.wape === 0 && b.hoursCompared > 0, JSON.stringify({ m: b.mape, w: b.wape, n: b.hoursCompared }));
  check("...for 14 days", b.byDay.length === FORECAST.backtestDays);
  check("...each day's forecast equals its actual", b.byDay.every((d) => near(d.forecast, d.actual, 0.05)), JSON.stringify(b.byDay[0]));

  // Data only older than the 14 days, none since: actuals are all zero.
  const old: HourlyPoint[] = [];
  for (let w = 3; w < 11; w++) old.push({ hourStart: new Date(now.getTime() - w * WEEK), orders: 4 });
  const bz = backtest(old, now);
  check("history that stops, then zero actuals: mape and wape null", bz.mape === null && bz.wape === null && bz.hoursCompared === 0, JSON.stringify({ m: bz.mape, w: bz.wape }));
  check("...and nothing is NaN", allFinite(bz));
  check("an empty history backtests to nulls", backtest([], now).mape === null);
}

console.log("productivity");
{
  const hours = (n: number, riders: number, delivered: number) =>
    Array.from({ length: n }, (_, i) => ({ hourStart: new Date(START.getTime() - (i + 1) * H), riderMinutes: riders * 60, delivered }));
  const a = productivity(hours(25, 2, 5), 3.1);
  check("25 hours of 2 riders delivering 5 → 2.5 from the zone", a.value === 2.5 && a.sampleHours === 25 && a.source === "zone", JSON.stringify(a));
  const b = productivity(hours(10, 2, 5), 3.1);
  check("10 hours falls back to the platform figure", b.value === 3.1 && b.source === "platform", JSON.stringify(b));
  const c = productivity(hours(10, 2, 5), null);
  check("...and then to 2.0", c.value === RIDERS.defaultProductivity && c.source === "default", JSON.stringify(c));
  const half = productivity([...hours(25, 2, 5), { hourStart: START, riderMinutes: 20, delivered: 9 }], null);
  check("an hour with under one rider-hour online is not a sample", half.sampleHours === 25);
  const med = productivity(hours(20, 1, 3).concat(hours(1, 1, 100).map((h) => ({ ...h, hourStart: new Date(h.hourStart.getTime() - 40 * H) }))), null);
  check("the median ignores one outlier hour", med.value === 3, JSON.stringify(med));
}

console.log("ridersPlan");
{
  const fc = [
    { hourStart: TARGET, orders: 6.4 },
    { hourStart: new Date(TARGET.getTime() + H), orders: 0.3 },
  ];
  // Usual online at the target weekday-hour: 1, 2, 3, 4 riders in the four weeks before.
  const supply = [1, 2, 3, 4].map((r, i) => ({ hourStart: back(TARGET, i + 1), riderMinutes: r * 60 }));
  const plan = ridersPlan(fc, supply, 2.5);
  check("6.4 orders at 2.5 per rider-hour needs 3", plan[0].ridersNeeded === 3, JSON.stringify(plan[0]));
  check("0.3 orders needs 0", plan[1].ridersNeeded === 0);
  check("usual online is the median of the four weekday-hour samples (2.5)", plan[0].ridersUsuallyOnline === 2.5, JSON.stringify(plan[0]));
  check("gap = needed − usual", plan[0].gap === 0.5, JSON.stringify(plan[0]));
  check("an hour nobody ever worked: usual 0, gap = needed", plan[1].ridersUsuallyOnline === 0 && plan[1].gap === 0);
}

console.log("payloads");
{
  const now = at(2026, 10, 22, 10);
  const area = { type: "scope" as const, id: null, name: "All my zones" };
  const emptyDemand = demandPayload({ now, area, history: [] });
  check("an empty history gives an honest, finite demand payload", allFinite(emptyDemand) && emptyDemand.insufficientHistory === true && emptyDemand.forecast.length === 168, JSON.stringify(emptyDemand.backtest));
  check("...with null error figures", emptyDemand.backtest.mape === null && emptyDemand.backtest.wape === null);
  check("...7 daily rows and no peak", emptyDemand.daily.length === 7 && emptyDemand.peak === null);
  const hist: HourlyPoint[] = [];
  for (let w = 0; w < 9; w++) for (let h = 0; h < 168; h++) hist.push({ hourStart: new Date(at(2026, 10, 19, 0).getTime() - w * WEEK + h * H), orders: h % 24 === 19 ? 6 : 1 });
  const d = demandPayload({ now, area, history: hist.filter((p) => p.hourStart.getTime() < now.getTime()) });
  const row = d.forecast[0];
  check("each forecast row has hourStart, date, weekday, hour, orders, low, high", ["hourStart", "date", "weekday", "hour", "orders", "low", "high"].every((k) => k in row), JSON.stringify(row));
  check("weekday is 1–7 and hour 0–23", d.forecast.every((r) => r.weekday >= 1 && r.weekday <= 7 && r.hour >= 0 && r.hour <= 23));
  check("the forecast starts at the next full hour", new Date(d.forecast[0].hourStart).getTime() > now.getTime() && new Date(d.forecast[0].hourStart).getTime() - now.getTime() <= H);
  check("low ≤ orders ≤ high", d.forecast.every((r) => r.low <= r.orders && r.orders <= r.high));
  check("the peak is a 19:00 hour", d.peak !== null && new Date(d.peak.hourStart).getTime() > 0 && istParts(new Date(d.peak.hourStart)).hour === 19);
  check("the payload is finite", allFinite(d));
  const r = ridersPayload({ now, area, history: hist.filter((p) => p.hourStart.getTime() < now.getTime()), supply: [] });
  check("riders payload: 168 hours, 7 days, a source label", r.hours.length === 168 && r.daily.length === 7 && ["zone", "platform", "default"].includes(r.productivity.source), JSON.stringify(r.productivity));
  check("...and finite", allFinite(r));
  check("...short hours are counted", r.shortHours === r.hours.filter((h) => h.gap > 0).length);
}

console.log("query parsing");
{
  const now = at(2026, 10, 22, 10);
  const bad = parseInsightsQuery(new URLSearchParams("zone=bad"), now);
  check("?zone=bad is a 400 on zone", !bad.ok && bad.status === 400 && bad.body.field === "zone", JSON.stringify(bad));
  const badCity = parseInsightsQuery(new URLSearchParams("city=bad"), now);
  check("?city=bad is a 400 on city", !badCity.ok && badCity.body.field === "city");
  const ok = parseInsightsQuery(new URLSearchParams(""), now, { range: true });
  check("the default range is the last 28 days ending today (IST)", ok.ok && ok.query.range.to === "2026-10-22" && ok.query.range.from === "2026-09-25", JSON.stringify(ok));
  const long = parseInsightsQuery(new URLSearchParams("from=2025-01-01&to=2026-10-01"), now, { range: true });
  check("over 366 days is range_too_long", !long.ok && long.body.error === "range_too_long");
  const future = parseInsightsQuery(new URLSearchParams("from=2026-10-01&to=2026-10-30"), now, { range: true });
  check("a `to` after today is range_in_future", !future.ok && future.body.error === "range_in_future");
  const flipped = parseInsightsQuery(new URLSearchParams("from=2026-10-10&to=2026-10-01"), now, { range: true });
  check("from after to is a 400 on from", !flipped.ok && flipped.body.field === "from");
  const junk = parseInsightsQuery(new URLSearchParams("from=yesterday"), now, { range: true });
  check("a non-date is a 400 on from", !junk.ok && junk.body.field === "from");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
