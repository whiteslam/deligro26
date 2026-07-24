"use client";

import { useState } from "react";
import { ChevronDown, Clock, Store } from "lucide-react";
import { Pill } from "@/components/roles/role-ui";
import { ApproveRestaurantButton } from "@/components/admin/approve-restaurant-button";
import { formatDateTime } from "@/lib/utils/relative-time";
import type { PendingRestaurant } from "@/lib/data-access/admin-stats";

/** How many approvals show before "See more" reveals the rest. */
const PREVIEW = 4;

/**
 * The approval queue on the Orders page. Only the first few show up front so
 * the list never buries the orders below it; "See more" expands the rest.
 */
export function PendingApprovals({ pending }: { pending: PendingRestaurant[] }) {
  const [expanded, setExpanded] = useState(false);

  if (pending.length === 0) return null;

  const visible = expanded ? pending : pending.slice(0, PREVIEW);
  const hidden = pending.length - visible.length;

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-label">Pending approvals</h2>
        <Pill tone="accent">{pending.length}</Pill>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {visible.map((r, i) => (
          <div
            key={r.id}
            className={
              "flex items-center gap-3 px-4 py-3.5" +
              (i > 0 ? " border-t border-line" : "")
            }
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <Store className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{r.name}</p>
              <p className="truncate text-xs text-muted">/{r.slug}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <Clock className="size-3" />
                {formatDateTime(r.createdAt)}
              </p>
            </div>
            <ApproveRestaurantButton id={r.id} name={r.name} />
          </div>
        ))}

        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="press flex w-full items-center justify-center gap-1 border-t border-line px-4 py-3 text-sm font-semibold text-accent"
          >
            See {hidden} more
            <ChevronDown className="size-4" />
          </button>
        ) : null}
      </div>
    </section>
  );
}
