"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MfaStatus } from "@/lib/data-access/mfa";
import {
  disableMfaAction,
  generateRecoveryCodesAction,
} from "@/app/vendor/settings/security-actions";

const NEXT = "/vendor/settings";

/**
 * Vendor / restaurant MFA control. MFA is optional for these accounts: this is
 * the opt-in / opt-out surface. Enabling routes to the shared TOTP setup;
 * disabling requires a password re-check; recovery codes are shown once.
 */
export function MfaSettings({ status }: { status: MfaStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [showDisable, setShowDisable] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  function disable() {
    setError(null);
    start(async () => {
      const res = await disableMfaAction(password);
      if (!res.ok) {
        setError(res.error ?? "Couldn't disable MFA.");
        return;
      }
      setShowDisable(false);
      setPassword("");
      setCodes(null);
      router.refresh();
    });
  }

  function regenerate() {
    setError(null);
    start(async () => {
      const res = await generateRecoveryCodesAction();
      if (!res.ok || !res.codes) {
        setError(res.error ?? "Couldn't generate codes.");
        return;
      }
      setCodes(res.codes);
      router.refresh();
    });
  }

  function copyCodes() {
    if (!codes) return;
    void navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${
            status.enrolled
              ? "bg-green-soft text-green"
              : "bg-surface-2 text-muted"
          }`}
        >
          {status.enrolled ? (
            <ShieldCheck className="size-5" />
          ) : (
            <ShieldOff className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold">Two-factor authentication</h2>
            <span
              className={`pill ${status.enrolled ? "pill-green" : "pill-muted"}`}
            >
              {status.enrolled ? "On" : "Off"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {status.enrolled
              ? "Your account asks for an authenticator code at sign-in."
              : "Add a second step at sign-in with an authenticator app. Optional for restaurant accounts."}
          </p>
        </div>
      </div>

      {/* Primary action: enable (link to setup) or disable (re-auth). */}
      {!status.enrolled ? (
        <Link href={`/mfa/setup?next=${encodeURIComponent(NEXT)}`}>
          <Button size="sm">
            <KeyRound className="size-4" /> Enable MFA
          </Button>
        </Link>
      ) : !showDisable ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={regenerate} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            {status.recoveryRemaining > 0
              ? "Regenerate recovery codes"
              : "Generate recovery codes"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowDisable(true);
              setError(null);
            }}
          >
            <ShieldOff className="size-4" /> Disable
          </Button>
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3.5">
          <p className="text-sm font-semibold">Confirm your password to disable</p>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Current password"
            className="w-full rounded-xl bg-surface px-3.5 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent/30"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={disable} disabled={pending}>
              {pending ? "Disabling…" : "Confirm & disable"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowDisable(false);
                setPassword("");
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {status.enrolled && !codes ? (
        <p className="text-xs text-muted">
          {status.recoveryRemaining > 0
            ? `${status.recoveryRemaining} recovery codes remaining.`
            : "No recovery codes yet — generate a set and store them somewhere safe."}
        </p>
      ) : null}

      {/* One-time reveal of freshly generated codes. */}
      {codes ? (
        <div className="space-y-2 rounded-xl border border-accent/30 bg-accent-soft/40 p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Your recovery codes</p>
            <button
              type="button"
              onClick={copyCodes}
              className="press inline-flex items-center gap-1 text-xs font-semibold text-accent-ink"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[13px]">
            {codes.map((c) => (
              <span key={c} className="rounded-lg bg-surface px-2 py-1 text-center">
                {c}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted">
            Each code works once. Save them now — you won&apos;t see them again.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-deal-soft px-3 py-2.5 text-sm font-medium text-deal">
          {error}
        </p>
      ) : null}
    </div>
  );
}
