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
  createMenuItem,
  deleteMenuItem,
  updateMenuItem,
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
