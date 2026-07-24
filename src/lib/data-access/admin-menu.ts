import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin menu management over `menu_items`. Admins ride the "menu — owner manage"
 * RLS policy (which grants `is_admin()`), so the cookie-bound client is enough.
 * `price`/`discount_price` are whole rupees (integers).
 */

export interface AdminMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discountPrice: number | null;
  veg: boolean;
  available: boolean;
  category: string | null;
  imageUrl: string | null;
}

export interface MenuItemInput {
  name: string;
  description: string | null;
  price: number;
  discountPrice: number | null;
  veg: boolean;
  available: boolean;
  category: string | null;
  imageUrl: string | null;
}

interface MenuRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  veg: boolean;
  available: boolean;
  category: string | null;
  image_url: string | null;
}

const SELECT =
  "id, name, description, price, discount_price, veg, available, category, image_url";

function isMissingSchema(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST205" ||
    code === "PGRST204" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist")
  );
}

function mapItem(row: MenuRow): AdminMenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    discountPrice: row.discount_price,
    veg: row.veg,
    available: row.available,
    category: row.category,
    imageUrl: row.image_url,
  };
}

function toRow(input: MenuItemInput) {
  return {
    name: input.name,
    description: input.description,
    price: Math.max(0, Math.trunc(input.price)),
    discount_price:
      input.discountPrice == null ? null : Math.max(0, Math.trunc(input.discountPrice)),
    veg: input.veg,
    available: input.available,
    category: input.category,
    image_url: input.imageUrl,
  };
}

export async function listMenuItems(restaurantId: string): Promise<AdminMenuItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select(SELECT)
    .eq("restaurant_id", restaurantId)
    .order("category", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) {
    if (isMissingSchema(error)) return [];
    throw error;
  }
  return (data as MenuRow[] | null ?? []).map(mapItem);
}

export async function createMenuItem(
  restaurantId: string,
  input: MenuItemInput
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({ restaurant_id: restaurantId, ...toRow(input) })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateMenuItem(
  itemId: string,
  input: MenuItemInput
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update(toRow(input))
    .eq("id", itemId);
  if (error) throw error;
}

export async function deleteMenuItem(itemId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function setMenuItemAvailable(
  itemId: string,
  available: boolean
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({ available })
    .eq("id", itemId);
  if (error) throw error;
}

export interface BulkMenuItem {
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  discountPrice: number | null;
  veg: boolean;
  available: boolean;
}

/** Insert many validated rows in one shot. Returns how many landed. */
export async function bulkInsertMenuItems(
  restaurantId: string,
  items: BulkMenuItem[]
): Promise<number> {
  if (items.length === 0) return 0;
  const supabase = await createClient();
  const rows = items.map((m) => ({
    restaurant_id: restaurantId,
    name: m.name.trim(),
    description: m.description,
    price: Math.max(0, Math.trunc(m.price)),
    discount_price:
      m.discountPrice == null ? null : Math.max(0, Math.trunc(m.discountPrice)),
    veg: m.veg,
    available: m.available,
    category: m.category,
  }));
  const { data, error } = await supabase
    .from("menu_items")
    .insert(rows)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}
