"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  createSettlementDraft,
  markOrderPaid,
  markOrderUnpaid,
  markSettlementPaid,
  voidSettlement,
} from "@/lib/data-access/admin-settlements";

export type SettlementActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function createSettlementAction(
  formData: FormData
): Promise<SettlementActionResult> {
  const admin = await requireRole("admin");
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const fromDate = String(formData.get("fromDate") ?? "");
  const toDate = String(formData.get("toDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const result = await createSettlementDraft({
    restaurantId,
    fromDate,
    toDate,
    adminId: admin.id,
    notes,
  });
  if ("error" in result) return { ok: false, error: result.error };

  revalidatePath("/admin/settlements");
  revalidatePath(`/admin/settlements/${result.id}`);
  return { ok: true, id: result.id };
}

export async function markSettlementPaidAction(
  formData: FormData
): Promise<SettlementActionResult> {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const paymentRef = String(formData.get("paymentRef") ?? "");

  const result = await markSettlementPaid({
    id,
    adminId: admin.id,
    paymentRef,
  });
  if ("error" in result) return { ok: false, error: result.error };

  revalidatePath("/admin/settlements");
  revalidatePath(`/admin/settlements/${id}`);
  return { ok: true, id };
}

/**
 * The Paid / Unpaid dropdown on a single order.
 *
 * "Paid" creates a one-order settlement in the paid state; "Unpaid" voids it.
 * Both re-gate on admin — a Server Action is a public HTTP endpoint, and this
 * one moves an order in and out of a vendor's payout (AGENTS.md §3).
 */
export async function setOrderPaidAction(
  orderId: string,
  paid: boolean,
  paymentRef?: string
): Promise<SettlementActionResult> {
  const admin = await requireRole("admin");

  const result = paid
    ? await markOrderPaid({ orderId, adminId: admin.id, paymentRef })
    : await markOrderUnpaid({ orderId, adminId: admin.id });

  if ("error" in result) return { ok: false, error: result.error };

  revalidatePath("/admin/settlements");
  revalidatePath("/admin/settlements/orders");
  revalidatePath("/admin/orders");
  return { ok: true, id: "id" in result ? result.id : undefined };
}

export async function voidSettlementAction(
  id: string
): Promise<SettlementActionResult> {
  const admin = await requireRole("admin");
  const result = await voidSettlement({ id, adminId: admin.id });
  if ("error" in result) return { ok: false, error: result.error };

  revalidatePath("/admin/settlements");
  revalidatePath(`/admin/settlements/${id}`);
  return { ok: true, id };
}
