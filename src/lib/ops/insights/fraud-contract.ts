/**
 * The fraud screens' JSON and request bodies (section 17.6). Pure.
 *
 * Whatever the database hands over, an evidence row leaves as exactly four
 * fields (kind, id, at, text), at most twenty of them, and any text that looks
 * like a phone number is blanked. The rules and the cases never carry a phone,
 * an address or a device value in the first place; this is the last guard.
 */
import { isUuid } from "@/lib/auth/manager-scope";
import type { FraudRuleId } from "@/lib/ops/alerts/fraud";

export type FraudUnit = "count" | "ratio" | "rupees" | "multiple";

export const FRAUD_RULES: Record<
  FraudRuleId,
  { label: string; description: string; unit: FraudUnit; bounds: [number, number]; defaultWindowDays: number }
> = {
  customer_cancellations: {
    label: "Customer cancellations",
    description: "A customer cancelled, or could not be reached at the door, too many times in a short while.",
    unit: "count",
    bounds: [1, 50],
    defaultWindowDays: 7,
  },
  code_sharing: {
    label: "Coupon sharing",
    description: "One code was used by several accounts whose orders look linked, more often than the code allows.",
    unit: "count",
    bounds: [2, 50],
    defaultWindowDays: 30,
  },
  refund_rate: {
    label: "Refund rate",
    description: "A large share of a customer's delivered orders were refunded.",
    unit: "ratio",
    bounds: [0.05, 1],
    defaultWindowDays: 30,
  },
  rider_cash_gap: {
    label: "Rider cash gap",
    description: "A rider has cash from deliveries that is days old and has not been handed over.",
    unit: "rupees",
    bounds: [100, 100000],
    defaultWindowDays: 2,
  },
  unusual_order_value: {
    label: "Unusual order value",
    description: "An order is far above what almost every other order in the zone costs.",
    unit: "multiple",
    bounds: [1.5, 20],
    defaultWindowDays: 30,
  },
};

const RULE_IDS = Object.keys(FRAUD_RULES) as FraudRuleId[];
export const isFraudRule = (v: unknown): v is FraudRuleId => typeof v === "string" && (RULE_IDS as string[]).includes(v);

// ── request bodies ──────────────────────────────────────────────────────────

type Bad = { ok: false; status: 400 | 422; error: "bad_request" | "reason_required"; field: string };

export function parseDismissBody(
  body: unknown
): { ok: true; value: { reason: string; days: number; clientActionId: string } } | Bad {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const cid = typeof b.clientActionId === "string" ? b.clientActionId.trim() : "";
  if (cid.length < 1 || cid.length > 80) return { ok: false, status: 400, error: "bad_request", field: "clientActionId" };
  const days = b.days === undefined ? 30 : b.days;
  if (typeof days !== "number" || !Number.isInteger(days) || days < 7 || days > 90) {
    return { ok: false, status: 400, error: "bad_request", field: "days" };
  }
  const reason = typeof b.reason === "string" ? b.reason.trim() : "";
  if (reason.length < 3 || reason.length > 300) return { ok: false, status: 422, error: "reason_required", field: "reason" };
  return { ok: true, value: { reason, days, clientActionId: cid } };
}

