import { AdminHero } from "@/components/admin/admin-ui";
import { ConsoleOnly } from "@/components/admin/console-only";
import { BannerForm } from "../banner-form";

export const dynamic = "force-dynamic";

export default function NewBannerPage() {
  return (
    <div className="admin-measure space-y-6">
      <AdminHero
        backHref="/admin/banners"
        backLabel="Campaigns"
        title="New campaign"
        subtitle="Design a banner or sponsored ad for the customer app"
      />
      {/* Console-only: creative authoring — tint and glyph pickers, placements,
          a schedule and a live preview of the banner as the app will draw it.
          Pausing a live campaign is a phone job and stays on /admin/banners. */}
      <ConsoleOnly variant="page" tool="Designing a campaign">
        <BannerForm />
      </ConsoleOnly>
    </div>
  );
}
