import { WelcomeFlow } from "@/components/auth/welcome-flow";
import { StatusBar } from "@/components/layout/status-bar";
import { SplashScreen } from "@/components/shared/splash-screen";

/**
 * App-launch entry for visitors without a session. The proxy sends every anon
 * request here. Rendered inside the phone mockup so the onboarding funnel
 * (intro slides → phone → OTP, or Skip → guest) reads as one continuous app.
 *
 * Per-request so a visitor who already has a session is redirected out by the
 * proxy before this renders.
 */
export const dynamic = "force-dynamic";

export default function WelcomePage() {
  return (
    <div className="device">
      <div className="app-shell">
        <WelcomeFlow />
        <StatusBar />
        <SplashScreen />
      </div>
    </div>
  );
}
