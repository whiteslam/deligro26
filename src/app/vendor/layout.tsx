import { VendorShell } from "@/components/vendor/vendor-shell";
import { requireVendorAccess } from "@/lib/auth/vendor-access";
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
  // Vendor accounts OR any shop owner (a customer who also runs a shop).
  await requireVendorAccess();
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

  return (
    <VendorShell
      restaurantName={restaurantName || "No restaurant"}
      isOpen={isOpen}
      restaurants={restaurants}
      activeSlug={activeSlug}
      showControls={isSupabaseConfigured && restaurants.length > 0}
    >
      {children}
    </VendorShell>
  );
}
