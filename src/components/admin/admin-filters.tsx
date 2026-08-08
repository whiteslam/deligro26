import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Filter controls for the console's list screens.
 *
 * Both are plain server-rendered elements — a GET form and a row of links —
 * rather than client components holding state. The filter *is* the URL here:
 * a filtered list has to survive a reload, be shareable with the colleague you
 * are on the phone to, and re-query on the server. State in a `"use client"`
 * component would give up all three.
 */

/** Hidden inputs that carry the rest of the query through a search submit. */
function Carried({ params }: { params: Record<string, string | undefined> }) {
  return (
    <>
      {Object.entries(params).map(([key, value]) =>
        value ? (
          <input key={key} type="hidden" name={key} value={value} />
        ) : null
      )}
    </>
  );
}

export function SearchForm({
  action,
  defaultValue,
  placeholder,
  carry = {},
  name = "q",
}: {
  action: string;
  defaultValue?: string;
  placeholder: string;
  /** Other active filters, preserved when the search is submitted. */
  carry?: Record<string, string | undefined>;
  name?: string;
}) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className="flex min-w-0 flex-1 items-center gap-2"
    >
      <Carried params={carry} />
      <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3">
        <Search className="size-4 shrink-0 text-muted" />
        <input
          type="search"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
      </div>
      <button
        type="submit"
        className="press h-10 shrink-0 rounded-xl bg-ink px-4 text-[13px] font-bold text-bg"
      >
        Search
      </button>
    </form>
  );
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/** A row of mutually-exclusive filter chips. `null` value = "All". */
export function FilterChips({
  options,
  active,
  hrefFor,
  label,
}: {
  options: FilterOption[];
  active: string | null;
  hrefFor: (value: string | null) => string;
  label: string;
}) {
  return (
    <div
      className="no-scrollbar flex items-center gap-2 overflow-x-auto"
      role="group"
      aria-label={label}
    >
      <Chip href={hrefFor(null)} on={active === null}>
        All
      </Chip>
      {options.map((o) => (
        <Chip key={o.value} href={hrefFor(o.value)} on={active === o.value}>
          {o.label}
          {typeof o.count === "number" ? (
            <span className="text-data ml-1.5 opacity-70">{o.count}</span>
          ) : null}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  href,
  on,
  children,
}: {
  href: string;
  on: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={on ? "true" : undefined}
      className={cn(
        "press inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
        on
          ? "border-ink bg-ink text-bg"
          : "border-line bg-surface text-muted hover:text-ink"
      )}
    >
      {children}
    </Link>
  );
}

/** "Showing X of Y · clear filters" summary line above a filtered table. */
export function FilterSummary({
  shown,
  total,
  noun,
  clearHref,
  filtered,
}: {
  shown: number;
  total: number;
  noun: string;
  clearHref: string;
  filtered: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted">
        {shown === total
          ? `${total} ${noun}${total === 1 ? "" : "s"}`
          : `${shown} of ${total} ${noun}${total === 1 ? "" : "s"}`}
      </p>
      {filtered ? (
        <Link
          href={clearHref}
          className="press inline-flex items-center gap-1 text-xs font-semibold text-accent-ink"
        >
          <X className="size-3.5" />
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}
