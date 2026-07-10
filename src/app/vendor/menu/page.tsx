import { VendorMenuBoard } from "@/components/vendor/vendor-menu-board";
import { VendorPageHeader } from "@/components/vendor/vendor-page-header";
import { getProfile } from "@/lib/auth";
import { listOwnedMenuItems } from "@/lib/data-access/vendor-menu";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RESTAURANTS } from "@/lib/data";

export const dynamic = "force-dynamic";

function DemoMenuPage() {
  const store = RESTAURANTS.find((r) => r.slug === "saffron-kitchen")!;
  const items = store.menu.map((m) => ({
    ...m,
    dbId: m.id,
  }));

  return (
    <VendorMenuBoard
      restaurantName={store.name}
      categories={store.categories}
      items={items}
      live={false}
    />
  );
}

export default async function RestaurantMenuPage() {
  if (!isSupabaseConfigured) {
    return <DemoMenuPage />;
  }

  const profile = await getProfile();
  if (profile?.role !== "restaurant") {
    return <DemoMenuPage />;
  }

  const restaurant = await resolveVendorRestaurant();
  if (!restaurant) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Menu"
          subtitle="No restaurant linked to your account."
        />
      </div>
    );
  }

  let menu: Awaited<ReturnType<typeof listOwnedMenuItems>> = null;
  try {
    menu = await listOwnedMenuItems();
  } catch {
    return <DemoMenuPage />;
  }

  return (
    <VendorMenuBoard
      restaurantName={menu?.restaurantName ?? restaurant.name}
      categories={menu?.categories ?? []}
      items={menu?.items ?? []}
      live
    />
  );
}
