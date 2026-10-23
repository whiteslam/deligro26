import { NextResponse } from "next/server";
import { insightsGate } from "@/lib/manager/insights-route";
import { loadVendorBenchmarks } from "@/lib/data-access/manager-analytics";
import { loadAreaNames } from "@/lib/data-access/manager-insights";
import { loadZoneCityMap } from "@/lib/data-access/zone-city";
import { isUuid } from "@/lib/auth/manager-scope";
import { parseBenchRows, vendorsPayload } from "@/lib/ops/insights/analytics-payload";

/**
 * GET /api/manager/insights/vendors?from&to&zone|city&vendor&page&pageSize -
 * each shop against the median of its zone and city on prep time, accept time,
 * cancellations, rating, order value and repeat customers. A shop with fewer
 * than five orders is shown but not judged.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await insightsGate(request, { range: true });
  if (gate instanceof Response) return gate;
  const sp = new URL(request.url).searchParams;

  const vendorRaw = sp.get("vendor")?.trim() || null;
  if (vendorRaw && !isUuid(vendorRaw)) return NextResponse.json({ error: "bad_request", field: "vendor" }, { status: 400 });
  const page = sp.get("page") === null ? 1 : Number(sp.get("page"));
  const pageSize = sp.get("pageSize") === null ? 50 : Number(sp.get("pageSize"));
  if (!Number.isInteger(page) || page < 1) return NextResponse.json({ error: "bad_request", field: "page" }, { status: 400 });
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return NextResponse.json({ error: "bad_request", field: "pageSize" }, { status: 400 });

  try {
    const [json, names, zoneCity] = await Promise.all([
      loadVendorBenchmarks(gate.scope, gate.query.range),
      loadAreaNames(),
      loadZoneCityMap(),
    ]);
    return NextResponse.json(
      vendorsPayload({
        now: gate.now,
        area: gate.area,
        range: gate.query.range,
        rows: parseBenchRows(json),
        zoneNames: names.zones,
        cityOf: (zoneId) => zoneCity.get(zoneId) ?? null,
        vendor: vendorRaw ? vendorRaw.toLowerCase() : null,
        page,
        pageSize,
      })
    );
  } catch {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
