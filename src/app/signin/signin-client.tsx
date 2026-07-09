"use client";

import { useSearchParams } from "next/navigation";
import { OtpLogin } from "@/components/auth/otp-login";

/** Customer sign-in — phone OTP only. Returns to `next` after login. */
export function SignInClient() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  return (
    <OtpLogin
      next={next}
      heading="Log in or sign up"
      sub="Enter your mobile number to continue."
    />
  );
}
