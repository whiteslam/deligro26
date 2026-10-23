import { NextResponse } from "next/server";
import { insightsGate } from "@/lib/manager/insights-route";
import { loadHourlySeries } from "@/lib/data-access/manager-insights";
import { ridersPayload } from "@/lib/ops/insights/forecast";

/**
 * GET /api/manager/insights/riders?zone|city — riders needed each hour for the
 * next seven days against the riders usually online at that weekday-hour.
 *
 * Needs manager.insights.view. Riders needed = forecast orders ÷ the area's own
 * deliveries per rider-hour (or the platform's, or 2.0), and the payload says
 * which of the three it used.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await insightsGate(request);
  if (gate instanceof Response) return gate;
  try {
    const { history, supply, platformProductivity } = await loadHourlySeries(gate.scope);
    return NextResponse.json(ridersPayload({ now: gate.now, area: gate.area, history, supply, platformProductivity }));
  } catch {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
