"use client";

import { Suspense } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { SplashScreen } from "@/components/shared/splash-screen";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitch } from "@/components/shared/language-switch";
import { useT } from "@/components/providers/lang-provider";
import { OtpLogin } from "@/components/auth/otp-login";
import { continueAsGuest } from "@/lib/auth/guest-actions";
import { customerLanding } from "@/lib/auth/portals";
import { useSearchParams } from "next/navigation";

/**
 * The customer front door. Phone OTP, or browse as a guest — and it only ever
 * lands you in the customer app.
 *
 * It used to be the *global* door: it read your role after sign-in and pushed
 * you into whichever portal that role owned, so the owner's phone (an admin
 * account) could never open its own customer app. Operators now sign in at
 * their own portal's door — /admin/login, /vendor/login, /manager/login,
 * /driver/login — and nothing here inspects roles at all.
 */
function LoginForm() {
  const params = useSearchParams();
  const t = useT();
  // Where the app itself should open. A `next` set by the proxy (bounced from
  // /checkout, /orders, …) still wins, so people land where they were headed —
  // unless it points into an operator portal, which needs that portal's door.
  const target = customerLanding(params.get("next"));
  // Sign-in lands on /switch, which asks "customer app or console?" *only* when
  // the account holds both — the owner's phone is an admin and a shopper, and
  // this door alone cannot know that (roles are server-side, by design). For an
  // ordinary customer /switch is a server-side redirect straight to `target`.
  const next = `/switch?next=${encodeURIComponent(target)}`;
  // Guest browse is only the *entry* affordance (bare /login). When we were sent
  // here to gate a specific action, `next` is set and an account is required.
  const showGuest = target === "/";

  return (
    <div className="w-full max-w-sm">
      <OtpLogin
        next={next}
        heading={t("Sign in", "लॉग इन करें")}
        sub={"Deligro · " + t("order in minutes", "मिनटों में ऑर्डर करें")}
      />

      {showGuest ? (
        <form action={continueAsGuest}>
          <button
            type="submit"
            className="press mt-4 block w-full text-center text-sm font-semibold text-muted hover:text-ink"
          >
            {t("Browse as guest", "गेस्ट की तरह देखें")}
          </button>
        </form>
      ) : null}

      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        {t(
          "OTP login is rate-limited per phone number.",
          "एक मोबाइल नंबर पर सीमित बार ही ओटीपी भेजा जा सकता है।",
        )}
        <br />
        {t(
          "Restaurant, manager, driver or admin?",
          "रेस्टोरेंट, मैनेजर, ड्राइवर या एडमिन?",
        )}{" "}
        <Link href="/portals" className="font-semibold hover:text-ink">
          {t("Portal sign-in", "पोर्टल लॉग इन")}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="device">
      <div className="app-shell">
        <StatusBar />
        <SplashScreen />
        {/* Below the status-bar strip, which is opaque and would otherwise
            cover the toggle in the framed (desktop) view. The language switch
            mirrors it on the left, so a first-time customer can pick English
            or हिंदी before signing in. Compact buttons keep the pair ~150px
            wide, well clear of the 40px toggle even at 360px. */}
        <div className="absolute left-4 top-4 z-10 min-[480px]:top-[64px]">
          <LanguageSwitch className="[&>button]:min-w-0 [&>button]:px-3 [&>button]:py-1.5" />
        </div>
        <div className="absolute right-4 top-4 z-10 min-[480px]:top-[64px]">
          <ThemeToggle />
        </div>
        {/* min-h-full + justify-center keeps the form centred but lets it scroll
            if the OTP step + errors grow taller than the phone screen. */}
        <div className="app-scroll no-scrollbar flex min-h-full flex-col items-center justify-center px-6 py-10">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
