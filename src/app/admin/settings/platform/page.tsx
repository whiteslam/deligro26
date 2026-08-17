import { AdminHero, PreviewNotice } from "@/components/admin/admin-ui";
import { ConsoleOnly } from "@/components/admin/console-only";
import { getSettings, settingsBackendReady } from "@/lib/settings";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import {
  getCommissionCoverage,
  getVendorCommissionDefault,
} from "@/lib/data-access/admin-commission";
import { SettingsForm } from "../settings-form";

/**
 * Platform settings — the one configuration row the whole app reads: order
 * fees, support contacts, which verticals are live, and the rider payout
 * formula. Writes here are server-authoritative; the customer app and the
 * billing code both read the same values. Reached from the Settings menu.
 */
export const dynamic = "force-dynamic";

export default async function PlatformSettingsPage() {
  const [settings, backendReady, vendorCommissionPct, commissionCoverage] =
    await Promise.all([
      getSettings(),
      settingsBackendReady(),
      getVendorCommissionDefault(),
      getCommissionCoverage(),
    ]);

  return (
    <>
      <AdminHero
        backHref="/admin/settings"
        backLabel="Settings"
        title="Platform configuration"
        subtitle="Fees, support, availability and the rider payout formula."
      />

      {!backendReady ? (
        <PreviewNotice>
          Preview mode — showing default values. Apply migration{" "}
          <code className="rounded bg-surface-2 px-1">
            0015_platform_settings.sql
          </code>{" "}
          to your database to save changes. Until then the app runs on these
          defaults.
        </PreviewNotice>
      ) : null}

      {/* Console-only: six two-column sections and a docked save bar, over the
          highest-blast-radius config in the product — fees, tax, commission,
          rider payout. Not something to edit from a phone by accident. */}
      <ConsoleOnly variant="page" tool="Platform configuration">
        {/* Whether the gateway keys exist is a server fact; the form needs it to
            tell an admin that the payments toggle alone won't do anything. */}
        <SettingsForm
          settings={settings}
          razorpayConfigured={isRazorpayConfigured}
          vendorCommissionPct={vendorCommissionPct}
          commissionCoverage={commissionCoverage}
        />
      </ConsoleOnly>
    </>
  );
}
