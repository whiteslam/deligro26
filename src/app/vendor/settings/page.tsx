import { getOwnedRestaurantFromDb } from "@/lib/data-access/restaurants";
import { ShopLocationForm } from "@/components/vendor/shop-location-form";

export const dynamic = "force-dynamic";

export default async function VendorSettingsPage() {
  const restaurant = await getOwnedRestaurantFromDb();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading">Shop location</h1>
        <p className="mt-1 text-sm text-muted">
          Drop a pin where the shop actually is. Customers see how far they are
          from it, and the feed puts the nearest shops first.
        </p>
      </div>

      <ShopLocationForm
        initial={{
          lat: restaurant?.lat ?? null,
          lng: restaurant?.lng ?? null,
          address: restaurant?.address ?? null,
        }}
      />
    </div>
  );
}
