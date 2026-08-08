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
import { DataTable, type Column } from "@/components/admin/data-table";
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

      <div className="grid grid-cols-2 gap-2.5 @3xl:grid-cols-4 @3xl:gap-4">
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

      <DataTable
        caption="Campaigns"
        columns={bannerColumns}
        rows={banners}
        rowKey={(b) => b.id}
        rowHref={(b) => `/admin/banners/${b.id}`}
        empty={
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
        }
      />
    </div>
  );
}

const bannerColumns: Column<Banner>[] = [
  {
    key: "headline",
    header: "Campaign",
    role: "title",
    cell: (b) => (
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl text-lg"
          style={{ background: b.tint }}
        >
          {b.glyph ?? "📢"}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{b.headline}</span>
            <span className="shrink-0 @3xl:hidden">
              <span className={STATUS_PILL[b.status]}>{b.status}</span>
            </span>
          </span>
          <span className="block truncate text-xs text-muted">
            {b.name}
            {b.kind === "sponsored" ? " · Sponsored" : ""}
          </span>
        </span>
      </div>
    ),
  },
  {
    key: "placements",
    header: "Placements",
    cell: (b) => (
      <span className="truncate text-[13px] text-muted">
        {b.placements.length ? b.placements.join(", ") : "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    role: "trailing",
    cell: (b) => (
      <span className="hidden @3xl:inline">
        <span className={STATUS_PILL[b.status]}>{b.status}</span>
      </span>
    ),
  },
  {
    key: "impressions",
    header: "Impressions",
    align: "right",
    cell: (b) => (
      <span className="text-data text-[13px]">
        {(b.analytics?.impressions ?? 0).toLocaleString("en-IN")}
      </span>
    ),
  },
  {
    key: "clicks",
    header: "Clicks",
    align: "right",
    cell: (b) => (
      <span className="text-data text-[13px]">{b.analytics?.clicks ?? 0}</span>
    ),
  },
  {
    key: "ctr",
    header: "CTR",
    align: "right",
    cell: (b) => (
      <span className="text-data text-[13px] font-semibold">
        {pct(b.analytics?.ctr ?? 0)}
      </span>
    ),
  },
  {
    key: "actions",
    header: "",
    role: "actions",
    align: "right",
    cell: (b) => <BannerRowActions id={b.id} status={b.status} />,
  },
];
