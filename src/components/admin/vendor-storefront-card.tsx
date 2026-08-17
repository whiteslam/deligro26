import Link from "next/link";
import { Phone, Sparkles, Store } from "lucide-react";
import { LivePulse } from "@/components/vendor/vendor-ui";
import { VendorPositionSelect } from "@/app/admin/vendors/vendor-position-select";
import { VendorRowActions } from "@/app/admin/vendors/vendor-row-actions";
import type { VendorListItem } from "@/lib/data-access/admin-vendors";
import { cn } from "@/lib/utils/cn";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * The cover treatment borrowed from the vendor profile: photo (or accent
 * gradient), dark veil, glass badges, display name. Shared by the catalogue
 * card and the approval queue so both read as storefronts, not rows.
 */
export function StorefrontCover({
  name,
  imageUrl,
  accentTint,
  href,
  kicker,
  subtitle,
  badges,
  className,
}: {
  name: string;
  imageUrl: string | null;
  accentTint: string | null;
  href?: string;
  kicker?: string;
  subtitle?: string;
  badges?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        className ?? "h-[168px] @3xl:h-[188px]"
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            accentTint ||
              "from-[var(--accent)] to-[color-mix(in_srgb,var(--accent)_45%,var(--ink))]"
          )}
        />
      )}
      <div className="vendor-profile-hero-veil absolute inset-0" />
      <div className="relative flex h-full flex-col justify-between p-3.5">
        {badges ? (
          <div className="flex flex-wrap items-center gap-1.5">{badges}</div>
        ) : (
          <span />
        )}
        <div className="min-w-0">
          {kicker ? (
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
              {kicker}
            </p>
          ) : null}
          <h3 className="mt-0.5 truncate text-xl font-bold leading-[1.1] tracking-tight text-white">
            {name}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-white/75">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!href) return body;
  return (
    <Link href={href} className="press block">
      {body}
    </Link>
  );
}

export function GlassBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * One shop in the admin catalogue, laid out the way a partner sees their
 * storefront: cover first, facts second, controls last. The cover navigates
 * to the record; actions sit outside that link so they are not nested.
 */
export function VendorStorefrontCard({ vendor: v }: { vendor: VendorListItem }) {
  const featured = v.sortPosition != null;
  const href = `/admin/vendors/${v.id}?tab=overview`;

  return (
    <article className="vendor-profile-stat flex flex-col overflow-hidden rounded-[var(--radius-block)] border border-line bg-surface">
      <StorefrontCover
        name={v.name}
        imageUrl={v.imageUrl}
        accentTint={v.accentTint}
        href={href}
        kicker={v.category ?? "Uncategorised"}
        subtitle={`/${v.slug}`}
        badges={
          <>
            {v.isOpen && v.status === "active" ? (
              <GlassBadge>
                <LivePulse className="scale-75" />
                Open
              </GlassBadge>
            ) : null}
            {v.status === "pending" ? (
              <GlassBadge>Pending</GlassBadge>
            ) : null}
            {v.status === "suspended" ? (
              <GlassBadge>Suspended</GlassBadge>
            ) : null}
            {v.status === "inactive" ? (
              <GlassBadge>Inactive</GlassBadge>
            ) : null}
            {featured ? (
              <GlassBadge>
                <Sparkles className="size-3" />
                Slot {v.sortPosition}
              </GlassBadge>
            ) : null}
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <dl className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <dt className="text-label">Owner</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold">
              {v.ownerName ?? "—"}
            </dd>
            {v.ownerMobile ? (
              <dd className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                <Phone className="size-3 shrink-0" />
                {v.ownerMobile}
              </dd>
            ) : null}
          </div>
          <div className="min-w-0 text-right">
            <dt className="text-label">Commission</dt>
            <dd className="text-data mt-0.5 text-sm font-bold">
              {v.effectiveCommissionPct}%
            </dd>
            <dd className="mt-0.5 text-xs text-muted">
              {dateFmt.format(new Date(v.createdAt))}
            </dd>
          </div>
        </dl>

        {v.address ? (
          <p className="flex items-start gap-1.5 text-xs text-muted">
            <Store className="mt-0.5 size-3 shrink-0" />
            <span className="line-clamp-2">{v.address}</span>
          </p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <VendorPositionSelect id={v.id} position={v.sortPosition} />
          <div className="-mx-1 max-w-full overflow-x-auto">
            <VendorRowActions id={v.id} name={v.name} status={v.status} />
          </div>
        </div>
      </div>
    </article>
  );
}
