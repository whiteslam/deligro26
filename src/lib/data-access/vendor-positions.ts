import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Manual "featured" ordering for vendors (migration 0021). A shop can be pinned
 * to a slot 1–10; NULL means unranked. Both the admin list and the customer feed
 * read positions through here.
 *
 * Resilient by design: if migration 0021 hasn't run, the `sort_position` column
 * is absent (PostgREST 42703). Rather than take the catalog down, we latch that
 * once and quietly behave as if nothing is pinned — the feed keeps its default
 * order until the migration is applied.
 */

const UNDEFINED_COLUMN = "42703";

/** null = not probed yet; false = column absent; true = present. */
let hasColumn: boolean | null = null;

export interface VendorPositionMap {
  byId: Map<string, number>;
  bySlug: Map<string, number>;
}

/** Every pinned shop's position, keyed by both id and slug. Never throws. */
export async function getVendorPositions(): Promise<VendorPositionMap> {
  const byId = new Map<string, number>();
  const bySlug = new Map<string, number>();
  if (hasColumn === false) return { byId, bySlug };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, slug, sort_position")
    .not("sort_position", "is", null);

  if (error) {
    if (error.code === UNDEFINED_COLUMN) hasColumn = false;
    return { byId, bySlug };
  }
  hasColumn = true;

  for (const r of (data ?? []) as {
    id: string;
    slug: string;
    sort_position: number | null;
  }[]) {
    if (r.sort_position == null) continue;
    byId.set(r.id, r.sort_position);
    bySlug.set(r.slug, r.sort_position);
  }
  return { byId, bySlug };
}

/** Pin a shop to slot 1–10, or pass null to unrank it. Admin-only via RLS. */
export async function setVendorPosition(
  id: string,
  position: number | null
): Promise<void> {
  const value =
    position == null ? null : Math.min(10, Math.max(1, Math.trunc(position)));
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ sort_position: value })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Stable-sort a list so pinned entries come first in ascending slot order and
 * everything else keeps its original order. `key` maps an item to its lookup
 * key (slug or id) in the position map.
 */
export function applyVendorOrder<T>(
  items: T[],
  positions: Map<string, number>,
  key: (item: T) => string
): T[] {
  if (positions.size === 0) return items;
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const pa = positions.get(key(a.item));
      const pb = positions.get(key(b.item));
      if (pa != null && pb != null) return pa - pb || a.index - b.index;
      if (pa != null) return -1;
      if (pb != null) return 1;
      return a.index - b.index;
    })
    .map((x) => x.item);
}
