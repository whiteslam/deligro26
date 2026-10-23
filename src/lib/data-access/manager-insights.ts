import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listCitiesWithZones } from "@/lib/data-access/zones";
import type { ManagerScope } from "@/lib/auth/manager-scope";
import type { HourlyPoint, SupplyPoint } from "@/lib/ops/insights/forecast";

/**
 * The hourly demand and rider-supply series behind the forecast, read from the
 * rollups (migration 0170) summed across the zones in scope — one RPC, one
 * value, never a row-per-order pull. Service role, behind managerApiContext().
 */
export type HourlySeries = {
  history: HourlyPoint[];
  supply: SupplyPoint[];
  /** The platform-wide median deliveries per rider-hour, when there is a sample. */
  platformProductivity: number | null;
};

type HourlyJson = {
  demand?: [number, number][];
  supply?: [number, number, number][];
  platform?: { median: number | null; sampleHours: number } | null;
};

export async function loadHourlySeries(scope: ManagerScope, weeks = 10): Promise<HourlySeries> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("ops_insight_hourly", {
    p_zone_ids: scope.all ? null : scope.zoneIds,
    p_all: scope.all,
    p_weeks: weeks,
  });
  if (error) throw error;
  const j = (data ?? {}) as HourlyJson;
  return {
    history: (j.demand ?? []).map(([sec, orders]) => ({ hourStart: new Date(Number(sec) * 1000), orders: Number(orders) })),
    supply: (j.supply ?? []).map(([sec, minutes, delivered]) => ({
      hourStart: new Date(Number(sec) * 1000),
      riderMinutes: Number(minutes),
      delivered: Number(delivered),
    })),
    platformProductivity: j.platform && Number(j.platform.sampleHours) >= 20 ? Number(j.platform.median) : null,
  };
}

/** Zone and city names for the `Area` label every insight payload carries. */
export async function loadAreaNames(): Promise<{ zones: Map<string, string>; cities: Map<string, string> }> {
  const zones = new Map<string, string>();
  const cities = new Map<string, string>();
  for (const c of await listCitiesWithZones()) {
    cities.set(c.id, c.name);
    for (const z of c.zones) zones.set(z.id, z.name);
  }
  return { zones, cities };
}
