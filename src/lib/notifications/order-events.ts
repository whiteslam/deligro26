import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { shortOrderId } from "@/lib/utils/order-map";
import { sendPush, isPushConfigured } from "./onesignal";

/**
 * Order notifications — every transition, for both sides of it.
 *
 * This file used to cover two of six transitions: on-the-way and delivered. A
 * customer heard nothing when the restaurant accepted their order, nothing when
 * it was ready, and — worst of the set — nothing when it was rejected. The two
 * moments people actually wait for were the silent ones.
 *
 * Everything here is fire-and-forget and never throws into the caller. A failed
 * push must not roll back the transition that triggered it; an order that moved
 * and wasn't announced is recoverable, an order that didn't move is not.
 *
 * Reads use the service-role client because the contexts that trigger these —
 * a driver advancing a delivery, a webhook, a vendor accepting — cannot see the
 * counterparty's push id under RLS.
 */

async function pushToPlayer(
  playerId: string | null | undefined,
  heading: string,
  message: string,
  url: string
): Promise<void> {
  if (!playerId) return;
  try {
    await sendPush(playerId, heading, message, { url });
  } catch {
    // swallow — fire-and-forget
  }
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/** Push an order update to the order's customer. */
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

    const customer = one(
      data?.customer as { onesignal_id: string | null } | { onesignal_id: string | null }[] | null
    );
    await pushToPlayer(
      customer?.onesignal_id,
      heading,
      message,
      `/orders/${orderId}`
    );
  } catch {
    // swallow — fire-and-forget
  }
}

/**
 * Push to the owner of the restaurant an order was placed with.
 *
 * The vendor board polls every four seconds, which is fine when someone is
 * watching it and useless when nobody is. A new order is the one event a
 * kitchen cannot afford to discover late.
 */
export async function notifyVendor(
  orderId: string,
  heading: string,
  message: string
): Promise<void> {
  if (!isPushConfigured) return;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("orders")
      .select("restaurants(owner_id)")
      .eq("id", orderId)
      .maybeSingle();

    const restaurant = one(
      data?.restaurants as { owner_id: string | null } | { owner_id: string | null }[] | null
    );
    if (!restaurant?.owner_id) return;

    const { data: owner } = await supabase
      .from("profiles")
      .select("onesignal_id")
      .eq("id", restaurant.owner_id)
      .maybeSingle();

    await pushToPlayer(owner?.onesignal_id, heading, message, `/vendor`);
  } catch {
    // swallow — fire-and-forget
  }
}

/**
 * Push to one rider, by profile id.
 *
 * Unlike `notifyCustomer`/`notifyVendor` this takes the recipient directly:
 * dispatch has already decided who to ask (see rider-dispatch.ts), and looking
 * the rider back up from the order would mean reading a `driver_id` that is
 * deliberately still null while an offer is outstanding.
 */
export async function notifyDriver(
  driverId: string,
  heading: string,
  message: string
): Promise<void> {
  if (!isPushConfigured) return;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("onesignal_id")
      .eq("id", driverId)
      .maybeSingle();

    await pushToPlayer(data?.onesignal_id, heading, message, "/driver");
  } catch {
    // swallow — fire-and-forget
  }
}

/* ---------- customer-facing transitions ---------- */

/**
 * Placed — deliberately worded as *sent*, not accepted. The order is waiting on
 * the kitchen at this point and saying otherwise is the lie the tracker used
 * to tell.
 */
export function notifyOrderPlaced(orderId: string): Promise<void> {
  return notifyCustomer(
    orderId,
    "Order sent 🧾",
    `Order #${shortOrderId(orderId)} is with the restaurant. We'll tell you the moment they accept.`
  );
}

export function notifyOrderAccepted(
  orderId: string,
  restaurantName?: string
): Promise<void> {
  return notifyCustomer(
    orderId,
    "Order accepted 👨‍🍳",
    restaurantName
      ? `${restaurantName} accepted order #${shortOrderId(orderId)} and started cooking.`
      : `Order #${shortOrderId(orderId)} was accepted and is being cooked.`
  );
}

export function notifyOrderReady(orderId: string): Promise<void> {
  return notifyCustomer(
    orderId,
    "Food is ready 🍽️",
    `Order #${shortOrderId(orderId)} is packed and waiting for a rider.`
  );
}

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

/**
 * Cancelled. `byVendor` changes the wording because the two cases are not the
 * same message: a customer who cancelled knows why, and one whose order the
 * restaurant refused needs to be told plainly — and told about their money.
 */
