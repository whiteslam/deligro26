"use client";

import Link from "next/link";
import { ChevronDown, LoaderCircle, MapPin, Navigation, Search } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useLocation } from "@/stores/location-store";
import { ADDRESSES } from "@/lib/data";

export function HomeHeader() {
  const addr = ADDRESSES.find((a) => a.isDefault) ?? ADDRESSES[0];

  const status = useLocation((s) => s.status);
  const label = useLocation((s) => s.label);
  const sublabel = useLocation((s) => s.sublabel);
  const openAsk = useLocation((s) => s.openAsk);
  const detect = useLocation((s) => s.detect);

  const detecting = status === "loading";
  const detected = status === "granted" && !!label;

  // Prefer a live fix; otherwise fall back to the saved default address.
  const primary = detected ? label! : addr.label;
  const secondary = detected
    ? sublabel ?? "Current location"
    : addr.line.split(",").slice(-2).join(",").trim();

  // Tapping opens the explainer first (native OS prompt only on Enable),
  // unless the user already denied — then retry detection directly.
  const onTap = () => {
    if (status === "denied" || status === "unsupported") detect();
    else openAsk();
  };

  return (
    <div className="glass sticky top-0 z-20 px-4 pb-3 pt-4">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onTap}
          className="press flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-label="Change delivery location"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            {detecting ? (
              <LoaderCircle className="size-[18px] animate-spin" />
            ) : detected ? (
              <Navigation className="size-[18px]" />
            ) : (
              <MapPin className="size-[18px]" />
            )}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-label !normal-case !tracking-normal !text-[11px]">
              {detecting ? "Locating you…" : "Deliver to"}
            </span>
            <span className="flex min-w-0 items-center gap-1 text-[15px] font-bold leading-tight">
              <span className="min-w-0 truncate">
                {primary}
                {secondary ? (
                  <span className="font-medium text-muted"> · {secondary}</span>
                ) : null}
              </span>
              <ChevronDown className="size-4 shrink-0" />
            </span>
          </span>
        </button>
        <ThemeToggle className="shrink-0" />
      </div>

      <Link
        href="/search"
        className="press mt-3 flex h-12 items-center gap-3 rounded-2xl border border-line bg-surface px-4 text-muted"
      >
        <Search className="size-5" />
        <span className="text-[15px]">Search dishes, restaurants…</span>
      </Link>
    </div>
  );
}
