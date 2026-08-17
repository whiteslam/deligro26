import { notFound } from "next/navigation";
import { getBanner } from "@/lib/banners";
import { AdminHero } from "@/components/admin/admin-ui";
import { ConsoleOnly } from "@/components/admin/console-only";
import { BannerForm } from "../banner-form";

export const dynamic = "force-dynamic";

export default async function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const banner = await getBanner(id);
  if (!banner) notFound();

  return (
    <div className="admin-measure space-y-6">
      <AdminHero
        backHref="/admin/banners"
        backLabel="Campaigns"
        title={`Edit · ${banner.name}`}
        subtitle="Update creative, placement & status"
      />
      {/* Console-only, same as /admin/banners/new — this is the same 400-line
          creative form. The row actions on /admin/banners cover the phone case:
          pausing or ending a live campaign. */}
      <ConsoleOnly variant="page" tool="Editing a campaign">
        <BannerForm banner={banner} />
      </ConsoleOnly>
    </div>
  );
}
