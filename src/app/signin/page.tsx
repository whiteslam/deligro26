import { Suspense } from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Wordmark } from "@/components/shared/logo";
import { SignInClient } from "./signin-client";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className="dashboard-shell grid place-items-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Wordmark className="text-2xl" />
        <Suspense fallback={null}>
          <SignInClient />
        </Suspense>
      </div>
    </div>
  );
}
