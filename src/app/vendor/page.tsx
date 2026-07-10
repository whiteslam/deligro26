import { VendorOrdersBoard } from "@/components/vendor/vendor-orders-board";
import { getProfile } from "@/lib/auth";
import {
  INCOMING_ORDERS,
  PREPARING_ORDERS,
} from "@/lib/roles-data";
import {
  listKitchenOrders,
  listVendorOrderHistory,
} from "@/lib/data-access/vendor-orders";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function VendorOrdersPage() {
  let incoming = INCOMING_ORDERS;
  let preparing = PREPARING_ORDERS;
  let recent: typeof INCOMING_ORDERS = [];
  let cancelled: typeof INCOMING_ORDERS = [];
  let live = false;
  let restaurantName: string | undefined;

  if (isSupabaseConfigured) {
    const profile = await getProfile();
    if (profile?.role === "restaurant") {
      try {
        const restaurant = await resolveVendorRestaurant();
        if (restaurant) {
          restaurantName = restaurant.name;
          const board = await listKitchenOrders(restaurant.id);
          incoming = board.incoming;
          preparing = board.preparing;
          const history = await listVendorOrderHistory(restaurant.id);
          recent = history.completed;
          cancelled = history.cancelled;
          live = true;
        }
      } catch {
        // fall back to demo data
      }
    }
  }

  return (
    <VendorOrdersBoard
      initialIncoming={incoming}
      initialPreparing={preparing}
      initialRecent={recent}
      initialCancelled={cancelled}
      live={live}
      restaurantName={restaurantName}
    />
  );
}
