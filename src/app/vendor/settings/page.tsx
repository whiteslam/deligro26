import { ShopLocationForm } from "@/components/vendor/shop-location-form";
import { VendorHero, VendorPanel } from "@/components/vendor/vendor-ui";
import { getOwnedRestaurantFromDb } from "@/lib/data-access/restaurants";

/**
 * Vendor → Settings. The shop pin, and nothing else.
 *
 * There is no Security section: MFA was removed in migration 0033, so the
 * optional two-factor enrolment a vendor could once turn on here no longer
 * exists to turn on. Signing out lives in the rail.
 */
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
