import { NextResponse } from "next/server";
import { managerApiContext, managerWriteLimit, readJsonObject } from "@/lib/auth/manager-api.server";
import { scopeAllows } from "@/lib/auth/manager-scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { insightsGate } from "@/lib/manager/insights-route";
import { loadDispatchOverview } from "@/lib/data-access/manager-analytics";
import { parseDispatchBody } from "@/lib/ops/insights/dispatch-contract";

/**
 * GET /api/manager/insights/dispatch - each zone's dispatch mode (offers or
 *     automatic assignment) and how deliveries were assigned in the last 24
 *     hours. Needs manager.insights.view.
 * PUT /api/manager/insights/dispatch - switch a zone. Needs
 *     manager.dispatch.configure (off by default); the reason is required and
 *     the change is audited as zone.dispatch_mode in the same transaction.
 *
 * Automatic assignment re-checks the one eligibility rule in the database, so
 * switching a zone on never lets a rider who could not be assigned by hand
 * take an order.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await insightsGate(request);
  if (gate instanceof Response) return gate;
  try {
    const zones = await loadDispatchOverview(gate.scope);
    return NextResponse.json({ zones, canConfigure: gate.ctx.permissions["manager.dispatch.configure"] === true });
  } catch {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const ctx = await managerApiContext("manager.dispatch.configure", request);
  if (ctx instanceof Response) return ctx;
  const limited = await managerWriteLimit(ctx, "dispatch-mode", 30);
  if (limited) return limited;

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const parsed = parseDispatchBody(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: parsed.status });
  const v = parsed.value;
  // A zone outside the caller's scope does not exist to them.
  if (!scopeAllows(ctx.scope, v.zoneId)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error } = await createAdminClient().rpc("ops_set_zone_dispatch", {
    p_actor: ctx.profile.id,
    p_zone: v.zoneId,
    p_mode: v.mode,
    p_max_load: v.autoAssignMaxLoad,
    p_reason: v.reason,
    p_client_action_id: v.clientActionId,
  });
  if (error) {
    const m = error.message ?? "";
    if (/forbidden/.test(m)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (/reason_required/.test(m)) return NextResponse.json({ error: "reason_required" }, { status: 422 });
    if (/bad_request/.test(m)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    if (/not_found/.test(m)) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (/client_action_id_conflict/.test(m)) return NextResponse.json({ error: "stale" }, { status: 409 });
    return NextResponse.json({ error: "action_failed" }, { status: 500 });
  }

  try {
    const zones = await loadDispatchOverview(ctx.scope);
    return NextResponse.json({ zone: zones.find((z) => z.zoneId === v.zoneId) ?? null });
  } catch {
    // Saved; the re-read failed. The app refetches.
    return NextResponse.json({ zone: null });
  }
}
