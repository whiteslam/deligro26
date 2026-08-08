import { notFound } from "next/navigation";
import { getBanner } from "@/lib/banners";
import { AdminHero } from "@/components/admin/admin-ui";
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
      <BannerForm banner={banner} />
    </div>
  );
}
