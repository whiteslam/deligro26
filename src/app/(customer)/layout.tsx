import { TabBar } from "@/components/layout/tab-bar";
import { GlassCart } from "@/components/glass/glass-cart";
import { ItemSheet } from "@/components/restaurant/item-sheet";
import { SplashScreen } from "@/components/shared/splash-screen";
import { LocationPermissionSheet } from "@/components/location/location-permission-sheet";
import { OneSignalInit } from "@/components/notifications/onesignal-init";
import { getProfile } from "@/lib/auth";

// The customer app is per-request: it reads the auth cookie (getProfile, below)
// and live catalog/order data. Render dynamically so cookie/Supabase access
// never collides with a child's generateStaticParams (which would otherwise
// throw DYNAMIC_SERVER_USAGE, e.g. on /restaurant/[slug]).
export const dynamic = "force-dynamic";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth cookie gates per-user extras (push). Onboarding now lives entirely in
  // the /welcome entry flow — no first-run carousel over the feed.
  const profile = await getProfile();

  return (
    <div className="device">
      <div className="app-shell">
        <div className="app-scroll no-scrollbar pb-[92px]">{children}</div>
        <ItemSheet />
        <GlassCart />
        <TabBar />
        <LocationPermissionSheet />
        <SplashScreen />
        {profile ? <OneSignalInit /> : null}
      </div>
    </div>
  );
}
