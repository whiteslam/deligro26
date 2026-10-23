import { NextResponse } from "next/server";
import { insightsGate } from "@/lib/manager/insights-route";
import { loadFraudCases } from "@/lib/data-access/manager-fraud";
import { isUuid } from "@/lib/auth/manager-scope";

/**
 * GET /api/manager/insights/fraud/[alertId] - one case, by its alert id (a push
 * or an inbox row opens it directly). Same permissions and the same scope as the
 * list; a case outside the caller's area, or a cash-gap case without finance
 * access, is simply not found.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ alertId: string }> }) {
  const gate = await insightsGate(request);
  if (gate instanceof Response) return gate;
  if (gate.ctx.permissions["manager.customers.view"] !== true) {
    return NextResponse.json({ error: "permission_denied", permission: "manager.customers.view" }, { status: 403 });
  }
  const { alertId } = await params;
  if (!isUuid(alertId)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const r = await loadFraudCases(gate.scope, {
      status: null,
      rule: null,
      alert: alertId.toLowerCase(),
      cursor: null,
      limit: 1,
      excludeRules: gate.ctx.permissions["manager.finance.view"] === true ? [] : ["rider_cash_gap"],
    });
    const item = r.items[0];
    return item ? NextResponse.json({ case: item }) : NextResponse.json({ error: "not_found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
