import { VendorPageHeader } from "@/components/vendor/vendor-page-header";
import { VendorEarningsCharts } from "@/components/vendor/vendor-earnings-charts";
import { getProfile } from "@/lib/auth";
import { hasVendorAccess } from "@/lib/auth/vendor-access";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import {
  getVendorEarningsSummary,
  resolveEarningsWindow,
  type VendorEarningsSummary,
} from "@/lib/data-access/vendor-earnings";
import { settlementEstimateFor } from "@/lib/data-access/admin-settlements";
import type { VendorSettlementEstimate } from "@/lib/settlements/math";
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
  if (!(await hasVendorAccess(profile))) {
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
    summary = await getVendorEarningsSummary(restaurant.id, "week");
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

  // The real payout figure, from the settlement engine the admin console pays
  // from. Authorised by the vendor-access + own-restaurant checks above; see
  // `settlementEstimateFor`. Failure is soft — the panel says it cannot show a
  // payout rather than falling back to a revenue figure dressed as one, which
  // is the mistake it is replacing.
  let settlement: VendorSettlementEstimate | null = null;
  try {
    const window = resolveEarningsWindow("week");
    settlement = await settlementEstimateFor({
      restaurantId: restaurant.id,
      from: window.start,
      to: window.end,
    });
  } catch {
    settlement = null;
  }

  return (
    <VendorEarningsCharts
      restaurantName={restaurant.name}
      initialStats={summary}
      initialSettlement={settlement}
    />
  );
}
