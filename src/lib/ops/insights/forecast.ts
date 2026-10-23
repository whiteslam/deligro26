/**
 * The demand forecast (§17.1) and riders needed (§17.2). Pure: rows in, JSON
 * out; the routes read the hourly rollups (migration 0170) and call this.
 *
 * The method, so a reader can check a figure by hand:
 *
 *   * For a target hour, look at the same weekday-hour 1…8 weeks earlier. A
 *     week counts only once the area had data that long ago (a brand-new zone
 *     is not forecast from imaginary zeros); inside that span a missing hour is
 *     a real zero.
 *   * Recent weeks count more: weight 0.75^(k−1) for k weeks back, normalised
 *     over the weeks that count.
 *   * A trend factor — orders of the last four weeks over the four before, held
 *     between 0.75 and 1.25 — scales the result.
 *   * Fewer than two complete weeks of data is flagged `insufficientHistory`;
 *     the forecast is still returned, and the app says it is thin.
 *   * The error is measured, not claimed: each of the last 14 days is forecast
 *     using only what was known before that day, and MAPE and WAPE are reported
 *     as they come out — `null` when there is nothing to measure, never 0.
 */

export const FORECAST = {
  weeks: 8,
  decay: 0.75,
  trendClamp: [0.75, 1.25],
  minWeeks: 2,
  horizonHours: 168,
  backtestDays: 14,
} as const;

export const RIDERS = {
  productivityDays: 28,
  minSampleHours: 20,
  defaultProductivity: 2.0,
  usualWeeks: 4,
} as const;

const HOUR = 3_600_000;
const WEEK = 168 * HOUR;
/** IST is UTC+5:30 all year; there is no daylight saving to account for. */
const IST_OFFSET = 19_800_000;

export type HourlyPoint = { hourStart: Date; orders: number };
export type SupplyPoint = { hourStart: Date; riderMinutes: number; delivered?: number };
export type Area = { type: "scope" | "city" | "zone"; id: string | null; name: string };

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
/** A finite number or 0 — nothing non-finite ever reaches a payload. */
const fin = (n: number) => (Number.isFinite(n) ? n : 0);

/** The instant the IST hour containing `d` began. */
export function istHourStart(d: Date): Date {
  return new Date(Math.floor((d.getTime() + IST_OFFSET) / HOUR) * HOUR - IST_OFFSET);
}

