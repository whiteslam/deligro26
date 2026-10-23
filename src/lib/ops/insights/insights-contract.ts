/**
 * What every Insights route accepts: an area (`zone` or `city`) and, for the
 * ones that look back over a period, a `from`/`to` range of IST calendar days.
 * Pure; the routes turn a refusal into the JSON status it carries.
 */
import { addDays, istDayKey } from "@/lib/metrics/ist";
import { parseAreaQuery } from "@/lib/ops/area";

export type InsightsQuery = {
  area: { zone: string | null; city: string | null };
  range: { from: string; to: string };
};

export type InsightsRefusal = { ok: false; status: 400; body: { error: string; field?: string } };

export const MAX_RANGE_DAYS = 366;
export const DEFAULT_RANGE_DAYS = 28;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar day (2026-02-30 is not one). */
function validDay(s: string): boolean {
  if (!DAY.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

/**
 * `opts.range` false (the forecast routes) skips the range checks; the query it
 * returns then carries the default range, which the route ignores.
 */
export function parseInsightsQuery(
  sp: URLSearchParams,
  now: Date,
  opts: { range?: boolean; defaultDays?: number } = {}
): { ok: true; query: InsightsQuery } | InsightsRefusal {
  const area = parseAreaQuery(sp);
  if ("error" in area) return { ok: false, status: 400, body: { error: area.error, field: area.field } };

  const today = istDayKey(now);
  const defaultDays = opts.defaultDays ?? DEFAULT_RANGE_DAYS;
  let from = addDays(today, -(defaultDays - 1));
  let to = today;

  if (opts.range) {
    const rawFrom = sp.get("from")?.trim() || null;
    const rawTo = sp.get("to")?.trim() || null;
    if (rawTo !== null) {
      if (!validDay(rawTo)) return { ok: false, status: 400, body: { error: "bad_request", field: "to" } };
      to = rawTo;
    }
    if (rawFrom !== null) {
      if (!validDay(rawFrom)) return { ok: false, status: 400, body: { error: "bad_request", field: "from" } };
      from = rawFrom;
    } else if (rawTo !== null) {
      from = addDays(to, -(defaultDays - 1));
    }
    if (from > to) return { ok: false, status: 400, body: { error: "bad_request", field: "from" } };
    if (to > today) return { ok: false, status: 400, body: { error: "range_in_future", field: "to" } };
    if (daysBetween(from, to) > MAX_RANGE_DAYS) return { ok: false, status: 400, body: { error: "range_too_long", field: "from" } };
  }

  return { ok: true, query: { area, range: { from, to } } };
}
