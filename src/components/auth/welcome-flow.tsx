"use client";

import Link from "next/link";
import { OtpLogin } from "@/components/auth/otp-login";
import { continueAsGuest } from "@/lib/auth/guest-actions";

/**
 * Entry flow: straight to phone → OTP, with "Skip" (browse as guest) available
 * throughout, then into the app. No intro slides. Lives inside the phone mockup.
 *
 *   phone number → OTP code → app
 *              └ Skip → guest feed
 */
export function WelcomeFlow() {
  return (
    <div className="onboarding animate-fade-in bg-bg">
      <div
        className="relative flex items-center justify-center border-b border-line px-4 pb-3"
        style={{ paddingTop: "max(18px, env(safe-area-inset-top))" }}
      >
        <span className="text-[20px] font-extrabold tracking-tight">Deligro</span>

        {/* Skip → server action latches the guest cookie and routes to the feed. */}
        <form action={continueAsGuest} className="absolute right-3">
          <button
            type="submit"
            className="press px-2 py-1 text-[15px] font-bold text-accent-ink"
          >
            Skip
          </button>
        </form>
      </div>

      {/* Body fills the shell; OtpLogin pins its CTA to the bottom. */}
      <div
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pt-2"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <OtpLogin
          variant="onboarding"
          next="/"
          heading="Enter your number"
          sub="We'll text you a one-time code to sign in."
          footer={
            <Link
              href="/login"
              className="block pt-1 text-center text-xs font-semibold text-muted hover:text-ink"
            >
              Restaurant, driver or admin? Sign in
            </Link>
          }
        />
      </div>
    </div>
  );
}
