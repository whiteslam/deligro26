import Link from "next/link";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Compact top chrome inside the admin phone frame. */
export function AdminHeader({
  title = "Admin",
  subtitle = "Operations",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-[color:var(--bg)]/90 px-4 py-3 backdrop-blur-md">
      <span className="size-2.5 shrink-0 rounded-full bg-green" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold leading-none">{title}</p>
        <p className="text-label mt-1 truncate leading-none">{subtitle}</p>
      </div>
      <ThemeToggle />
      {isSupabaseConfigured ? (
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="press grid size-9 place-items-center rounded-full border border-line bg-surface text-muted"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      ) : (
        <Link
          href="/"
          className="press grid size-9 place-items-center rounded-full border border-line bg-surface text-xs font-bold text-muted"
        >
          ✕
        </Link>
      )}
    </header>
  );
}
