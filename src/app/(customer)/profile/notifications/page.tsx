import Link from "next/link";
import {
  BellRing,
  Check,
  ChefHat,
  Package,
  Bike,
  XCircle,
  Receipt,
} from "lucide-react";
import { ProfileSubpage } from "@/components/profile/profile-subpage";
import { PushOptIn } from "@/components/notifications/push-opt-in";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  listActivity,
  type ActivityEvent,
  type ActivityKind,
} from "@/lib/data-access/notifications-feed";
import { shortOrderId } from "@/lib/utils/order-map";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

/**
 * How each event reads, and what colour carries it. Worded in the past tense
 * throughout: this is a record of what happened, not a live status — the
 * tracking screen is where "where is it now" is answered.
 */
const LOOK: Record<
  ActivityKind,
  { icon: typeof Check; title: (shop: string) => string; tone: string }
> = {
  placed: {
    icon: Receipt,
    title: (s) => `Order sent to ${s}`,
    tone: "bg-surface-2 text-muted",
  },
  accepted: {
    icon: ChefHat,
    title: (s) => `${s} started cooking`,
    tone: "bg-accent/12 text-accent",
  },
  ready: {
    icon: Package,
    title: () => "Packed and waiting for a rider",
    tone: "bg-blue/12 text-blue",
  },
  on_the_way: {
    icon: Bike,
    title: () => "On the way to you",
    tone: "bg-accent/12 text-accent",
  },
  delivered: {
    icon: Check,
    title: () => "Delivered",
    tone: "bg-green/12 text-green",
  },
  cancelled: {
    icon: XCircle,
    title: () => "Order cancelled",
    tone: "bg-deal/12 text-deal",
  },
};

/** "3 min ago" / "Yesterday" / "12 Aug" — precise near, coarse far. */
function ago(iso: string): string {
  const then = new Date(iso);
  const mins = Math.round((Date.now() - then.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function NotificationsPage() {
  await requireUser();

  /*
   * A failed read must not render as "you have no notifications" — the same
   * rule the Orders tab follows. Null means we could not look; an empty array
   * means we looked and there was nothing.
   */
  let activity: ActivityEvent[] | null = [];
  if (isSupabaseConfigured) {
    activity = await listActivity().catch(() => null);
  }

  return (
    <ProfileSubpage title="Notifications">
      {/*
        The bell in the header points here, so this had to become what a bell
        means. It was a settings screen: a permission switch and two rows of
        text describing categories nobody could change. Tapping a bell and
        getting preferences is the app answering a question you did not ask.

        Nothing about a sent push is stored — it goes to OneSignal and is gone —
        so this is derived from the order lifecycle timestamps the database
        already keeps. See `notifications-feed.ts` for what that buys and what
        it costs.
      */}
      {activity === null ? (
        <p className="card mb-6 p-4 text-sm font-medium text-deal">
          We couldn&apos;t load your activity just now. This is a problem on our
          side — nothing is missing from your account.
        </p>
      ) : activity.length === 0 ? (
        <div className="card mb-6 flex flex-col items-center gap-2 px-4 py-8 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
            <BellRing className="size-6" />
          </span>
          <p className="text-[15px] font-bold">Nothing yet</p>
          <p className="max-w-[34ch] text-[13px] leading-snug text-muted">
            Updates about your orders — accepted, packed, on the way — will
            appear here as they happen.
          </p>
        </div>
      ) : (
        <ul className="card mb-6 divide-y divide-line">
          {activity.map((e) => {
            const look = LOOK[e.kind];
            const Icon = look.icon;
            return (
              <li key={e.id}>
                {/* Every entry goes back to the order it is about. A
                    notification you cannot act on is a notification that only
                    tells you something is wrong. */}
                <Link
                  href={`/orders/${e.orderId}`}
                  className="press flex items-start gap-3 p-4 text-left"
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl",
                      look.tone
                    )}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-semibold">
                        {look.title(e.restaurantName)}
                      </span>
                      <span className="shrink-0 text-[12px] text-muted">
                        {ago(e.at)}
                      </span>
                    </span>
                    <span className="text-data mt-0.5 block text-[11px] font-bold tracking-[0.1em] text-muted">
                      {shortOrderId(e.orderId)}
                    </span>
                    {e.detail ? (
                      <span className="mt-1 block text-[13px] leading-snug text-muted">
                        &ldquo;{e.detail}&rdquo;
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
        Settings
      </h2>

      {/* The permission control, above the list it governs. Renders nothing at
          all when push is not configured for this deployment, so a build with no
          OneSignal credentials still shows an honest page rather than a switch
          wired to nothing. */}
      <div className="card mb-4">
        <PushOptIn />
      </div>

      {/* These were three checkboxes with no handler and no persistence:
          toggling "Order updates" off did nothing, and the setting was gone on
          reload. Per-category preferences need somewhere to be stored; until
          they have it, the page says what is actually true. */}
      <div className="card divide-y divide-line">
        <NotifyRow
          title="Order updates"
          description="Status changes, rider on the way, and delivery alerts."
        />
        <NotifyRow
          title="Account & security"
          description="Sign-in activity and important account notices."
        />
      </div>
      <p className="mt-4 text-xs text-muted">
        These two categories are always sent together — per-category preferences
        aren&rsquo;t available yet. Turning notifications off in your browser or
        device settings stops both.
      </p>
    </ProfileSubpage>
  );
}

function NotifyRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{description}</span>
      </span>
    </div>
  );
}
