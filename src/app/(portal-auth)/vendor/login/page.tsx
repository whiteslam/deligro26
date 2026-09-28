import type { Metadata } from "next";
import { PortalLoginScreen } from "@/components/auth/portal-login-screen";

// The manifest too, so "Add to Home Screen" from this sign-in page installs
// the Deligro Partner app, not the customer one (src/lib/pwa/role-manifest.ts).
export const metadata: Metadata = {
  title: "Restaurant sign-in · Deligro",
  manifest: "/manifests/vendor",
  appleWebApp: { capable: true, title: "Deligro Partner", statusBarStyle: "default" },
};

/** Reads the auth cookie — never prerendered. */
export const dynamic = "force-dynamic";

export default async function VendorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; denied?: string }>;
}) {
  return <PortalLoginScreen portalKey="vendor" searchParams={searchParams} />;
}
