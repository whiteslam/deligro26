"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { Section } from "@/components/ui/field";
import { PhoneOtpVerify } from "@/components/admin/phone-otp-verify";
import { resetVendorPasswordAction, verifyVendorPhoneAction } from "../../actions";

/**
 * Login & credentials block on the Edit screen: shows the current one-time
 * password (stored on the vendor so it survives a page close, per admin request),
 * lets an operator generate a fresh one, and lets them verify the vendor's mobile
 * by OTP later. Reset/verify run through admin-gated server actions.
 */
export function VendorCredentials({
  id,
  tempPassword,
  ownerMobile,
  ownerPhoneVerified,
}: {
  id: string;
  tempPassword: string | null;
  ownerMobile: string | null;
  ownerPhoneVerified: boolean;
}) {
  const router = useRouter();
  const [pw, setPw] = useState<string | null>(tempPassword);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(ownerPhoneVerified);
  const [pending, start] = useTransition();

  const regenerate = () => {
    setError(null);
    start(async () => {
      const res = await resetVendorPasswordAction(id);
      if (!res.ok || !res.tempPassword) {
        setError(res.error ?? "Couldn't generate a password.");
        return;
      }
      setCopied(false);
      setPw(res.tempPassword);
    });
  };

  const copy = async () => {
    if (!pw) return;
    try {
      await navigator.clipboard.writeText(pw);
      setCopied(true);
    } catch {
      /* clipboard blocked — the value is visible to read/type */
    }
  };

  return (
    <Section title="Login & credentials">
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-muted">Temporary password</span>
        {pw ? (
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 p-2.5">
            <code className="text-data flex-1 break-all px-1 text-[15px] font-semibold text-ink">
              {pw}
            </code>
            <button
              type="button"
              onClick={copy}
              className="press grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-muted hover:text-ink"
              aria-label="Copy password"
            >
              {copied ? <Check className="size-4 text-green" /> : <Copy className="size-4" />}
            </button>
          </div>
        ) : (
          <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-xs text-muted">
            No password on record. Generate one to hand off to the vendor.
          </p>
        )}
        <button
          type="button"
          onClick={regenerate}
          disabled={pending}
          className="press inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-2 text-xs font-bold text-accent disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : pw ? (
            <RefreshCw className="size-3.5" />
          ) : (
            <KeyRound className="size-3.5" />
          )}
          {pw ? "Generate new password" : "Generate password"}
        </button>
        <p className="text-[11px] text-muted">
          Regenerating immediately replaces the vendor&apos;s current login
          password. It&apos;s stored here until the vendor sets their own.
        </p>
        {error ? <p className="text-xs font-medium text-deal">{error}</p> : null}
      </div>

      <div className="space-y-1.5 border-t border-line pt-3">
        <span className="text-xs font-semibold text-muted">Mobile verification</span>
        {ownerMobile ? (
          <PhoneOtpVerify
            phone={ownerMobile}
            verified={verified}
            onVerified={() => {
              setVerified(true);
              router.refresh();
            }}
            verify={(phone, code) => verifyVendorPhoneAction(id, phone, code)}
          />
        ) : (
          <p className="text-xs text-muted">Add a mobile number to enable OTP verification.</p>
        )}
      </div>
    </Section>
  );
}
