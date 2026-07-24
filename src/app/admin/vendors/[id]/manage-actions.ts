"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  setMenuItemAvailable,
  bulkInsertMenuItems,
  type MenuItemInput,
  type BulkMenuItem,
} from "@/lib/data-access/admin-menu";
import { deleteVendorDocument } from "@/lib/data-access/vendor-documents";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const DEMO = "Demo mode: connect Supabase and apply 0019 to manage the menu.";

function revalidateVendor(id: string) {
  revalidatePath(`/admin/vendors/${id}`);
  revalidatePath("/", "layout");
}

async function guard(): Promise<string | null> {
  await requireRole("admin");
  if (!isSupabaseConfigured) return DEMO;
  return null;
}

// ---------- menu ----------

export async function createMenuItemAction(
  restaurantId: string,
  input: MenuItemInput
): Promise<ActionResult & { id?: string }> {
  const demo = await guard();
  if (demo) return { ok: false, error: demo };
  if (!input.name?.trim()) return { ok: false, error: "Item name is required." };
  try {
    const id = await createMenuItem(restaurantId, input);
    revalidateVendor(restaurantId);
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Couldn't add the item." };
  }
}

export async function updateMenuItemAction(
  restaurantId: string,
  itemId: string,
  input: MenuItemInput
): Promise<ActionResult> {
  const demo = await guard();
  if (demo) return { ok: false, error: demo };
  if (!input.name?.trim()) return { ok: false, error: "Item name is required." };
  try {
    await updateMenuItem(itemId, input);
    revalidateVendor(restaurantId);
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't save the item." };
  }
}

export async function deleteMenuItemAction(
  restaurantId: string,
  itemId: string
): Promise<ActionResult> {
  const demo = await guard();
  if (demo) return { ok: false, error: demo };
  try {
    await deleteMenuItem(itemId);
    revalidateVendor(restaurantId);
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't delete the item." };
  }
}

export async function setMenuAvailabilityAction(
  restaurantId: string,
  itemId: string,
  available: boolean
): Promise<ActionResult> {
  const demo = await guard();
  if (demo) return { ok: false, error: demo };
  try {
    await setMenuItemAvailable(itemId, available);
    revalidateVendor(restaurantId);
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't update availability." };
  }
}

export async function bulkInsertMenuItemsAction(
  restaurantId: string,
  items: BulkMenuItem[]
): Promise<ActionResult & { inserted?: number }> {
  const demo = await guard();
  if (demo) return { ok: false, error: demo };
  const clean = items.filter((m) => m.name?.trim());
  if (clean.length === 0) return { ok: false, error: "No valid rows to import." };
  try {
    const inserted = await bulkInsertMenuItems(restaurantId, clean);
    revalidateVendor(restaurantId);
    return { ok: true, inserted };
  } catch {
    return { ok: false, error: "Import failed. Try again." };
  }
}

// ---------- documents ----------

export async function deleteDocumentAction(
  restaurantId: string,
  docId: string
): Promise<ActionResult> {
  const demo = await guard();
  if (demo) return { ok: false, error: demo };
  try {
    await deleteVendorDocument(docId);
    revalidateVendor(restaurantId);
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't delete the document." };
  }
}
