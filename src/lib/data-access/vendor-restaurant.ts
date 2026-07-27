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

export interface VendorRestaurantUpdateInput {
  name?: string;
  tagline?: string | null;
  cuisines?: string[];
  offer?: string | null;
  imageUrl?: string | null;
  accentTint?: string | null;
  etaMin?: number | null;
  etaMax?: number | null;
  costForTwo?: number | null;
  priceTier?: number;
}

/** Update storefront fields for the active restaurant. */
export async function updateVendorRestaurant(
  input: VendorRestaurantUpdateInput
): Promise<boolean> {
  const restaurant = await resolveVendorRestaurant();
  if (!restaurant) return false;

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("name_required");
    patch.name = name;
  }
  if (input.tagline !== undefined)
    patch.tagline = input.tagline?.trim() || null;
  if (input.cuisines !== undefined) patch.cuisines = input.cuisines;
  if (input.offer !== undefined) patch.offer = input.offer?.trim() || null;
  if (input.imageUrl !== undefined)
    patch.image_url = input.imageUrl?.trim() || null;
  if (input.accentTint !== undefined)
    patch.accent_tint = input.accentTint?.trim() || null;
  if (input.etaMin !== undefined) patch.eta_min = input.etaMin;
  if (input.etaMax !== undefined) patch.eta_max = input.etaMax;
  if (input.costForTwo !== undefined) patch.cost_for_two = input.costForTwo;
  if (input.priceTier !== undefined) {
    const tier = Math.min(3, Math.max(1, Math.round(input.priceTier)));
    patch.price_tier = tier;
  }

  if (Object.keys(patch).length === 0) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .update(patch)
    .eq("id", restaurant.id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}
