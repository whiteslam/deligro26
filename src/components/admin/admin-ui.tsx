import Link from "next/link";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Shared admin dashboard primitives — the admin section's answer to
 * `vendor-ui`. Every admin page is built from these so the whole portal reads
 * as one product: a gradient hero header, toned metric cards, titled panels and
 * a common empty state. All are pure presentational components (no hooks, no
 * handlers) so they render in both server and client components.
 */

/** A trend's shape, kept local so this stays free of the server-only stats module. */
export type TrendLike = { pct: number; direction: "up" | "down" | "flat" };

export type StatTone = "accent" | "green" | "blue" | "deal" | "muted";

const TONES: Record<StatTone, string> = {
  accent: "bg-accent/12 text-accent",
  green: "bg-green/12 text-green",
  blue: "bg-blue/12 text-blue",
  deal: "bg-deal/12 text-deal",
  muted: "bg-surface-2 text-muted",
};

/** Pulsing green dot — the "live" tell borrowed from the vendor portal. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2", className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-green" />
    </span>
  );
}

/** Small "Live" capsule for hero headers. */
export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green/15 px-2.5 py-1 text-[11px] font-bold text-green">
      <LiveDot />
      Live
    </span>
  );
}

/** Muted "← Parent" link that sits above a sub-page hero. */
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
    >
      <ArrowLeft className="size-4" />
      {children}
    </Link>
  );
}

/**
 * The gradient page header every admin screen opens with — the section's
 * signature, matching the vendor hero. Optional back link, live badge, a free
 * `badge` slot and a right-aligned `action` (a button, count or headline stat).
 */
export function AdminHero({
  title,
  subtitle,
  badge,
  action,
  live,
  backHref,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  live?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="vendor-hero relative overflow-hidden rounded-[var(--radius-sheet)] border border-line p-4">
      <div className="vendor-hero-glow pointer-events-none absolute inset-0" />
      <div className="relative">
        {backHref ? (
          <div className="mb-3">
            <BackLink href={backHref}>{backLabel ?? "Back"}</BackLink>
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {live || badge ? (
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                {live ? <LiveBadge /> : null}
                {badge}
              </div>
            ) : null}
            <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** Small directional chip for metric cards: green up, red down, muted flat. */
export function TrendChip({ trend }: { trend: TrendLike }) {
  if (trend.direction === "flat") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-muted">
        <Minus className="size-3" />
        0%
      </span>
    );
  }
  const up = trend.direction === "up";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-bold",
        up ? "text-green" : "text-deal"
      )}
    >
      <Icon className="size-3" />
      {Math.abs(trend.pct)}%
    </span>
  );
}

/** Rounded, tinted trend pill for hero headlines — includes "vs last week". */
export function TrendPill({ trend }: { trend: TrendLike }) {
  if (trend.direction === "flat") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
        <Minus className="size-3" />
        Flat vs last week
      </span>
    );
  }
  const up = trend.direction === "up";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
        up ? "bg-green/15 text-green" : "bg-deal/15 text-deal"
      )}
    >
      <Icon className="size-3" />
      {Math.abs(trend.pct)}% vs last week
    </span>
  );
}

/**
 * A metric tile: toned icon chip, big mono value, uppercase label, with either a
 * trend arrow or a hint pill in the top-right. Becomes a tappable card when
 * given an href.
 */
export function StatCard({
  icon,
  label,
  value,
  tone = "muted",
  trend,
  hint,
  href,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  tone?: StatTone;
  trend?: TrendLike;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-1.5">
        {icon ? (
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg",
              TONES[tone]
            )}
          >
            {icon}
          </span>
        ) : (
          <span />
        )}
        {trend ? (
          <TrendChip trend={trend} />
        ) : hint ? (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted">
            {hint}
          </span>
        ) : null}
      </div>
      <p className="text-data mt-2.5 text-xl font-bold leading-none tracking-tight text-ink">
        {value}
      </p>
      <p className="text-label mt-1">{label}</p>
    </>
  );
  const className = cn(
    "block rounded-2xl border border-line bg-surface p-3",
    href && "press transition-shadow hover:shadow-[var(--shadow-md)]"
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** A titled section card — the admin analogue of the vendor panel. */
export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  id,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("vendor-panel", id && "scroll-mt-4", className)}>
      {title ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Centered empty state: icon chip, title, description, optional action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-10 text-center">
      <span className="mb-1 grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
        <Icon className="size-6" />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="max-w-xs text-sm text-muted">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** A soft "preview mode / apply migration" notice used across admin pages. */
export function PreviewNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-pop/40 bg-pop/10 px-3.5 py-3 text-sm font-medium text-ink">
      {children}
    </p>
  );
}
