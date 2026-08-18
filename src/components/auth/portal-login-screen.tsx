import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { OperatorLogin } from "@/components/auth/operator-login";
import { getProfile } from "@/lib/auth";
import { hasVendorAccess } from "@/lib/auth/vendor-access";
import { PORTALS, portalLanding, roleEntersPortal, type PortalKey } from "@/lib/auth/portals";

/**
 * The page body every portal's `/…/login` route renders.
 *
 * It lives outside the portal's own folder tree (see `src/app/(portal-auth)/`)
 * so the portal layout — which guards the portal and would bounce back here —
 * never wraps it. That is what keeps the door from looping into itself.
 *
 * Already signed in with an account that belongs here? Straight through, no
 * second form. Signed in as someone else? The form stays, with a way out.
 */
export async function PortalLoginScreen({
  portalKey,
  searchParams,
}: {
  portalKey: PortalKey;
  searchParams: Promise<{ next?: string; denied?: string }>;
}) {
  const portal = PORTALS[portalKey];
  const { next, denied } = await searchParams;
  const landing = portalLanding(portal, next);

  const profile = await getProfile();
  if (profile) {
    // Vendor access is ownership-based, not role-based: a customer who runs a
    // shop belongs here too. Everything else is a plain role match.
    const allowed =
      portalKey === "vendor"
        ? await hasVendorAccess(profile)
        : roleEntersPortal(portal, profile.role);
    if (allowed) redirect(landing);
  }

  const signedInAs = profile
    ? profile.full_name?.trim() || profile.phone || "That account"
    : null;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <OperatorLogin
        portalKey={portalKey}
        landing={landing}
        denied={denied === "1"}
        signedInAs={signedInAs}
      />
    </div>
  );
}
