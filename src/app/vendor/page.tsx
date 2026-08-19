import { VendorOrdersBoard } from "@/components/vendor/vendor-orders-board";
import { VendorPageHeader } from "@/components/vendor/vendor-page-header";
import { getProfile } from "@/lib/auth";
import { hasVendorAccess } from "@/lib/auth/vendor-access";
import {
  listKitchenOrders,
  listVendorOrderHistory,
} from "@/lib/data-access/vendor-orders";
import {
  getVendorPace,
  resolveVendorRestaurant,
  type VendorPace,
} from "@/lib/data-access/vendor-restaurant";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { KitchenOrder } from "@/lib/roles-data";

export const dynamic = "force-dynamic";

export default async function VendorOrdersPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Live orders"
          subtitle="Connect Supabase to load kitchen orders."
        />
      </div>
    );
  }

  const profile = await getProfile();
  if (!(await hasVendorAccess(profile))) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Live orders"
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
          title="Live orders"
          subtitle="Could not load your restaurant. Try again."
        />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Live orders"
          subtitle="No restaurant linked to your account."
        />
      </div>
    );
  }

  let incoming: KitchenOrder[] = [];
  let preparing: KitchenOrder[] = [];
  let ready: KitchenOrder[] = [];
  let recent: KitchenOrder[] = [];
  let cancelled: KitchenOrder[] = [];
  // Soft: an un-migrated database simply doesn't offer the busy control.
  let pace: VendorPace = { extraMinutes: 0, until: null, supported: false };

  try {
    const board = await listKitchenOrders(restaurant.id);
    incoming = board.incoming;
    preparing = board.preparing;
    ready = board.ready;
    const history = await listVendorOrderHistory(restaurant.id);
    recent = history.completed;
    cancelled = history.cancelled;
    pace = await getVendorPace(restaurant.id).catch(() => pace);
  } catch {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Live orders"
          subtitle={`Could not load orders for ${restaurant.name}.`}
        />
      </div>
    );
  }

  return (
    <VendorOrdersBoard
      initialIncoming={incoming}
      initialPreparing={preparing}
      initialReady={ready}
      initialRecent={recent}
      initialCancelled={cancelled}
      live
      restaurantName={restaurant.name}
      pace={pace}
    />
  );
}
