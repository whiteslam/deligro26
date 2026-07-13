import { ProfileSubpage } from "@/components/profile/profile-subpage";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireUser();

  return (
    <ProfileSubpage title="Notifications">
      {/* These were three checkboxes with no handler and no persistence: toggling
          "Order updates" off did nothing, and the setting was gone on reload. Per-
          category preferences need somewhere to be stored; until they have it, the
          page says what is actually true. */}
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
        Push notifications are controlled by your browser permission — allow or
        block them in your device settings. Per-category preferences aren&rsquo;t
        available yet.
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
