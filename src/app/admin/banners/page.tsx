import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { listAllBanners, bannersBackendReady } from "@/lib/banners";
import type { Banner, BannerStatus } from "@/types";
import {
  AdminHero,
  EmptyState,
  PreviewNotice,
} from "@/components/admin/admin-ui";
import { StatTile, StatTiles } from "@/components/admin/console-ui";
import { BannerRowActions } from "./banner-row-actions";

/**
 * Admin → Campaigns. Every banner and sponsored slot, as performance cards.
 *
 * The design's budget bar, reach, redemptions and ROI are not here: banners in
 * this product carry no budget, no coupon link and no spend, so there is
 * nothing to divide or draw a progress track against. What the platform does
 * record — impressions, clicks, click-through and attributed orders — is what
 * the four figures show. A budget bar filled from a number nobody set is a
 * chart of an assumption.
 */
export const dynamic = "force-dynamic";

const STATUS_PILL: Record<BannerStatus, string> = {
  active: "pill pill-green",
  paused: "pill pill-pop",
  draft: "pill pill-muted",
  archived: "pill pill-muted",
};

const STATUS_LABEL: Record<BannerStatus, string> = {
  active: "Running",
  paused: "Paused",
  draft: "Draft",
  archived: "Ended",
};

const nf = new Intl.NumberFormat("en-IN");

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

/** "12 Aug – 30 Aug", "from 12 Aug", "until 30 Aug", or open-ended. */
function window_(b: Banner): string {
  const from = b.startsAt ? dateFmt.format(new Date(b.startsAt)) : null;
  const to = b.endsAt ? dateFmt.format(new Date(b.endsAt)) : null;
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "No end date";
}

export default async function AdminBannersPage() {
  const [banners, backendReady] = await Promise.all([
    listAllBanners(),
    bannersBackendReady(),
  ]);

  const live = banners.filter((b) => b.status === "active");
  const totals = banners.reduce(
    (acc, b) => {
      acc.impressions += b.analytics?.impressions ?? 0;
      acc.clicks += b.analytics?.clicks ?? 0;
      acc.orders += b.analytics?.orders ?? 0;
      return acc;
    },
    { impressions: 0, clicks: 0, orders: 0 }
  );
  const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

  return (
    <>
      <AdminHero
        title="Campaigns"
        tag={live.length > 0 ? `${live.length} running` : "None running"}
        subtitle="Banners and sponsored slots across the customer app"
        action={
          <Link href="/admin/banners/new" className="c-btn c-btn-dark press">
            <Plus className="size-3.5" strokeWidth={2.4} /> New campaign
          </Link>
        }
      />

      {!backendReady ? (
        <PreviewNotice>
          Preview mode — apply{" "}
          <code className="rounded bg-surface-2 px-1 text-xs">
            0014_banners.sql
          </code>{" "}
          to persist campaigns.
        </PreviewNotice>
      ) : null}

      {banners.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create a banner and it shows in the customer app."
          action={
            <Link href="/admin/banners/new" className="c-btn c-btn-dark press">
              <Plus className="size-3.5" strokeWidth={2.4} /> New campaign
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3.5">
            {banners.map((b) => (
              <CampaignCard key={b.id} banner={b} />
            ))}
          </div>

          <StatTiles>
            <StatTile
              label="Running now"
              value={live.length}
              note={`Of ${banners.length} campaign${banners.length === 1 ? "" : "s"}`}
            />
            <StatTile
              label="Impressions"
              value={nf.format(totals.impressions)}
              note="Times a banner was shown"
            />
            <StatTile
              label="Click-through"
              value={pct(ctr)}
              note={`${nf.format(totals.clicks)} clicks`}
            />
            <StatTile
              label="Attributed orders"
              value={nf.format(totals.orders)}
              note="Orders that followed a click"
            />
          </StatTiles>
        </>
      )}
    </>
  );
}

function CampaignCard({ banner: b }: { banner: Banner }) {
  const a = b.analytics;
  return (
    <article className="flex flex-col gap-3.5 rounded-xl border border-line bg-surface px-[17px] py-4">
      <div className="flex items-start gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-[9px] text-lg"
          style={{ background: b.tint }}
        >
          {b.glyph ?? "📢"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-[-0.01em]">
              {b.headline}
            </h2>
            <span className={`${STATUS_PILL[b.status]} shrink-0`}>
              {STATUS_LABEL[b.status]}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            {b.name}
            {b.kind === "sponsored"
              ? ` · Sponsored${b.sponsorName ? ` · ${b.sponsorName}` : ""}`
              : ""}
            {" · "}
            {window_(b)}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-4 gap-2">
        <Figure label="Shown" value={nf.format(a?.impressions ?? 0)} />
        <Figure label="Clicks" value={nf.format(a?.clicks ?? 0)} />
        <Figure label="CTR" value={pct(a?.ctr ?? 0)} />
        <Figure label="Orders" value={nf.format(a?.orders ?? 0)} />
      </dl>

      <div className="flex items-center justify-between gap-2 border-t border-[color:var(--c-divider)] pt-3">
        <p className="min-w-0 truncate text-[11.5px] text-muted">
          {b.placements.length
            ? b.placements.join(", ")
            : "Not placed anywhere yet"}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/admin/banners/${b.id}`} className="c-btn-affirm press">
            Edit
          </Link>
          <BannerRowActions id={b.id} status={b.status} />
        </div>
      </div>
    </article>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dd className="truncate text-base font-bold leading-none tabular-nums text-ink">
        {value}
      </dd>
      <dt className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
        {label}
      </dt>
    </div>
  );
}
