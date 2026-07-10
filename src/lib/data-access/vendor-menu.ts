import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MenuItem } from "@/types";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";

interface DbMenuItem {
  id: string;
  external_id: string | null;
  name: string;
  description: string | null;
  price: number;
  veg: boolean;
  available: boolean;
  category: string | null;
  image_url: string | null;
  popular: boolean;
  bestseller: boolean;
}

export interface MenuItemInput {
  name: string;
  description?: string;
  price: number;
  category: string;
  veg: boolean;
  available?: boolean;
  popular?: boolean;
  bestseller?: boolean;
  imageUrl?: string;
}

function mapMenuItem(row: DbMenuItem): MenuItem & { dbId: string } {
  return {
    dbId: row.id,
    id: row.external_id ?? row.id,
    name: row.name,
    description: row.description ?? "",
    price: row.price,
    category: row.category ?? "Popular",
    veg: row.veg,
    image: row.image_url ?? undefined,
    soldOut: !row.available,
    popular: row.popular,
    bestseller: row.bestseller,
  };
}

function normalizeInput(input: MenuItemInput) {
  const name = input.name.trim();
  const category = input.category.trim() || "Popular";
  const price = Math.round(input.price);
  if (!name) throw new Error("name_required");
  if (price < 0) throw new Error("invalid_price");
  return {
    name,
    description: input.description?.trim() || null,
    price,
    category,
    veg: input.veg,
    available: input.available ?? true,
    popular: input.popular ?? false,
    bestseller: input.bestseller ?? false,
    image_url: input.imageUrl?.trim() || null,
  };
}

/** Menu for the signed-in vendor's active restaurant. */
export async function listOwnedMenuItems(): Promise<{
  restaurantId: string;
  restaurantName: string;
  categories: string[];
  items: (MenuItem & { dbId: string })[];
} | null> {
  const restaurant = await resolveVendorRestaurant();
  if (!restaurant) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select(
      "id, external_id, name, description, price, veg, available, category, image_url, popular, bestseller"
    )
    .eq("restaurant_id", restaurant.id)
    .order("category")
    .order("name");

  if (error) throw error;

  const items = (data as DbMenuItem[]).map(mapMenuItem);
  const categories = [
    ...Array.from(new Set(items.map((m) => m.category).filter(Boolean))),
  ].sort((a, b) => {
    if (a === "Popular") return -1;
    if (b === "Popular") return 1;
    return a.localeCompare(b);
  });

  return {
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    categories,
    items,
  };
}

export async function createMenuItem(
  input: MenuItemInput
): Promise<string | null> {
  const restaurant = await resolveVendorRestaurant();
  if (!restaurant) return null;

  const row = normalizeInput(input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({ restaurant_id: restaurant.id, ...row })
    .select("id")
    .single();

  if (error) throw error;
  return data?.id ?? null;
}

export async function updateMenuItem(
  menuItemId: string,
  input: Partial<MenuItemInput>
): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined)
    patch.description = input.description.trim() || null;
  if (input.price !== undefined) {
    const price = Math.round(input.price);
    if (price < 0) throw new Error("invalid_price");
    patch.price = price;
  }
  if (input.category !== undefined)
    patch.category = input.category.trim() || "Popular";
  if (input.veg !== undefined) patch.veg = input.veg;
  if (input.available !== undefined) patch.available = input.available;
  if (input.popular !== undefined) patch.popular = input.popular;
  if (input.bestseller !== undefined) patch.bestseller = input.bestseller;
  if (input.imageUrl !== undefined)
    patch.image_url = input.imageUrl.trim() || null;

  if (Object.keys(patch).length === 0) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update(patch)
    .eq("id", menuItemId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

export async function deleteMenuItem(menuItemId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", menuItemId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

export async function setMenuItemAvailable(
  menuItemId: string,
  available: boolean
): Promise<boolean> {
  return updateMenuItem(menuItemId, { available });
}
