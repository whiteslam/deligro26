import Link from "next/link";
import {
  Store,
  Mail,
  Phone,
  Star,
  UtensilsCrossed,
  Package,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Pill } from "@/components/roles/role-ui";
import {
  VendorMetricCard,
  VendorPanel,
} from "@/components/vendor/vendor-ui";
import { formatINR } from "@/lib/utils/format";
import type { VendorProfileSummary } from "@/lib/data-access/vendor-profile";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium sm:text-right">{value}</span>
    </div>
  );
}

export function VendorProfileView({
  profile,
  live,
}: {
  profile: VendorProfileSummary;
  live: boolean;
}) {
  const r = profile.restaurant;
  const priceLabel = r ? "₹".repeat(Math.min(3, r.priceTier)) : "—";

  const maxStat = Math.max(
    profile.stats.menuItems,
    profile.stats.totalOrders,
    profile.stats.lifetimeRevenue / 100,
    1
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="vendor-profile-cover relative overflow-hidden rounded-[var(--radius-sheet)] p-5 text-white">
        <div className="relative flex items-end gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-white/30 bg-white/20 text-2xl font-bold backdrop-blur-sm">
            {profile.initials}
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-xl font-bold sm:text-2xl">
              {profile.ownerName}
            </h1>
            <p className="mt-0.5 text-sm text-white/80">Restaurant owner</p>
            <p className="mt-1 text-xs text-white/70">
              Member since {profile.memberSince}
              {profile.ownedRestaurants.length > 1
                ? ` · ${profile.ownedRestaurants.length} stores`
                : ""}
            </p>
          </div>
        </div>
      </div>

      {r ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <VendorMetricCard
              label="Menu items"
              value={String(profile.stats.menuItems)}
              icon="utensils"
              tone="accent"
              barPct={(profile.stats.menuItems / maxStat) * 100}
            />
            <VendorMetricCard
              label="In stock"
              value={String(profile.stats.menuAvailable)}
              icon="package"
              tone="green"
              barPct={
                profile.stats.menuItems > 0
                  ? (profile.stats.menuAvailable / profile.stats.menuItems) * 100
                  : 0
              }
            />
            <VendorMetricCard
              label="Total orders"
              value={String(profile.stats.totalOrders)}
              icon="shopping"
              tone="blue"
              barPct={(profile.stats.totalOrders / maxStat) * 100}
            />
            <VendorMetricCard
              label="Lifetime revenue"
              value={formatINR(profile.stats.lifetimeRevenue)}
              icon="rupee"
              tone="accent"
              barPct={72}
            />
          </div>

          <VendorPanel
            title="Store details"
            action={
              <Pill tone={r.isOpen ? "green" : "muted"}>
                {r.isOpen ? "Open" : "Closed"}
              </Pill>
            }
            accent={r.isOpen ? "green" : "muted"}
          >
            <div className="divide-y divide-line">
              <DetailRow label="Restaurant" value={r.name} />
              <DetailRow label="Slug" value={r.slug} />
              <DetailRow
                label="Status"
                value={r.approved ? "Approved" : "Pending approval"}
              />
              {r.tagline ? (
                <DetailRow label="Tagline" value={r.tagline} />
              ) : null}
              {r.cuisines.length > 0 ? (
                <DetailRow label="Cuisines" value={r.cuisines.join(", ")} />
              ) : null}
              <DetailRow
                label="Rating"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3.5 fill-accent text-accent" />
                    {r.rating.toFixed(1)} ({r.ratingCount})
                  </span>
                }
              />
              <DetailRow label="Price tier" value={priceLabel} />
              {r.costForTwo ? (
                <DetailRow
                  label="Cost for two"
                  value={formatINR(r.costForTwo)}
                />
              ) : null}
              {r.etaMin && r.etaMax ? (
                <DetailRow
                  label="Delivery ETA"
                  value={`${r.etaMin}–${r.etaMax} min`}
                />
              ) : null}
              {r.offer ? <DetailRow label="Offer" value={r.offer} /> : null}
            </div>
            {live ? (
              <Link
                href={`/restaurant/${r.slug}`}
                className="press mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm font-semibold"
              >
                <ExternalLink className="size-4" />
                View customer menu
              </Link>
            ) : null}
          </VendorPanel>
        </>
      ) : (
        <VendorPanel>
          <p className="text-sm text-muted">
            No restaurant is linked to this account yet.
          </p>
        </VendorPanel>
      )}

      <VendorPanel title="Account">
        <div className="divide-y divide-line">
          {profile.ownerEmail ? (
            <div className="flex items-center gap-3 py-3">
              <Mail className="size-4 shrink-0 text-muted" />
              <div className="min-w-0">
                <p className="text-label">Email</p>
                <p className="truncate text-sm font-medium">
                  {profile.ownerEmail}
                </p>
              </div>
            </div>
          ) : null}
          {profile.ownerPhone ? (
            <div className="flex items-center gap-3 py-3">
              <Phone className="size-4 shrink-0 text-muted" />
              <div>
                <p className="text-label">Phone</p>
                <a
                  href={`tel:${profile.ownerPhone.replace(/\s/g, "")}`}
                  className="text-data text-sm font-medium text-accent"
                >
                  {profile.ownerPhone}
                </a>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-3 py-3">
            <Store className="size-4 shrink-0 text-muted" />
            <div>
              <p className="text-label">Active orders</p>
              <p className="text-sm font-medium">
                {profile.stats.activeOrders} in kitchen pipeline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3">
            <Package className="size-4 shrink-0 text-muted" />
            <div>
              <p className="text-label">Delivered</p>
              <p className="text-sm font-medium">
                {profile.stats.deliveredOrders} orders completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3">
            <UtensilsCrossed className="size-4 shrink-0 text-muted" />
            <div>
              <p className="text-label">Menu</p>
              <p className="text-sm font-medium">
                {profile.stats.menuAvailable} of {profile.stats.menuItems} items
                in stock
              </p>
            </div>
          </div>
        </div>
      </VendorPanel>

      <p className="flex items-center justify-center gap-1.5 px-2 text-center text-xs text-muted">
        <ShieldCheck className="size-3.5 shrink-0" />
        Profile changes are managed by admin · contact support to update bank or
        legal details.
      </p>
    </div>
  );
}
