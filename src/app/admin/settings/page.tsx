import { getSettings, settingsBackendReady } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

/**
 * Platform settings — the one configuration row the whole app reads: order
 * fees, support contacts, which verticals are live, and the rider payout
 * formula. Writes here are server-authoritative; the customer app and the
 * billing code both read the same values.
 */
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [settings, backendReady] = await Promise.all([
    getSettings(),
    settingsBackendReady(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading">Settings</h1>
        <p className="text-sm text-muted">
          Platform configuration — fees, support, availability & ops
        </p>
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
    </div>
  );
}
