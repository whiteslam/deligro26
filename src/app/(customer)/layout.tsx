import { TabBar } from "@/components/layout/tab-bar";
import { GlassCart } from "@/components/glass/glass-cart";
import { SplashScreen } from "@/components/shared/splash-screen";
import { LocationPermissionSheet } from "@/components/location/location-permission-sheet";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="device">
      <div className="app-shell">
        <div className="app-scroll no-scrollbar pb-[92px]">{children}</div>
        <GlassCart />
        <TabBar />
        <LocationPermissionSheet />
        <SplashScreen />
      </div>
    </div>
  );
}
