/**
 * Fraud candidates become alerts (section 17.6). Pure: the candidates that
 * `ops_fraud_candidates` returns in, desired alerts out. The alert engine
 * raises them and attaches the evidence; this file decides how they read.
 *
 * Nothing here ever holds a phone number, an address or a device value: a
 * candidate is ids, a count or an amount, and a few short sentences.
 */
import type { DesiredAlert } from "@/lib/ops/alerts/evaluate";

export type FraudRuleId =
  | "customer_cancellations"
  | "code_sharing"
  | "refund_rate"
  | "rider_cash_gap"
  | "unusual_order_value";

export interface FraudCandidate {
  rule: FraudRuleId;
  zoneId: string | null;
  subjectType: string;
  subjectId: string;
  measure: number;
  threshold: number;
  windowDays: number;
  evidence: { kind: string; id: string; at: string; text: string }[];
}

/** Whose alert it is: people who can see customers, or (for cash) finance. */
export function fraudAudiencePermission(rule: FraudRuleId): "manager.customers.view" | "manager.finance.view" {
  return rule === "rider_cash_gap" ? "manager.finance.view" : "manager.customers.view";
}

/** The ISO week of the IST calendar date of an instant, as "2026-W43". */
export function istIsoWeek(at: Date): string {
  const shifted = new Date(at.getTime() + 19_800_000);
  const d = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // the Thursday of this week decides the year
  const isoYear = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const week =
    1 +
    Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function words(c: FraudCandidate): { title: string; body: string } {
  const m = c.measure;
  switch (c.rule) {
    case "customer_cancellations":
      return {
        title: `Possible repeated cancellations: ${m} in ${c.windowDays} days`,
        body: `A customer cancelled or could not be reached ${m} times in the last ${c.windowDays} days. Alerts start at ${c.threshold}.`,
      };
    case "code_sharing":
      return {
        title: `Possible coupon sharing: code ${c.subjectId} used by ${m} accounts that look linked`,
        body: `${m} accounts redeemed ${c.subjectId} more often than it allows per customer, and their orders look linked, in the last ${c.windowDays} days.`,
      };
    case "refund_rate":
      return {
        title: `High refund rate: ${Math.round(m * 100)}% of a customer's delivered orders were refunded`,
        body: `In the last ${c.windowDays} days at least ${Math.round(c.threshold * 100)}% of this customer's delivered orders were refunded.`,
      };
    case "rider_cash_gap":
      return {
        title: `A rider is holding ${rupees(m)} of cash`,
        body: `Cash collected on deliveries more than ${c.windowDays * 24} hours ago has not been handed over, and no dispute is open.`,
      };
    case "unusual_order_value":
      return {
        title: `Unusually large order: ${(Math.round(m * 10) / 10).toFixed(1)}× the usual top order`,
        body: `An order in the last day was ${(Math.round(m * 10) / 10).toFixed(1)} times what only 5% of this zone's orders exceed. Alerts start at ${c.threshold}×.`,
      };
  }
}

export function evaluateFraud(candidates: readonly FraudCandidate[], now: Date): DesiredAlert[] {
  const week = istIsoWeek(now);
  const out: DesiredAlert[] = [];
  for (const c of candidates) {
    // An alert needs a zone to go to; a candidate without one cannot be placed.
    if (!c.zoneId) continue;
    const { title, body } = words(c);
    out.push({
      kind: "fraud_suspected",
      severity: c.measure >= 2 * c.threshold ? "critical" : "warning",
      title,
      body,
      zoneId: c.zoneId,
      entity: { type: c.subjectType, id: c.subjectId },
      // A code can be shared in two zones at once, so its key says which.
      dedupeKey: `fraud_suspected:${c.rule}:${c.subjectId}${c.rule === "code_sharing" ? `:${c.zoneId}` : ""}:${week}`,
      data: { rule: c.rule },
    });
  }
  return out;
}
