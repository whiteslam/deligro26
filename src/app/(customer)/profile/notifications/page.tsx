import { ProfileSubpage } from "@/components/profile/profile-subpage";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireUser();

  return (
    <ProfileSubpage title="Notifications">
      <div className="card divide-y divide-line">
        <NotifyRow
          title="Order updates"
          description="Status changes, rider on the way, and delivery alerts."
          defaultOn
        />
        <NotifyRow
          title="Offers & promos"
          description="Coupons and deals from restaurants near you."
          defaultOn
        />
        <NotifyRow
          title="Account & security"
          description="Sign-in activity and important account notices."
        />
      </div>
      <p className="mt-4 text-xs text-muted">
        Push notifications use your browser permission. You can change this anytime
        in your device settings.
      </p>
    </ProfileSubpage>
  );
}

function NotifyRow({
  title,
  description,
  defaultOn,
}: {
  title: string;
  description: string;
  defaultOn?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 p-4">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        defaultChecked={defaultOn}
        className="mt-1 size-5 accent-[var(--accent)]"
      />
    </label>
  );
}
