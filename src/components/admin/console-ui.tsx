import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Console-only primitives — the shapes the ops-console redesign introduced that
 * the existing admin kit had no equivalent for.
 *
 * Everything that *did* have an equivalent (StatCard, Panel, ChartCard,
 * DataTable, FilterChips, RangeTabs) was retuned in place instead of forked, so
 * this file is deliberately short: a KPI strip, a sparkline, a summary tile, a
 * stacked share bar, and the decision-queue row. All are pure presentational
 * server components.
 */

/* ============================================================
   Sparkline
   ============================================================ */

/**
 * A 26px trend line for a KPI card. Inline SVG rather than a chart library:
 * there are five of these above the fold, none of them is interactive, and
 * `preserveAspectRatio="none"` plus a non-scaling stroke gives a line that
 * stretches to any column width without the stroke going with it.
 *
 * Fewer than two points is not a trend, so it renders nothing rather than a
 * flat line implying "no change".
 */
function Sparkline({
  points,
  tone = "flat",
  className,
}: {
  points: number[];
  tone?: "up" | "down" | "flat";
  className?: string;
}) {
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  // A perfectly flat series has no range to normalise against; draw it down
  // the middle rather than dividing by zero.
  const span = max - min || 1;
  const stepX = 120 / (points.length - 1);

  const xy = points.map((p, i) => {
    const x = i * stepX;
    const y = 24 - ((p - min) / span) * 22;
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  const line = `M${xy.join(" L")}`;
  const area = `${line} L120 26 L0 26 Z`;

  const stroke =
    tone === "up"
      ? "var(--c-spark-up)"
      : tone === "down"
        ? "var(--c-spark-down)"
        : "var(--c-faint)";

  return (
    <svg
      viewBox="0 0 120 26"
      preserveAspectRatio="none"
      className={cn("block h-[26px] w-full", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path d={area} fill={stroke} fillOpacity={0.1} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ============================================================
   KPI strip
   ============================================================ */

export interface KpiDelta {
  /** Pre-formatted, because not every delta is a percentage ("+6", "+0.8pp"). */
  label: string;
  direction: "up" | "down" | "flat";
  /**
   * Set when rising is the bad outcome — late deliveries, cancellations. Only
   * affects colour; the arrow still points the way the number moved.
   */
  invert?: boolean;
  /** What the comparison is against, e.g. "vs Wed". */
  note?: string;
}

export interface KpiItem {
  label: string;
  value: string;
  /** Small grey qualifier under the value: "per order", "of 140". */
  unit?: string;
  delta?: KpiDelta;
  /** Omitted when the metric has no history to draw — see the dashboard. */
  spark?: number[];
}

/** Which way a delta should read, once `invert` is taken into account. */
function deltaTone(d: KpiDelta): "up" | "down" | "flat" {
  if (d.direction === "flat") return "flat";
  const good = d.invert ? d.direction === "down" : d.direction === "up";
  return good ? "up" : "down";
}

/**
 * The dashboard's top band: five figures in one bordered container, split by
 * hairlines.
 *
 * The dividers are the 1px gaps between cells, showing the container's own
 * `--line` background through.
 *
 * They used to be a `box-shadow: 0 0 0 1px` ring on each cell, which drew a
 * SQUARE outline on every side — including the outer edges, where it landed on
 * top of the container's rounded border. On a straight edge the two coincided
 * and nobody noticed; at the four corners the square ring cut across the 12px
 * arc and the corner rendered doubled and notched.
 *
 * The original reason for the ring was that these cells wrap, and a partial
 * last row must not leave a tinted empty cell at the end of the line. That does
 * not arise: the cells are `flex-1`, so a wrapping row's cells grow to fill the
 * width and there is no leftover space for the tint to show through. One thing
 * draws the outline (the container border, which follows the radius), one thing
 * draws the dividers (the gaps), and they never overlap.
 */
export function KpiStrip({ items }: { items: KpiItem[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-px overflow-hidden rounded-xl border border-line bg-[var(--line)]">
      {items.map((k) => {
        const tone = k.delta ? deltaTone(k.delta) : "flat";
        return (
          <div
            key={k.label}
            className="flex min-w-0 flex-1 basis-52 flex-col gap-[9px] bg-surface px-[15px] pb-3 pt-3.5"
          >
            <div className="flex items-baseline justify-between gap-2">
              {/* Sentence case, wrapping to a second line rather than
                  truncating. These labels are now plain English — "Riders
                  currently delivering", not "RIDERS ON DELIVERY" — and a plain
                  sentence clipped to "RIDERS CURRENTLY DELIV…" is harder to
                  read than the jargon it replaced. */}
              <span className="min-w-0 text-[11.5px] font-semibold leading-tight text-muted">
                {k.label}
              </span>
              {k.delta ? (
                <span
                  className={cn(
                    "text-data shrink-0 text-[11px] font-semibold",
                    tone === "up"
                      ? "text-green"
                      : tone === "down"
                        ? "text-deal"
                        : "text-muted"
                  )}
                >
                  {k.delta.label}
                </span>
              ) : null}
            </div>

            <div className="min-w-0">
              <p className="truncate text-[26px] font-bold leading-none tracking-[-0.03em] tabular-nums text-ink">
                {k.value}
              </p>
              {k.unit || k.delta?.note ? (
                <p className="mt-1.5 truncate text-[11.5px] text-muted">
                  {k.unit ?? k.delta?.note}
                </p>
              ) : null}
            </div>

            {k.spark ? <Sparkline points={k.spark} tone={tone} /> : null}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Summary tile
   ============================================================ */

/**
 * The label / figure / note card under a queue table. Distinct from StatCard:
 * no icon, no link, no trend arrow — just a stated number with the sentence
 * that makes it mean something.
 */
export function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-surface px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
        {value}
      </p>
      {note ? (
        <p className="mt-1 text-[11px] leading-snug text-muted">{note}</p>
      ) : null}
    </div>
  );
}

/**
 * A row of summary tiles, sized so they reflow rather than squash.
 *
 * Deliberately tight: these are a band above a table, not the page's subject,
 * and at the old size eight of them pushed the list they summarise off screen.
 */
export function StatTiles({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(178px,1fr))] gap-2">
      {children}
    </div>
  );
}

/* ============================================================
   Stacked share bar
   ============================================================ */

export interface ShareSegment {
  label: string;
  count: number;
  /** Any CSS colour — callers pass a token so it follows the theme. */
  color: string;
}

/**
 * "Where orders ended up": one bar plus a legend. A bar and a table of the
 * same four numbers would be redundant, so the legend *is* the table — swatch,
 * label, count, share.
 */
export function ShareBar({ segments }: { segments: ShareSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  if (!total) {
    return (
      <p className="py-6 text-center text-[13px] text-muted">
        No orders in this window.
      </p>
    );
  }

  return (
    <div>
      <div className="flex h-[9px] gap-0.5 overflow-hidden rounded-full">
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <span
              key={s.label}
              style={{
                width: `${(s.count / total) * 100}%`,
                background: s.color,
              }}
              className="first:rounded-l-full last:rounded-r-full"
            />
          ))}
      </div>
      <dl className="mt-3 space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span
              className="size-2 shrink-0 rounded-[3px]"
              style={{ background: s.color }}
            />
            <dt className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
              {s.label}
            </dt>
            <dd className="text-data shrink-0 text-[12.5px] tabular-nums text-ink">
              {s.count.toLocaleString("en-IN")}
            </dd>
            <dd className="text-data w-[42px] shrink-0 text-right text-[11.5px] tabular-nums text-muted">
              {Math.round((s.count / total) * 100)}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ============================================================
   Decision queue
   ============================================================ */

export interface Decision {
  href: string;
  title: string;
  detail: string;
  count: number;
  /** Left-edge accent; a token, so it follows the theme. */
  color: string;
}

/**
 * "Needs a decision" — the one place on the dashboard that answers *what
 * should I do next*, which is the hierarchy problem the redesign was built to
 * fix. Each row is a real queue with a real destination; a queue at zero is
 * dropped by the caller rather than shown as a green zero, because a list of
 * zeros trains you to stop reading the list.
 */
export function DecisionRow({ item }: { item: Decision }) {
  return (
    <Link
      href={item.href}
      className="press flex items-center gap-3 rounded-lg border border-[color:var(--c-divider)] bg-surface px-[11px] py-2.5 transition-colors hover:border-[var(--c-border-strong)] hover:bg-[var(--c-hover)]"
      style={{ borderLeft: `3px solid ${item.color}` }}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-semibold text-ink">
          {item.title}
        </span>
        <span className="block truncate text-[11.5px] text-muted">
          {item.detail}
        </span>
      </span>
      <span
        className="text-data shrink-0 text-[15px] font-semibold tabular-nums"
        style={{ color: item.color }}
      >
        {item.count}
      </span>
      <ChevronRight className="size-4 shrink-0 text-[color:var(--c-faint)]" />
    </Link>
  );
}