/** The IST calendar date, weekday (Monday = 1 … Sunday = 7) and hour of an instant. */
export function istParts(d: Date): { date: string; weekday: number; hour: number } {
  const shifted = new Date(d.getTime() + IST_OFFSET);
  const wd = shifted.getUTCDay(); // 0 = Sunday
  return {
    date: shifted.toISOString().slice(0, 10),
    weekday: ((wd + 6) % 7) + 1,
    hour: shifted.getUTCHours(),
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Weighted mean of the weeks that count (`null` = left out). Index 0 is one week back. */
export function weightedBase(values: (number | null)[]): number {
  let num = 0;
  let den = 0;
  values.forEach((v, i) => {
    if (v === null) return;
    const w = FORECAST.decay ** i;
    num += w * v;
    den += w;
  });
  return den > 0 ? num / den : 0;
}

export type ForecastResult = {
  points: { hourStart: Date; orders: number }[];
  trend: { factor: number; last4Weeks: number; prior4Weeks: number };
  insufficientHistory: boolean;
  weeksOfHistory: number;
};

/**
 * `hours` hourly forecasts from `start` (an IST hour start), using only history
 * before `start`.
 */
export function forecastHours(history: readonly HourlyPoint[], start: Date, hours: number): ForecastResult {
  const s = start.getTime();
  const byHour = new Map<number, number>();
  let first = Infinity;
  let last4 = 0;
  let prior4 = 0;
  for (const p of history) {
    const t = p.hourStart.getTime();
    if (t >= s || t < s - FORECAST.weeks * WEEK || !(p.orders >= 0)) continue;
    byHour.set(t, (byHour.get(t) ?? 0) + p.orders);
    if (p.orders > 0 && t < first) first = t;
    if (t >= s - 4 * WEEK) last4 += p.orders;
    else prior4 += p.orders;
  }
  const completeWeeks = Number.isFinite(first) ? Math.min(FORECAST.weeks, Math.floor((s - first) / WEEK)) : 0;
  const [lo, hi] = FORECAST.trendClamp;
  const factor = prior4 > 0 ? Math.min(hi, Math.max(lo, last4 / prior4)) : 1;

  const points: ForecastResult["points"] = [];
  for (let i = 0; i < hours; i++) {
    const h = s + i * HOUR;
    const values: (number | null)[] = [];
    for (let k = 1; k <= FORECAST.weeks; k++) {
      values.push(k > completeWeeks ? null : (byHour.get(h - k * WEEK) ?? 0));
    }
    points.push({ hourStart: new Date(h), orders: round1(fin(weightedBase(values) * factor)) });
  }
  return {
    points,
    trend: { factor: round2(factor), last4Weeks: last4, prior4Weeks: prior4 },
    insufficientHistory: completeWeeks < FORECAST.minWeeks,
    weeksOfHistory: completeWeeks,
  };
}

export type ErrorMetrics = { hoursCompared: number; mape: number | null; wape: number | null };

/**
 * MAPE over the hours that had orders, WAPE over all of them. `null` when there
 * is nothing to measure — a missing error is not a zero error.
 */
export function errorMetrics(pairs: readonly { forecast: number; actual: number }[]): ErrorMetrics {
  let sumAbs = 0;
  let sumActual = 0;
  let pct = 0;
  let n = 0;
  for (const { forecast, actual } of pairs) {
    sumAbs += Math.abs(forecast - actual);
    sumActual += actual;
    if (actual > 0) {
      pct += Math.abs(forecast - actual) / actual;
      n += 1;
    }
  }
  return {
    hoursCompared: n,
    mape: n > 0 ? fin(pct / n) : null,
    wape: sumActual > 0 ? fin(sumAbs / sumActual) : null,
  };
}

export type Backtest = ErrorMetrics & { days: number; byDay: { date: string; forecast: number; actual: number }[] };

/**
 * Forecast each of the last 14 complete IST days from only what was known
 * before it, and compare with what happened. Days with no earlier history to
 * forecast from are left out rather than scored as misses.
 */
export function backtest(history: readonly HourlyPoint[], now: Date): Backtest {
  const actual = new Map<number, number>();
  for (const p of history) actual.set(p.hourStart.getTime(), (actual.get(p.hourStart.getTime()) ?? 0) + p.orders);
  const today = Math.floor((now.getTime() + IST_OFFSET) / (24 * HOUR)) * 24 * HOUR - IST_OFFSET;

  const pairs: { forecast: number; actual: number }[] = [];
  const byDay: Backtest["byDay"] = [];
  for (let i = FORECAST.backtestDays; i >= 1; i--) {
    const dayStart = new Date(today - i * 24 * HOUR);
    const before = history.filter((p) => p.hourStart.getTime() < dayStart.getTime());
    const f = forecastHours(before, dayStart, 24);
    if (f.weeksOfHistory === 0) continue;
    let dayF = 0;
    let dayA = 0;
    f.points.forEach((pt) => {
      const a = actual.get(pt.hourStart.getTime()) ?? 0;
      pairs.push({ forecast: pt.orders, actual: a });
      dayF += pt.orders;
      dayA += a;
    });
    byDay.push({ date: istParts(dayStart).date, forecast: round1(dayF), actual: round1(dayA) });
  }
  return { days: FORECAST.backtestDays, ...errorMetrics(pairs), byDay };
}

export type Productivity = { value: number; sampleHours: number; source: "zone" | "platform" | "default" };

/**
 * Deliveries per online rider-hour: the median over zone-hours with at least
 * one rider-hour online, from the area's own data when there are enough such
 * hours, else the platform's, else 2.0.
 */
export function productivity(supply: readonly SupplyPoint[], platformFallback: number | null): Productivity {
  const ratios = supply
    .filter((p) => p.riderMinutes >= 60)
    .map((p) => (p.delivered ?? 0) / (p.riderMinutes / 60));
  const sampleHours = ratios.length;
  if (sampleHours >= RIDERS.minSampleHours) {
    return { value: round2(fin(median(ratios) ?? RIDERS.defaultProductivity)), sampleHours, source: "zone" };
  }
  if (platformFallback !== null && Number.isFinite(platformFallback) && platformFallback > 0) {
    return { value: round2(platformFallback), sampleHours, source: "platform" };
  }
  return { value: RIDERS.defaultProductivity, sampleHours, source: "default" };
}

export type RidersHour = {
  hourStart: Date;
  forecastOrders: number;
  ridersNeeded: number;
  ridersUsuallyOnline: number;
  gap: number;
};

/** Riders needed each hour against the riders usually online at that weekday-hour. */
export function ridersPlan(
  forecast: readonly { hourStart: Date; orders: number }[],
  supply: readonly { hourStart: Date; riderMinutes: number }[],
  prod: number
): RidersHour[] {
  if (forecast.length === 0) return [];
  const start = forecast[0].hourStart.getTime();
  const minutes = new Map<number, number>();
  const weekHasData = new Array<boolean>(RIDERS.usualWeeks + 1).fill(false);
  for (const p of supply) {
    const t = p.hourStart.getTime();
    minutes.set(t, (minutes.get(t) ?? 0) + p.riderMinutes);
    for (let k = 1; k <= RIDERS.usualWeeks; k++) {
      if (t >= start - k * WEEK && t < start - (k - 1) * WEEK) weekHasData[k] = true;
    }
  }
  return forecast.map((f) => {
    const needed = f.orders < 0.5 || !(prod > 0) ? 0 : Math.ceil(f.orders / prod);
    const samples: number[] = [];
    for (let k = 1; k <= RIDERS.usualWeeks; k++) {
      if (!weekHasData[k]) continue;
      samples.push((minutes.get(f.hourStart.getTime() - k * WEEK) ?? 0) / 60);
    }
    const usual = round1(fin(median(samples) ?? 0));
    return {
      hourStart: f.hourStart,
      forecastOrders: f.orders,
      ridersNeeded: needed,
      ridersUsuallyOnline: usual,
      gap: round1(needed - usual),
    };
  });
}

// ── the pinned JSON ─────────────────────────────────────────────────────────

export type DemandPayload = {
  generatedAt: string;
  area: Area;
  insufficientHistory: boolean;
  weeksOfHistory: number;
  trend: ForecastResult["trend"];
  forecast: { hourStart: string; date: string; weekday: number; hour: number; orders: number; low: number; high: number }[];
  daily: { date: string; orders: number; hours: number }[];
  peak: { hourStart: string; orders: number } | null;
  backtest: { days: number; hoursCompared: number; mape: number | null; wape: number | null; byDay: Backtest["byDay"] };
};

export type RidersPayload = {
  generatedAt: string;
  area: Area;
  productivity: { deliveriesPerRiderHour: number; sampleHours: number; source: Productivity["source"] };
  hours: { hourStart: string; forecastOrders: number; ridersNeeded: number; ridersUsuallyOnline: number; gap: number }[];
  daily: { date: string; peakNeeded: number; peakUsual: number; shortHours: number; hours: number }[];
  shortHours: number;
};

/** The next full IST hour after `now`: where every forecast begins. */
export function forecastStart(now: Date): Date {
  return new Date(istHourStart(now).getTime() + HOUR);
}

export function demandPayload(input: { now: Date; area: Area; history: readonly HourlyPoint[] }): DemandPayload {
  const { now, area, history } = input;
  const f = forecastHours(history, forecastStart(now), FORECAST.horizonHours);
  const bt = backtest(history, now);
  const band = bt.wape === null ? 0 : Math.min(1, Math.max(0, bt.wape));

  const rows = f.points.map((p) => {
    const parts = istParts(p.hourStart);
    return {
      hourStart: p.hourStart.toISOString(),
      date: parts.date,
      weekday: parts.weekday,
      hour: parts.hour,
      orders: p.orders,
      low: round1(Math.max(0, p.orders * (1 - band))),
      high: round1(p.orders * (1 + band)),
    };
  });

  // Calendar dates, the first possibly part-way through; only the first seven
  // are listed, so the last partial date is in the hourly rows alone.
  const daily: DemandPayload["daily"] = [];
  const index = new Map<string, number>();
  for (const r of rows) {
    let i = index.get(r.date);
    if (i === undefined) {
      if (daily.length === 7) continue;
      i = daily.length;
      index.set(r.date, i);
      daily.push({ date: r.date, orders: 0, hours: 0 });
    }
    daily[i].orders = round1(daily[i].orders + r.orders);
    daily[i].hours += 1;
  }

  let peak: DemandPayload["peak"] = null;
  for (const r of rows) if (r.orders > 0 && (peak === null || r.orders > peak.orders)) peak = { hourStart: r.hourStart, orders: r.orders };

  return {
    generatedAt: now.toISOString(),
    area,
    insufficientHistory: f.insufficientHistory,
    weeksOfHistory: f.weeksOfHistory,
    trend: f.trend,
    forecast: rows,
    daily,
    peak,
    backtest: { days: bt.days, hoursCompared: bt.hoursCompared, mape: bt.mape, wape: bt.wape, byDay: bt.byDay },
  };
}

export function ridersPayload(input: {
  now: Date;
  area: Area;
  history: readonly HourlyPoint[];
  supply: readonly SupplyPoint[];
  /** The platform-wide median deliveries per rider-hour, when the database could say. */
  platformProductivity?: number | null;
}): RidersPayload {
  const { now, area, history, supply } = input;
  const f = forecastHours(history, forecastStart(now), FORECAST.horizonHours);
  const since = now.getTime() - RIDERS.productivityDays * 24 * HOUR;
  const prod = productivity(
    supply.filter((p) => p.hourStart.getTime() >= since && p.hourStart.getTime() < now.getTime()),
    input.platformProductivity ?? null
  );
  const plan = ridersPlan(f.points, supply, prod.value);

  const hours = plan.map((p) => ({
    hourStart: p.hourStart.toISOString(),
    forecastOrders: p.forecastOrders,
    ridersNeeded: p.ridersNeeded,
    ridersUsuallyOnline: p.ridersUsuallyOnline,
    gap: p.gap,
  }));

  const daily: RidersPayload["daily"] = [];
  const index = new Map<string, number>();
  for (const h of hours) {
    const date = istParts(new Date(h.hourStart)).date;
    let i = index.get(date);
    if (i === undefined) {
      if (daily.length === 7) continue;
      i = daily.length;
      index.set(date, i);
      daily.push({ date, peakNeeded: 0, peakUsual: 0, shortHours: 0, hours: 0 });
    }
    const d = daily[i];
    d.hours += 1;
    if (h.gap > 0) d.shortHours += 1;
    if (h.ridersNeeded >= d.peakNeeded) {
      d.peakNeeded = h.ridersNeeded;
      d.peakUsual = h.ridersUsuallyOnline;
    }
  }

  return {
    generatedAt: now.toISOString(),
    area,
    productivity: { deliveriesPerRiderHour: prod.value, sampleHours: prod.sampleHours, source: prod.source },
    hours,
    daily,
    shortHours: hours.filter((h) => h.gap > 0).length,
  };
}
