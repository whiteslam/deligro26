/**
 * Service-level helpers (§17.9): the arithmetic of one stage (kept in step with
 * ops_sla_breaches in migration 0171) and the body of a target edit. Pure.
 */
import { isUuid } from "@/lib/auth/manager-scope";

export const SLA_BOUNDS = {
  accept: [1, 60],
  prep: [1, 180],
  pickup: [1, 120],
  deliver: [10, 240],
} as const;

export type StageStat = { orders: number; breaches: number; rate: number; medianMinutes: number | null };

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** How many orders reached a stage, how many ran over `target`, and the median. */
export function stageStat(durations: readonly number[], target: number): StageStat {
  const n = durations.length;
  if (n === 0) return { orders: 0, breaches: 0, rate: 0, medianMinutes: null };
  const breaches = durations.filter((d) => d > target).length;
  const s = [...durations].sort((a, b) => a - b);
  const m = Math.floor(n / 2);
  const med = n % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  return { orders: n, breaches, rate: round4(breaches / n), medianMinutes: round1(med) };
}

/**
 * Several areas' stage figures as one: counts are summed and the rate is
 * recomputed from them (never averaged). A median cannot be summed, so it is
 * null — the database computes city medians from the underlying orders.
 */
export function sumStages(stats: readonly StageStat[]): StageStat {
  const orders = stats.reduce((a, s) => a + s.orders, 0);
  const breaches = stats.reduce((a, s) => a + s.breaches, 0);
  return { orders, breaches, rate: orders > 0 ? round4(breaches / orders) : 0, medianMinutes: null };
}

export type SlaTargetBody = {
  zoneId: string | null;
  acceptMinutes: number;
  prepMinutes: number;
  pickupMinutes: number;
  deliverMinutes: number;
  reason: string;
  clientActionId: string;
};

export type SlaBodyResult =
  | { ok: true; value: SlaTargetBody }
  | { ok: false; status: 400 | 422; error: "bad_request" | "bad_threshold" | "reason_required"; field?: string };

const FIELDS: [keyof typeof SLA_BOUNDS, "acceptMinutes" | "prepMinutes" | "pickupMinutes" | "deliverMinutes"][] = [
  ["accept", "acceptMinutes"],
  ["prep", "prepMinutes"],
  ["pickup", "pickupMinutes"],
  ["deliver", "deliverMinutes"],
];

export function parseSlaTargetBody(body: unknown): SlaBodyResult {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  let zoneId: string | null = null;
  if (b.zoneId !== null && b.zoneId !== undefined) {
    if (typeof b.zoneId !== "string" || !isUuid(b.zoneId)) return { ok: false, status: 400, error: "bad_request", field: "zoneId" };
    zoneId = b.zoneId.toLowerCase();
  }
  const cid = typeof b.clientActionId === "string" ? b.clientActionId.trim() : "";
  if (cid.length < 1 || cid.length > 80) return { ok: false, status: 400, error: "bad_request", field: "clientActionId" };

  const minutes = {} as Record<string, number>;
  for (const [stage, field] of FIELDS) {
    const v = b[field];
    if (typeof v !== "number" || !Number.isFinite(v)) return { ok: false, status: 400, error: "bad_request", field };
    const [lo, hi] = SLA_BOUNDS[stage];
    if (!Number.isInteger(v) || v < lo || v > hi) return { ok: false, status: 400, error: "bad_threshold", field };
    minutes[field] = v;
  }

  const reason = typeof b.reason === "string" ? b.reason.trim() : "";
  if (reason.length < 3 || reason.length > 300) return { ok: false, status: 422, error: "reason_required", field: "reason" };

  return {
    ok: true,
    value: {
      zoneId,
      acceptMinutes: minutes.acceptMinutes,
      prepMinutes: minutes.prepMinutes,
      pickupMinutes: minutes.pickupMinutes,
      deliverMinutes: minutes.deliverMinutes,
      reason,
      clientActionId: cid,
    },
  };
}
