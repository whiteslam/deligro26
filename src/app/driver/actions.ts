"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { acceptDelivery, advanceDelivery } from "@/lib/data-access/driver-orders";

async function requireDriverId(): Promise<string> {
  const profile = await getProfile();
  if (!profile || profile.role !== "driver") throw new Error("forbidden");
  return profile.id;
}

export async function acceptDeliveryAction(orderId: string) {
  const driverId = await requireDriverId();

  // A rider genuinely taps Accept a handful of times an hour; the cap is here so
  // a script cannot sweep the ready pool the instant orders appear.
  const limit = await rateLimit(`driver-accept:${driverId}`, 30, 60_000);
  if (!limit.ok) return { ok: false, error: "rate_limited" };

  const result = await acceptDelivery(driverId, orderId);
  revalidatePath("/driver");
  return result;
}

export async function advanceDeliveryAction(orderId: string, otp?: string) {
  const driverId = await requireDriverId();

  // This is the delivery-OTP gate, and it is guessable: the code is four digits,
  // so 10 000 combinations. The rider who would want to guess it is the one who
  // already has the food and would rather not meet the customer — an assigned
  // rider, passing every other check. Ten attempts a minute turns an exhaustive
  // search into something that takes most of a day and shows up as a pattern
  // long before it succeeds. `tooManyRequests` is for route handlers; a Server
  // Action answers in the same shape as the rest of this file.
  const limit = await rateLimit(`driver-advance:${driverId}`, 10, 60_000);
  if (!limit.ok) return { ok: false, error: "rate_limited" };

  const result = await advanceDelivery(driverId, orderId, otp);
  revalidatePath("/driver");
  return result;
}
