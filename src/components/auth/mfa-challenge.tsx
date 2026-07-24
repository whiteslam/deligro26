"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Second factor after password / OTP — verifies a TOTP code and promotes the
 * session to aal2 so admin / restaurant portals unlock.
 */
export function MfaChallenge({ next }: { next: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const { data: factors, error: listError } =
      await supabase.auth.mfa.listFactors();
    if (listError || !factors) {
      setBusy(false);
      setError("Couldn't load your authenticator. Try signing in again.");
      return;
    }

    const totp = factors.totp.find((f) => f.status === "verified");
    if (!totp) {
      setBusy(false);
      router.replace(`/mfa/setup?next=${encodeURIComponent(next)}`);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: totp.id,
      code: code.replace(/\s/g, ""),
    });
    setBusy(false);

    if (verifyError) {
      setError("That code didn't match. Check your authenticator and try again.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-green-soft text-green">
        <ShieldCheck className="size-6" />
      </div>
      <h1 className="mt-4 text-center text-[26px] font-extrabold tracking-tight">
        Enter authenticator code
      </h1>
      <p className="mt-1.5 text-center text-sm text-muted">
        Admin and restaurant accounts need a second factor after sign-in.
      </p>

      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,8}"
        required
        maxLength={8}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="mt-6 h-14 w-full rounded-2xl bg-surface-2 px-4 text-center text-[22px] font-bold tracking-[0.35em] outline-none ring-accent focus:ring-2"
        placeholder="000000"
        aria-label="6-digit authenticator code"
      />

      {error ? (
        <p className="mt-3 rounded-xl bg-deal-soft px-3 py-2.5 text-center text-sm font-medium text-deal">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || code.replace(/\s/g, "").length < 6}
        className="press mt-4 flex h-14 w-full items-center justify-center rounded-full bg-accent text-[17px] font-bold text-white shadow-[var(--glow-accent)] disabled:opacity-50"
      >
        {busy ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
