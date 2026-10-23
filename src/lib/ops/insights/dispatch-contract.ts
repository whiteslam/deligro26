/**
 * The body of a dispatch-mode change (section 17.4). Pure; the database
 * enforces the same limits and the permission.
 */
import { isUuid } from "@/lib/auth/manager-scope";

export type DispatchBody = {
  zoneId: string;
  mode: "offer" | "auto_assign";
  autoAssignMaxLoad: number;
  reason: string;
  clientActionId: string;
};

export type DispatchBodyResult =
  | { ok: true; value: DispatchBody }
  | { ok: false; status: 400 | 422; error: "bad_request" | "reason_required"; field: string };

export function parseDispatchBody(body: unknown): DispatchBodyResult {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (typeof b.zoneId !== "string" || !isUuid(b.zoneId)) return { ok: false, status: 400, error: "bad_request", field: "zoneId" };
  if (b.mode !== "offer" && b.mode !== "auto_assign") return { ok: false, status: 400, error: "bad_request", field: "mode" };
  const load = b.autoAssignMaxLoad;
  if (typeof load !== "number" || !Number.isInteger(load) || load < 0 || load > 3) {
    return { ok: false, status: 400, error: "bad_request", field: "autoAssignMaxLoad" };
  }
  const cid = typeof b.clientActionId === "string" ? b.clientActionId.trim() : "";
  if (cid.length < 1 || cid.length > 80) return { ok: false, status: 400, error: "bad_request", field: "clientActionId" };
  const reason = typeof b.reason === "string" ? b.reason.trim() : "";
  if (reason.length < 3 || reason.length > 300) return { ok: false, status: 422, error: "reason_required", field: "reason" };
  return { ok: true, value: { zoneId: b.zoneId.toLowerCase(), mode: b.mode, autoAssignMaxLoad: load, reason, clientActionId: cid } };
}
