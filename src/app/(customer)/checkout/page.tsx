import { CheckoutView } from "@/components/checkout/checkout-view";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { onlinePaymentsEnabled } from "@/lib/payments/availability";

// Checkout needs a real account (addresses, wallet, placing an order). The proxy
// already bounces guests to /login; this is the server-side backstop.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  await requireUser();
  // The fee/tax/min shown here are the same platform settings the server bills
  // from, so the quoted total and the charged total can't disagree.
  //
  // `onlinePayments` comes from the same gate /api/orders enforces, so the
  // option the customer can tap and the one the server will accept are the same
  // fact. False — the state this ships in — renders "Available soon".
  const [s, onlinePayments] = await Promise.all([
    getSettings(),
    onlinePaymentsEnabled(),
  ]);

  return (
    // `owns-bottom` drops the shell's 80px tab-bar reservation (the tab bar is
    // hidden on checkout), so the sticky order dock can reach the bottom edge.
    // The column stretches to the full scroller height so the dock still sits
    // at the foot of the screen when the basket is short enough not to scroll.
    <div className="owns-bottom relative flex min-h-full flex-col">
      <CheckoutView
        config={{
          deliveryFee: s.deliveryFee,
          taxRate: s.taxRate,
          freeDeliveryThreshold: s.freeDeliveryThreshold,
          minOrder: s.minOrder,
          acceptingOrders: s.acceptingOrders,
          maintenanceMessage: s.maintenanceMessage,
          onlinePayments,
        }}
      />
    </div>
  );
}
