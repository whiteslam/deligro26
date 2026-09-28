import { VendorShell } from "@/components/vendor/vendor-shell";
import { OneSignalInit } from "@/components/notifications/onesignal-init";
import { FeaturesProvider } from "@/components/features/features-provider";
import { getFeatures } from "@/lib/features/flags.server";
import { requireVendorAccess } from "@/lib/auth/vendor-access";
import {
  listOwnedRestaurants,
  resolveVendorRestaurant,
} from "@/lib/data-access/vendor-restaurant";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resolveShellMode } from "@/lib/shell-mode.server";
import { resolveConsolePrefs } from "@/lib/console-theme.server";
import type { Metadata } from "next";

/**
 * Installs as its own home-screen app on iPhone/Android ("Add to Home
 * Screen" from this portal) — see src/lib/pwa/role-manifest.ts.
 */
export const metadata: Metadata = {
  manifest: "/manifests/vendor",
  appleWebApp: { capable: true, title: "Deligro Partner", statusBarStyle: "default" },
};

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
  // No MFA challenge follows it: the optional vendor enrolment went with
  // migration 0033, so vendor access is this check and nothing else.
  const profile = await requireVendorAccess();

  let restaurantName = "";
  let isOpen = false;
  let restaurants: Awaited<ReturnType<typeof listOwnedRestaurants>> = [];
  let activeSlug = "";
  let activeId: string | null = null;

  if (isSupabaseConfigured) {
    try {
      restaurants = await listOwnedRestaurants();
      const active = await resolveVendorRestaurant();
      if (active) {
        restaurantName = active.name;
        isOpen = active.isOpen;
        activeSlug = active.slug;
        activeId = active.id;
      }
    } catch {
      // leave empty — pages show their own error states
    }
  }

  const [email, shellMode, prefs, features] = await Promise.all([
    ownerEmail(),
    // Server-resolved so the console never server-renders as the phone frame.
    resolveShellMode("vendor"),
    // Likewise the palette: resolved here, or the first paint is a guess.
    resolveConsolePrefs(),
    // Switches are per shop (Admin → Feature access).
    getFeatures("vendor", activeId),
  ]);

  return (
    <FeaturesProvider features={features}>
      {/* Push for the kitchen: "new order" and "cancelled" reach a tablet
          nobody is looking at. See onesignal-init.tsx. */}
      <OneSignalInit userId={isSupabaseConfigured ? profile.id : null} />
      <VendorShell
        initialMode={shellMode}
        prefs={prefs}
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
    </FeaturesProvider>
  );
}
