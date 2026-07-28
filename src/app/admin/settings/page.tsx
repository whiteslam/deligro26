import Link from "next/link";
import { Megaphone, ReceiptText, RotateCcw, Store } from "lucide-react";
import { getSettings, settingsBackendReady } from "@/lib/settings";
import { getMfaStatus } from "@/lib/data-access/mfa";
import { MfaSettings } from "@/components/auth/mfa-settings";
import { SettingsForm } from "./settings-form";

const SHORTCUTS = [
  { href: "/admin/vendors", icon: Store, label: "Vendors" },
  { href: "/admin/orders", icon: ReceiptText, label: "All orders" },
  { href: "/admin/refunds", icon: RotateCcw, label: "Refunds" },
  { href: "/admin/banners", icon: Megaphone, label: "Campaigns" },
];

/**
 * Platform settings — the one configuration row the whole app reads: order
 * fees, support contacts, which verticals are live, and the rider payout
 * formula. Writes here are server-authoritative; the customer app and the
 * billing code both read the same values.
 */
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [settings, backendReady, mfa] = await Promise.all([
    getSettings(),
    settingsBackendReady(),
    getMfaStatus(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading">Settings</h1>
        <p className="text-sm text-muted">
          Platform configuration — fees, support, availability & ops
        </p>
      </div>

      {/* Jump-off points, moved here from the dashboard. */}
      <div className="grid grid-cols-2 gap-2.5">
        {SHORTCUTS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="press flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-3"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-ink">
              <Icon className="size-4" />
            </span>
            <span className="text-sm font-bold">{label}</span>
          </Link>
        ))}
      </div>

      {!backendReady ? (
        <p className="rounded-xl border border-pop/40 bg-pop/10 px-3.5 py-3 text-sm font-medium text-ink">
          Preview mode — showing default values. Apply migration{" "}
          <code className="rounded bg-surface-2 px-1">
            0015_platform_settings.sql
          </code>{" "}
          to your database to save changes. Until then the app runs on these
          defaults.
        </p>
      ) : null}

      <SettingsForm settings={settings} />

      <div>
        <h2 className="text-heading">Security</h2>
        <p className="mt-1 text-sm text-muted">
          Two-factor authentication for your admin account. Enable it for a code
          at sign-in, or turn it off anytime.
        </p>
      </div>

      {mfa ? (
        <MfaSettings status={mfa} next="/admin/settings" />
      ) : (
        <p className="card p-5 text-sm text-muted">
          Sign in with your admin account to manage MFA.
        </p>
      )}
    </div>
  );
}
