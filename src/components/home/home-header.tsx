"use client";

import Link from "next/link";
import {
  Bell,
  ChevronDown,
  LoaderCircle,
  MapPin,
  Navigation,
  Search,
  User,
  X,
} from "lucide-react";
import { useLocation } from "@/stores/location-store";
import { useScrollCollapse } from "@/hooks/use-scroll-collapse";
import { cn } from "@/lib/utils/cn";

/** The user's saved default address, resolved server-side and passed in. */
export interface SavedAddress {
  label: string;
  line: string;
}

/**
 * Sticky header for the feed screens: where we deliver, and what you're looking
 * for.
 *
 * Scrolling into the feed collapses the whole top row — address, notifications
 * and profile — leaving just the search field. The row is the only thing that
 * moves; see use-scroll-collapse for the hysteresis that stops the height it
 * gives back from bouncing the header (an earlier version of this flickered
 * exactly that way).
 */
export function HomeHeader({
  savedAddress,
  query = "",
  onQueryChange,
}: {
  savedAddress?: SavedAddress | null;
  query?: string;
  onQueryChange?: (value: string) => void;
}) {
  const status = useLocation((s) => s.status);
  const label = useLocation((s) => s.label);
  const sublabel = useLocation((s) => s.sublabel);

  const collapsed = useScrollCollapse();

  const detecting = status === "loading";
  const detected = status === "granted" && !!label;

  // The store always holds a location — it starts at Bemetara, the city we
  // deliver in, and a detected fix or a saved address replaces it. So the
  // header shows a real place from the first paint instead of "Set your
  // location", and it always names the same place the distances are measured
  // from. A saved address still wins over the city default.
  const place = detected ? { label, sublabel } : null;
  const saved = savedAddress
    ? {
        label: savedAddress.label,
        sublabel: savedAddress.line.split(",").slice(-2).join(",").trim(),
      }
    : null;
  const fallback = label ? { label, sublabel } : null;

  const shown = place ?? saved ?? fallback;
  const primary = shown?.label ?? "Set your location";
  const secondary = shown?.sublabel ?? "Tap to detect";

  return (
    <div className="app-header sticky top-0 z-20 px-4 pb-3 pt-2.5">
      {/* `inert` as well as the CSS pointer-events: a collapsed row is gone as
          far as tapping and the tab order are concerned, not just invisible. */}
      <div
        className={cn("collapsible", collapsed && "is-collapsed")}
        inert={collapsed}
      >
        {/* The clipping child carries no padding of its own — padding lives on
            the row inside it. A grid item's padding is added outside the height
            the 0fr row gives it, so any here would survive the collapse as a
            stubborn sliver of empty space. */}
        <div>
          <div className="flex items-center gap-2 pb-3">
            {/* Goes to the picker, not the permission sheet — re-asking for a
                permission the device has already answered does nothing. */}
            <Link
              href="/location"
              className="press flex min-w-0 flex-1 items-center gap-2 text-left"
              aria-label="Change delivery location"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
                {detecting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : detected ? (
                  <Navigation className="size-4" />
                ) : (
                  <MapPin className="size-4" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                  {detecting ? "Locating…" : "Deliver to"}
                </span>
                <span className="flex min-w-0 items-center gap-1 text-[15px] font-extrabold leading-tight tracking-tight">
                  <span className="min-w-0 truncate">{primary}</span>
                  {secondary ? (
                    <span className="truncate font-semibold text-muted">
                      · {secondary}
                    </span>
                  ) : null}
                  <ChevronDown className="size-4 shrink-0 text-muted" />
                </span>
              </span>
            </Link>

            <Link
              href="/profile/notifications"
              aria-label="Notifications"
              className="press grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink"
            >
              <Bell className="size-[18px]" />
            </Link>
            <Link
              href="/profile"
              aria-label="Profile"
              className="press grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink"
            >
              <User className="size-[18px]" />
            </Link>
          </div>
        </div>
      </div>

      <div className="bolt-search w-full">
        <Search className="size-5 shrink-0" strokeWidth={2.25} />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange?.(e.target.value)}
          placeholder="Search for restaurants or dishes"
          aria-label="Search for restaurants or dishes"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange?.("")}
            aria-label="Clear search"
            className="press grid size-6 shrink-0 place-items-center rounded-full bg-surface text-muted"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
