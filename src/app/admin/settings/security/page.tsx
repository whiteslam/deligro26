import { AdminHero } from "@/components/admin/admin-ui";
import { getMfaStatus } from "@/lib/data-access/mfa";
import { MfaSettings } from "@/components/auth/mfa-settings";

/**
 * Admin account security — two-factor authentication for the operator's own
 * login. Reached from the Settings menu; the MFA setup flow returns here.
 */
export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const mfa = await getMfaStatus();

  return (
    <div className="space-y-5">
      <AdminHero
        backHref="/admin/settings"
        backLabel="Settings"
        title="Security"
        subtitle="Two-factor authentication for your admin account. Enable it for a code at sign-in, or turn it off anytime."
      />

      {mfa ? (
        <MfaSettings status={mfa} next="/admin/settings/security" />
      ) : (
        <p className="card p-5 text-sm text-muted">
          Sign in with your admin account to manage MFA.
        </p>
      )}
    </div>
  );
}
