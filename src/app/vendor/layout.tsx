import { VendorShell } from "@/components/vendor/vendor-shell";
import { requireVendorAccess } from "@/lib/auth/vendor-access";
import {
  listOwnedRestaurants,
  resolveVendorRestaurant,
} from "@/lib/data-access/vendor-restaurant";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

async function ownerEmail(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? null;
  } catch {
    return null;
  }
}

export default async function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vendor accounts OR any shop owner (a customer who also runs a shop).
  const profile = await requireVendorAccess();

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

  const email = await ownerEmail();

  return (
    <VendorShell
      restaurantName={restaurantName || "No restaurant"}
      isOpen={isOpen}
      restaurants={restaurants}
      activeSlug={activeSlug}
      showControls={isSupabaseConfigured && restaurants.length > 0}
      name={profile.full_name?.trim() || "Vendor"}
      email={email}
    >
      {children}
    </VendorShell>
  );
}
