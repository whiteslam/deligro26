"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ShieldAlert, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { StatusBar } from "@/components/layout/status-bar";
import { SplashScreen } from "@/components/shared/splash-screen";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { OtpLogin } from "@/components/auth/otp-login";
import { resolveLanding } from "@/lib/auth/landing";
import { continueAsGuest } from "@/lib/auth/guest-actions";

/**
 * The one global entry point — customers and operators all sign in here. Phone
 * OTP leads (what most customers use); operators toggle to email + password
 * (and get an MFA challenge). Anonymous visitors can also browse as a guest,
 * but only from the bare /login — once we've been sent here to gate a specific
 * action (`next` set), an account is required.
 */
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Straight into the app after sign-in. A `next` set by the proxy (bounced from
  // /vendor, /checkout, …) still wins, so people land where they were headed.
  const next = params.get("next") ?? "/";
  const denied = params.get("denied") === "1";
  // Guest browse is only the *entry* affordance (bare /login). When we were sent
  // here to gate a specific action, `next` is set and an account is required.
  const showGuest = next === "/";

  // OTP first: phone is what most customers use; operators flip to password.
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const guest = showGuest ? (
    <form action={continueAsGuest}>
      <button
        type="submit"
        className="press mt-4 block w-full text-center text-sm font-semibold text-muted hover:text-ink"
      >
        Browse as guest
      </button>
    </form>
  ) : null;

  const divider = (
    <div className="my-5 flex items-center gap-3 text-xs font-semibold text-muted">
      <span className="h-px flex-1 bg-line" /> OR{" "}
      <span className="h-px flex-1 bg-line" />
    </div>
  );

  if (mode === "otp") {
    return (
      <div className="w-full max-w-sm">
        <OtpLogin
          next={next}
          heading="Sign in"
          sub="Deligro · one account, your role"
        />
        {divider}
        <button
          type="button"
          onClick={() => {
            setMode("password");
            setError(null);
          }}
          className="press flex h-14 w-full items-center justify-center gap-2 rounded-full border border-line bg-surface text-[15px] font-bold text-ink"
        >
          <Mail className="size-5" /> Email &amp; password
        </button>
        {guest}
        <p className="mt-5 text-center text-xs leading-relaxed text-muted">
          Restaurant &amp; admin accounts require authenticator MFA. OTP login is
          rate-limited per phone number.
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured) {
      setError(
        "Auth isn't configured yet. Add your Supabase keys to .env.local, then run the migration."
      );
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setBusy(false);
      // Deliberately generic — don't reveal whether the email exists.
      setError("Incorrect email or password.");
      return;
    }

    // Route by the account's real role, resolved once and reused for the MFA hop.
    const dest = await resolveLanding(next);

    // If this account already has TOTP, promote to aal2 before the portal gate.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setBusy(false);

    if (aal?.currentLevel !== "aal2" && aal?.nextLevel === "aal2") {
      router.push(`/mfa?next=${encodeURIComponent(dest)}`);
      router.refresh();
      return;
    }

    router.push(dest);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={onSubmit}>
      <h1 className="text-center text-[26px] font-extrabold tracking-tight">
        Sign in
      </h1>
      <p className="mt-1.5 text-center text-sm text-muted">
        Deligro · one account, your role
      </p>

      {denied ? (
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-deal-soft px-3 py-2.5 text-sm font-medium text-deal">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          Your account doesn&apos;t have access to that area.
        </p>
      ) : null}

      <div className="mt-6 space-y-2.5">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-14 w-full rounded-2xl bg-surface-2 px-4 text-[15px] font-medium outline-none ring-accent focus:ring-2"
          placeholder="Email"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-14 w-full rounded-2xl bg-surface-2 px-4 text-[15px] font-medium outline-none ring-accent focus:ring-2"
          placeholder="Password"
        />
      </div>

      {error ? (
        <p className="mt-3 rounded-xl bg-deal-soft px-3 py-2.5 text-center text-sm font-medium text-deal">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="press mt-4 flex h-14 w-full items-center justify-center rounded-full bg-accent text-[17px] font-bold text-white shadow-[var(--glow-accent)] disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>

      {divider}

      <button
        type="button"
        onClick={() => {
          setMode("otp");
          setError(null);
        }}
        className="press flex h-14 w-full items-center justify-center gap-2 rounded-full border border-line bg-surface text-[15px] font-bold text-ink"
      >
        <Smartphone className="size-5" /> Login with OTP
      </button>
      </form>

      {/* Sibling of the sign-in form, not a child — a <form> inside a <form> is
          invalid HTML and throws a hydration error. */}
      {guest}
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
            cover the toggle in the framed (desktop) view. */}
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
