import { VendorOrdersBoard } from "@/components/vendor/vendor-orders-board";
import {
  INCOMING_ORDERS,
  PREPARING_ORDERS,
} from "@/lib/roles-data";
import { listKitchenOrders } from "@/lib/data-access/vendor-orders";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function VendorOrdersPage() {
  let incoming = INCOMING_ORDERS;
  let preparing = PREPARING_ORDERS;
  let live = false;

  if (isSupabaseConfigured) {
    try {
      const board = await listKitchenOrders();
      incoming = board.incoming;
      preparing = board.preparing;
      live = true;
    } catch {
      // demo fallback
    }
  }

  return (
    <VendorOrdersBoard
      initialIncoming={incoming}
      initialPreparing={preparing}
      live={live}
    />
  );
}
