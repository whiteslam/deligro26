import type { Metadata } from "next";
import { PortalLoginScreen } from "@/components/auth/portal-login-screen";

export const metadata: Metadata = { title: "Restaurant sign-in · Deligro" };

/** Reads the auth cookie — never prerendered. */
export const dynamic = "force-dynamic";

export default async function VendorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; denied?: string }>;
}) {
  return <PortalLoginScreen portalKey="vendor" searchParams={searchParams} />;
}
