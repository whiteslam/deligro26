"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { acceptDelivery, advanceDelivery } from "@/lib/data-access/driver-orders";

async function requireDriverId(): Promise<string> {
  const profile = await getProfile();
  if (!profile || profile.role !== "driver") throw new Error("forbidden");
  return profile.id;
}

export async function acceptDeliveryAction(orderId: string) {
  const driverId = await requireDriverId();
  await acceptDelivery(driverId, orderId);
  revalidatePath("/driver");
}

export async function advanceDeliveryAction(orderId: string) {
  const driverId = await requireDriverId();
  await advanceDelivery(driverId, orderId);
  revalidatePath("/driver");
}