export function notifyOrderCancelled(
  orderId: string,
  opts: { byVendor?: boolean; refundQueued?: boolean } = {}
): Promise<void> {
  const money = opts.refundQueued
    ? " Your refund has been requested and is being processed."
    : "";
  return notifyCustomer(
    orderId,
    opts.byVendor ? "Order declined" : "Order cancelled",
    opts.byVendor
      ? `The restaurant couldn't take order #${shortOrderId(orderId)}.${money}`
      : `Order #${shortOrderId(orderId)} was cancelled.${money}`
  );
}

export function notifyPaymentFailed(orderId: string): Promise<void> {
  return notifyCustomer(
    orderId,
    "Payment didn't go through",
    `Order #${shortOrderId(orderId)} is saved but unpaid. Open it to try again.`
  );
}

export function notifyRefundDecided(
  orderId: string,
  approved: boolean
): Promise<void> {
  return notifyCustomer(
    orderId,
    approved ? "Refund approved 💸" : "Refund declined",
    approved
      ? `Your refund for order #${shortOrderId(orderId)} was approved.`
      : `We couldn't approve the refund for order #${shortOrderId(orderId)}. Contact support if this looks wrong.`
  );
}

/* ---------- rider-facing ---------- */

/**
 * The kitchen just accepted — go and be there when it comes off the pass.
 *
 * This is the notification the rider never used to get. Orders appeared in the
 * available pool at `ready`, which is the moment the food is already sitting on
 * the counter going cold: the road leg started from wherever the rider happened
 * to be, after they happened to notice. Told at `kitchen` instead, with the
 * prep estimate, a rider can be at the shop when the bag is.
 *
 * `readyInMinutes` is the kitchen leg from `kitchenPrepMinutes` — the same
 * number the customer's countdown is built on, so the two cannot disagree.
 */
export function notifyDriverPickupOffered(
  driverId: string,
  opts: {
    orderId: string;
    restaurantName: string;
    readyInMinutes: number;
    /** Shown so the rider can judge whether to set off now. */
    pickupArea?: string | null;
  }
): Promise<void> {
  const where = opts.pickupArea?.trim() ? ` (${opts.pickupArea.trim()})` : "";
  return notifyDriver(
    driverId,
    "Pickup coming your way 🛵",
    `${opts.restaurantName}${where} is cooking order #${shortOrderId(
      opts.orderId
    )} — ready in about ${opts.readyInMinutes} min. Head over.`
  );
}

/** Packed and waiting. Sent to whichever rider dispatch picked at ready-time. */
export function notifyDriverPickupReady(
  driverId: string,
  opts: { orderId: string; restaurantName: string }
): Promise<void> {
  return notifyDriver(
    driverId,
    "Order ready to collect 📦",
    `${opts.restaurantName} has packed order #${shortOrderId(
      opts.orderId
    )}. It's held for you — accept it in the app.`
  );
}

/**
 * The rider is at the door.
 *
 * Fired once, from the rider's own location report, when they first come within
 * the arrival radius of the drop (see reportDriverLocation). Worded as *nearly*
 * there rather than *here*: 500 m is a couple of minutes on a bike, and a
 * customer who comes downstairs on this message should not be standing in the
 * street for five minutes wondering whether they misread it.
 */
export function notifyRiderArriving(orderId: string, riderName?: string | null): Promise<void> {
  const who = riderName?.trim() || "Your rider";
  return notifyCustomer(
    orderId,
    "Your rider is here 🛵",
    `${who} has reached your place with order #${shortOrderId(
      orderId
    )}. Have your delivery code ready.`
  );
}

/* ---------- vendor-facing ---------- */

export function notifyVendorNewOrder(
  orderId: string,
  itemCount?: number
): Promise<void> {
  const items =
    typeof itemCount === "number" && itemCount > 0
      ? ` · ${itemCount} item${itemCount > 1 ? "s" : ""}`
      : "";
  return notifyVendor(
    orderId,
    "New order 🔔",
    `Order #${shortOrderId(orderId)}${items} is waiting for you to accept.`
  );
}

/**
 * The customer pulled out. The board would otherwise just drop the card, which
 * a kitchen already cooking has no way to notice.
 */
export function notifyVendorOrderCancelled(
  orderId: string,
  opts: { byAdmin?: boolean } = {}
): Promise<void> {
  // Who pulled the order changes what the kitchen does next: a customer
  // cancelling is routine, support cancelling on their behalf usually means
  // something went wrong that the restaurant is about to be asked about.
  // Default unchanged, so the existing customer-path callers are untouched.
  return notifyVendor(
    orderId,
    opts.byAdmin ? "Order cancelled by support" : "Order cancelled by customer",
    `Order #${shortOrderId(orderId)} was cancelled. Stop preparing it.`
  );
}
