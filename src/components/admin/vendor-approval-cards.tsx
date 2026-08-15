import Link from "next/link";
import { ApproveRestaurantButton } from "@/components/admin/approve-restaurant-button";
import type { VendorListItem } from "@/lib/data-access/admin-vendors";
import { formatWaited, initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * The approval backlog as decision cards — the redesign's answer to the clumsy
 * signup flow. Everything needed to say yes is on the card: who they are, what
 * they sell, where, and how long they have been waiting.
 *
 * Oldest first, and the waiting time turns red at four days, because the
 * failure mode of an approval queue is not rejecting the wrong shop — it is a
 * shop that signed up a week ago and has still heard nothing.
 *
 * "Review" opens the vendor record, where documents, bank details and the
 * destructive controls live. There is no reject button: `restaurants` models
 * approval as a boolean, so the only "no" it can express is deletion, and that
 * belongs behind the confirmation it already has, not on a grid tile.
 */

/** Days waiting after which the figure is called out in red. */
const OVERDUE_DAYS = 4;

/**
 * Module scope, not the component body: reading the clock during render is
 * impure, and this screen is a dynamic server render where "now" is genuinely
 * request time.
 */
function isOverdue(createdAt: string): boolean {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Number.isFinite(ms) && ms > OVERDUE_DAYS * 86_400_000;
}

export function VendorApprovalCards({
  vendors,
}: {
  vendors: VendorListItem[];
}) {
  if (!vendors.length) return null;

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(288px,1fr))] gap-3">
      {vendors.map((v) => {
        const overdue = isOverdue(v.createdAt);

        return (
          <article
            key={v.id}
            className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-[15px] py-3.5"
          >
            <div className="flex items-start gap-2.5">
              <span
                className="grid size-[34px] shrink-0 place-items-center overflow-hidden rounded-[9px] bg-accent-soft bg-cover bg-center text-[11px] font-bold text-accent-ink"
                style={
                  v.imageUrl ? { backgroundImage: `url(${v.imageUrl})` } : undefined
                }
              >
                {v.imageUrl ? "" : initials(v.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-ink">
                  {v.name}
                </span>
                <span className="text-data block truncate text-[11px] text-muted">
                  /{v.slug}
                </span>
              </span>
              <span className="pill pill-pop shrink-0">Awaiting review</span>
            </div>

            <dl className="grid grid-cols-3 gap-2">
              <Meta label="Category" value={v.category ?? "—"} />
              <Meta label="Area" value={cityOf(v.address)} />
              <Meta
                label="Waiting"
                value={formatWaited(v.createdAt)}
                mono
                className={overdue ? "text-deal" : undefined}
              />
            </dl>

            <div className="flex items-center gap-2">
              <span className="flex-1">
                <ApproveRestaurantButton
                  id={v.id}
                  name={v.name}
                  variant="compact"
                />
              </span>
              <Link
                href={`/admin/vendors/${v.id}?tab=overview`}
                className="c-btn c-btn-outline press"
              >
                Review
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Meta({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "truncate text-xs text-ink",
          mono && "text-data tabular-nums",
          className
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * The last comma-separated part of an address, which is the town in the format
 * the registration wizard collects. Not parsed further — guessing a city out of
 * free text is how "Shop 4" ends up rendered as a location.
 */
function cityOf(address: string | null): string {
  if (!address) return "—";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "—";
}
