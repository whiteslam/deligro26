"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, ShieldAlert, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Button } from "@/components/ui/button";
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
    <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
      <div className="flex items-center gap-2">
        <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
          <LogIn className="size-5" />
        </span>
        <div>
          <h1 className="text-heading leading-none">Sign in</h1>
          <p className="mt-1 text-xs text-muted">Deligro · one account, your role</p>
        </div>
      </div>

      {denied ? (
        <p className="flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          Your account doesn&apos;t have access to that area.
        </p>
      ) : null}

      <label className="block">
        <span className="text-label">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-accent"
          placeholder="you@example.com"
        />
      </label>

      <label className="block">
        <span className="text-label">Password</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-accent"
          placeholder="••••••••"
        />
      </label>

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>

      <button
        type="button"
        onClick={() => { setMode("otp"); setError(null); }}
        className="press flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <Smartphone className="size-4" /> Login with OTP
      </button>

      <p className="text-center text-xs text-muted">
        Restaurant &amp; admin accounts should enable MFA. OTP login is
        rate-limited per phone number.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="dashboard-shell grid place-items-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
