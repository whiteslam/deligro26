"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { updateMenuItemAvailability } from "@/lib/data-access/restaurants";

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
  await requireRole("restaurant");

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
