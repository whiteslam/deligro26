import { getOwnedRestaurantFromDb } from "@/lib/data-access/restaurants";
import { ShopLocationForm } from "@/components/vendor/shop-location-form";
import { MfaSettings } from "@/components/vendor/mfa-settings";
import { getMfaStatus } from "@/lib/data-access/mfa";

export const dynamic = "force-dynamic";

export default async function VendorSettingsPage() {
  const [restaurant, mfa] = await Promise.all([
    getOwnedRestaurantFromDb(),
    getMfaStatus(),
  ]);

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

      <div>
        <h2 className="text-heading">Security</h2>
        <p className="mt-1 text-sm text-muted">
          Protect your shop account with two-factor authentication.
        </p>
      </div>

      {mfa ? (
        <MfaSettings status={mfa} />
      ) : (
        <p className="card p-5 text-sm text-muted">
          Sign in with your vendor account to manage MFA.
        </p>
      )}
    </div>
  );
}
