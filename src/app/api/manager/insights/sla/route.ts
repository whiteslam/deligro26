import { NextResponse } from "next/server";
import { insightsGate } from "@/lib/manager/insights-route";
import { loadSlaBreaches, loadSlaTargets } from "@/lib/data-access/manager-analytics";
import { slaPayload } from "@/lib/ops/insights/analytics-payload";

/**
 * GET /api/manager/insights/sla?from&to&zone|city - how often orders ran over
 * the target at each stage (accept, prep, pickup, deliver), overall and by zone,
 * city, shop and rider, with the targets in force. Cancelled orders are in no
 * stage; a stage counts an order only once it reached it.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await insightsGate(request, { range: true });
  if (gate instanceof Response) return gate;
  try {
    const [sla, targets] = await Promise.all([loadSlaBreaches(gate.scope, gate.query.range), loadSlaTargets(gate.scope)]);
    return NextResponse.json(slaPayload({ now: gate.now, area: gate.area, range: gate.query.range, sla: sla as never, targets }));
  } catch {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
