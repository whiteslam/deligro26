"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/components/providers/lang-provider";
import type { T } from "@/lib/i18n/lang";

type Step = "phone" | "code";
type Variant = "card" | "onboarding";
const CODE_LEN = 6;

/**
 * Phone-OTP login. Requests a code (Renflair SMS via our API), then verifies it
 * and exchanges the returned magic-link token for a real Supabase session.
 *
 * `next` is where a successful sign-in lands — the caller decides that (the
 * customer door sends you into the app, the vendor door into /vendor). This
 * component never re-routes on role.
 *
 * Two layouts share one logic core:
 *   - "card"        centred block, button under the input
 *   - "onboarding"  full-height screen with the primary CTA pinned to the
 *                   bottom and a country prefix beside the field — the
 *                   standard mobile sign-up shape used in the entry flow.
 */
export function OtpLogin({
  next = "/",
  heading: headingProp,
  sub: subProp,
  variant = "card",
  footer,
}: {
  next?: string;
  heading?: string;
  sub?: string;
  variant?: Variant;
  /** Optional node under the primary CTA (onboarding variant), e.g. a partner link. */
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  // Customer screens sit inside LangProvider; operator screens don't, and get
  // English from the context default.
  const t = useT();
  const heading =
    headingProp ?? t("Log in to continue", "जारी रखने के लिए लॉग इन करें");
  const sub =
    subProp ??
    t("We'll text you a one-time code.", "हम आपको एक ओटीपी भेजेंगे।");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  const onboarding = variant === "onboarding";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function requestCode() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        if (data.error === "cooldown") setCooldown(data.retryAfter ?? 30);
        setError(errorText(t, data.error));
        return;
      }
      setDevCode(data.devCode ?? null);
      setCooldown(30);
      setStep("code");
    } catch {
      setError(
        t(
          "Network error — please try again.",
          "नेटवर्क में दिक्कत है — फिर से कोशिश करें।",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await readJson(res);
      if (!res.ok || !data.tokenHash) {
        setError(errorText(t, data.error));
        return;
      }

      const supabase = createClient();
      const { error: sErr } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: "email",
      });
      if (sErr) {
        setError(
          t(
            "Could not sign you in. Try again.",
            "लॉग इन नहीं हो पाया। फिर से कोशिश करें।",
          ),
        );
        return;
      }

      // Go where this door leads — the caller already resolved that. This used
      // to look the account's role up and reroute, which is exactly how a
      // customer sign-in could end up on the admin console.
      router.push(next);
      router.refresh();
    } catch {
      setError(
        t(
          "Network error — please try again.",
          "नेटवर्क में दिक्कत है — फिर से कोशिश करें।",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const ctaClass =
    "press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[16px] font-bold text-[var(--on-accent)] shadow-[var(--glow-accent)] disabled:opacity-50";

  // ---- Phone step ----
  if (step === "phone") {
    const field = (
      <div className="flex w-full gap-2">
        {/* Country prefix — India-only for now, styled as a selector to match
            the two-field sign-up shape. */}
        <span className="flex h-12 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 text-[14px] font-bold">
          🇮🇳 +91 <ChevronDown className="size-4 text-muted" />
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && phone && requestCode()}
          className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3.5 text-[14px] font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          placeholder={t("Mobile number", "मोबाइल नंबर")}
          autoFocus={onboarding}
        />
      </div>
    );

    const terms = (
      <p
        className={cn(
          "text-xs leading-relaxed text-muted",
          onboarding ? "text-left" : "mt-5 text-center",
        )}
      >
        {t(
          "By continuing you agree to Deligro's Terms & Conditions and Privacy Policy. We'll text you a one-time code.",
          "आगे बढ़ने पर आप हमारी शर्तें और प्राइवेसी पॉलिसी मानते हैं। हम आपको एक ओटीपी भेजेंगे।",
        )}
      </p>
    );

    const cta = (
      <button
        onClick={requestCode}
        disabled={busy || !phone}
        className={ctaClass}
      >
        {busy ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          t("Continue", "आगे बढ़ें")
        )}
      </button>
    );

    if (onboarding) {
      return (
        <div className="flex min-h-full w-full flex-col">
          <div className="mt-2">
            <h1 className="text-[23px] font-extrabold tracking-tight">
              {heading}
            </h1>
            <p className="mt-1.5 text-sm text-muted">{sub}</p>
            <div className="mt-6">{field}</div>
            {error ? <ValidationError>{error}</ValidationError> : null}
          </div>
          <div className="mt-auto space-y-4 pt-8">
            {terms}
            {cta}
            {footer}
          </div>
        </div>
      );
    }

    return (
      <div key="phone" className="animate-fade-in w-full max-w-sm">
        <h1 className="text-center text-[23px] font-extrabold tracking-tight">
          {heading}
        </h1>
        <p className="mt-1.5 text-center text-sm text-muted">{sub}</p>
        <div className="mt-6">{field}</div>
        {error ? <ValidationError>{error}</ValidationError> : null}
        <div className="mt-4">{cta}</div>
        {terms}
      </div>
    );
  }

  // ---- Code step ----
  const codeHeading = t("Enter the OTP", "ओटीपी डालें");
  const codeSent = t(
    `We sent an OTP to +91 ${phone}`,
    `+91 ${phone} पर ओटीपी भेजा गया है`,
  );
  const codeBoxes = (
    <div className="relative mt-6">
      <input
        ref={codeRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={CODE_LEN}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) =>
          e.key === "Enter" && code.length === CODE_LEN && verifyCode()
        }
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        aria-label={t("Enter 6-digit OTP", "6 अंकों का ओटीपी डालें")}
      />
      <div className="flex gap-2">
        {Array.from({ length: CODE_LEN }).map((_, i) => {
          const active =
            i === code.length ||
            (i === CODE_LEN - 1 && code.length === CODE_LEN);
          return (
            <div
              key={i}
              className={cn(
                "grid h-12 flex-1 place-items-center rounded-xl text-xl font-extrabold tabular-nums transition-colors",
                code[i] ? "border border-line bg-surface" : "bg-surface-2",
                active && "border-2 border-ink bg-surface",
              )}
            >
              {code[i] ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );

  const back = (
    <button
      onClick={() => {
        setStep("phone");
        setCode("");
        setError(null);
      }}
      aria-label={t("Change number", "नंबर बदलें")}
      className="press -ml-1 mb-3 grid size-9 place-items-center rounded-full text-ink"
    >
      <ChevronLeft className="size-6" />
    </button>
  );

  const devHint = devCode ? (
    <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-center text-xs text-muted">
      {t("Dev mode — your code is", "डेव मोड — आपका ओटीपी है")}{" "}
      <span className="text-data font-bold text-ink">{devCode}</span>
    </p>
  ) : null;

  const resend = (
    <div className="mt-4 text-center text-sm">
      <button
        className="font-bold text-accent-ink disabled:text-muted"
        disabled={cooldown > 0 || busy}
        onClick={requestCode}
      >
        {cooldown > 0
          ? t(
              `Resend OTP in ${cooldown}s`,
              `${cooldown} सेकंड में दोबारा भेजें`,
            )
          : t("Resend OTP", "ओटीपी दोबारा भेजें")}
      </button>
    </div>
  );

  const verifyCta = (
    <button
      onClick={verifyCode}
      disabled={busy || code.length !== CODE_LEN}
      className={ctaClass}
    >
      {busy ? (
        <Loader2 className="size-5 animate-spin" />
      ) : (
        t("Verify & continue", "जाँचें और आगे बढ़ें")
      )}
    </button>
  );

  if (onboarding) {
    return (
      <div className="flex min-h-full w-full flex-col">
        <div className="mt-2">
          {back}
          <h1 className="text-[23px] font-extrabold tracking-tight">
            {codeHeading}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{codeSent}</p>
          {codeBoxes}
          {devHint}
          {error ? <ValidationError>{error}</ValidationError> : null}
        </div>
        <div className="mt-auto space-y-1 pt-8">
          {verifyCta}
          {resend}
          {footer}
        </div>
      </div>
    );
  }

  return (
    <div key="code" className="animate-slide-up w-full max-w-sm">
      {back}
      <h1 className="text-[23px] font-extrabold tracking-tight">
        {codeHeading}
      </h1>
      <p className="mt-1.5 text-sm text-muted">{codeSent}</p>
      {codeBoxes}
      {devHint}
      {error ? <ValidationError>{error}</ValidationError> : null}
      <div className="mt-4">{verifyCta}</div>
      {resend}
    </div>
  );
}

/** Shared Bolt-style validation message (red pill). */
function ValidationError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-xl bg-deal-soft px-3 py-2.5 text-center text-sm font-medium text-deal">
      {children}
    </p>
  );
}

async function readJson(res: Response): Promise<{
  error?: string;
  retryAfter?: number;
  devCode?: string;
  tokenHash?: string;
}> {
  const text = await res.text();
  if (!text) return { error: res.ok ? undefined : "server_error" };
  try {
    return JSON.parse(text) as {
      error?: string;
      retryAfter?: number;
      devCode?: string;
      tokenHash?: string;
    };
  } catch {
    return { error: "server_error" };
  }
}

function errorText(t: T, code?: string): string {
  switch (code) {
    case "invalid_phone":
      return t("Enter a valid mobile number.", "सही मोबाइल नंबर डालें।");
    case "invalid":
      return t(
        "That OTP isn't right. Try again.",
        "ओटीपी गलत है। फिर से डालें।",
      );
    case "expired":
      return t(
        "OTP expired — request a new one.",
        "ओटीपी की समय सीमा खत्म हो गई — नया ओटीपी मँगाएँ।",
      );
    case "locked":
      return t(
        "Too many tries. Request a new OTP.",
        "बहुत बार गलत ओटीपी डाला गया। नया ओटीपी मँगाएँ।",
      );
    case "cooldown":
      return t(
        "Please wait a moment before resending.",
        "दोबारा भेजने से पहले थोड़ा रुकें।",
      );
    case "too_many":
    case "rate_limited":
      return t(
        "Too many requests. Try again later.",
        "बहुत ज़्यादा कोशिशें हो गईं। थोड़ी देर बाद कोशिश करें।",
      );
    case "sms_unavailable":
    case "otp_misconfigured":
    case "backend_not_configured":
      return t(
        "Sign-in is temporarily unavailable. Please try again later.",
        "अभी लॉग इन नहीं हो पा रहा। थोड़ी देर बाद कोशिश करें।",
      );
    case "server_error":
      return t(
        "Server error — please try again.",
        "सर्वर में दिक्कत है — फिर से कोशिश करें।",
      );
    default:
      return t(
        "Something went wrong. Please try again.",
        "कुछ गड़बड़ हो गई। फिर से कोशिश करें।",
      );
  }
}
