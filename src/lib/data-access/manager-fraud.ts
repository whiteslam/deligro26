import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ManagerScope } from "@/lib/auth/manager-scope";
import {
  fraudCasePayload,
  fraudRulesPayload,
  type FraudCase,
  type FraudCaseRow,
  type FraudRuleRow,
} from "@/lib/ops/insights/fraud-contract";

/**
 * Fraud cases and rules (migration 0173). Cases are alerts of kind
 * fraud_suspected joined to the evidence the engine attached; the database
 * applies the zone scope and the rules a caller may not see. Service role,
 * behind managerApiContext().
 */
export type FraudCaseQuery = {
  status: "open" | "dismissed" | "resolved" | null;
  rule: string | null;
  alert: string | null;
  cursor: { at: string; id: string } | null;
  limit: number;
  /** Rules the caller must not see at all (cash gaps without finance access). */
  excludeRules: string[];
};

export async function loadFraudCases(
  scope: ManagerScope,
  q: FraudCaseQuery
): Promise<{ items: FraudCase[]; nextCursor: string | null; counts: { open: number; dismissed: number; resolved: number } }> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("ops_fraud_cases", {
    p_zone_ids: scope.all ? null : scope.zoneIds,
    p_all: scope.all,
    p_status: q.status,
    p_rule: q.rule,
    p_alert: q.alert,
    p_cursor_at: q.cursor?.at ?? null,
    p_cursor_id: q.cursor?.id ?? null,
    p_limit: q.limit,
    p_exclude_rules: q.excludeRules,
  });
  if (error) throw error;
  const j = (data ?? {}) as { items?: FraudCaseRow[]; counts?: { open: number; dismissed: number; resolved: number } };
  const rows = j.items ?? [];

  const ids = [...new Set(rows.map((r) => r.dismissal?.by).filter((x): x is string => !!x))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: ps } = await db.from("profiles").select("id, full_name").in("id", ids);
    for (const p of (ps ?? []) as { id: string; full_name: string | null }[]) names.set(p.id, p.full_name?.trim() || "Staff");
  }

  const items = rows.map((r) => fraudCasePayload(r, names));
  const last = rows[rows.length - 1];
  return {
    items,
    nextCursor: rows.length >= q.limit && last ? `${last.openedAt}|${last.alertId}` : null,
    counts: {
      open: Number(j.counts?.open ?? 0),
      dismissed: Number(j.counts?.dismissed ?? 0),
      resolved: Number(j.counts?.resolved ?? 0),
    },
  };
}

/** Each fraud rule for a zone, with whether the master switch is on. */
export async function loadFraudRules(zoneId: string | null) {
  const db = createAdminClient();
  const [{ data: rules, error }, { data: master }] = await Promise.all([
    db.from("ops_fraud_rules").select("rule, zone_id, enabled, threshold, window_days"),
    db.from("ops_alert_rules").select("enabled").eq("kind", "fraud_suspected").is("zone_id", null).maybeSingle(),
  ]);
  if (error) throw error;
  return fraudRulesPayload((rules ?? []) as FraudRuleRow[], zoneId, (master as { enabled: boolean } | null)?.enabled ?? false);
}

/** "2026-10-20T10:00:00.000Z|<uuid>" back into its parts, or null if it is anything else. */
export function parseCaseCursor(raw: string | null): { at: string; id: string } | null | "bad" {
  if (!raw) return null;
  const [at, id] = raw.split("|");
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return at && id && iso.test(at) && uuid.test(id) && !Number.isNaN(Date.parse(at)) ? { at, id: id.toLowerCase() } : "bad";
}
