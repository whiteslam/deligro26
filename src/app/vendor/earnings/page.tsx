import { VendorPageHeader } from "@/components/vendor/vendor-page-header";
import { VendorEarningsCharts } from "@/components/vendor/vendor-earnings-charts";
import { getProfile } from "@/lib/auth";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import { getVendorEarningsSummary } from "@/lib/data-access/vendor-earnings";
import type { VendorEarningsSummary } from "@/lib/data-access/vendor-earnings";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const DEMO_WEEK = [
  { day: "Mon", amount: 8200, orders: 18 },
  { day: "Tue", amount: 9400, orders: 21 },
  { day: "Wed", amount: 7600, orders: 16 },
  { day: "Thu", amount: 11200, orders: 24 },
  { day: "Fri", amount: 14800, orders: 31 },
  { day: "Sat", amount: 16900, orders: 36 },
  { day: "Sun", amount: 13100, orders: 28 },
];

function demoStats(): VendorEarningsSummary {
  const weekTotal = DEMO_WEEK.reduce((s, d) => s + d.amount, 0);
  const orderCount = DEMO_WEEK.reduce((s, d) => s + d.orders, 0);
  const best = DEMO_WEEK.reduce(
    (top, d) => (d.amount > top.amount ? d : top),
    DEMO_WEEK[0]
  );

  return {
    weekTotal,
    orderCount,
    daily: DEMO_WEEK,
    lifetimeTotal: 72400,
    lifetimeOrders: 198,
    avgOrderValue: Math.round(weekTotal / orderCount),
    lifetimeAvgOrderValue: Math.round(72400 / 198),
    todayRevenue: 4200,
    todayOrders: 9,
    lastWeekTotal: 68150,
    lastWeekOrders: 186,
    weekChangePercent: 12,
    cancelledCount: 6,
    cancelledValue: 2840,
    pendingCount: 3,
    pendingValue: 1560,
    bestDay: best.day,
    bestDayAmount: best.amount,
  };
}

function DemoEarningsPage() {
  return (
    <VendorEarningsCharts
      restaurantName="Saffron Kitchen"
      stats={demoStats()}
      demo
    />
  );
}

export default async function RestaurantEarningsPage() {
  if (!isSupabaseConfigured) {
    return <DemoEarningsPage />;
  }

  const profile = await getProfile();
  if (profile?.role !== "restaurant") {
    return <DemoEarningsPage />;
  }

  let restaurant: Awaited<ReturnType<typeof resolveVendorRestaurant>> = null;
  try {
    restaurant = await resolveVendorRestaurant();
  } catch {
    return <DemoEarningsPage />;
  }

  if (!restaurant) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Earnings"
          subtitle="No restaurant linked to your account."
        />
      </div>
    );
  }

  let summary: VendorEarningsSummary;
  try {
    summary = await getVendorEarningsSummary(restaurant.id);
  } catch {
    return <DemoEarningsPage />;
  }

  return (
    <VendorEarningsCharts restaurantName={restaurant.name} stats={summary} />
  );
}
