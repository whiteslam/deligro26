import { VendorTopBar } from "@/components/vendor/vendor-top-bar";
import {
  VendorBottomNav,
  VendorSidebar,
} from "@/components/vendor/vendor-sidebar";
import { requireRole } from "@/lib/auth";
import { requireOperatorMfa } from "@/lib/auth/mfa";
import {
  listOwnedRestaurants,
  resolveVendorRestaurant,
} from "@/lib/data-access/vendor-restaurant";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("restaurant"); // vendor accounts only
  // Optional for vendors: only challenged if they opted in from settings.
  await requireOperatorMfa("/vendor", "restaurant");

  let restaurantName = "";
  let isOpen = false;
  let restaurants: Awaited<ReturnType<typeof listOwnedRestaurants>> = [];
  let activeSlug = "";

  if (isSupabaseConfigured) {
    try {
      restaurants = await listOwnedRestaurants();
      const active = await resolveVendorRestaurant();
      if (active) {
        restaurantName = active.name;
        isOpen = active.isOpen;
        activeSlug = active.slug;
      }
    } catch {
      // leave empty — pages show their own error states
    }
  }

  const shellProps = {
    restaurantName: restaurantName || "No restaurant",
    isOpen,
    restaurants,
    activeSlug,
    showControls: isSupabaseConfigured && restaurants.length > 0,
  };

  return (
    <div className="dashboard-shell vendor-shell">
      <VendorSidebar {...shellProps} />
      <div className="vendor-content">
        <VendorTopBar {...shellProps} />
        <main className="dashboard-main vendor-main">{children}</main>
      </div>
      <VendorBottomNav />
    </div>
  );
}
