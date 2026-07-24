import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StatusBar } from "@/components/layout/status-bar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { MfaSetup } from "@/components/auth/mfa-setup";
import { getOperatorMfaGate, safeNextPath } from "@/lib/auth/mfa";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Deligro · Set up MFA",
};

async function SetupBody({ next }: { next: string }) {
  if (!isSupabaseConfigured) redirect(next);
  await requireUser();

  const gate = await getOperatorMfaGate();
  if (gate.ok) redirect(next);
  if (gate.reason === "challenge") {
    redirect(`/mfa?next=${encodeURIComponent(next)}`);
  }

  return <MfaSetup next={next} />;
}

export default async function MfaSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: raw } = await searchParams;
  const next = safeNextPath(raw, "/");

  return (
    <div className="device">
      <div className="app-shell">
        <StatusBar />
        <div className="absolute right-4 top-4 z-10 min-[480px]:top-[64px]">
          <ThemeToggle />
        </div>
        <div className="app-scroll no-scrollbar flex min-h-full flex-col items-center justify-center px-6 py-10">
          <Suspense fallback={null}>
            <SetupBody next={next} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
