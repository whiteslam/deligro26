import { VendorOverviewBoard } from "@/components/vendor/vendor-overview-board";
import { VendorPageHeader } from "@/components/vendor/vendor-page-header";
import { getProfile } from "@/lib/auth";
import { getVendorOverviewSummary } from "@/lib/data-access/vendor-overview";
import type { VendorOverviewSummary } from "@/lib/data-access/vendor-overview";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function VendorOverviewPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Overview"
          subtitle="Connect Supabase to view business insights."
        />
      </div>
    );
  }

  const profile = await getProfile();
  if (profile?.role !== "restaurant") {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Overview"
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
          title="Overview"
          subtitle="Could not load your restaurant. Try again."
        />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Overview"
          subtitle="No restaurant linked to your account."
        />
      </div>
    );
  }

  let summary: VendorOverviewSummary;
  try {
    summary = await getVendorOverviewSummary(restaurant.id);
  } catch {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Overview"
          subtitle={`Could not load overview for ${restaurant.name}.`}
        />
      </div>
    );
  }

  return (
    <VendorOverviewBoard restaurantName={restaurant.name} stats={summary} />
  );
}
