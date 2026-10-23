import { NextResponse } from "next/server";
import { insightsGate } from "@/lib/manager/insights-route";
import { loadHourlySeries } from "@/lib/data-access/manager-insights";
import { demandPayload } from "@/lib/ops/insights/forecast";

/**
 * GET /api/manager/insights/demand?zone|city — the next seven days of orders by
 * hour, with the error of the same method over the last fourteen days.
 *
 * Reads the hourly rollups (migration 0170), never orders. Needs
 * manager.insights.view; the area can only narrow what the caller already sees.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await insightsGate(request);
  if (gate instanceof Response) return gate;
  try {
    const { history } = await loadHourlySeries(gate.scope);
    return NextResponse.json(demandPayload({ now: gate.now, area: gate.area, history }));
  } catch {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
