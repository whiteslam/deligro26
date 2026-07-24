"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { fieldCls } from "@/components/ui/field";
import { VENDOR_STATUSES } from "@/lib/vendor-status";

const STATUS_LABEL: Record<string, string> = {
  all: "All statuses",
  pending: "Pending",
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
};

const SORTS: { value: string; label: string }[] = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "status", label: "Status" },
];

/**
 * Search / filter / sort for the vendor list. Everything lives in the URL, so
 * the server component reads `searchParams` and the state survives refresh and
 * the browser back button. The text box is debounced; the selects apply at once.
 */
export function VendorSearchBar({ categories }: { categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const firstRun = useRef(true);

  const push = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") sp.delete(key);
      else sp.set(key, value);
    }
    start(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }));
  };

  // Debounce the text box; skip the initial mount so a fresh load doesn't push.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const id = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) push({ q: q || null, page: null });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const status = params.get("status") ?? "all";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "recent";

  return (
    <div className={pending ? "space-y-2.5 opacity-70 transition-opacity" : "space-y-2.5"}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shop, owner or mobile…"
          className={`${fieldCls} pl-10 pr-10`}
          aria-label="Search vendors"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            className="press absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <select
          value={status}
          onChange={(e) =>
            push({ status: e.target.value === "all" ? null : e.target.value, page: null })
          }
          className={`${fieldCls} px-2.5 text-sm`}
          aria-label="Filter by status"
        >
          {["all", ...VENDOR_STATUSES].map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => push({ category: e.target.value || null, page: null })}
          className={`${fieldCls} px-2.5 text-sm`}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => push({ sort: e.target.value })}
          className={`${fieldCls} px-2.5 text-sm`}
          aria-label="Sort vendors"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
