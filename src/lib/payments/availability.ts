import "server-only";
import { getSettings } from "@/lib/settings";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";

/**
 * Is online payment actually on offer right now?
 *
 * One answer, used by the checkout page, the order API and the payment routes,
 * so the button the customer sees and the request the server accepts can never
 * disagree. Both conditions are required:
 *
 *   1. an admin switched it on in Settings → Platform, and
 *   2. the Razorpay keys are present in this environment.
 *
 * (2) is not redundant. Without it, flipping the toggle on a staging box with no
 * keys would show the customer a payment option that dead-ends at an empty
 * checkout — and "the config says yes so let it through" is exactly the
 * fail-open shape the audit's H-1 was. A missing key reduces what is offered.
 *
 * Until this returns true the customer sees "Available soon" and COD is the
 * only method, which is the state this ships in.
 */
export async function onlinePaymentsEnabled(): Promise<boolean> {
  if (!isRazorpayConfigured) return false;
  const settings = await getSettings();
  return settings.featureOnlinePayment;
}
