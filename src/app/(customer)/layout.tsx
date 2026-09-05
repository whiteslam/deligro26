import { StatusBar } from "@/components/layout/status-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { GlassCart } from "@/components/glass/glass-cart";
import { CartHydrator } from "@/components/glass/cart-hydrator";
import { ItemSheet } from "@/components/restaurant/item-sheet";
import { CartSwitchDialog } from "@/components/shared/cart-switch-dialog";
import { ReorderReviewDialog } from "@/components/shared/reorder-review-dialog";
import { SplashScreen } from "@/components/shared/splash-screen";
import { OneSignalInit } from "@/components/notifications/onesignal-init";
import { ChargesConfigProvider } from "@/components/providers/charges-config-provider";
import { getProfile } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

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
  //
  // Settings come down with it because the basket sheet and every discovery
  // card quote a delivery fee, and those quotes have to be the numbers checkout
  // and `createOrder` bill from. Read here, once, rather than per surface:
  // `getSettings()` is request-cached, and this is the one node that is an
  // ancestor of both the page tree and the cart sheet.
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);

  return (
    <ChargesConfigProvider
      config={{
        deliveryFee: settings.deliveryFee,
        taxRate: settings.taxRate,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
      }}
    >
      <div className="device">
        <div className="app-shell">
          <div className="app-scroll no-scrollbar pb-[80px]">{children}</div>
          <StatusBar />
          <ItemSheet />
          <CartSwitchDialog />
          <ReorderReviewDialog />
          <GlassCart />
          <CartHydrator />
          <TabBar />
          <SplashScreen />
          {profile ? <OneSignalInit /> : null}
        </div>
      </div>
    </ChargesConfigProvider>
  );
}
