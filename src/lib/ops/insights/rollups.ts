import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Keeps the hourly demand and rider-supply rollups (migration 0170) current.
 *
 * Called from the dispatch sweep, which runs every minute or so; the lease
 * lets one run through every 15 minutes. The first run fills ten weeks; after
 * that each run recomputes the last 72 hours, which is enough for a late
 * cancellation or a shift that ended after the previous run to correct itself.
 * Before 0170 (or 0166, which owns the lease) the RPCs are missing and this
 * quietly does nothing.
 */
export const ROLLUP_LEASE_SECONDS = 900;
export const ROLLUP_WINDOW_HOURS = 72;

export async function refreshInsightRollups(now: Date): Promise<number> {
  const db = createAdminClient();
  const { data: won, error: leaseErr } = await db.rpc("ops_claim_alert_run", {
    p_name: "insight_rollups",
    p_seconds: ROLLUP_LEASE_SECONDS,
  });
  if (leaseErr || won !== true) return 0;

  const { data: filled, error: fillErr } = await db.rpc("ops_backfill_insight_rollups");
  if (fillErr) return 0;
  if (Number(filled) > 0) return Number(filled);

  const from = new Date(now.getTime() - ROLLUP_WINDOW_HOURS * 3_600_000);
  const { data, error } = await db.rpc("ops_refresh_insight_rollups", {
    p_from: from.toISOString(),
    p_to: now.toISOString(),
  });
  if (error) throw error;
  return Number(data) || 0;
}
