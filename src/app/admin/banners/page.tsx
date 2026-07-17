import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/roles/role-ui";
import { listAllBanners, bannersBackendReady } from "@/lib/banners";
import type { Banner, BannerStatus } from "@/types";
import { BannerRowActions } from "./banner-row-actions";

/**
 * Campaign manager. Every promotional banner in the app is a row here — the
 * mobile app renders whatever this list marks live, so this is the single place
 * promos are turned on, scheduled, prioritised, and measured.
 */
export const dynamic = "force-dynamic";

const STATUS_PILL: Record<BannerStatus, string> = {
  active: "pill pill-green",
  paused: "pill pill-pop",
  draft: "pill pill-muted",
  archived: "pill pill-muted",
};

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading">Campaigns</h1>
          <p className="text-sm text-muted">
            Promotional banners & sponsored ads across the app
          </p>
        </div>
        <Link href="/admin/banners/new">
          <Button size="sm">
            <Plus className="size-4" /> New campaign
          </Button>
        </Link>
      </div>

      {!backendReady ? (
        <p className="rounded-xl border border-pop/40 bg-pop/10 px-3.5 py-3 text-sm font-medium text-ink">
          Preview mode — these are the built-in sample campaigns. Apply migration{" "}
          <code className="rounded bg-surface-2 px-1">0014_banners.sql</code> to
          your database to create, edit, and persist your own. The customer app
          shows these samples until then.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Live now" value={String(live.length)} tone="green" />
        <StatCard
          label="Impressions"
          value={totals.impressions.toLocaleString("en-IN")}
          tone="accent"
        />
        <StatCard label="Avg CTR" value={pct(ctr)} />
        <StatCard label="Orders driven" value={String(totals.orders)} />
      </div>

      {banners.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Megaphone className="size-8 text-muted" />
          <p className="font-semibold">No campaigns yet</p>
          <p className="max-w-sm text-sm text-muted">
            Create your first banner — grocery, pharmacy, a festival offer, or a
            paid sponsored slot — and it appears in the app instantly.
          </p>
          <Link href="/admin/banners/new">
            <Button size="sm">
              <Plus className="size-4" /> New campaign
            </Button>
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {banners.map((b) => (
            <BannerRow key={b.id} banner={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BannerRow({ banner: b }: { banner: Banner }) {
  const a = b.analytics;
  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <div
        className="hidden size-12 shrink-0 place-items-center rounded-xl text-xl sm:grid"
        style={{ background: b.tint }}
      >
        {b.glyph ?? "📢"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold">{b.headline}</p>
          <span className={STATUS_PILL[b.status]}>{b.status}</span>
          {b.kind === "sponsored" ? (
            <span className="pill pill-accent">Sponsored</span>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted">
          {b.name} · {b.placements.join(", ") || "no placement"} · priority{" "}
          {b.priority}
        </p>
      </div>

      <div className="hidden text-right text-xs text-muted md:block">
        <p className="font-semibold text-ink">
          {(a?.impressions ?? 0).toLocaleString("en-IN")}
        </p>
        <p>impressions</p>
      </div>
      <div className="hidden text-right text-xs text-muted md:block">
        <p className="font-semibold text-ink">{pct(a?.ctr ?? 0)}</p>
        <p>CTR · {a?.clicks ?? 0} clicks</p>
      </div>

      <BannerRowActions id={b.id} status={b.status} />
    </div>
  );
}
