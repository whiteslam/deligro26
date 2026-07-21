import { VendorPageHeader } from "@/components/vendor/vendor-page-header";
import { VendorEarningsCharts } from "@/components/vendor/vendor-earnings-charts";
import { getProfile } from "@/lib/auth";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import { getVendorEarningsSummary } from "@/lib/data-access/vendor-earnings";
import type { VendorEarningsSummary } from "@/lib/data-access/vendor-earnings";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function RestaurantEarningsPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Earnings"
          subtitle="Connect Supabase to view earnings."
        />
      </div>
    );
  }

  const profile = await getProfile();
  if (profile?.role !== "restaurant") {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Earnings"
          subtitle="Restaurant access required."
        />
      </div>
    );
  }

  let restaurant: Awaited<ReturnType<typeof resolveVendorRestaurant>> = null;
  try {
    restaurant = await resolveVendorRestaurant();
  } catch {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Earnings"
          subtitle="Could not load your restaurant. Try again."
        />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Earnings"
          subtitle="No restaurant linked to your account."
        />
      </div>
    );
  }

  let summary: VendorEarningsSummary;
  try {
    summary = await getVendorEarningsSummary(restaurant.id);
  } catch {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Earnings"
          subtitle={`Could not load earnings for ${restaurant.name}.`}
        />
      </div>
    );
  }

  return (
    <VendorEarningsCharts restaurantName={restaurant.name} stats={summary} />
  );
}
