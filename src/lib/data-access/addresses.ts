import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Saved delivery addresses. RLS scopes every row to the signed-in user, so no
 * explicit `where user_id = me` is needed — the anon client simply can't see or
 * touch anyone else's rows.
 */

export interface Address {
  id: string;
  label: string;
  line: string;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
}

interface Row {
  id: string;
  label: string;
  line: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
}

function map(r: Row): Address {
  return {
    id: r.id,
    label: r.label,
    line: r.line,
    lat: r.lat,
    lng: r.lng,
    isDefault: r.is_default,
  };
}

export async function listAddresses(): Promise<Address[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, line, lat, lng, is_default")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(map);
}

export interface AddressInput {
  label: string;
  line: string;
  lat?: number | null;
  lng?: number | null;
  isDefault?: boolean;
}

export async function createAddress(
  input: AddressInput
): Promise<Address | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  // First address becomes the default automatically.
  const { count } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("addresses")
    .insert({
      user_id: user.id,
      label: input.label.slice(0, 40) || "Home",
      line: input.line.slice(0, 300),
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      is_default: input.isDefault ?? (count ?? 0) === 0,
    })
    .select("id, label, line, lat, lng, is_default")
    .single();
  if (error) throw error;
  return map(data as Row);
}

export async function updateAddress(
  id: string,
  input: Partial<AddressInput>
): Promise<boolean> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.label !== undefined) patch.label = input.label.slice(0, 40);
  if (input.line !== undefined) patch.line = input.line.slice(0, 300);
  if (input.lat !== undefined) patch.lat = input.lat;
  if (input.lng !== undefined) patch.lng = input.lng;
  if (input.isDefault !== undefined) patch.is_default = input.isDefault;

  const { data, error } = await supabase
    .from("addresses")
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

/**
 * Delete an address, and hand the default flag on if it was carrying it.
 *
 * Deleting simply removed the row, so removing your default left the account
 * with no default at all. Every screen that wants one is written as
 * `find(isDefault) ?? list[0]`, which is why this never produced a visible
 * error — it produced something quieter: the Default badge disappeared from the
 * list, "Set default" appeared on every row, and checkout silently began
 * preferring whichever address happened to sort first. The addresses page even
 * dimmed the Remove button on a default to discourage this, without disabling
 * it, so the discouragement was decorative.
 *
 * The promotion is a second statement rather than a trigger because `addresses`
 * has no trigger infrastructure and this is the only writer. Best-effort: the
 * delete is what the customer asked for and has already happened, so a failure
 * to promote is logged and swallowed rather than reported as a failed delete.
 */
export async function deleteAddress(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .select("id, is_default")
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) return false;

  if (data.is_default) {
    try {
      // RLS scopes this to the caller's own rows, so "the oldest one left" is
      // the oldest of THEIR addresses, not of the table.
      const { data: next } = await supabase
        .from("addresses")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (next?.id) {
        await supabase
          .from("addresses")
          .update({ is_default: true })
          .eq("id", next.id);
      }
    } catch (err) {
      console.error("[addresses] could not promote a new default", err);
    }
  }

  return true;
}
