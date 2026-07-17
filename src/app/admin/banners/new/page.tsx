import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BannerForm } from "../banner-form";

export const dynamic = "force-dynamic";

export default function NewBannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/banners"
          className="press inline-flex items-center gap-1 text-sm font-semibold text-muted"
        >
          <ChevronLeft className="size-4" /> Campaigns
        </Link>
        <h1 className="text-heading mt-1">New campaign</h1>
      </div>
      <BannerForm />
    </div>
  );
}
