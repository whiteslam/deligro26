import Link from "next/link";
import { ApproveRestaurantButton } from "@/components/admin/approve-restaurant-button";
import {
  GlassBadge,
  StorefrontCover,
} from "@/components/admin/vendor-storefront-card";
import type { VendorListItem } from "@/lib/data-access/admin-vendors";
import { formatWaited } from "@/lib/utils/format";

/**
 * Approval backlog as storefront cards — same cover language as the catalogue
 * and the vendor profile. Oldest first; wait time turns red after four days.
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(288px,1fr))] gap-3">
      {vendors.map((v) => {
        const overdue = isOverdue(v.createdAt);
        const waited = formatWaited(v.createdAt);

        return (
          <article
            key={v.id}
            className="vendor-profile-stat flex flex-col overflow-hidden rounded-[var(--radius-block)] border border-line bg-surface"
          >
            <StorefrontCover
              name={v.name}
              imageUrl={v.imageUrl}
              accentTint={v.accentTint}
              href={`/admin/vendors/${v.id}?tab=overview`}
              kicker={v.category ?? "Uncategorised"}
              subtitle={`/${v.slug}`}
              className="h-[148px]"
              badges={
                <>
                  <GlassBadge>Awaiting review</GlassBadge>
                  <GlassBadge className={overdue ? "bg-deal/80" : undefined}>
                    {waited}
                  </GlassBadge>
                </>
              }
            />

            <div className="flex flex-1 flex-col gap-3 p-3.5">
              <dl className="grid grid-cols-2 gap-3">
                <Meta label="Owner" value={v.ownerName ?? "—"} />
                <Meta label="Area" value={cityOf(v.address)} />
              </dl>

              <div className="mt-auto flex items-center gap-2">
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
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-label">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold">{value}</dd>
    </div>
  );
}

function cityOf(address: string | null): string {
  if (!address) return "—";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "—";
}
