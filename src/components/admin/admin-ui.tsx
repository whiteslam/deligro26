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
 * The page header every admin screen opens with. One component, two faces:
 *
 * - phone frame — the gradient card, matching the vendor hero.
 * - console — a plain title row: 25px title, an outlined status `tag` beside
 *   it, a subtitle under it, and the screen's controls on the right.
 *
 * The switch is `.admin-hero`'s container query in globals.css, not a second
 * component, because these pages render in both shells. A separate
 * `ConsoleHeader` would mean every screen rendering two headers and hiding one.
 *
 * `tag` is the console's status chip ("18 in flight", "6 open") — a live count
 * belongs next to the title, not buried in the body. On the phone it falls
 * back to the same row as `badge`, where the card has room for it.
 */
export function AdminHero({
  title,
  subtitle,
  tag,
  badge,
  action,
  live,
  backHref,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  tag?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  live?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="admin-hero relative overflow-hidden rounded-[var(--radius-sheet)] border border-line p-4">
      <div className="admin-hero-glow vendor-hero-glow pointer-events-none absolute inset-0" />
      <div className="relative">
        {backHref ? (
          <div className="mb-3">
            <BackLink href={backHref}>{backLabel ?? "Back"}</BackLink>
          </div>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {live || badge ? (
              <div className="mb-1.5 flex flex-wrap items-center gap-2 @3xl:hidden">
                {live ? <LiveBadge /> : null}
                {badge}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight @3xl:text-[25px] @3xl:tracking-[-0.025em]">
                {title}
              </h1>
              {live ? (
                <span className="hidden @3xl:inline">
                  <LiveBadge />
                </span>
              ) : null}
              {tag ? <StatusTag>{tag}</StatusTag> : null}
            </div>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted @3xl:text-[13px]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** The outlined chip beside a page title: "22 waiting", "Cycle 12 Aug". */
function StatusTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[5px] border border-line bg-surface px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted">
      {children}
    </span>
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
              "grid size-8 shrink-0 place-items-center rounded-lg @3xl:size-10 @3xl:rounded-xl",
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
      <p className="text-data mt-2.5 text-xl font-bold leading-none tracking-tight text-ink @3xl:mt-4 @3xl:text-[28px]">
        {value}
      </p>
      <p className="text-label mt-1 @3xl:mt-1.5">{label}</p>
    </>
  );
  const className = cn(
    "block rounded-xl border border-line bg-surface p-3 @3xl:p-4",
    href && "press transition-colors hover:border-[var(--c-border-hover)]"
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
    // `ui-empty` is the console's hook — this component is shared with the
    // customer app, so its radius is retuned by CSS rather than changed here.
    <div className="ui-empty flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-10 text-center">
      <span className="mb-1 grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
        <Icon className="size-6" />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="max-w-xs text-sm text-muted">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/**
 * A panel built to hold a chart: title, optional headline figure, and a body of
 * a fixed height (charts need one — a `ResponsiveContainer` inside an auto-height
 * parent collapses to zero).
 */
export function ChartCard({
  title,
  subtitle,
  action,
  height = 260,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  height?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        // Its own container: a chart in a one-third column must lay itself out
        // against that column, not against the page. Without this the donut
        // reads "the page is 1600px wide" and goes side-by-side inside a card
        // barely wider than the ring.
        "@container rounded-xl border border-line bg-surface p-4 @3xl:px-4 @3xl:py-[14px]",
        className
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-bold tracking-[-0.01em]">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div style={{ height }}>{children}</div>
    </section>
  );
}

/**
 * The window a screen is reporting on, as links rather than state — the page is
 * a server component and re-queries when the range changes, so the URL is the
 * only place the choice can honestly live.
 */
export function RangeTabs({
  options,
  active,
  hrefFor,
}: {
  options: { value: number; label: string }[];
  active: number;
  hrefFor: (value: number) => string;
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 text-xs"
      role="group"
      aria-label="Reporting window"
    >
      {options.map((o) => {
        const on = o.value === active;
        return (
          <Link
            key={o.value}
            href={hrefFor(o.value)}
            aria-current={on ? "true" : undefined}
            className={cn(
              "press whitespace-nowrap rounded-md px-[11px] py-[5px] transition-colors",
              on
                ? "bg-ink font-semibold text-[color:var(--surface)]"
                : "font-medium text-muted hover:text-ink"
            )}
          >
            {o.label}
          </Link>
        );
      })}
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
