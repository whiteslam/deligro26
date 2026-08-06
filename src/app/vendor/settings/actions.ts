"use server";

import { revalidatePath } from "next/cache";
import { requireVendorAccess } from "@/lib/auth/vendor-access";
import { updateShopLocation } from "@/lib/data-access/restaurants";

export interface SaveShopLocationResult {
  ok: boolean;
  error?: string;
}

/** Save where the shop is. Distances across the customer app are measured to it. */
export async function saveShopLocation(input: {
  lat: number;
  lng: number;
  address: string;
}): Promise<SaveShopLocationResult> {
  await requireVendorAccess();

  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    return { ok: false, error: "Drop a pin on the map first." };
  }

  try {
    await updateShopLocation(input);
  } catch {
    return { ok: false, error: "Couldn't save the location. Try again." };
  }

  // The feed sorts and labels by this, so every customer screen is now stale.
  revalidatePath("/", "layout");
  return { ok: true };
}
