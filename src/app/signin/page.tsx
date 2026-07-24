import { Suspense } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { SplashScreen } from "@/components/shared/splash-screen";
import { SignInClient } from "./signin-client";

/**
 * Customer OTP gate — rendered inside the phone mockup so checkout / orders /
 * profile auth feels continuous with the rest of the app (same as /welcome).
 */
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className="device">
      <div className="app-shell">
        <Suspense fallback={null}>
          <SignInClient />
        </Suspense>
        <StatusBar />
        <SplashScreen />
      </div>
    </div>
  );
}
