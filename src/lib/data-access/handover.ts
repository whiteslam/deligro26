import "server-only";
import { createClient } from "@/lib/supabase/server";

/** The customer's delivery handover code (RLS: only the order owner can read). */
export async function getDeliveryOtp(orderId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("delivery_otp")
    .eq("id", orderId)
    .maybeSingle();
  return (data?.delivery_otp as string | undefined) ?? null;
}
