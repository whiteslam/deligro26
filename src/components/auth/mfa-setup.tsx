"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type EnrollState = {
  factorId: string;
  qr: string;
  secret: string;
};

/**
 * TOTP enrollment for admin / restaurant operators. Creates an unverified
 * factor, shows the QR + secret, then verifies the first code to promote aal2.
 */
export function MfaSetup({ next }: { next: string }) {
  const router = useRouter();
  const [enroll, setEnroll] = useState<EnrollState | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const supabase = createClient();

      const { data: existing } = await supabase.auth.mfa.listFactors();
      const verified = existing?.totp.find((f) => f.status === "verified");
      if (verified) {
        router.replace(`/mfa?next=${encodeURIComponent(next)}`);
        return;
      }

      // Drop leftover unverified factors so enroll doesn't stack junk.
      for (const f of existing?.all ?? []) {
        if (f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Deligro",
      });

      if (cancelled) return;

      if (enrollError || !data || data.type !== "totp") {
        setError(
          enrollError?.message ??
            "Couldn't start MFA enrollment. MFA may be disabled in Supabase Auth."
        );
        setLoading(false);
        return;
      }

      setEnroll({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setLoading(false);
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enroll.factorId,
      code: code.replace(/\s/g, ""),
    });
    setBusy(false);

    if (verifyError) {
      setError("That code didn't match. Wait for a fresh code and try again.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-3 py-10">
        <Loader2 className="size-6 animate-spin text-accent" />
        <p className="text-sm text-muted">Preparing authenticator…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onVerify} className="w-full max-w-sm">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <KeyRound className="size-6" />
      </div>
      <h1 className="mt-4 text-center text-[26px] font-extrabold tracking-tight">
        Set up MFA
      </h1>
      <p className="mt-1.5 text-center text-sm text-muted">
        Scan with Google Authenticator, 1Password, or Authy. Required for admin
        and restaurant accounts.
      </p>

      {enroll ? (
        <div className="mt-5 space-y-3">
          <div className="mx-auto flex size-[180px] items-center justify-center overflow-hidden rounded-2xl bg-white p-2">
            {/* qr_code is a data:image/svg+xml URL from Supabase */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enroll.qr}
              alt="Authenticator QR code"
              width={164}
              height={164}
              className="size-[164px]"
            />
          </div>
          <p className="break-all rounded-xl bg-surface-2 px-3 py-2 text-center font-mono text-[11px] text-muted">
            {enroll.secret}
          </p>
        </div>
      ) : null}

      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,8}"
        required
        maxLength={8}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={!enroll}
        className="mt-5 h-14 w-full rounded-2xl bg-surface-2 px-4 text-center text-[22px] font-bold tracking-[0.35em] outline-none ring-accent focus:ring-2 disabled:opacity-50"
        placeholder="000000"
        aria-label="6-digit code from authenticator"
      />

      {error ? (
        <p className="mt-3 rounded-xl bg-deal-soft px-3 py-2.5 text-center text-sm font-medium text-deal">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !enroll || code.replace(/\s/g, "").length < 6}
        className="press mt-4 flex h-14 w-full items-center justify-center rounded-full bg-accent text-[17px] font-bold text-white shadow-[var(--glow-accent)] disabled:opacity-50"
      >
        {busy ? "Confirming…" : "Confirm & continue"}
      </button>
    </form>
  );
}
