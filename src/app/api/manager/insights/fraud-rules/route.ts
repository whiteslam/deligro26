import { NextResponse } from "next/server";
import { managerApiContext, managerWriteLimit, readJsonObject } from "@/lib/auth/manager-api.server";
import { isUuid, scopeAllows } from "@/lib/auth/manager-scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { insightsGate } from "@/lib/manager/insights-route";
import { loadFraudRules } from "@/lib/data-access/manager-fraud";
import { parseFraudRuleBody } from "@/lib/ops/insights/fraud-contract";
import { answerFromRpc } from "@/lib/ops/insights/rpc-errors";

/**
 * GET /api/manager/insights/fraud-rules?zone= - the five fraud rules for a zone
 *     (its own settings, else the platform defaults), and whether the master
 *     switch is on. Needs manager.insights.view.
 * PUT /api/manager/insights/fraud-rules - change one rule's threshold, window or
 *     on/off for a zone (or the default, admins only). Needs
 *     manager.alerts.configure. No reason is asked for: a rule is a setting, and
 *     the audit row says "Rule changed" with the before and after.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await insightsGate(request);
  if (gate instanceof Response) return gate;
  try {
    return NextResponse.json(await loadFraudRules(gate.query.area.zone));
  } catch {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const ctx = await managerApiContext("manager.alerts.configure", request);
  if (ctx instanceof Response) return ctx;
  const limited = await managerWriteLimit(ctx, "fraud-rule", 30);
  if (limited) return limited;

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const parsed = parseFraudRuleBody(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: parsed.status });
  const v = parsed.value;

  // The platform default belongs to admins; a zone outside the caller's area does not exist to them.
  if (v.zoneId === null && ctx.profile.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (v.zoneId !== null && (!isUuid(v.zoneId) || !scopeAllows(ctx.scope, v.zoneId))) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error } = await createAdminClient().rpc("ops_set_fraud_rule", {
    p_actor: ctx.profile.id,
    p_rule: v.rule,
    p_zone: v.zoneId,
    p_enabled: v.enabled,
    p_threshold: v.threshold,
    p_window_days: v.windowDays,
    p_client_action_id: v.clientActionId,
  });
  if (error) return answerFromRpc(error.message);

  try {
    const rules = await loadFraudRules(v.zoneId);
    return NextResponse.json({ rule: rules.rules.find((r) => r.rule === v.rule) ?? null });
  } catch {
    // Saved; the re-read failed. The app refetches.
    return NextResponse.json({ rule: null });
  }
}
