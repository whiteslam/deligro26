import { ShopLocationForm } from "@/components/vendor/shop-location-form";
import { VendorHero, VendorPanel } from "@/components/vendor/vendor-ui";
import { getOwnedRestaurantFromDb } from "@/lib/data-access/restaurants";

export const dynamic = "force-dynamic";

export default async function VendorSettingsPage() {
  const restaurant = await getOwnedRestaurantFromDb();

  return (
    <>
      <VendorHero title="Settings" subtitle="Where your shop sits on the map." />

      <VendorPanel
        title="Shop location"
        subtitle="Drop a pin where the shop actually is. Customers see how far they are from it, and the feed puts the nearest shops first."
      >
        <ShopLocationForm
          initial={{
            lat: restaurant?.lat ?? null,
            lng: restaurant?.lng ?? null,
            address: restaurant?.address ?? null,
          }}
        />
      </VendorPanel>
    </>
  );
}
