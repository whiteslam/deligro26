"use client";

import { useState } from "react";
import { ChevronDown, Clock, Store } from "lucide-react";
import { ApproveRestaurantButton } from "@/components/admin/approve-restaurant-button";
import { Panel } from "@/components/admin/admin-ui";
import { formatDateTime } from "@/lib/utils/relative-time";
import type { PendingRestaurant } from "@/lib/data-access/admin-stats";

/** How many approvals show before "See more" reveals the rest. */
const PREVIEW = 4;

/**
 * The approval queue on the Orders page. Only the first few show up front so
 * the list never buries the orders below it; "See more" expands the rest.
 * Shares the dashboard's panel + avatar-chip styling.
 */
export function PendingApprovals({ pending }: { pending: PendingRestaurant[] }) {
  const [expanded, setExpanded] = useState(false);

  if (pending.length === 0) return null;

  const visible = expanded ? pending : pending.slice(0, PREVIEW);
  const hidden = pending.length - visible.length;

  return (
    <Panel
      title="Pending approvals"
      subtitle="Restaurants waiting to go live"
      action={<span className="pill pill-accent">{pending.length}</span>}
    >
      <ul className="divide-y divide-line">
        {visible.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
              <Store className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.name}</p>
              <p className="truncate text-xs text-muted">/{r.slug}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <Clock className="size-3" />
                {formatDateTime(r.createdAt)}
              </p>
            </div>
            <ApproveRestaurantButton id={r.id} name={r.name} />
          </li>
        ))}
      </ul>

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="press mt-1 flex w-full items-center justify-center gap-1 border-t border-line pt-3 text-sm font-semibold text-accent-ink"
        >
          See {hidden} more
          <ChevronDown className="size-4" />
        </button>
      ) : null}
    </Panel>
  );
}
