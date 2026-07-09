import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { shortOrderId } from "@/lib/utils/order-map";
import { sendPush, isPushConfigured } from "./onesignal";

/**
 * Push an order-status update to the order's customer. Best-effort and never
 * throws — a failed push must not roll back the delivery transition that
 * triggered it. Looks up the customer's OneSignal player id with the
 * service-role client (the driver/webhook context can't read it under RLS).
 */
export async function notifyCustomer(
  orderId: string,
  heading: string,
  message: string
): Promise<void> {
  if (!isPushConfigured) return;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("orders")
      .select("customer:profiles!orders_customer_id_fkey(onesignal_id)")
      .eq("id", orderId)
      .maybeSingle();

    const customer = data?.customer as { onesignal_id: string | null } | { onesignal_id: string | null }[] | null;
    const playerId = Array.isArray(customer) ? customer[0]?.onesignal_id : customer?.onesignal_id;
    if (!playerId) return;

    await sendPush(playerId, heading, message, { url: `/orders/${orderId}` });
  } catch {
    // swallow — fire-and-forget
  }
}

/** Convenience: the two customer-facing delivery transitions. */
export function notifyOnTheWay(orderId: string): Promise<void> {
  return notifyCustomer(
    orderId,
    "Your order is on the way 🛵",
    `Order #${shortOrderId(orderId)} has left the kitchen and is heading to you.`
  );
}

export function notifyDelivered(orderId: string): Promise<void> {
  return notifyCustomer(
    orderId,
    "Delivered ✅",
    `Order #${shortOrderId(orderId)} was delivered. Enjoy your meal!`
  );
}
