import { VendorProfileView } from "@/components/vendor/vendor-profile-view";
import { VendorPageHeader } from "@/components/vendor/vendor-page-header";
import { getProfile } from "@/lib/auth";
import { getVendorProfileSummary } from "@/lib/data-access/vendor-profile";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RESTAURANT_NAME } from "@/lib/roles-data";

export const dynamic = "force-dynamic";

function DemoProfilePage() {
  return (
    <VendorProfileView
      live={false}
      profile={{
        ownerName: "Demo Vendor",
        ownerPhone: "+91 98765 43210",
        ownerEmail: "vendor@deligro.demo",
        memberSince: "2024",
        initials: "DV",
        ownedRestaurants: [
          {
            id: "demo",
            slug: "saffron-kitchen",
            name: RESTAURANT_NAME,
            isOpen: true,
          },
        ],
        restaurant: {
          id: "demo",
          slug: "saffron-kitchen",
          name: RESTAURANT_NAME,
          isOpen: true,
          tagline: "Hyderabadi soul food",
          approved: true,
          cuisines: ["North Indian", "Biryani"],
          rating: 4.6,
          ratingCount: 128,
          offer: "20% off first order",
          imageUrl: null,
          etaMin: 25,
          etaMax: 35,
          costForTwo: 450,
          priceTier: 2,
          promoted: true,
        },
        stats: {
          menuItems: 24,
          menuAvailable: 22,
          totalOrders: 212,
          activeOrders: 3,
          deliveredOrders: 198,
          lifetimeRevenue: 72400,
        },
      }}
    />
  );
}

export default async function VendorProfilePage() {
  if (!isSupabaseConfigured) {
    return <DemoProfilePage />;
  }

  const role = await getProfile();
  if (role?.role !== "restaurant") {
    return <DemoProfilePage />;
  }

  try {
    const profile = await getVendorProfileSummary();
    if (!profile) {
      return (
        <div className="space-y-6">
          <VendorPageHeader
            title="Profile"
            subtitle="Sign in to view your restaurant account."
          />
        </div>
      );
    }
    return <VendorProfileView profile={profile} live />;
  } catch {
    return <DemoProfilePage />;
  }
}
