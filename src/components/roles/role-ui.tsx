import Link from "next/link";
import { ArrowUpRight, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils/cn";

/** Top bar shared by every role portal: role name, optional nav, theme + exit. */
export function RoleTopBar({
  role,
  accent,
  nav,
}: {
  role: string;
  accent?: string; // small colored dot to distinguish portals
  nav?: React.ReactNode;
}) {
  return (
    <header className="glass sticky top-0 z-30 border-x-0 border-t-0">
      <div className="mx-auto flex w-full max-w-[1120px] items-center gap-3 px-4 py-3 md:px-7">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: accent ?? "var(--accent)" }}
        />
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-none">Deligro</p>
          <p className="text-label mt-1 leading-none">{role}</p>
        </div>
        {nav ? (
          <nav className="ml-4 hidden items-center gap-1 md:flex">{nav}</nav>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {isSupabaseConfigured ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="press inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted"
              >
                Sign out <LogOut className="size-3.5" />
              </button>
            </form>
          ) : (
            <Link
              href="/"
              className="press hidden items-center gap-1 rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted sm:inline-flex"
            >
              Exit <ArrowUpRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
      {nav ? (
        <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {nav}
        </nav>
      ) : null}
    </header>
  );
}

export function RoleNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "press whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
        active ? "bg-accent text-white" : "text-muted hover:bg-surface-2"
      )}
    >
      {children}
    </Link>
  );
}

export function StatCard({
  label,
  value,
  delta,
  tone = "muted",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "accent" | "green" | "muted";
}) {
  const toneClass =
    tone === "green"
      ? "text-green"
      : tone === "accent"
        ? "text-accent"
        : "text-muted";
  return (
    <div className="card p-4">
      <p className="text-label">{label}</p>
      <p className="text-data mt-2 text-2xl font-semibold text-ink">{value}</p>
      {delta ? (
        <p className={cn("mt-1 text-xs font-semibold", toneClass)}>{delta}</p>
      ) : null}
    </div>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-label">{children}</h2>
      {right}
    </div>
  );
}

export function Pill({
  tone = "muted",
  children,
}: {
  tone?: "accent" | "green" | "muted";
  children: React.ReactNode;
}) {
  return <span className={cn("pill", `pill-${tone}`)}>{children}</span>;
}
