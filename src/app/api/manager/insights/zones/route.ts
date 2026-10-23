import { NextResponse } from "next/server";
import { insightsGate } from "@/lib/manager/insights-route";
import { loadZoneGrid } from "@/lib/data-access/manager-analytics";
import { zonesPayload } from "@/lib/ops/insights/analytics-payload";

/**
 * GET /api/manager/insights/zones?from&to&zone|city - where deliveries went, on
 * a 1 km grid, with plain-language suggestions (new zone, uncovered demand,
 * slow area, resize, merge). Cells with fewer than three drops are left out so
 * no single household shows; their drops still count in the zone totals.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await insightsGate(request, { range: true });
  if (gate instanceof Response) return gate;
  try {
    const grid = await loadZoneGrid(gate.scope, gate.query.range);
    return NextResponse.json(zonesPayload({ now: gate.now, area: gate.area, range: gate.query.range, grid: grid as never }));
  } catch {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
