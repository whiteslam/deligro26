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
  return { id: r.id, label: r.label, line: r.line, lat: r.lat, lng: r.lng, isDefault: r.is_default };
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

export async function createAddress(input: AddressInput): Promise<Address | null> {
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

export async function updateAddress(id: string, input: Partial<AddressInput>): Promise<boolean> {
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

export async function deleteAddress(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) throw error;
  return true;
}
