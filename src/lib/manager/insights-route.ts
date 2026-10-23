import "server-only";
import { NextResponse } from "next/server";
import { managerApiContext, managerWriteLimit, type ManagerApiContext } from "@/lib/auth/manager-api.server";
import { narrowScope, type ManagerScope } from "@/lib/auth/manager-scope";
import { areaLabel } from "@/lib/ops/area";
import { loadAreaNames } from "@/lib/data-access/manager-insights";
import { parseInsightsQuery, type InsightsQuery } from "@/lib/ops/insights/insights-contract";
import type { Area } from "@/lib/ops/insights/forecast";
import type { FeatureKey } from "@/lib/features/catalog";

/**
 * The opening every Insights read shares: the gate (with its permission), the
 * per-person read budget, the query, and the scope narrowed to the area asked
 * for. `ctx.scope` is already limited to a `city` by managerApiContext; a `zone`
 * is applied here, and a zone the caller does not hold is an empty scope.
 */
export type InsightsGate = {
  ctx: ManagerApiContext;
  query: InsightsQuery;
  scope: ManagerScope;
  area: Area;
  now: Date;
};

export async function insightsGate(
  request: Request,
  opts: { permission?: FeatureKey; range?: boolean; defaultDays?: number } = {}
): Promise<InsightsGate | Response> {
  const ctx = await managerApiContext(opts.permission ?? "manager.insights.view", request);
  if (ctx instanceof Response) return ctx;
  const limited = await managerWriteLimit(ctx, "insights-read", 60);
  if (limited) return limited;

  const now = new Date();
  const parsed = parseInsightsQuery(new URL(request.url).searchParams, now, { range: opts.range, defaultDays: opts.defaultDays });
  if (!parsed.ok) return NextResponse.json(parsed.body, { status: parsed.status });

  const scope = narrowScope(ctx.scope, parsed.query.area.zone);
  const names = await loadAreaNames().catch(() => ({ zones: new Map<string, string>(), cities: new Map<string, string>() }));
  return { ctx, query: parsed.query, scope, area: areaLabel(scope, parsed.query.area, names), now };
}
