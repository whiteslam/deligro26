import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ACTIVE_ORDER, PAST_ORDERS } from "@/lib/data";
import { TrackingView } from "@/components/orders/tracking-view";

const ALL_ORDERS = [ACTIVE_ORDER, ...PAST_ORDERS];

export function generateStaticParams() {
  return ALL_ORDERS.map((o) => ({ id: o.id }));
}

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = ALL_ORDERS.find((o) => o.id === id);
  if (!order) notFound();

  return (
    <Suspense>
      <TrackingView order={order} />
    </Suspense>
  );
}
