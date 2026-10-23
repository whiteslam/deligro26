import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { managerApiContext, managerWriteLimit, readJsonObject } from "@/lib/auth/manager-api.server";
import { isUuid, scopeAllows } from "@/lib/auth/manager-scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSlaTargets } from "@/lib/data-access/manager-analytics";
import { parseSlaTargetBody } from "@/lib/ops/insights/sla";

/**
 * PUT    /api/manager/insights/sla-targets  - set the accept / prep / pickup /
 *                                             deliver targets for a zone (or the
 *                                             default, admins only).
 * DELETE /api/manager/insights/sla-targets?zone=<uuid>[&reason=][&clientActionId=]
 *                                           - put a zone back on the default. The
 *                                             reason is optional here (the
 *                                             contract has none); without one the
 *                                             audit row says so plainly.
 *
 * Needs manager.alerts.configure. Both go through the audited, zone-checked,
 * replay-safe database functions; nothing here writes the table.
 */
export const dynamic = "force-dynamic";

/** A database refusal becomes its status and body. */
function answerFor(message: string): Response {
  if (/forbidden/.test(message)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (/reason_required/.test(message)) return NextResponse.json({ error: "reason_required" }, { status: 422 });
  if (/bad_threshold/.test(message)) return NextResponse.json({ error: "bad_threshold" }, { status: 400 });
  if (/not_found/.test(message)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (/client_action_id_conflict/.test(message)) return NextResponse.json({ error: "stale" }, { status: 409 });
  return NextResponse.json({ error: "action_failed" }, { status: 500 });
}

export async function PUT(request: Request) {
  const ctx = await managerApiContext("manager.alerts.configure", request);
  if (ctx instanceof Response) return ctx;
  const limited = await managerWriteLimit(ctx, "sla-target", 30);
  if (limited) return limited;

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const parsed = parseSlaTargetBody(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error, ...(parsed.field ? { field: parsed.field } : {}) }, { status: parsed.status });
  const v = parsed.value;

  // The platform default belongs to admins; a zone outside the caller's scope does not exist to them.
  if (v.zoneId === null && ctx.profile.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (v.zoneId !== null && !scopeAllows(ctx.scope, v.zoneId)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error } = await createAdminClient().rpc("ops_set_sla_target", {
    p_actor: ctx.profile.id,
    p_zone: v.zoneId,
    p_accept: v.acceptMinutes,
    p_prep: v.prepMinutes,
    p_pickup: v.pickupMinutes,
    p_deliver: v.deliverMinutes,
    p_reason: v.reason,
    p_client_action_id: v.clientActionId,
  });
  if (error) return answerFor(error.message ?? "");

  try {
    const targets = await loadSlaTargets(ctx.scope);
    return NextResponse.json({ target: targets.find((t) => t.zoneId === v.zoneId) ?? null });
  } catch {
    // Saved; the re-read failed. The app refetches.
    return NextResponse.json({ target: null });
  }
}

export async function DELETE(request: Request) {
  const ctx = await managerApiContext("manager.alerts.configure", request);
  if (ctx instanceof Response) return ctx;
  const limited = await managerWriteLimit(ctx, "sla-target", 30);
  if (limited) return limited;

  const sp = new URL(request.url).searchParams;
  const zone = sp.get("zone")?.trim() || "";
  if (!isUuid(zone)) return NextResponse.json({ error: "bad_request", field: "zone" }, { status: 400 });
  const zoneId = zone.toLowerCase();
  if (!scopeAllows(ctx.scope, zoneId)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await readJsonObject(request).catch(() => null)) ?? {};
  const reason = String(body.reason ?? sp.get("reason") ?? "Back to the default target").trim();
  const cid = String(body.clientActionId ?? sp.get("clientActionId") ?? "").trim() || randomUUID();

  const { error } = await createAdminClient().rpc("ops_reset_sla_target", {
    p_actor: ctx.profile.id,
    p_zone: zoneId,
    p_reason: reason,
    p_client_action_id: cid,
  });
  if (error) return answerFor(error.message ?? "");
  return NextResponse.json({ ok: true });
}
