import Link from "next/link";
import {
  Eye,
  Megaphone,
  MousePointerClick,
  Plus,
  Radio,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { listAllBanners, bannersBackendReady } from "@/lib/banners";
import type { Banner, BannerStatus } from "@/types";
import {
  AdminHero,
  EmptyState,
  PreviewNotice,
  StatCard,
} from "@/components/admin/admin-ui";
import { BannerRowActions } from "./banner-row-actions";

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
    <div className="space-y-5">
      <AdminHero
        title="Campaigns"
        subtitle="Banners &amp; sponsored ads"
        action={
          <Link href="/admin/banners/new">
            <Button size="sm">
              <Plus className="size-4" /> New
            </Button>
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

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          icon={<Radio className="size-4" />}
          tone="green"
          label="Live"
          value={live.length}
        />
        <StatCard
          icon={<Eye className="size-4" />}
          tone="blue"
          label="Impressions"
          value={totals.impressions.toLocaleString("en-IN")}
        />
        <StatCard
          icon={<MousePointerClick className="size-4" />}
          tone="accent"
          label="Avg CTR"
          value={pct(ctr)}
        />
        <StatCard
          icon={<ReceiptText className="size-4" />}
          tone="muted"
          label="Orders"
          value={totals.orders}
        />
      </div>

      {banners.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create a banner and it shows in the customer app."
          action={
            <Link href="/admin/banners/new">
              <Button size="sm">
                <Plus className="size-4" /> New campaign
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {banners.map((b) => (
            <BannerCard key={b.id} banner={b} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BannerCard({ banner: b }: { banner: Banner }) {
  const a = b.analytics;
  return (
    <li className="rounded-2xl border border-line bg-surface p-3.5 transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="flex gap-3">
        <div
          className="grid size-11 shrink-0 place-items-center rounded-xl text-lg"
          style={{ background: b.tint }}
        >
          {b.glyph ?? "📢"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-semibold">{b.headline}</p>
            <span className={STATUS_PILL[b.status]}>{b.status}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            {b.name}
            {b.kind === "sponsored" ? " · Sponsored" : ""}
          </p>
          <p className="mt-2 text-[11px] text-muted">
            {(a?.impressions ?? 0).toLocaleString("en-IN")} imp ·{" "}
            {pct(a?.ctr ?? 0)} CTR · {a?.clicks ?? 0} clicks
          </p>
        </div>
      </div>
      <div className="mt-3 border-t border-line pt-3">
        <BannerRowActions id={b.id} status={b.status} />
      </div>
    </li>
  );
}
