/**
 * Automatic rider assignment (section 17.4), the part that needs no database:
 * reading a zone's setting, and the loop that tries up to three riders.
 *
 * The database decides. `ops_auto_assign_delivery` re-checks the one
 * eligibility rule and the rider's load under a lock on the order, so this
 * loop only chooses whom to ask; a refusal is an ordinary answer, and when
 * every rider is refused the caller falls back to the offer path unchanged.
 */

export const AUTO_ASSIGN_TRIES = 3;

export type ZoneDispatchConfig = { mode: "offer" | "auto_assign"; maxLoad: number };

/** A zone row's setting; anything missing or odd is the offer mode, as before 0172. */
export function zoneDispatchConfig(row: unknown): ZoneDispatchConfig {
  const r = (row && typeof row === "object" ? row : {}) as { dispatch_mode?: unknown; auto_assign_max_load?: unknown };
  const load = Number(r.auto_assign_max_load);
  return {
    mode: r.dispatch_mode === "auto_assign" ? "auto_assign" : "offer",
    maxLoad: Number.isFinite(load) ? Math.min(3, Math.max(0, Math.trunc(load))) : 0,
  };
}

export type AutoAssignOutcome<R> =
  | { kind: "assigned"; rider: R }
  | { kind: "taken" }
  | { kind: "fallback"; refusals: string[] };

/**
 * Ask the database to put the order on the first of the best riders it will
 * accept. `ranked` is best first; riders already carrying more than `maxLoad`
 * deliveries are not asked.
 *
 * `call` answers `{ error: true }` when the database call itself failed (the
 * function is missing, the connection dropped) - dispatch then stands down to
 * offers rather than guess - and otherwise `result`: null for success or the
 * database's reason for refusing this rider.
 */
export async function runAutoAssign<R extends { id: string; activeJobs: number }>(
  ranked: readonly R[],
  maxLoad: number,
  call: (rider: R) => Promise<{ error: boolean; result: string | null }>
): Promise<AutoAssignOutcome<R>> {
  const limit = Math.max(0, maxLoad);
  const refusals: string[] = [];
  const asked = ranked.filter((r) => r.activeJobs <= limit).slice(0, AUTO_ASSIGN_TRIES);
  for (const rider of asked) {
    const { error, result } = await call(rider);
    if (error) break;
    if (result === null) return { kind: "assigned", rider };
    // Somebody (a rider, a manager, an earlier run) already has the order, or
    // it is over: nothing to fall back to.
    if (result === "already_assigned" || result === "terminal" || result === "not_found") return { kind: "taken" };
    // The zone was switched back to offers while this ran.
    if (result === "mode_off") break;
    refusals.push(result);
  }
  return { kind: "fallback", refusals };
}
