import { ShopLocationForm } from "@/components/vendor/shop-location-form";
import { MfaSettings } from "@/components/auth/mfa-settings";
import { VendorHero, VendorPanel } from "@/components/vendor/vendor-ui";
import { getOwnedRestaurantFromDb } from "@/lib/data-access/restaurants";
import { getMfaStatus } from "@/lib/data-access/mfa";

export const dynamic = "force-dynamic";

export default async function VendorSettingsPage() {
  const [restaurant, mfa] = await Promise.all([
    getOwnedRestaurantFromDb(),
    getMfaStatus(),
  ]);

  return (
    <>
      <VendorHero
        title="Settings"
        subtitle="Shop pin and account security."
      />

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

      <VendorPanel
        title="Security"
        subtitle="Protect your shop account with two-factor authentication."
      >
        {mfa ? (
          <MfaSettings status={mfa} />
        ) : (
          <p className="text-sm text-muted">
            Sign in with your vendor account to manage MFA.
          </p>
        )}
      </VendorPanel>
    </>
  );
}
