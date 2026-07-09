"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Step = "phone" | "code";

/**
 * Phone-OTP login. Requests a code (Renflair SMS via our API), then verifies it
 * and exchanges the returned magic-link token for a real Supabase session.
 */
export function OtpLogin({
  next = "/",
  heading = "Log in to continue",
  sub = "We'll text you a one-time code.",
}: {
  next?: string;
  heading?: string;
  sub?: string;
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

  return (
    <div className="card w-full max-w-sm space-y-4 p-6">
      <div className="flex items-center gap-2">
        <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
          {step === "phone" ? <Phone className="size-5" /> : <ShieldCheck className="size-5" />}
        </span>
        <div>
          <h1 className="text-heading leading-none">{heading}</h1>
          <p className="mt-1 text-xs text-muted">
            {step === "phone" ? sub : `Code sent to ${phone}`}
          </p>
        </div>
      </div>

      {step === "phone" ? (
        <>
          <label className="block">
            <span className="text-label">Mobile number</span>
            <div className="mt-1.5 flex items-center rounded-xl border border-line bg-surface focus-within:border-accent">
              <span className="pl-3 text-[15px] text-muted">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && phone && requestCode()}
                className="w-full bg-transparent px-2 py-2.5 text-[15px] outline-none"
                placeholder="98765 43210"
              />
            </div>
          </label>
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <Button size="lg" className="w-full" disabled={busy || !phone} onClick={requestCode}>
            {busy ? <Loader2 className="size-5 animate-spin" /> : <>Send code <ArrowRight className="size-4" /></>}
          </Button>
        </>
      ) : (
        <>
          <label className="block">
            <span className="text-label">Enter 6-digit code</span>
            <input
              ref={codeRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && code.length === 6 && verifyCode()}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-center text-2xl tracking-[0.5em] outline-none focus:border-accent"
              placeholder="••••••"
            />
          </label>

          {devCode ? (
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-center text-xs text-muted">
              Dev mode — your code is <span className="text-data font-bold">{devCode}</span>
            </p>
          ) : null}

          {error ? <p className="text-sm text-accent">{error}</p> : null}

          <Button size="lg" className="w-full" disabled={busy || code.length !== 6} onClick={verifyCode}>
            {busy ? <Loader2 className="size-5 animate-spin" /> : "Verify & continue"}
          </Button>

          <div className="flex items-center justify-between text-xs">
            <button className="text-muted hover:text-ink" onClick={() => { setStep("phone"); setCode(""); setError(null); }}>
              Change number
            </button>
            <button
              className="font-semibold text-accent disabled:opacity-50"
              disabled={cooldown > 0 || busy}
              onClick={requestCode}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </>
      )}
    </div>
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
