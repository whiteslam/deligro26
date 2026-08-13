import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * The console's list primitive: one column definition, two layouts.
 *
 * A wide container gets a real `<table>` — scannable columns, aligned numbers,
 * a sticky header. A narrow one gets stacked cards. Crucially the switch is a
 * *container* query, not a viewport one: the phone-frame preview is a 390px
 * column on a 1920px screen, so a `md:` breakpoint would call it wide and serve
 * a table nobody can read.
 *
 * Both layouts are rendered and one is hidden. That costs a second element tree
 * per row, which is the price of defining each cell once; these are operator
 * lists of tens-to-hundreds of rows, not a feed.
 *
 * Sorting is by URL, not by state. This renders on the server so a column's
 * `cell` closure can return anything (including client components); handing
 * that to a `"use client"` table would mean serialising functions across the
 * RSC boundary, which is not a thing. Pages sort in their own query instead.
 */

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /**
   * How this column behaves in the narrow card layout:
   * - `title`    the card's headline (one per table)
   * - `trailing` top-right of the card, e.g. an amount or a status
   * - `meta`     a labelled line in the card body (default)
   * - `actions`  pinned to the card's footer
   * - `wideOnly` dropped entirely — detail the card has no room for
   */
  role?: "title" | "trailing" | "meta" | "actions" | "wideOnly";
  align?: "left" | "right";
  /** Column width for the table layout, e.g. "w-[160px]". */
  width?: string;
  /** Set when this column can be sorted; combines with `sortHref`. */
  sortKey?: string;
}

