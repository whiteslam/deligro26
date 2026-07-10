import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const VENDOR_RESTAURANT_COOKIE = "vendor_restaurant_slug";

export interface OwnedRestaurant {
  id: string;
  slug: string;
  name: string;
  isOpen: boolean;
}

/** All restaurants owned by the signed-in vendor. */
export async function listOwnedRestaurants(): Promise<OwnedRestaurant[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("restaurants")
    .select("id, slug, name, is_open")
    .eq("owner_id", user.id)
    .order("name");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    isOpen: row.is_open,
  }));
}

async function defaultRestaurantId(
  ownedIds: string[]
): Promise<string | undefined> {
  if (ownedIds.length === 0) return undefined;

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("restaurant_id")
    .in("restaurant_id", ownedIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.restaurant_id ?? ownedIds[0];
}

/**
 * Active restaurant for this vendor session.
 * Single-owner vendors always get their one shop; multi-owner accounts
 * respect the selection cookie, then fall back to the shop with the latest order.
 */
export async function resolveVendorRestaurant(): Promise<OwnedRestaurant | null> {
  const owned = await listOwnedRestaurants();
  if (owned.length === 0) return null;
  if (owned.length === 1) return owned[0];

  const jar = await cookies();
  const slug = jar.get(VENDOR_RESTAURANT_COOKIE)?.value;
  if (slug) {
    const picked = owned.find((r) => r.slug === slug);
    if (picked) return picked;
  }

  const fallbackId = await defaultRestaurantId(owned.map((r) => r.id));
  return owned.find((r) => r.id === fallbackId) ?? owned[0];
}

/** @deprecated Use resolveVendorRestaurant — kept for call-site clarity. */
export async function getOwnedRestaurant(): Promise<OwnedRestaurant | null> {
  return resolveVendorRestaurant();
}

/** Toggle store open/closed for the active restaurant. */
export async function setRestaurantOpen(isOpen: boolean): Promise<boolean> {
  const restaurant = await resolveVendorRestaurant();
  if (!restaurant) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .update({ is_open: isOpen })
    .eq("id", restaurant.id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}
