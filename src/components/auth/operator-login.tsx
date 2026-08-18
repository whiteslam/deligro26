"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, ShieldAlert, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { OtpLogin } from "@/components/auth/otp-login";
import { PORTALS, type PortalKey } from "@/lib/auth/portals";

/**
 * The sign-in form behind every operator door (/admin/login, /vendor/login, …).
 *
 * One form, one portal: it never asks who you are and routes accordingly — it
 * signs you in and sends you to *this* portal. If the account can't open this
 * door, the portal layout's `requireRole()` bounces straight back here with
 * `denied=1`, which is why the wrong-account banner below matters: without it a
 * signed-in customer would ping-pong between the two.
 */
export function OperatorLogin({
  portalKey,
  landing,
  denied = false,
  signedInAs = null,
}: {
  portalKey: PortalKey;
  /** Pre-resolved destination (portal home, or a deep link inside it). */
  landing: string;
  /** A role check just failed for the account that is signed in. */
  denied?: boolean;
  /** Set when someone is signed in but can't enter here. */
  signedInAs?: string | null;
}) {
  const portal = PORTALS[portalKey];
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured) {
      setError(
        "Auth isn't configured yet. Add your Supabase keys to .env.local, then run the migrations."
      );
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: sErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);

    if (sErr) {
      // Deliberately generic — don't reveal whether the email exists.
      setError("Incorrect email or password.");
      return;
    }

    // Straight to the portal. Whether this account may actually be here is the
    // layout's call, server-side; a wrong role lands back on this page with
    // `denied=1` rather than being decided in the browser.
    router.push(landing);
    router.refresh();
  }

  const header = (
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        Deligro
      </p>
      <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight">
        {portal.label}
      </h1>
      <p className="mt-1.5 text-sm text-muted">{portal.blurb}</p>
    </div>
  );

  const notices = (
    <>
      {denied ? (
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-deal-soft px-3 py-2.5 text-sm font-medium text-deal">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          {signedInAs
            ? `${signedInAs} doesn't have access to the ${portal.label.toLowerCase()}. Sign in with an account that does.`
            : `That account doesn't have access to the ${portal.label.toLowerCase()}.`}
        </p>
      ) : null}

      {signedInAs && !denied ? (
        <p className="mt-5 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">
          Signed in as <span className="font-semibold text-ink">{signedInAs}</span>,
          which can&apos;t open this portal.
        </p>
      ) : null}
    </>
  );

  const switchAccount = signedInAs ? (
    <form
      action={`/auth/signout?next=${encodeURIComponent(portal.login)}`}
      method="post"
      className="mt-3"
    >
      <button
        type="submit"
        className="press block w-full text-center text-sm font-semibold text-muted hover:text-ink"
      >
        Sign out of that account
      </button>
    </form>
  ) : null;

  const footer = (
    <div className="mt-6 space-y-1 text-center text-xs text-muted">
      <p>
        <Link href="/login" className="font-semibold hover:text-ink">
          Customer sign-in
        </Link>{" "}
        ·{" "}
        <Link href="/portals" className="font-semibold hover:text-ink">
          All portals
        </Link>
      </p>
      <p>
        Operator accounts are created by an admin. Lost your password? Ask an
        admin to reset it.
      </p>
    </div>
  );

  if (mode === "otp") {
    return (
      <div className="w-full max-w-sm">
        {header}
        {notices}
        <div className="mt-6">
          <OtpLogin
            next={landing}
            heading="Sign in with your phone"
            sub="The number this account is registered with."
          />
        </div>
        <div className="my-5 flex items-center gap-3 text-xs font-semibold text-muted">
          <span className="h-px flex-1 bg-line" /> OR{" "}
          <span className="h-px flex-1 bg-line" />
        </div>
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
        {switchAccount}
        {footer}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={onSubmit}>
        {header}
        {notices}

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
          className="press mt-4 flex h-14 w-full items-center justify-center rounded-full bg-accent text-[17px] font-bold text-[var(--on-accent)] shadow-[var(--glow-accent)] disabled:opacity-50"
        >
          {busy ? "Signing in…" : `Sign in to ${portal.label.toLowerCase()}`}
        </button>

        {portal.otp ? (
          <>
            <div className="my-5 flex items-center gap-3 text-xs font-semibold text-muted">
              <span className="h-px flex-1 bg-line" /> OR{" "}
              <span className="h-px flex-1 bg-line" />
            </div>
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
          </>
        ) : null}
      </form>

      {/* Sibling of the sign-in form, not a child — a <form> inside a <form> is
          invalid HTML and throws a hydration error. */}
      {switchAccount}
      {footer}
    </div>
  );
}
