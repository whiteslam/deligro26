import { NextResponse } from "next/server";
import { managerApiContext, managerWriteLimit, readJsonObject } from "@/lib/auth/manager-api.server";
import { isUuid } from "@/lib/auth/manager-scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadFraudCases } from "@/lib/data-access/manager-fraud";
import { parseDismissBody } from "@/lib/ops/insights/fraud-contract";
import { answerFromRpc } from "@/lib/ops/insights/rpc-errors";

/**
 * POST /api/manager/insights/fraud/[alertId]/dismiss { reason, days, clientActionId }
 *
 * Mark a case as a false positive. The reason is required and kept; the alert is
 * resolved with the note "false positive: ...", and the same subject is not
 * raised again for `days` (7-90) unless its measure doubles. One audited,
 * zone-checked, replay-safe database function does it all in one transaction.
 * Needs manager.insights.view and manager.customers.view.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ alertId: string }> }) {
  const ctx = await managerApiContext("manager.insights.view", request);
  if (ctx instanceof Response) return ctx;
  if (ctx.permissions["manager.customers.view"] !== true) {
    return NextResponse.json({ error: "permission_denied", permission: "manager.customers.view" }, { status: 403 });
  }
  const limited = await managerWriteLimit(ctx, "fraud-dismiss", 30);
  if (limited) return limited;

  const { alertId } = await params;
  if (!isUuid(alertId)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const parsed = parseDismissBody(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: parsed.status });
  const v = parsed.value;

  // A case outside the caller's area (or one they may not see) does not exist to them.
  const excludeRules = ctx.permissions["manager.finance.view"] === true ? [] : ["rider_cash_gap"];
  try {
    const found = await loadFraudCases(ctx.scope, { status: null, rule: null, alert: alertId.toLowerCase(), cursor: null, limit: 1, excludeRules });
    if (found.items.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "action_failed" }, { status: 500 });
  }

  const { error } = await createAdminClient().rpc("ops_dismiss_fraud", {
    p_actor: ctx.profile.id,
    p_alert: alertId.toLowerCase(),
    p_reason: v.reason,
    p_days: v.days,
    p_client_action_id: v.clientActionId,
  });
  if (error) return answerFromRpc(error.message);

  try {
    const after = await loadFraudCases(ctx.scope, { status: null, rule: null, alert: alertId.toLowerCase(), cursor: null, limit: 1, excludeRules });
    return NextResponse.json({ case: after.items[0] ?? null });
  } catch {
    // Dismissed; the re-read failed. The app refetches.
    return NextResponse.json({ case: null });
  }
}
