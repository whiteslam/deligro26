import Link from "next/link";
import { LogOut, UtensilsCrossed } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Top chrome for admin — works in phone frame and web dashboard. */
export function AdminHeader({
  title = "Admin",
  subtitle = "Operations",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-[color:var(--bg)]/90 px-4 py-3 backdrop-blur-md">
      <span className="size-2.5 shrink-0 rounded-full bg-green" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold leading-none">{title}</p>
        <p className="text-label mt-1 truncate leading-none">{subtitle}</p>
      </div>
      {/* Back to the app, without ending the session. On a handset this is the
          console's only exit — the rail that carries it on desktop isn't here. */}
      <Link
        href="/"
        aria-label="Open the customer app"
        title="Customer app"
        className="press grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted"
      >
        <UtensilsCrossed className="size-4" />
      </Link>
      <ThemeToggle className="size-9" />
      {isSupabaseConfigured ? (
        <form action="/auth/signout?next=/admin/login" method="post">
          <button
            type="submit"
            className="press grid size-9 place-items-center rounded-full border border-line bg-surface text-muted"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      ) : null}
    </header>
  );
}
