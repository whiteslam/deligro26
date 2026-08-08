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
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface @3xl:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <thead>
              <tr className="border-b border-line bg-surface-2/60">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-[0.06em] text-muted",
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
            <tbody className="divide-y divide-line">
              {rows.map((row) => {
                const href = rowHref?.(row) ?? null;
                return (
                  <tr
                    key={rowKey(row)}
                    className="group transition-colors hover:bg-surface-2/50"
                  >
                    {columns.map((col, i) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 align-middle",
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
              className="rounded-2xl border border-line bg-surface p-3.5 transition-shadow hover:shadow-[var(--shadow-md)]"
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

/** Prev / page-of / next, for server-paginated tables. */
export function TablePager({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const base =
    "press rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-surface-2";

  return (
    <nav
      className="flex items-center justify-between gap-3 pt-1"
      aria-label="Pagination"
    >
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={base}>
          Previous
        </Link>
      ) : (
        <span className={cn(base, "pointer-events-none opacity-40")}>
          Previous
        </span>
      )}
      <span className="text-xs text-muted">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={base}>
          Next
        </Link>
      ) : (
        <span className={cn(base, "pointer-events-none opacity-40")}>Next</span>
      )}
    </nav>
  );
}
