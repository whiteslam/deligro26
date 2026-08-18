import type { Metadata } from "next";
import { PortalLoginScreen } from "@/components/auth/portal-login-screen";

export const metadata: Metadata = { title: "Driver sign-in · Deligro" };

/** Reads the auth cookie — never prerendered. */
export const dynamic = "force-dynamic";

export default async function DriverLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; denied?: string }>;
}) {
  return <PortalLoginScreen portalKey="driver" searchParams={searchParams} />;
}
