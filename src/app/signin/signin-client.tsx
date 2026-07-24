"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OtpLogin } from "@/components/auth/otp-login";

/**
 * Customer sign-in inside the phone mockup — same shape as /welcome, but
 * without Skip (this screen is the order/account gate, not browse entry).
 */
export function SignInClient() {
  const params = useSearchParams();
  const next = params.get("next") || "/";

  return (
    <div className="onboarding animate-fade-in bg-bg">
      <div
        className="relative flex items-center justify-center border-b border-line px-4 pb-3"
        style={{ paddingTop: "max(18px, env(safe-area-inset-top))" }}
      >
        <span className="text-[20px] font-extrabold tracking-tight">Deligro</span>
        <Link
          href="/"
          className="absolute right-3 press px-2 py-1 text-[15px] font-bold text-accent-ink"
        >
          Back
        </Link>
      </div>

      <div
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pt-2"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <OtpLogin
          variant="onboarding"
          next={next}
          heading="Enter your number"
          sub="We'll text you a one-time code to continue."
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
