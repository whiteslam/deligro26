import Link from "next/link";
import {
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { AdminHero } from "@/components/admin/admin-ui";
import { settingsBackendReady } from "@/lib/settings";
import { getMfaStatus } from "@/lib/data-access/mfa";

/**
 * Settings home = a menu, not a form. Each row is a tap target that routes to
 * the screen that owns it (platform config, the ops shortcuts, security). The
 * actual editing lives on the sub-pages so this stays a clean settings tab.
 */
export const dynamic = "force-dynamic";

// Only surface actions that don't already have a bottom-nav tab. Vendors,
// Orders and Campaigns live on the tab bar, so they're intentionally omitted
// here to avoid duplicating those tabs inside Settings.
const MANAGE = [
  {
    href: "/admin/settings/employees",
    icon: Users,
    label: "Team & staff",
    desc: "Create manager & driver logins",
    tone: "green" as const,
  },
  {
    href: "/admin/refunds",
    icon: RotateCcw,
    label: "Refunds",
    desc: "Review & issue refunds",
    tone: "deal" as const,
  },
];

/** Toned icon chips, matching the dashboard cards and the bottom nav. */
const ICON_TONE = {
  accent: "bg-accent/12 text-accent",
  green: "bg-green/12 text-green",
  blue: "bg-blue/12 text-blue",
  deal: "bg-deal/12 text-deal",
  violet: "bg-violet-500/15 text-violet-500",
} as const;

type IconTone = keyof typeof ICON_TONE;

export default async function AdminSettingsPage() {
  const [backendReady, mfa] = await Promise.all([
    settingsBackendReady(),
    getMfaStatus(),
  ]);

  return (
    <div className="admin-measure space-y-6">
      <AdminHero
        title="Settings"
        subtitle="Platform configuration — fees, support, availability & ops"
      />

      <Group label="Configuration">
        <Row
          href="/admin/settings/platform"
          icon={SlidersHorizontal}
          label="Platform configuration"
          desc="Fees, tax, support, availability & rider payout"
          tone="blue"
          badge={backendReady ? undefined : "Preview"}
          badgeTone="deal"
        />
      </Group>

      <Group label="Manage">
        {MANAGE.map((s) => (
          <Row key={s.href} {...s} />
        ))}
      </Group>

      <Group label="Account">
        <Row
          href="/admin/settings/security"
          icon={ShieldCheck}
          label="Security"
          desc="Two-factor authentication"
          tone="violet"
          badge={mfa ? (mfa.enrolled ? "On" : "Off") : undefined}
          badgeTone={mfa?.enrolled ? "green" : "muted"}
        />
      </Group>
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-label mb-2">{label}</h2>
      {/* A divided list in the phone frame; separate cards in the console,
          where a full-width row with one chevron at the far right reads as an
          empty shelf rather than a menu. */}
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface @3xl:grid @3xl:grid-cols-2 @3xl:gap-4 @3xl:divide-y-0 @3xl:rounded-none @3xl:border-0 @3xl:bg-transparent">
        {children}
      </div>
    </section>
  );
}

function Row({
  href,
  icon: Icon,
  label,
  desc,
  tone = "accent",
  badge,
  badgeTone = "muted",
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc?: string;
  tone?: IconTone;
  badge?: string;
  badgeTone?: "green" | "muted" | "deal";
}) {
  return (
    <Link
      href={href}
      className="press flex items-center gap-3 px-4 py-3.5 @3xl:rounded-2xl @3xl:border @3xl:border-line @3xl:bg-surface @3xl:transition-shadow @3xl:hover:shadow-[var(--shadow-md)]"
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-xl ${ICON_TONE[tone]}`}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        {desc ? (
          <span className="block truncate text-xs text-muted">{desc}</span>
        ) : null}
      </span>
      {badge ? <span className={`pill pill-${badgeTone}`}>{badge}</span> : null}
      <ChevronRight className="size-4 shrink-0 text-muted" />
    </Link>
  );
}