export interface TableSort {
  key: string;
  dir: "asc" | "desc";
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  sort,
  sortHref,
  empty,
  caption,
  footer,
  minWidth = 840,
  rowTone,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Makes the whole row navigate. Cells with their own links still win. */
  rowHref?: (row: T) => string | null;
  sort?: TableSort;
  /** Given a column's sortKey, the href that applies it. Omit to disable sorting. */
  sortHref?: (key: string, dir: "asc" | "desc") => string;
  empty?: React.ReactNode;
  caption?: string;
  /** Sunken bar inside the card's bottom edge — counts and pagination. */
  footer?: React.ReactNode;
  /**
   * The width below which the table scrolls sideways instead of squashing.
   * Real minimums, not `minmax(0,1fr)`: columns that can collapse to zero next
   * to fixed ones overprint their text rather than scrolling.
   */
  minWidth?: number;
  /** Flags a row as needing attention — tinted, e.g. an order past its promise. */
  rowTone?: (row: T) => "alert" | null;
}) {
  if (!rows.length) return <>{empty ?? null}</>;

  const title = columns.find((c) => c.role === "title") ?? columns[0];
  const trailing = columns.filter((c) => c.role === "trailing");
  const actions = columns.filter((c) => c.role === "actions");
  const meta = columns.filter(
    (c) => c !== title && !["trailing", "actions", "wideOnly"].includes(c.role ?? "")
  );

  return (
    <>
      {/* ---------- wide: table ---------- */}
      <div className="hidden overflow-hidden rounded-xl border border-line bg-surface @3xl:block">
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse text-left text-sm"
            style={{ minWidth }}
          >
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <thead>
              <tr className="border-b border-[color:var(--c-divider)] bg-surface-2">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted",
                      col.align === "right" && "text-right",
                      col.width
                    )}
                  >
                    {col.sortKey && sortHref ? (
                      <SortHeader
                        label={col.header}
                        sortKey={col.sortKey}
                        sort={sort}
                        sortHref={sortHref}
                        align={col.align}
                      />
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const href = rowHref?.(row) ?? null;
                const alert = rowTone?.(row) === "alert";
                return (
                  <tr
                    key={rowKey(row)}
                    className={cn(
                      "c-rowin group border-b border-[color:var(--c-divider-2)] transition-colors last:border-b-0 hover:bg-[var(--c-hover)]",
                      // A tint, not a border or an icon: it has to survive being
                      // one row among forty and still be visible at a glance.
                      alert && "bg-deal/[0.035]"
                    )}
                  >
                    {columns.map((col, i) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-2.5 align-middle",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {/* Only the first cell carries the row link. A stretched
                            overlay across the <tr> would swallow the row's own
                            buttons — and `position: relative` on a table row is
                            not dependable enough to build navigation on. */}
                        {href && i === 0 ? (
                          <Link href={href} className="press block">
                            {col.cell(row)}
                          </Link>
                        ) : (
                          col.cell(row)
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {footer ? (
          <div className="border-t border-[color:var(--c-divider)] bg-surface-2 px-4 py-[11px]">
            {footer}
          </div>
        ) : null}
      </div>

      {/* ---------- narrow: cards ---------- */}
      <ul className="space-y-2.5 @3xl:hidden">
        {rows.map((row) => {
          const href = rowHref?.(row) ?? null;
          const head = (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">{title.cell(row)}</div>
              {trailing.length ? (
                <div className="shrink-0 text-right">
                  {trailing.map((col) => (
                    <div key={col.key}>{col.cell(row)}</div>
                  ))}
                </div>
              ) : null}
            </div>
          );

          return (
            <li
              key={rowKey(row)}
              className={cn(
                "c-rowin rounded-2xl border border-line bg-surface p-3.5 transition-shadow hover:shadow-[var(--shadow-md)]",
                rowTone?.(row) === "alert" && "border-deal/30 bg-deal/[0.035]"
              )}
            >
              {href ? (
                <Link href={href} className="press block">
                  {head}
                </Link>
              ) : (
                head
              )}

              {meta.length ? (
                <dl className="mt-2.5 space-y-1 border-t border-line pt-2.5">
                  {meta.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {col.header}
                      </dt>
                      <dd className="min-w-0 truncate text-right text-[13px]">
                        {col.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {actions.length ? (
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-line pt-3">
                  {actions.map((col) => (
                    <div key={col.key}>{col.cell(row)}</div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
        {footer ? <li className="pt-1">{footer}</li> : null}
      </ul>
    </>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  sortHref,
  align,
}: {
  label: string;
  sortKey: string;
  sort?: TableSort;
  sortHref: (key: string, dir: "asc" | "desc") => string;
  align?: "left" | "right";
}) {
  const active = sort?.key === sortKey;
  // Clicking the active column flips it; a fresh column starts ascending.
  const next: "asc" | "desc" = active && sort?.dir === "asc" ? "desc" : "asc";
  const Icon = !active ? ChevronsUpDown : sort?.dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <Link
      href={sortHref(sortKey, next)}
      className={cn(
        "press inline-flex items-center gap-1 rounded transition-colors hover:text-ink",
        active && "text-ink",
        align === "right" && "flex-row-reverse"
      )}
      aria-label={`Sort by ${label}, ${next}ending`}
    >
      {label}
      <Icon className="size-3" />
    </Link>
  );
}

/**
 * The table card's footer bar: what you are looking at on the left, paging on
 * the right. Pass it to DataTable's `footer` so it sits inside the card's
 * bottom edge rather than floating under it.
 *
 * Renders even at one page, because the count is the useful half — "42 orders"
 * is the answer to a question an operator actually has.
 */
export function TableFooter({
  page,
  totalPages,
  hrefFor,
  summary,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  summary: string;
}) {
  const base =
    "press rounded-[7px] border border-line bg-surface px-2.5 py-1 text-xs font-semibold transition-colors hover:border-[var(--c-border-hover)]";

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-2"
      aria-label="Pagination"
    >
      <span className="text-xs text-muted">
        {summary}
        {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
      </span>
      {totalPages > 1 ? (
        <span className="flex items-center gap-1.5">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className={base}>
              Previous
            </Link>
          ) : (
            <span className={cn(base, "pointer-events-none opacity-40")}>
              Previous
            </span>
          )}
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} className={base}>
              Next
            </Link>
          ) : (
            <span className={cn(base, "pointer-events-none opacity-40")}>
              Next
            </span>
          )}
        </span>
      ) : null}
    </nav>
  );
}
