"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { OtpLogin } from "@/components/auth/otp-login";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/portals";
  const denied = params.get("denied") === "1";

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (mode === "otp") {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-3">
        <OtpLogin
          next={next}
          heading="Sign in with OTP"
          sub="Enter the mobile number on your account."
        />
        <button
          className="text-xs font-semibold text-muted hover:text-ink"
          onClick={() => setMode("password")}
        >
          Use email &amp; password instead
        </button>
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
    setBusy(false);

    if (error) {
      // Deliberately generic — don't reveal whether the email exists.
      setError("Incorrect email or password.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm">
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

      <div className="my-5 flex items-center gap-3 text-xs font-semibold text-muted">
        <span className="h-px flex-1 bg-line" /> OR <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={() => { setMode("otp"); setError(null); }}
        className="press flex h-14 w-full items-center justify-center gap-2 rounded-full border border-line bg-surface text-[15px] font-bold text-ink"
      >
        <Smartphone className="size-5" /> Login with OTP
      </button>

      <p className="mt-5 text-center text-xs leading-relaxed text-muted">
        Restaurant &amp; admin accounts should enable MFA. OTP login is
        rate-limited per phone number.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="device">
      <div className="app-shell">
        <div className="absolute right-4 top-4 z-10">
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
