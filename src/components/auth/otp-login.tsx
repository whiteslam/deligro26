"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type Step = "phone" | "code";
type Variant = "card" | "onboarding";
const CODE_LEN = 6;

/**
 * Phone-OTP login. Requests a code (Renflair SMS via our API), then verifies it
 * and exchanges the returned magic-link token for a real Supabase session.
 *
 * Two layouts share one logic core:
 *   - "card"        centred block, button under the input (operator /login)
 *   - "onboarding"  full-height screen with the primary CTA pinned to the
 *                   bottom and a country prefix beside the field — the
 *                   standard mobile sign-up shape used in the entry flow.
 */
export function OtpLogin({
  next = "/",
  heading = "Log in to continue",
  sub = "We'll text you a one-time code.",
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
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
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
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "cooldown") setCooldown(data.retryAfter ?? 30);
        setError(errorText(data.error));
        return;
      }
      setDevCode(data.devCode ?? null);
      setCooldown(30);
      setStep("code");
    } catch {
      setError("Network error — please try again.");
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
      const data = await res.json();
      if (!res.ok || !data.tokenHash) {
        setError(errorText(data.error));
        return;
      }

      const supabase = createClient();
      const { error: sErr } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: "email",
      });
      if (sErr) {
        setError("Could not start your session. Try again.");
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const ctaClass =
    "press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[16px] font-bold text-white shadow-[var(--glow-accent)] disabled:opacity-50";

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
          placeholder="Phone number"
          autoFocus={onboarding}
        />
      </div>
    );

    const terms = (
      <p
        className={cn(
          "text-xs leading-relaxed text-muted",
          onboarding ? "text-left" : "mt-5 text-center"
        )}
      >
        By continuing you agree to Deligro&apos;s Terms &amp; Conditions and
        Privacy Policy. We&apos;ll text you a one-time code.
      </p>
    );

    const cta = (
      <button onClick={requestCode} disabled={busy || !phone} className={ctaClass}>
        {busy ? <Loader2 className="size-5 animate-spin" /> : "Continue"}
      </button>
    );

    if (onboarding) {
      return (
        <div className="flex min-h-full w-full flex-col">
          <div className="mt-2">
            <h1 className="text-[23px] font-extrabold tracking-tight">{heading}</h1>
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
        aria-label="Enter 6-digit code"
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
                active && "border-2 border-ink bg-surface"
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
      aria-label="Change number"
      className="press -ml-1 mb-3 grid size-9 place-items-center rounded-full text-ink"
    >
      <ChevronLeft className="size-6" />
    </button>
  );

  const devHint = devCode ? (
    <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-center text-xs text-muted">
      Dev mode — your code is{" "}
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
        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
      </button>
    </div>
  );

  const verifyCta = (
    <button
      onClick={verifyCode}
      disabled={busy || code.length !== CODE_LEN}
      className={ctaClass}
    >
      {busy ? <Loader2 className="size-5 animate-spin" /> : "Verify & continue"}
    </button>
  );

  if (onboarding) {
    return (
      <div className="flex min-h-full w-full flex-col">
        <div className="mt-2">
          {back}
          <h1 className="text-[23px] font-extrabold tracking-tight">
            Enter the code
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            A code was sent to +91 {phone}
          </p>
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
        Enter the code
      </h1>
      <p className="mt-1.5 text-sm text-muted">A code was sent to +91 {phone}</p>
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

function errorText(code?: string): string {
  switch (code) {
    case "invalid_phone":
      return "Enter a valid mobile number.";
    case "invalid":
      return "That code isn't right. Try again.";
    case "expired":
      return "Code expired — request a new one.";
    case "locked":
      return "Too many tries. Request a new code.";
    case "cooldown":
      return "Please wait a moment before resending.";
    case "too_many":
      return "Too many requests. Try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}