/** A rule edit asks for no reason: it is a setting, recorded as "Rule changed". */
export function parseFraudRuleBody(
  body: unknown
):
  | { ok: true; value: { rule: FraudRuleId; zoneId: string | null; enabled: boolean; threshold: number; windowDays: number; clientActionId: string } }
  | Bad {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (!isFraudRule(b.rule)) return { ok: false, status: 400, error: "bad_request", field: "rule" };
  let zoneId: string | null = null;
  if (b.zoneId !== null && b.zoneId !== undefined) {
    if (typeof b.zoneId !== "string" || !isUuid(b.zoneId)) return { ok: false, status: 400, error: "bad_request", field: "zoneId" };
    zoneId = b.zoneId.toLowerCase();
  }
  if (typeof b.enabled !== "boolean") return { ok: false, status: 400, error: "bad_request", field: "enabled" };
  const [lo, hi] = FRAUD_RULES[b.rule].bounds;
  if (typeof b.threshold !== "number" || !Number.isFinite(b.threshold) || b.threshold < lo || b.threshold > hi) {
    return { ok: false, status: 400, error: "bad_request", field: "threshold" };
  }
  if (typeof b.windowDays !== "number" || !Number.isInteger(b.windowDays) || b.windowDays < 1 || b.windowDays > 90) {
    return { ok: false, status: 400, error: "bad_request", field: "windowDays" };
  }
  const cid = typeof b.clientActionId === "string" ? b.clientActionId.trim() : "";
  if (cid.length < 1 || cid.length > 80) return { ok: false, status: 400, error: "bad_request", field: "clientActionId" };
  return {
    ok: true,
    value: { rule: b.rule, zoneId, enabled: b.enabled, threshold: b.threshold, windowDays: b.windowDays, clientActionId: cid },
  };
}

// ── a case, as the app sees it ───────────────────────────────────────────────

const PHONE_LIKE = /\+91|\b\d{10}\b/;
const scrub = (text: unknown): string => {
  const t = typeof text === "string" ? text : "";
  return PHONE_LIKE.test(t) ? "Details withheld" : t.slice(0, 160);
};

export interface FraudCaseRow {
  alertId: string;
  rule: string;
  severity: string;
  status: string;
  zoneId: string | null;
  openedAt: string;
  subject: { type: string; id: string; label?: string | null };
  measure: { value: number; threshold: number; unit: string; windowDays: number };
  evidence: unknown[];
  dismissal: { by: string | null; reason: string; until: string } | null;
}

export function fraudCasePayload(row: FraudCaseRow, names: ReadonlyMap<string, string>) {
  const evidence = (Array.isArray(row.evidence) ? row.evidence : []).slice(0, 20).map((e) => {
    const x = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
    return { kind: String(x.kind ?? ""), id: String(x.id ?? ""), at: String(x.at ?? ""), text: scrub(x.text) };
  });
  const label =
    row.subject.label?.trim() ||
    (row.subject.type === "code" ? row.subject.id : `${row.subject.type[0].toUpperCase()}${row.subject.type.slice(1)} ${row.subject.id.slice(0, 8)}`);
  return {
    alertId: row.alertId,
    rule: row.rule,
    severity: row.severity,
    status: row.status,
    zoneId: row.zoneId,
    openedAt: row.openedAt,
    subject: { type: row.subject.type, id: row.subject.id, label },
    measure: row.measure,
    evidence,
    dismissal: row.dismissal
      ? {
          by: { id: row.dismissal.by ?? "", name: (row.dismissal.by ? names.get(row.dismissal.by) : undefined) ?? "Staff" },
          reason: row.dismissal.reason,
          until: row.dismissal.until,
        }
      : null,
  };
}

export type FraudCase = ReturnType<typeof fraudCasePayload>;

// ── the rules screen ─────────────────────────────────────────────────────────

export interface FraudRuleRow {
  rule: string;
  zone_id: string | null;
  enabled: boolean;
  threshold: number | string;
  window_days: number;
}

/** Each rule for a zone: its own row, else the default (inherited). */
export function fraudRulesPayload(rows: readonly FraudRuleRow[], zoneId: string | null, masterEnabled: boolean) {
  return {
    enabled: masterEnabled,
    rules: RULE_IDS.map((rule) => {
      const own = zoneId ? rows.find((r) => r.rule === rule && r.zone_id === zoneId) : undefined;
      const def = rows.find((r) => r.rule === rule && r.zone_id === null);
      const r = own ?? def;
      const meta = FRAUD_RULES[rule];
      return {
        rule,
        zoneId: own ? zoneId : null,
        inherited: !own,
        enabled: r?.enabled ?? true,
        threshold: r ? Number(r.threshold) : meta.bounds[0],
        windowDays: r?.window_days ?? meta.defaultWindowDays,
        unit: meta.unit,
        label: meta.label,
        description: meta.description,
      };
    }),
  };
}
