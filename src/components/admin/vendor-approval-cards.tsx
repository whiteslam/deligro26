import Link from "next/link";
import { Clock, MapPin, Phone } from "lucide-react";
import { ApproveRestaurantButton } from "@/components/admin/approve-restaurant-button";
import { RejectVendorButton } from "@/components/admin/reject-vendor-button";
import { VendorAvatar } from "@/components/admin/vendor-profile-card";
import {
  storefrontGaps,
  type VendorListItem,
} from "@/lib/data-access/admin-vendors";
import { formatWaited } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * The approval backlog, in the same profile language as the catalogue below it.
 *
 * Narrower than a catalogue card on purpose: the decision here is yes, no, or
 * open it, and the only facts that inform it are who signed up, how long ago, and
 * whether the storefront is finished enough to put in front of customers. What
 * is missing is stated rather than implied — approving a shop with no photo and
 * no address publishes an empty listing, and the queue is the last point where
 * that is cheap to fix.
 */

const OVERDUE_DAYS = 4;

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
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-3">
      {vendors.map((v) => {
        const overdue = isOverdue(v.createdAt);
        const gaps = storefrontGaps(v);

        return (
          <li
            key={v.id}
            className={cn(
              "vendor-profile-stat flex flex-col gap-3 rounded-[var(--radius-block)] border bg-surface p-3.5",
              overdue ? "border-deal/40" : "border-line"
            )}
          >
            <div className="flex items-start gap-3">
              <VendorAvatar
                name={v.name}
                imageUrl={v.imageUrl}
                accentTint={v.accentTint}
                className="size-11"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/vendors/${v.id}?tab=overview`}
                  className="block truncate text-[14.5px] font-bold leading-tight tracking-tight hover:text-accent-ink"
                >
                  {v.name}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {v.ownerName ?? "Owner not named"}
                  {v.category ? ` · ${v.category}` : ""}
                </p>
                <p
                  className={cn(
                    "mt-1 inline-flex items-center gap-1 text-[11px] font-semibold",
                    overdue ? "text-deal" : "text-muted"
                  )}
                >
                  <Clock className="size-3" />
                  Waiting {formatWaited(v.createdAt)}
                </p>
              </div>
            </div>

            <div className="space-y-1 text-[11.5px] text-muted">
              {v.ownerMobile ? (
                <p className="flex items-center gap-1.5">
                  <Phone className="size-3 shrink-0" />
                  <a
                    href={`tel:${v.ownerMobile}`}
                    className="truncate font-medium text-ink hover:text-accent-ink"
                  >
                    {v.ownerMobile}
                  </a>
                </p>
              ) : null}
              <p className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 size-3 shrink-0" />
                <span className="line-clamp-1">
                  {v.address ?? "No address given"}
                </span>
              </p>
            </div>

            {gaps.length > 0 ? (
              <p className="rounded-lg bg-pop/10 px-2.5 py-1.5 text-[11px] font-medium text-pop-ink">
                Goes live without a {gaps.join(", ")}
              </p>
            ) : null}

            {/* Both verbs, then the way out of deciding today. Wraps rather
                than shrinks: a truncated destructive button is a misclick. */}
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <ApproveRestaurantButton
                id={v.id}
                name={v.name}
                variant="compact"
              />
              <RejectVendorButton id={v.id} name={v.name} />
              <Link
                href={`/admin/vendors/${v.id}?tab=overview`}
                className="c-btn-quiet press ml-auto"
              >
                Review
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
