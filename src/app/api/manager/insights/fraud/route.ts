import { NextResponse } from "next/server";
import { insightsGate } from "@/lib/manager/insights-route";
import { loadFraudCases, parseCaseCursor } from "@/lib/data-access/manager-fraud";
import { isFraudRule } from "@/lib/ops/insights/fraud-contract";

/**
 * GET /api/manager/insights/fraud?status=open|dismissed|resolved&rule&zone|city&cursor&limit
 *
 * The fraud cases in the caller's area: who or what looks suspicious, the
 * measure against its threshold, and up to 20 lines of evidence (ids, times and
 * short sentences - never a phone, an address or a device). Needs
 * manager.insights.view and manager.customers.view; cash-gap cases need
 * manager.finance.view as well and are left out (even from the counts) without it.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await insightsGate(request);
  if (gate instanceof Response) return gate;
  if (gate.ctx.permissions["manager.customers.view"] !== true) {
    return NextResponse.json({ error: "permission_denied", permission: "manager.customers.view" }, { status: 403 });
  }
  const sp = new URL(request.url).searchParams;

  const status = sp.get("status");
  if (status !== null && status !== "open" && status !== "dismissed" && status !== "resolved") {
    return NextResponse.json({ error: "bad_request", field: "status" }, { status: 400 });
  }
  const rule = sp.get("rule");
  if (rule !== null && !isFraudRule(rule)) return NextResponse.json({ error: "bad_request", field: "rule" }, { status: 400 });
  const cursor = parseCaseCursor(sp.get("cursor"));
  if (cursor === "bad") return NextResponse.json({ error: "bad_request", field: "cursor" }, { status: 400 });
  const limit = sp.get("limit") === null ? 20 : Number(sp.get("limit"));
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return NextResponse.json({ error: "bad_request", field: "limit" }, { status: 400 });

  try {
    const r = await loadFraudCases(gate.scope, {
      status,
      rule,
      alert: null,
      cursor,
      limit,
      excludeRules: gate.ctx.permissions["manager.finance.view"] === true ? [] : ["rider_cash_gap"],
    });
    return NextResponse.json({ items: r.items, nextCursor: r.nextCursor, counts: r.counts });
  } catch {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
