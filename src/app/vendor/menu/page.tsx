import { VendorMenu } from "@/components/vendor/vendor-menu";
import { getOwnedRestaurantFromDb } from "@/lib/data-access/restaurants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RESTAURANTS } from "@/lib/data";
import type { Restaurant } from "@/types";

// Reads the vendor's own restaurant through their session — never cached.
export const dynamic = "force-dynamic";

const DEMO_STORE = RESTAURANTS.find((r) => r.slug === "saffron-kitchen")!;

export default async function VendorMenuPage() {
  // With no backend at all, show the demo store so the screen is explorable.
  if (!isSupabaseConfigured) {
    return <VendorMenu restaurant={DEMO_STORE as Restaurant} live={false} />;
  }

  // With a backend, a vendor sees THEIR menu or nothing. This used to fall back
  // to the demo store whenever the query threw or the account wasn't linked to a
  // restaurant yet — so a real vendor could be shown someone else's menu
  // (Saffron Kitchen's dishes and prices) with only a "· demo data" suffix as
  // the tell, and could have started editing it believing it was theirs.
  const owned = await getOwnedRestaurantFromDb();

  if (!owned) {
    return (
      <div className="space-y-2">
        <h1 className="text-heading">Menu</h1>
        <p className="card p-4 text-sm text-muted">
          This account isn&rsquo;t linked to a restaurant yet, so there&rsquo;s
          no menu to show. An admin has to link it before you can add dishes.
        </p>
      </div>
    );
  }

  return <VendorMenu restaurant={owned} live />;
}
