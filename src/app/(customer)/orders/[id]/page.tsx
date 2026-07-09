import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ACTIVE_ORDER, PAST_ORDERS } from "@/lib/data";
import { getOrderForTracking } from "@/lib/orders-ui";
import { getDeliveryOtp } from "@/lib/data-access/handover";
import { TrackingView } from "@/components/orders/tracking-view";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const MOCK_ORDERS = [ACTIVE_ORDER, ...PAST_ORDERS];

export async function generateStaticParams() {
  if (isSupabaseConfigured) return [];
  return MOCK_ORDERS.map((o) => ({ id: o.id }));
}

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderForTracking(id);
  if (!order) notFound();

  let deliveryOtp: string | null = null;
  if (isSupabaseConfigured && order.status !== "DELIVERED" && order.status !== "CANCELLED") {
    try {
      deliveryOtp = await getDeliveryOtp(id);
    } catch {
      // non-fatal — just hide the code
    }
  }

  return (
    <Suspense>
      <TrackingView order={order} deliveryOtp={deliveryOtp} />
    </Suspense>
  );
}
