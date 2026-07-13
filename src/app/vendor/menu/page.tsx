import { VendorMenu } from "@/components/vendor/vendor-menu";
import { getOwnedRestaurantFromDb } from "@/lib/data-access/restaurants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RESTAURANTS } from "@/lib/data";
import type { Restaurant } from "@/types";

// Reads the vendor's own restaurant through their session — never cached.
export const dynamic = "force-dynamic";

const DEMO_STORE = RESTAURANTS.find((r) => r.slug === "saffron-kitchen")!;

export default async function VendorMenuPage() {
  let restaurant: Restaurant = DEMO_STORE;
  let live = false;

  if (isSupabaseConfigured) {
    try {
      const owned = await getOwnedRestaurantFromDb();
      if (owned) {
        restaurant = owned;
        live = true;
      }
    } catch {
      // demo fallback — the board still renders if the catalog read fails
    }
  }

  return <VendorMenu restaurant={restaurant} live={live} />;
}
