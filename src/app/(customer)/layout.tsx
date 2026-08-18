import { StatusBar } from "@/components/layout/status-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { GlassCart } from "@/components/glass/glass-cart";
import { CartHydrator } from "@/components/glass/cart-hydrator";
import { ItemSheet } from "@/components/restaurant/item-sheet";
import { CartSwitchDialog } from "@/components/shared/cart-switch-dialog";
import { SplashScreen } from "@/components/shared/splash-screen";
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
  // the /login entry flow — no first-run carousel over the feed.
  //
  // No role check here on purpose. This shell used to redirect any non-customer
  // to their portal, which meant an operator account could not open the app it
  // operates — the owner's phone is an admin, so signing in to shop landed on
  // the admin console. The customer app is for everyone; the portals are the
  // things that are gated, each behind its own door.
  const profile = await getProfile();

  return (
    <div className="device">
      <div className="app-shell">
        <div className="app-scroll no-scrollbar pb-[80px]">{children}</div>
        <StatusBar />
        <ItemSheet />
        <CartSwitchDialog />
        <GlassCart />
        <CartHydrator />
        <TabBar />
        <SplashScreen />
        {profile ? <OneSignalInit /> : null}
      </div>
    </div>
  );
}
