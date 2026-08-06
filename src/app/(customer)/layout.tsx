import { StatusBar } from "@/components/layout/status-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { GlassCart } from "@/components/glass/glass-cart";
import { CartHydrator } from "@/components/glass/cart-hydrator";
import { ItemSheet } from "@/components/restaurant/item-sheet";
import { SplashScreen } from "@/components/shared/splash-screen";
import { OneSignalInit } from "@/components/notifications/onesignal-init";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { roleHome } from "@/lib/auth/role-home";

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
  // the /login entry flow — no first-run carousel over the feed.
  const profile = await getProfile();

  // Separate-entry model: an operator who lands on the customer shell (direct
  // link, bookmark, or a stale post-login push) is sent to their own portal.
  // The login flow already resolves this; this is the server-side safety net.
  if (profile && profile.role !== "customer") {
    redirect(roleHome(profile.role));
  }

  return (
    <div className="device">
      <div className="app-shell">
        <div className="app-scroll no-scrollbar pb-[80px]">{children}</div>
        <StatusBar />
        <ItemSheet />
        <GlassCart />
        <CartHydrator />
        <TabBar />
        <SplashScreen />
        {profile ? <OneSignalInit /> : null}
      </div>
    </div>
  );
}
