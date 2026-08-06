import { VendorMenuBoard } from "@/components/vendor/vendor-menu-board";
import { VendorPageHeader } from "@/components/vendor/vendor-page-header";
import { getProfile } from "@/lib/auth";
import { hasVendorAccess } from "@/lib/auth/vendor-access";
import { listOwnedMenuItems } from "@/lib/data-access/vendor-menu";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function RestaurantMenuPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Menu"
          subtitle="Connect Supabase to manage your menu."
        />
      </div>
    );
  }

  const profile = await getProfile();
  if (!(await hasVendorAccess(profile))) {
    return (
      <div className="space-y-6">
        <VendorPageHeader title="Menu" subtitle="Restaurant access required." />
      </div>
    );
  }

  let restaurant: Awaited<ReturnType<typeof resolveVendorRestaurant>> = null;
  try {
    restaurant = await resolveVendorRestaurant();
  } catch {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Menu"
          subtitle="Could not load your restaurant. Try again."
        />
      </div>
    );
  }

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
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Menu"
          subtitle={`Could not load menu for ${restaurant.name}.`}
        />
      </div>
    );
  }

  return (
    <VendorMenuBoard
      restaurantId={menu?.restaurantId ?? restaurant.id}
      restaurantName={menu?.restaurantName ?? restaurant.name}
      restaurantSlug={restaurant.slug}
      categories={menu?.categories ?? []}
      items={menu?.items ?? []}
      live
    />
  );
}
