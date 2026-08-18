import type { Metadata } from "next";
import { PortalLoginScreen } from "@/components/auth/portal-login-screen";

export const metadata: Metadata = { title: "Manager sign-in · Deligro" };

/** Reads the auth cookie — never prerendered. */
export const dynamic = "force-dynamic";

export default async function ManagerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; denied?: string }>;
}) {
  return <PortalLoginScreen portalKey="manager" searchParams={searchParams} />;
}
