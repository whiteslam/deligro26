import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Manual "featured" ordering for vendors (migration 0021). A shop can be pinned
 * to a slot 1–10; NULL means unranked. The admin list, the slots board and the
 * customer feed all read and write positions through here — one slot, one shop
 * (see setVendorPosition).
 *
 * Resilient by design: if migration 0021 hasn't run, the `sort_position` column
 * is absent (PostgREST 42703). Rather than take the catalog down, we latch that
 * once and quietly behave as if nothing is pinned — the feed keeps its default
 * order until the migration is applied.
 */

const UNDEFINED_COLUMN = "42703";

/** How many featured slots the board offers. Matches the 0021 CHECK (1–10). */
export const SLOT_COUNT = 10;

/** [1..SLOT_COUNT] — the board's rows, in rank order. */
export const SLOT_POSITIONS = Array.from({ length: SLOT_COUNT }, (_, i) => i + 1);

/** null = not probed yet; false = column absent; true = present. */
let hasColumn: boolean | null = null;

/**
 * Has migration 0021 been applied? Head-only probe, sharing the latch above so
 * one answer serves every reader. A transient failure does not latch — only a
 * definite "no such column" does.
 */
export async function vendorPositionsReady(): Promise<boolean> {
  if (hasColumn !== null) return hasColumn;
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .select("sort_position", { head: true, count: "exact" })
    .limit(1);
  if (error) {
    if (error.code === UNDEFINED_COLUMN) {
      hasColumn = false;
      return false;
    }
    return true;
  }
  hasColumn = true;
  return true;
}

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

/**
 * Pin a shop to slot 1–10, or pass null to unrank it. Admin-only via RLS.
 *
 * A slot holds exactly one shop, so pinning evicts whoever held it. The column
 * has no unique constraint (0021), and without this the feed would show two #3s
 * in an order nothing decides — the two surfaces that pin (the vendor table's
 * inline select and the slots board) both come through here so they agree.
 */
export async function setVendorPosition(
  id: string,
  position: number | null
): Promise<void> {
  const value =
    position == null
      ? null
      : Math.min(SLOT_COUNT, Math.max(1, Math.trunc(position)));
  const supabase = await createClient();

  if (value != null) {
    const { error: evictErr } = await supabase
      .from("restaurants")
      .update({ sort_position: null })
      .eq("sort_position", value)
      .neq("id", id);
    if (evictErr) throw evictErr;
  }

  const { error } = await supabase
    .from("restaurants")
    .update({ sort_position: value })
    .eq("id", id);
  if (error) throw error;
}

/** Empty a slot, whoever is in it. No-op when the slot is already free. */
export async function clearVendorSlot(position: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ sort_position: null })
    .eq("sort_position", Math.trunc(position));
  if (error) throw error;
}

/**
 * Exchange the occupants of two slots — the board's move up/down.
 *
 * Resolved by id rather than by chaining two `eq('sort_position', …)` updates:
 * the second would otherwise re-match the rows the first just moved. Either
 * slot may be empty, which simply moves the one occupant across.
 */
export async function swapVendorSlots(a: number, b: number): Promise<void> {
  const from = Math.trunc(a);
  const to = Math.trunc(b);
  if (from === to) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, sort_position")
    .in("sort_position", [from, to]);
  if (error) throw error;

  for (const row of (data ?? []) as { id: string; sort_position: number }[]) {
    const next = row.sort_position === from ? to : from;
    const { error: updErr } = await supabase
      .from("restaurants")
      .update({ sort_position: next })
      .eq("id", row.id);
    if (updErr) throw updErr;
  }
}

/**
 * A shop as the slots board shows it. Only 0024-safe columns.
 *
 * Carries the card fields (cuisines, ETA) and `approved` because the board
 * renders a preview of the customer feed: the feed reads `approved = true`, so a
 * pinned-but-unapproved shop occupies a slot and shows nobody anything. That is
 * the single most useful thing this screen can tell an operator, and it can only
 * say it if the flag comes back with the row.
 */
export interface SlotVendor {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  cuisines: string[];
  imageUrl: string | null;
  accentTint: string | null;
  status: string;
  isOpen: boolean;
  /** False = invisible on the customer feed however it is ranked. */
  approved: boolean;
  etaMin: number;
  etaMax: number;
}

export interface FeaturedSlot {
  /** 1 = first on the customer feed. */
  position: number;
  /**
   * Normally 0 or 1 shops. It is a list because the column carries no unique
   * constraint, so rows pinned before setVendorPosition became exclusive can
   * still collide — the board surfaces those rather than hiding one at random.
   */
  vendors: SlotVendor[];
}

const SLOT_SELECT = `
  id, slug, name, category, cuisines, image_url, accent_tint,
  status, is_open, approved, eta_min, eta_max, sort_position
`;

interface SlotRow {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  cuisines?: string[] | null;
  image_url?: string | null;
  accent_tint?: string | null;
  status: string | null;
  is_open?: boolean | null;
  approved?: boolean | null;
  eta_min?: number | null;
  eta_max?: number | null;
  sort_position: number | null;
}

/** Same defaults the customer mapper uses, so the preview reads like the feed. */
function mapSlotVendor(r: SlotRow): SlotVendor {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category,
    cuisines: r.cuisines ?? [],
    imageUrl: r.image_url ?? null,
    accentTint: r.accent_tint ?? null,
    status: r.status ?? "active",
    isOpen: r.is_open ?? false,
    approved: r.approved ?? false,
    etaMin: r.eta_min ?? 25,
    etaMax: r.eta_max ?? 35,
  };
}

/**
 * The ten slots in rank order, each with its occupant. Always returns all ten
 * rows — an empty slot is a thing the operator acts on, not a row to omit — and
 * never throws, matching getVendorPositions' pre-migration behaviour.
 */
export async function listSlotBoard(): Promise<FeaturedSlot[]> {
  const slots: FeaturedSlot[] = SLOT_POSITIONS.map((position) => ({
    position,
    vendors: [],
  }));
  if (hasColumn === false) return slots;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(SLOT_SELECT)
    .not("sort_position", "is", null)
    .order("sort_position", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (error.code === UNDEFINED_COLUMN) hasColumn = false;
    return slots;
  }
  hasColumn = true;

  for (const row of ((data as SlotRow[] | null) ?? [])) {
    const slot = slots[(row.sort_position ?? 0) - 1];
    if (!slot) continue;
    slot.vendors.push(mapSlotVendor(row));
  }
  return slots;
}

/** A shop in the board's assign dropdown. */
export interface AssignableVendor {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  status: string;
  /** The slot it already holds, so the picker can say "#4" beside it. */
  position: number | null;
}

/**
 * Shops that can be pinned, A–Z. Suspended and inactive ones are included but
 * carry their status: a pinned shop the feed won't show is worth seeing on this
 * screen, and silently omitting it would read as "that shop doesn't exist".
 */
export async function listAssignableVendors(
  limit = 300
): Promise<AssignableVendor[]> {
  if (hasColumn === false) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, category, status, sort_position")
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    if (error.code === UNDEFINED_COLUMN) hasColumn = false;
    return [];
  }
  hasColumn = true;

  return ((data as SlotRow[] | null) ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    category: r.category,
    status: r.status ?? "active",
    position: r.sort_position,
  }));
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
