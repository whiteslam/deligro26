import { CheckoutView } from "@/components/checkout/checkout-view";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

// Checkout needs a real account (addresses, wallet, placing an order). The proxy
// already bounces guests to /signin; this is the server-side backstop.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  await requireUser();
  // The fee/tax/min shown here are the same platform settings the server bills
  // from, so the quoted total and the charged total can't disagree.
  const s = await getSettings();
  return (
    <div className="relative -mb-[92px] min-h-full">
      <CheckoutView
        config={{
          deliveryFee: s.deliveryFee,
          taxRate: s.taxRate,
          freeDeliveryThreshold: s.freeDeliveryThreshold,
          minOrder: s.minOrder,
          acceptingOrders: s.acceptingOrders,
          maintenanceMessage: s.maintenanceMessage,
        }}
      />
    </div>
  );
}
