import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Profile-style shortcut row used on admin catalogue screens. */
export function AdminQuickLink({
  href,
  label,
  hint,
  icon: Icon,
}: {
  href: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="vendor-profile-link press group flex items-center justify-between gap-3 rounded-[var(--radius-block)] border border-line bg-surface px-4 py-3.5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-0.5 text-xs text-muted">{hint}</p>
        </div>
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-muted transition group-hover:text-accent" />
    </Link>
  );
}
