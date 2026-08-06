"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfileEditSheet({
  open,
  field,
  value,
  onClose,
}: {
  open: boolean;
  field: "name" | "phone";
  value: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A phone change is an identity claim, not a preference: profiles.phone is
  // what OTP login resolves an account from, so the server demands a code sent
  // to the NEW number. Step 2 appears only once the server asks for it.
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  // The draft starts from the saved value each time the sheet opens (and if the
  // saved value changes underneath it). Adjusted during render rather than in
  // an effect: an effect would paint one frame holding the previous edit before
  // correcting itself, and React re-runs this render before touching the DOM.
  const [synced, setSynced] = useState({ open, value });
  if (synced.open !== open || synced.value !== value) {
    setSynced({ open, value });
    if (open) {
      setDraft(value);
      setError(null);
      setOtpSent(false);
      setOtp("");
    }
  }

  if (!open) return null;

  const title = field === "name" ? "Edit name" : "Edit phone";
  const placeholder = field === "name" ? "Your full name" : "+91 98765 43210";

  /** Ask the server to text a code to the number being claimed. */
  async function requestCode() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "invalid_phone"
            ? "Enter a valid phone number."
            : data.error === "cooldown" || data.error === "too_many"
              ? "Too many codes requested. Wait a moment and try again."
              : "Couldn't send a code. Try again."
        );
        return;
      }
      setOtpSent(true);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          field === "name"
            ? { fullName: draft }
            : { phone: draft, phoneOtp: otp || undefined }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // otp_required is the expected first answer for a genuine change —
        // it's the server telling us to run the verification step, not a
        // failure to show as one.
        if (data.error === "otp_required") {
          await requestCode();
          return;
        }
        setError(
          data.error === "invalid_phone"
            ? "Enter a valid phone number."
            : data.error === "otp_invalid"
              ? "That code isn't right. Check it and try again."
              : data.error === "phone_taken"
                ? "This number is already linked to another account. Sign in to that account, or use a different number."
                : "Could not save. Try again."
        );
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="bolt-sheet animate-sheet-in absolute inset-x-0 bottom-0 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-heading">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="press grid size-9 place-items-center rounded-full bg-surface-2 text-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <input
          type={field === "phone" ? "tel" : "text"}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            // Editing the number invalidates a code sent to the old one.
            if (otpSent) {
              setOtpSent(false);
              setOtp("");
            }
          }}
          placeholder={placeholder}
          disabled={otpSent}
          className="w-full rounded-xl bg-surface-2 px-3.5 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
        />

        {otpSent ? (
          <div className="mt-3 space-y-1.5">
            <label htmlFor="phone-otp" className="text-xs font-semibold text-muted">
              Enter the 6-digit code sent to {draft}
            </label>
            <input
              id="phone-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="text-data w-full rounded-xl bg-surface-2 px-3.5 py-3 text-[17px] tracking-[0.3em] outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="button"
              onClick={requestCode}
              disabled={busy}
              className="press text-xs font-bold text-accent disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        ) : null}

        {error ? <p className="mt-2 text-sm text-deal">{error}</p> : null}
        <Button
          className="mt-4 w-full"
          disabled={busy || (otpSent && otp.length !== 6)}
          onClick={save}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : otpSent ? (
            "Verify & save"
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}
