import { TabBar } from "@/components/layout/tab-bar";
import { GlassCart } from "@/components/glass/glass-cart";
import { SplashScreen } from "@/components/shared/splash-screen";
import { Onboarding } from "@/components/shared/onboarding";
import { LocationPermissionSheet } from "@/components/location/location-permission-sheet";
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
  // Signed-in users have already been welcomed — skip the first-run carousel.
  const profile = await getProfile();

  return (
    <div className="device">
      <div className="app-shell">
        <div className="app-scroll no-scrollbar pb-[92px]">{children}</div>
        <GlassCart />
        <TabBar />
        <LocationPermissionSheet />
        <SplashScreen />
        <Onboarding authed={!!profile} />
      </div>
    </div>
  );
}
