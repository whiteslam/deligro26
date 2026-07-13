import { CheckoutView } from "@/components/checkout/checkout-view";
import { requireUser } from "@/lib/auth";

// Checkout needs a real account (addresses, wallet, placing an order). The proxy
// already bounces guests to /login; this is the server-side backstop.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  await requireUser();
  return (
    <div className="relative -mb-[92px] min-h-full">
      <CheckoutView />
    </div>
  );
}
