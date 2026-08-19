import Link from "next/link";
import { MapPin, Phone, Sparkles, Star } from "lucide-react";
import { VendorPositionSelect } from "@/app/admin/vendors/vendor-position-select";
import { VendorRowActions } from "@/app/admin/vendors/vendor-row-actions";
import {
  storefrontGaps,
  storefrontScore,
  type VendorListItem,
  type VendorStatus,
} from "@/lib/data-access/admin-vendors";
import { cn } from "@/lib/utils/cn";

/**
 * One shop in the admin catalogue, read as a profile.
 *
 * The previous version of this card led with a 188px cover photo. On a real
 * database that is the wrong bet twice over: most shops have not uploaded one,
 * so a page of twelve cards was twelve identical accent gradients, and the
 * shops that HAD a photo turned the catalogue into a mood board you cannot scan
 * for the one fact an operator is actually after. A directory of a hundred
 * partners is not a feed.
 *
 * So the identity comes from an avatar the way a profile's does — the shop's
 * photo when there is one, its initials on its own accent tint when there is
 * not, which stays distinct per shop instead of collapsing into one colour.
 * Name, handle and rating sit beside it; the facts an admin phones a vendor
 * about sit under it; the controls stay at the bottom, outside the card's link.
 *
 * The completeness bar is the part that earns its place. This screen's real
 * question is not "who is on the platform" but "who is not finished yet", and
 * a listing with no photo or no address converts badly however approved it is.
 */

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "numeric",
});

const STATUS: Record<VendorStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "pill pill-green" },
  pending: { label: "Pending", className: "pill pill-pop" },
  suspended: { label: "Suspended", className: "pill pill-deal" },
  inactive: { label: "Inactive", className: "pill pill-muted" },
};

/** Up to two initials, skipping the words that are on half the signboards. */
function monogram(name: string): string {
  const SKIP = new Set(["the", "shri", "sri", "new", "hotel", "cafe", "restaurant"]);
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !SKIP.has(w.toLowerCase()));
  const use = words.length ? words : name.split(/\s+/).filter(Boolean);
  return use.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * The shop's face: its photo, or its initials on its own tint.
 *
 * `accentTint` is a per-vendor gradient class pair, so the fallback is still an
 * identity rather than a placeholder — twenty shops without photos read as
 * twenty different shops.
 */
export function VendorAvatar({
  name,
  imageUrl,
  accentTint,
  className,
}: {
  name: string;
  imageUrl: string | null;
  accentTint: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-2xl ring-1 ring-line",
        className ?? "size-14"
      )}
    >
      {imageUrl ? (
        // Vendor photos are arbitrary storage URLs and this renders at 56px —
        // there is nothing for the image pipeline to save here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="size-full object-cover" />
      ) : (
        <>
          <span
            className={cn(
              "absolute inset-0 bg-gradient-to-br",
              accentTint ||
                "from-[var(--accent)] to-[color-mix(in_srgb,var(--accent)_45%,var(--ink))]"
            )}
          />
          <span className="relative text-[15px] font-bold tracking-tight text-white">
            {monogram(name)}
          </span>
        </>
      )}
    </span>
  );
}

export function VendorProfileCard({ vendor: v }: { vendor: VendorListItem }) {
  const href = `/admin/vendors/${v.id}?tab=overview`;
  const status = STATUS[v.status];
  const gaps = storefrontGaps(v);
  const score = storefrontScore(v);
  const live = v.isOpen && v.status === "active";

  return (
    <article className="vendor-profile-stat flex w-full flex-col overflow-hidden rounded-[var(--radius-block)] border border-line bg-surface">
      {/* Identity. The whole block links through, so the target is a card-width
          row rather than a shop name a few characters wide. */}
      <Link href={href} className="press flex items-start gap-3 p-4 pb-3">
        <VendorAvatar
          name={v.name}
          imageUrl={v.imageUrl}
          accentTint={v.accentTint}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="truncate text-[15px] font-bold leading-tight tracking-tight">
              {v.name}
            </span>
            <span className={cn(status.className, "shrink-0")}>{status.label}</span>
          </span>

          <span className="mt-1 block truncate text-xs text-muted">
            /{v.slug}
            {v.category ? ` · ${v.category}` : ""}
          </span>

          <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px]">
            {v.ratingCount > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold">
                <Star className="size-3 fill-pop text-pop" />
                {v.rating.toFixed(1)}
                <span className="font-normal text-muted">({v.ratingCount})</span>
              </span>
            ) : (
              <span className="text-muted">Not rated yet</span>
            )}
            {live ? (
              <span className="inline-flex items-center gap-1 font-semibold text-green">
                <span className="c-dot bg-green" />
                Open now
              </span>
            ) : v.status === "active" ? (
              <span className="text-muted">Closed</span>
            ) : null}
            {v.sortPosition != null ? (
              <span className="inline-flex items-center gap-1 font-semibold text-accent-ink">
                <Sparkles className="size-3" />
                Slot {v.sortPosition}
              </span>
            ) : null}
          </span>
        </span>
      </Link>

      {/* The three facts an operator opens this screen holding a phone for. */}
      <dl className="grid grid-cols-3 gap-2 border-t border-line px-4 py-3">
        <Fact label="Owner" value={v.ownerName ?? "—"} />
        <Fact
          label="Commission"
          value={`${v.effectiveCommissionPct}%`}
          hint={v.inheritsPlatformRate ? "Platform rate" : "Own rate"}
        />
        <Fact label="Partner since" value={dateFmt.format(new Date(v.createdAt))} />
      </dl>

      <div className="space-y-2 px-4 pb-3 text-xs text-muted">
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
        {v.address ? (
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 size-3 shrink-0" />
            <span className="line-clamp-1">{v.address}</span>
          </p>
        ) : null}
      </div>

      {gaps.length > 0 ? (
        <div className="mx-4 mb-3 rounded-xl bg-surface-2 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-ink">Storefront {score}%</span>
            <span className="truncate text-muted">Missing {gaps.join(", ")}</span>
          </div>
          <div
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-line"
            role="img"
            aria-label={`Storefront ${score}% complete`}
          >
            <div
              className={cn(
                "h-full rounded-full",
                score >= 75 ? "bg-green" : score >= 50 ? "bg-pop" : "bg-deal"
              )}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5">
        <VendorPositionSelect id={v.id} position={v.sortPosition} />
        <VendorRowActions id={v.id} name={v.name} status={v.status} />
      </div>
    </article>
  );
}

function Fact({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-label">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-semibold">{value}</dd>
      {hint ? (
        <dd className="truncate text-[10.5px] text-muted">{hint}</dd>
      ) : null}
    </div>
  );
}
