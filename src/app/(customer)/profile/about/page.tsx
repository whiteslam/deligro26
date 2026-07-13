import { ProfileSubpage } from "@/components/profile/profile-subpage";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  await requireUser();

  return (
    <ProfileSubpage title="About Deligro">
      <div className="card space-y-4 p-5">
        <p className="text-[15px] leading-relaxed">
          Deligro brings your favourite local restaurants and stores to your
          doorstep — fast, warm, and reliably tracked from kitchen to door.
        </p>
        <div className="space-y-2 text-sm text-muted">
          <p>
            <span className="font-semibold text-ink">Version</span> 2.6.0
          </p>
          <p>
            <span className="font-semibold text-ink">Made for</span> Bemetara &
            nearby
          </p>
        </div>
      </div>
      <div className="mt-4 card divide-y divide-line text-sm">
        <a href="/profile/help" className="press block px-4 py-3.5 font-medium">
          Help & support
        </a>
        <a
          href="mailto:support@deligro.app"
          className="press block px-4 py-3.5 font-medium"
        >
          Contact us
        </a>
      </div>
    </ProfileSubpage>
  );
}
