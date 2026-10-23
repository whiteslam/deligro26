import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { scopeZoneIds, type ManagerScope } from "@/lib/auth/manager-scope";
import { istDayStart } from "@/lib/metrics/ist";
import { listCitiesWithZones } from "@/lib/data-access/zones";
import { rangeEndExclusive, slaTargets, type Range, type SlaTarget, type SlaTargetRow } from "@/lib/ops/insights/analytics-payload";

/**
 * The zone grid, vendor benchmarks and SLA analyses (migration 0171). Each is
 * one RPC returning one jsonb value, computed in the database for the zones in
 * scope - never a pull of orders into Node. Service role, behind
 * managerApiContext().
 */
function scopeArgs(scope: ManagerScope) {
  return { p_zone_ids: scope.all ? null : scope.zoneIds, p_all: scope.all };
}

function bounds(range: Range) {
  return { p_from: istDayStart(range.from).toISOString(), p_to: istDayStart(rangeEndExclusive(range)).toISOString() };
}

export async function loadZoneGrid(scope: ManagerScope, range: Range, minCellDrops = 3): Promise<unknown> {
  const { data, error } = await createAdminClient().rpc("ops_zone_grid", { ...scopeArgs(scope), ...bounds(range), p_min_cell_drops: minCellDrops });
  if (error) throw error;
  return data;
}

export async function loadVendorBenchmarks(scope: ManagerScope, range: Range): Promise<unknown> {
  const { data, error } = await createAdminClient().rpc("ops_vendor_benchmarks", { ...scopeArgs(scope), ...bounds(range) });
  if (error) throw error;
  return data;
}

export async function loadSlaBreaches(scope: ManagerScope, range: Range): Promise<unknown> {
  const { data, error } = await createAdminClient().rpc("ops_sla_breaches", { ...scopeArgs(scope), ...bounds(range) });
  if (error) throw error;
  return data;
}

/** The default target and one entry per zone in scope (its own row, or the inherited default). */
export async function loadSlaTargets(scope: ManagerScope): Promise<SlaTarget[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("ops_sla_targets")
    .select("zone_id, accept_minutes, prep_minutes, pickup_minutes, deliver_minutes, updated_by, updated_at");
  if (error) throw error;
  const rows = (data ?? []) as SlaTargetRow[];

  const zones = scopeZoneIds(scope);
  const all = (await listCitiesWithZones()).flatMap((c) => c.zones.filter((z) => z.isActive).map((z) => z.id));
  const inScope = zones === null ? all : all.filter((z) => zones.includes(z));

  const ids = [...new Set(rows.map((r) => r.updated_by).filter((x): x is string => !!x))];
  const people = new Map<string, string>();
  if (ids.length > 0) {
    const { data: ps } = await db.from("profiles").select("id, full_name").in("id", ids);
    for (const p of (ps ?? []) as { id: string; full_name: string | null }[]) people.set(p.id, p.full_name?.trim() || "Staff");
  }
  return slaTargets(rows, inScope, people);
}

export type DispatchZone = {
  zoneId: string;
  name: string;
  cityName: string;
  mode: "offer" | "auto_assign";
  autoAssignMaxLoad: number;
  updatedBy: { id: string; name: string } | null;
  updatedAt: string | null;
  last24h: { auto: number; offerAccepted: number; ops: number; fellBackToOffer: number };
};

/** Each zone's dispatch mode and what happened in the last 24 hours (migration 0172). */
export async function loadDispatchOverview(scope: ManagerScope): Promise<DispatchZone[]> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("ops_dispatch_overview", scopeArgs(scope));
  if (error) throw error;
  const rows = (data ?? []) as (Omit<DispatchZone, "updatedBy"> & { updatedBy: string | null })[];

  const ids = [...new Set(rows.map((r) => r.updatedBy).filter((x): x is string => !!x))];
  const people = new Map<string, string>();
  if (ids.length > 0) {
    const { data: ps } = await db.from("profiles").select("id, full_name").in("id", ids);
    for (const p of (ps ?? []) as { id: string; full_name: string | null }[]) people.set(p.id, p.full_name?.trim() || "Staff");
  }
  return rows.map((r) => ({
    ...r,
    last24h: {
      auto: Number(r.last24h.auto),
      offerAccepted: Number(r.last24h.offerAccepted),
      ops: Number(r.last24h.ops),
      fellBackToOffer: Number(r.last24h.fellBackToOffer),
    },
    updatedBy: r.updatedBy ? { id: r.updatedBy, name: people.get(r.updatedBy) ?? "Staff" } : null,
  }));
}
