/**
 * SLA breach alerts (section 17.9). Pure: the rows `ops_sla_live` returns in,
 * desired alerts out. A row is one zone and stage over the trailing hour; it
 * alerts when enough orders reached the stage and enough of them ran over.
 */
import type { DesiredAlert } from "@/lib/ops/alerts/evaluate";

export type SlaStage = "accept" | "prep" | "pickup" | "deliver";

export interface SlaLiveRow {
  zoneId: string;
  stage: SlaStage;
  orders: number;
  breaches: number;
  rate: number;
}

/** Below this many orders a percentage means nothing. */
export const SLA_MIN_ORDERS = 5;
export const SLA_DEFAULT_THRESHOLD_PCT = 25;

const LABEL: Record<SlaStage, string> = { accept: "Accept", prep: "Prep", pickup: "Pickup", deliver: "Delivery" };
const PHRASE: Record<SlaStage, string> = { accept: "acceptance", prep: "preparation", pickup: "pickup", deliver: "delivery" };

/** The IST hour of an instant as "2026-10-21T11". */
export function istHourKey(at: Date): string {
  return new Date(at.getTime() + 19_800_000).toISOString().slice(0, 13);
}

export function evaluateSla(
  rows: readonly SlaLiveRow[],
  rule: { enabled: boolean; threshold: number | null } | null,
  zoneNames: ReadonlyMap<string, string>,
  now: Date
): DesiredAlert[] {
  if (rule && !rule.enabled) return [];
  const threshold = rule?.threshold ?? SLA_DEFAULT_THRESHOLD_PCT;
  const hour = istHourKey(now);
  const out: DesiredAlert[] = [];
  for (const r of rows) {
    if (r.orders < SLA_MIN_ORDERS) continue;
    const pct = r.rate * 100;
    if (pct < threshold - 1e-9) continue;
    const zone = zoneNames.get(r.zoneId);
    out.push({
      kind: "sla_breach",
      severity: pct >= 2 * threshold - 1e-9 ? "critical" : "warning",
      title: `${LABEL[r.stage]} SLA breached for ${Math.round(pct)}% of orders in ${zone ?? "this zone"} in the last hour`,
      body: `${r.breaches} of ${r.orders} orders ran over the ${PHRASE[r.stage]} target in the last hour. Alerts start at ${threshold}%.`,
      zoneId: r.zoneId,
      entity: { type: "zone", id: r.zoneId },
      dedupeKey: `sla_breach:${r.zoneId}:${r.stage}:${hour}`,
      data: { stage: r.stage },
    });
  }
  return out;
}
