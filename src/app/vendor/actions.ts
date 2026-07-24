"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import {
  listOwnedRestaurants,
  setRestaurantOpen,
  VENDOR_RESTAURANT_COOKIE,
} from "@/lib/data-access/vendor-restaurant";
import {
  bulkSetAvailable,
  createMenuItem,
  deleteMenuItem,
  deleteMenuItems,
  mergeCategory,
  renameCategory,
  updateMenuItem,
  upsertMenuItemsFromImport,
  type MenuImportRow,
  type MenuItemInput,
} from "@/lib/data-access/vendor-menu";

async function requireRestaurantRole() {
  const profile = await getProfile();
  if (!profile || profile.role !== "restaurant") throw new Error("forbidden");
  return profile;
}

function revalidateVendorMenu() {
  revalidatePath("/vendor/menu");
  revalidatePath("/vendor/profile");
}

export async function setRestaurantOpenAction(isOpen: boolean) {
  await requireRestaurantRole();
  await setRestaurantOpen(isOpen);
  revalidatePath("/vendor", "layout");
}

export async function setActiveRestaurantAction(slug: string) {
  await requireRestaurantRole();
  const owned = await listOwnedRestaurants();
  if (!owned.some((r) => r.slug === slug)) throw new Error("forbidden");

  const jar = await cookies();
  jar.set(VENDOR_RESTAURANT_COOKIE, slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/vendor", "layout");
}

export async function createMenuItemAction(input: MenuItemInput) {
  await requireRestaurantRole();
  const id = await createMenuItem(input);
  if (!id) throw new Error("not_found");
  revalidateVendorMenu();
  return { ok: true as const, id };
}

export async function updateMenuItemAction(
  menuItemId: string,
  input: Partial<MenuItemInput>
) {
  await requireRestaurantRole();
  const ok = await updateMenuItem(menuItemId, input);
  if (!ok) throw new Error("not_found");
  revalidateVendorMenu();
  return { ok: true as const };
}

export async function deleteMenuItemAction(menuItemId: string) {
  await requireRestaurantRole();
  const ok = await deleteMenuItem(menuItemId);
  if (!ok) throw new Error("not_found");
  revalidateVendorMenu();
  return { ok: true as const };
}

export async function deleteMenuItemsAction(menuItemIds: string[]) {
  await requireRestaurantRole();
  const count = await deleteMenuItems(menuItemIds);
  revalidateVendorMenu();
  return { ok: true as const, count };
}

export async function bulkSetAvailableAction(
  menuItemIds: string[],
  available: boolean
) {
  await requireRestaurantRole();
  const count = await bulkSetAvailable(menuItemIds, available);
  revalidateVendorMenu();
  return { ok: true as const, count };
}

export async function renameCategoryAction(from: string, to: string) {
  await requireRestaurantRole();
  const count = await renameCategory(from, to);
  revalidateVendorMenu();
  return { ok: true as const, count };
}

export async function mergeCategoryAction(from: string, into: string) {
  await requireRestaurantRole();
  const count = await mergeCategory(from, into);
  revalidateVendorMenu();
  return { ok: true as const, count };
}

export async function importMenuCsvAction(rows: MenuImportRow[]) {
  await requireRestaurantRole();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("empty_import");
  }
  if (rows.length > 500) throw new Error("too_many_rows");
  const result = await upsertMenuItemsFromImport(rows);
  revalidateVendorMenu();
  return { ok: true as const, ...result };
}
