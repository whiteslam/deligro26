"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { approveRestaurant } from "@/lib/data-access/admin-stats";
import { decideRefund } from "@/lib/data-access/refunds";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Real admin decisions. These exist because the buttons that used to sit on
 * these screens called nothing at all — the refund "Approve" only set local
 * React state and then rendered "Approved · logged".
 *
 * `requireRole` gates the call, and RLS gates the write, so neither one alone is
 * load-bearing.
 */
export async function approveRestaurantAction(id: string): Promise<ActionResult> {
  await requireRole("admin");

  try {
    await approveRestaurant(id);
  } catch {
    return { ok: false, error: "Couldn't approve. Try again." };
  }

  // The storefront is now live — the customer feed must be rebuilt.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function decideRefundAction(
  id: string,
  decision: "approved" | "rejected"
): Promise<ActionResult> {
  await requireRole("admin");

  try {
    await decideRefund(id, decision);
  } catch {
    return { ok: false, error: "Couldn't record the decision. Try again." };
  }

  revalidatePath("/admin/refunds");
  revalidatePath("/admin");
  return { ok: true };
}
