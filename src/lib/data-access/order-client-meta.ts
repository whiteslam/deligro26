import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeDeviceHash } from "@/lib/orders/device-id";

/**
 * Remember which install placed an order, as a salted hash and nothing else
 * (migration 0173, section 17.6). Best effort and silent: a missing secret,
 * a missing table or a failed write must never touch the order that was just
 * placed. Without `DEVICE_HASH_PEPPER` nothing is stored (see device-id.ts).
 */
export async function recordOrderClientMeta(orderId: string, deviceId: string | null): Promise<void> {
  try {
    const hash = computeDeviceHash(deviceId, process.env.DEVICE_HASH_PEPPER);
    if (!hash) return;
    await createAdminClient().rpc("record_order_client_meta", { p_order: orderId, p_device_hash: hash });
  } catch {
    // by contract
  }
}
