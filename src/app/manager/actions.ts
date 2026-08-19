"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  notifyOrderAccepted,
  notifyOrderReady,
  notifyOnTheWay,
  notifyDelivered,
} from "@/lib/notifications/order-events";
import { columnKnownMissing, isMissingColumn, rememberColumn } from "@/lib/data-access/schema-probe";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const DEMO = "Demo mode: connect Supabase and apply 0023 to work orders.";
const LOCATION_SOURCE_COLUMN = "deliveries.driver_location_source";

/**
 * The linear pipeline, and the only moves a manager may make along it.
 *
 * Forward-only, one step at a time. A manager is an operator, not an auditor:
 * the ability to drag an order backwards, or to jump it from `placed` straight
 * to `delivered`, is an admin override and lives on the admin order screen
 * behind `requireRole("admin")`.
 */
const NEXT: Record<string, string> = {
  placed: "kitchen",
  kitchen: "ready",
  ready: "on_the_way",
  on_the_way: "delivered",
};

/**
 * Advance one order to the next stage.
 *
 * Two things make this its own action rather than a call into the vendor route:
 *
 *   * `/api/orders/[id]/status` is restaurant-only by design — it authorizes on
 *     ownership of the restaurant, which a manager does not have.
 *   * `guard_order_update()` lets a non-admin change **only** `status` on an
 *     order. Every other column is locked, and the check is per-column across
 *     the whole row: send `status` plus anything else — a timestamp, an
 *     `updated_at` — and Postgres rejects the entire update. So this sends one
 *     field and lets `zz_orders_stamp_lifecycle` do the rest.
 */
export async function advanceOrder(
  orderId: string,
  expected: string
): Promise<ActionResult> {
  // ["manager", "admin"] matches the /manager layout, which admits both. This
  // grants an admin nothing new — RLS is the real boundary and `is_admin()`
  // already passes it — it just stops the portal's own buttons from bouncing
  // the admin the layout let in.
  await requireRole(["manager", "admin"]);
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };

  const target = NEXT[expected];
  if (!target) {
    return { ok: false, error: "This order has nowhere further to go." };
  }

  const supabase = await createClient();

  // Conditional on the status the manager was looking at. Two managers working
  // the same board would otherwise both advance the same order and push it two
  // stages in one tap — the second update matches zero rows instead.
  const { data, error } = await supabase
    .from("orders")
    .update({ status: target })
    .eq("id", orderId)
    .eq("status", expected)
    .select("id");

  if (error) return { ok: false, error: "That didn't go through. Try again." };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "Someone else moved this order. Refresh to see where it is.",
    };
  }

  if (target === "kitchen") void notifyOrderAccepted(orderId);
  else if (target === "ready") void notifyOrderReady(orderId);
  else if (target === "on_the_way") void notifyOnTheWay(orderId);
  else if (target === "delivered") void notifyDelivered(orderId);

  revalidatePath("/manager");
  return { ok: true };
}

/**
 * Hand a ready order to a specific rider.
 *
 * The race handling is copied from `acceptDelivery()` in driver-orders.ts, and
 * for the same reason: `deliveries.order_id` is unique (0001), so when a manager
 * dispatches an order at the moment a rider self-assigns it, both pass the
 * pre-check and the loser's insert raises 23505. That is not an error to show as
 * a failure — someone got there first, and the job is covered either way.
 */
export async function assignRider(
  orderId: string,
  riderId: string
): Promise<ActionResult> {
  await requireRole(["manager", "admin"]);
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };

  if (!orderId || !riderId) {
    return { ok: false, error: "Pick a rider first." };
  }

  const supabase = await createClient();

  // Read the row whatever its status. It used to filter to the claimed
  // statuses, which was correct only while `deliveries` rows came into being at
  // the moment a rider accepted. Dispatch (0042) now leaves an `unassigned` row
  // carrying an offer, and the insert below would hit the unique constraint on
  // `order_id` and tell the manager "a rider took this order first" about an
  // order no rider had touched.
  const { data: existing } = await supabase
    .from("deliveries")
    .select("id, status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing && existing.status !== "unassigned") {
    return { ok: false, error: "This order already has a rider." };
  }

  // No coordinates, and `driver_location_source: 'none'` says so out loud. The
  // tracking map draws an estimate until the rider's device reports a real fix
  // — seeding a fake position here is the exact bug slice D removed.
  const claim = {
    driver_id: riderId,
    status: "assigned" as const,
    assigned_at: new Date().toISOString(),
  };

  // A manager assigning deliberately OVERRIDES whatever dispatch offered: they
  // can see the board and the rider in front of them, and the automatic pick
  // cannot. `offered_driver_id` is left alone — it is the record of who the
  // system asked, which stays true whether or not that is who was sent.
  const write = (withSource: boolean) =>
    existing
      ? supabase
          .from("deliveries")
          .update({
            ...claim,
            ...(withSource ? { driver_location_source: "none" } : {}),
          })
          .eq("id", existing.id)
          // The optimistic lock the insert path gets for free from the unique
          // constraint: if a rider accepted the offer between our read and this
          // write, no row matches and we say so rather than reporting a
          // dispatch that never happened.
          .eq("status", "unassigned")
          .select("id")
      : supabase
          .from("deliveries")
          .insert({
            order_id: orderId,
            ...claim,
            ...(withSource ? { driver_location_source: "none" } : {}),
          })
          .select("id");

  let withSource = !columnKnownMissing(LOCATION_SOURCE_COLUMN);
  let { data, error } = await write(withSource);

  if (error && withSource && isMissingColumn(error)) {
    rememberColumn(LOCATION_SOURCE_COLUMN, false);
    withSource = false;
    ({ data, error } = await write(false));
  } else if (!error && withSource) {
    rememberColumn(LOCATION_SOURCE_COLUMN, true);
  }

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: "A rider took this order first." };
    }
    return { ok: false, error: "That didn't go through. Try again." };
  }
  if ((data ?? []).length === 0) {
    return { ok: false, error: "A rider took this order first." };
  }

  revalidatePath("/manager");
  return { ok: true };
}
