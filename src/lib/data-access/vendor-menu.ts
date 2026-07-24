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
  sort_order: number;
}

export type VendorMenuItem = MenuItem & {
  dbId: string;
  externalId: string | null;
  sortOrder: number;
};

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
  externalId?: string | null;
  sortOrder?: number;
}

export interface MenuImportRow {
  externalId?: string | null;
  name: string;
  category: string;
  price: number;
  description?: string;
  veg?: boolean;
  available?: boolean;
  popular?: boolean;
  bestseller?: boolean;
  imageUrl?: string | null;
}

function mapMenuItem(row: DbMenuItem): VendorMenuItem {
  return {
    dbId: row.id,
    id: row.external_id ?? row.id,
    externalId: row.external_id,
    sortOrder: row.sort_order ?? 0,
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
  const externalId = input.externalId?.trim() || null;
  const row: Record<string, unknown> = {
    name,
    description: input.description?.trim() || null,
    price,
    category,
    veg: input.veg,
    available: input.available ?? true,
    popular: input.popular ?? false,
    bestseller: input.bestseller ?? false,
    image_url: input.imageUrl?.trim() || null,
    external_id: externalId,
  };
  if (input.sortOrder !== undefined) row.sort_order = input.sortOrder;
  return row;
}

async function requireOwnedRestaurant() {
  const restaurant = await resolveVendorRestaurant();
  if (!restaurant) return null;
  return restaurant;
}

/** Menu for the signed-in vendor's active restaurant. */
export async function listOwnedMenuItems(): Promise<{
  restaurantId: string;
  restaurantName: string;
  categories: string[];
  items: VendorMenuItem[];
} | null> {
  const restaurant = await requireOwnedRestaurant();
  if (!restaurant) return null;

  const supabase = await createClient();
  let data: DbMenuItem[] | null = null;

  const primary = await supabase
    .from("menu_items")
    .select(
      "id, external_id, name, description, price, veg, available, category, image_url, popular, bestseller, sort_order"
    )
    .eq("restaurant_id", restaurant.id)
    .order("sort_order", { ascending: true })
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (primary.error) {
    // Pre-migration fallback if sort_order is not applied yet
    const fallback = await supabase
      .from("menu_items")
      .select(
        "id, external_id, name, description, price, veg, available, category, image_url, popular, bestseller"
      )
      .eq("restaurant_id", restaurant.id)
      .order("category")
      .order("name");
    if (fallback.error) throw fallback.error;
    data = ((fallback.data ?? []) as Omit<DbMenuItem, "sort_order">[]).map(
      (row) => ({ ...row, sort_order: 0 })
    );
  } else {
    data = (primary.data ?? []) as DbMenuItem[];
  }

  const items = data.map(mapMenuItem);
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
  const restaurant = await requireOwnedRestaurant();
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
  const restaurant = await requireOwnedRestaurant();
  if (!restaurant) return false;

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
  if (input.externalId !== undefined)
    patch.external_id = input.externalId?.trim() || null;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;

  if (Object.keys(patch).length === 0) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update(patch)
    .eq("id", menuItemId)
    .eq("restaurant_id", restaurant.id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

export async function deleteMenuItem(menuItemId: string): Promise<boolean> {
  const restaurant = await requireOwnedRestaurant();
  if (!restaurant) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", menuItemId)
    .eq("restaurant_id", restaurant.id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

export async function deleteMenuItems(menuItemIds: string[]): Promise<number> {
  const restaurant = await requireOwnedRestaurant();
  if (!restaurant || menuItemIds.length === 0) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .delete()
    .eq("restaurant_id", restaurant.id)
    .in("id", menuItemIds)
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

export async function setMenuItemAvailable(
  menuItemId: string,
  available: boolean
): Promise<boolean> {
  return updateMenuItem(menuItemId, { available });
}

export async function bulkSetAvailable(
  menuItemIds: string[],
  available: boolean
): Promise<number> {
  const restaurant = await requireOwnedRestaurant();
  if (!restaurant || menuItemIds.length === 0) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update({ available })
    .eq("restaurant_id", restaurant.id)
    .in("id", menuItemIds)
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

/** Rename category text for all items at the active restaurant. */
export async function renameCategory(
  from: string,
  to: string
): Promise<number> {
  const restaurant = await requireOwnedRestaurant();
  if (!restaurant) return 0;

  const source = from.trim();
  const target = to.trim() || "Popular";
  if (!source || source === target) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update({ category: target })
    .eq("restaurant_id", restaurant.id)
    .eq("category", source)
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

/** Move all items from one category into another (merge). */
export async function mergeCategory(
  from: string,
  into: string
): Promise<number> {
  return renameCategory(from, into);
}

export interface MenuImportResult {
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

/** Upsert by external_id when present; otherwise insert. Cap 500 rows. */
export async function upsertMenuItemsFromImport(
  rows: MenuImportRow[]
): Promise<MenuImportResult> {
  const restaurant = await requireOwnedRestaurant();
  if (!restaurant) {
    return { created: 0, updated: 0, failed: 0, errors: ["No restaurant"] };
  }

  const capped = rows.slice(0, 500);
  const supabase = await createClient();
  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  const externalIds = capped
    .map((r) => r.externalId?.trim())
    .filter((id): id is string => Boolean(id));

  const existingByExternal = new Map<string, string>();
  if (externalIds.length > 0) {
    const { data: existing, error: existingError } = await supabase
      .from("menu_items")
      .select("id, external_id")
      .eq("restaurant_id", restaurant.id)
      .in("external_id", externalIds);
    if (existingError) {
      return {
        created: 0,
        updated: 0,
        failed: capped.length,
        errors: [existingError.message],
      };
    }
    for (const row of existing ?? []) {
      if (row.external_id) existingByExternal.set(row.external_id, row.id);
    }
  }

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: { id: string; patch: Record<string, unknown> }[] = [];

  capped.forEach((r) => {
    const externalId = r.externalId?.trim() || null;
    const base: Record<string, unknown> = {
      name: r.name.trim(),
      category: r.category.trim() || "Popular",
      price: Math.round(r.price),
      description: r.description?.trim() || null,
      veg: r.veg ?? true,
      available: r.available ?? true,
      popular: r.popular ?? false,
      bestseller: r.bestseller ?? false,
      image_url: r.imageUrl?.trim() || null,
    };

    if (externalId && existingByExternal.has(externalId)) {
      toUpdate.push({
        id: existingByExternal.get(externalId)!,
        patch: { ...base, external_id: externalId },
      });
    } else {
      toInsert.push({
        restaurant_id: restaurant.id,
        ...base,
        external_id: externalId,
      });
    }
  });

  for (const item of toUpdate) {
    const { error } = await supabase
      .from("menu_items")
      .update(item.patch)
      .eq("id", item.id)
      .eq("restaurant_id", restaurant.id);
    if (error) {
      failed += 1;
      errors.push(error.message);
    } else {
      updated += 1;
    }
  }

  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from("menu_items")
      .insert(toInsert)
      .select("id");
    if (error) {
      failed += toInsert.length;
      errors.push(error.message);
    } else {
      created += data?.length ?? 0;
    }
  }

  return { created, updated, failed, errors };
}
