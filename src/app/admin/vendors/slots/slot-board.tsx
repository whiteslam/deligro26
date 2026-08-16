"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type {
  AssignableVendor,
  FeaturedSlot,
  SlotVendor,
} from "@/lib/data-access/vendor-positions";
import {
  assignVendorSlotAction,
  swapVendorSlotsAction,
  setVendorPositionAction,
} from "../actions";
import { SlotVendorPicker } from "./slot-vendor-picker";

/**
 * The ten featured slots, rank order, one row each.
 *
 * A slot is a place on the customer feed, so an empty one is still a row — the
 * operator's job here is "fill #3", and a list that only showed occupied slots
 * would hide the very thing they came to do.
 *
 * Every control is one server round-trip followed by router.refresh(): the
 * actions revalidate this page and the customer feed, so the board redraws from
 * the database rather than from optimistic local state that could disagree with
 * the eviction rule the server applies.
 */

const STATUS_PILL: Record<string, string> = {
  active: "pill pill-green",
  pending: "pill pill-pop",
  inactive: "pill pill-muted",
  suspended: "pill pill-deal",
};

export function SlotBoard({
  slots,
  vendors,
  disabled,
}: {
  slots: FeaturedSlot[];
  vendors: AssignableVendor[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    start(async () => {
      const res = await fn();
      if (!res.ok && res.error) window.alert(res.error);
      router.refresh();
    });
  };

  const busy = pending || Boolean(disabled);

  return (
    // No `overflow-hidden` despite the rounded corners: it would clip each
    // row's search panel. Nothing inside paints to the edge, so the corners
    // stay clean without it.
    <ul
      className={cn(
        "rounded-xl border border-line bg-surface transition-opacity",
        pending && "opacity-70"
      )}
    >
      {slots.map((slot, index) => {
        const [occupant, ...extras] = slot.vendors;
        return (
          <li
            key={slot.position}
            className="border-b border-[color:var(--c-divider)] last:border-b-0"
          >
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <RankBadge position={slot.position} filled={Boolean(occupant)} />

              {occupant ? (
                <Occupant vendor={occupant} />
              ) : (
                <p className="min-w-0 flex-1 text-[13px] text-muted">
                  Empty — the feed falls through to its default order here.
                </p>
              )}

              <div className="flex shrink-0 items-center gap-1.5">
                <SlotVendorPicker
                  position={slot.position}
                  currentId={occupant?.id ?? null}
                  currentName={occupant?.name ?? null}
                  vendors={vendors}
                  disabled={busy}
                  onPick={(vendorId) =>
                    run(() => assignVendorSlotAction(slot.position, vendorId))
                  }
                />

                <IconButton
                  label={`Move slot ${slot.position} up`}
                  disabled={busy || index === 0}
                  onClick={() =>
                    run(() =>
                      swapVendorSlotsAction(slot.position, slot.position - 1)
                    )
                  }
                >
                  <ArrowUp className="size-4" />
                </IconButton>

                <IconButton
                  label={`Move slot ${slot.position} down`}
                  disabled={busy || index === slots.length - 1}
                  onClick={() =>
                    run(() =>
                      swapVendorSlotsAction(slot.position, slot.position + 1)
                    )
                  }
                >
                  <ArrowDown className="size-4" />
                </IconButton>

                <IconButton
                  label={`Clear slot ${slot.position}`}
                  disabled={busy || !occupant}
                  onClick={() => run(() => assignVendorSlotAction(slot.position, null))}
                >
                  <X className="size-4" />
                </IconButton>
              </div>
            </div>

            {/* Legacy collisions: two shops on one slot, from before pinning
                became exclusive. Shown, not hidden, with a one-click unpin. */}
            {extras.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--c-divider)] px-4 py-2">
                <p className="text-[11.5px] font-semibold text-accent-ink">
                  Also pinned to #{slot.position}:
                </p>
                {extras.map((v) => (
                  <span
                    key={v.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11.5px]"
                  >
                    {v.name}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => setVendorPositionAction(v.id, null))}
                      className="press text-muted hover:text-ink disabled:opacity-50"
                      aria-label={`Unpin ${v.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function RankBadge({
  position,
  filled,
}: {
  position: number;
  filled: boolean;
}) {
  return (
    <span
      className={cn(
        "text-data grid size-9 shrink-0 place-items-center rounded-xl text-[13px] font-bold tabular-nums",
        filled
          ? "bg-accent text-[var(--on-accent)]"
          : "border border-dashed border-line text-muted"
      )}
    >
      {position}
    </span>
  );
}

function Occupant({ vendor }: { vendor: SlotVendor }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span
        className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-cover bg-center text-[13px] font-bold text-white"
        style={
          vendor.imageUrl
            ? { backgroundImage: `url(${vendor.imageUrl})` }
            : { background: vendor.accentTint ?? "var(--accent)" }
        }
      >
        {vendor.imageUrl ? "" : vendor.name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold">{vendor.name}</span>
          {vendor.status !== "active" ? (
            <span className={STATUS_PILL[vendor.status] ?? "pill pill-muted"}>
              {vendor.status}
            </span>
          ) : null}
        </span>
        <span className="block truncate text-[11.5px] text-muted">
          {vendor.category ?? "Uncategorised"} · /{vendor.slug}
        </span>
      </span>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="press grid size-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
