import { VendorOrdersBoard } from "@/components/vendor/vendor-orders-board";
import {
  INCOMING_ORDERS,
  PREPARING_ORDERS,
} from "@/lib/roles-data";
import { listKitchenOrders } from "@/lib/data-access/vendor-orders";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function VendorOrdersPage() {
  // Demo tickets only when there is no backend at all. They used to also stand in
  // whenever the live query threw — which meant a kitchen could be shown three
  // fabricated orders ("Aarav M. · Koramangala 5th Block") and start cooking
  // them. A failed read now fails; it does not invent work.
  let incoming = INCOMING_ORDERS;
  let preparing = PREPARING_ORDERS;
  let live = false;

  if (isSupabaseConfigured) {
    const board = await listKitchenOrders();
    incoming = board.incoming;
    preparing = board.preparing;
    live = true;
  }

  return (
    <VendorOrdersBoard
      initialIncoming={incoming}
      initialPreparing={preparing}
      live={live}
    />
  );
}
