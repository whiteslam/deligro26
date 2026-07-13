import "server-only";

/** PostgREST's "column does not exist". */
export const UNDEFINED_COLUMN = "42703";

export function isMissingColumn(error: { code?: string } | null): boolean {
  return error?.code === UNDEFINED_COLUMN;
}

/**
 * Remembers, per column, whether the database has actually been migrated.
 *
 * Asking PostgREST for a column that doesn't exist is a hard 400, not a null —
 * so a query written for a migration that hasn't been applied yet takes the
 * whole feature down. Rather than let an un-migrated environment serve an empty
 * feed or a dead checkout, the queries here probe once and then serve a
 * degraded-but-honest version until the migration lands.
 *
 * Every entry is a promise to delete: once an environment is known-migrated, the
 * branch that reads it is dead weight.
 */
const known = new Map<string, boolean>();

export function columnKnownMissing(key: string): boolean {
  return known.get(key) === false;
}

export function rememberColumn(key: string, present: boolean): void {
  known.set(key, present);
}
