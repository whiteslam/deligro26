"use server";

import { revalidatePath } from "next/cache";
import { requireVendorAccess } from "@/lib/auth/vendor-access";
import { updateMenuItemAvailability } from "@/lib/data-access/restaurants";
import {
  listFoodImages,
  suggestImages,
  type FoodImage,
} from "@/lib/data-access/food-images";

export interface SetMenuAvailabilityResult {
  ok: boolean;
  error?: string;
}

/**
 * Toggle whether a dish is orderable. Writes menu_items.available under RLS
 * (owns_restaurant) — the vendor UI used to flip local state only.
 */
export async function setMenuItemAvailability(input: {
  itemId: string;
  available: boolean;
  restaurantSlug?: string;
}): Promise<SetMenuAvailabilityResult> {
  await requireVendorAccess();

  const itemId = input.itemId?.trim();
  if (!itemId) return { ok: false, error: "Missing dish." };

  try {
    const ok = await updateMenuItemAvailability(itemId, input.available);
    if (!ok) return { ok: false, error: "Couldn't update that dish." };
  } catch {
    return { ok: false, error: "Couldn't update that dish. Try again." };
  }

  revalidatePath("/vendor/menu");
  if (input.restaurantSlug) {
    revalidatePath(`/restaurant/${input.restaurantSlug}`);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ------------------------------------------------------------------
 * The shared food photo library, from the vendor side.
 * ------------------------------------------------------------------
 * Same library, same ranking, same two functions the admin console calls — a
 * vendor changing a wrongly-matched photo has to see exactly what an admin
 * would, or the two will pick different pictures for the same dish.
 *
 * `requireVendorAccess()` first, like every action in this file: these are
 * public HTTP endpoints (AGENTS.md §3). The rows themselves are world-readable
 * by design (the customer app renders them, migration 0035), so the gate is
 * about not offering an ungated query surface rather than about hiding data —
 * and it is the authorization check that sits above the service-role read
 * inside those functions (AGENTS.md §5).
 * ------------------------------------------------------------------ */

/** Ranked photos for a dish name — what the picker opens on. */
export async function suggestVendorFoodImages(
  dishName: string
): Promise<{ suggestions: { image: FoodImage; score: number; reason: string }[] }> {
  await requireVendorAccess();
  if (!dishName.trim()) return { suggestions: [] };
  try {
    return { suggestions: await suggestImages(dishName.trim()) };
  } catch {
    return { suggestions: [] };
  }
}

/** Free-text search of the library, as the vendor types. */
export async function searchVendorFoodImages(
  query: string
): Promise<{ images: FoodImage[] }> {
  await requireVendorAccess();
  try {
    return { images: await listFoodImages({ query: query.trim(), limit: 40 }) };
  } catch {
    return { images: [] };
  }
}
