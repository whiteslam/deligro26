import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getBanner } from "@/lib/banners";
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
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/banners"
          className="press inline-flex items-center gap-1 text-sm font-semibold text-muted"
        >
          <ChevronLeft className="size-4" /> Campaigns
        </Link>
        <h1 className="text-heading mt-1">Edit · {banner.name}</h1>
      </div>
      <BannerForm banner={banner} />
    </div>
  );
}
