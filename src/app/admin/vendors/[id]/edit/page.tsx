import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getVendorDetail } from "@/lib/data-access/admin-vendors";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { VendorForm } from "./vendor-form";

export const dynamic = "force-dynamic";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [vendor, categories] = await Promise.all([
    getVendorDetail(id),
    listCategories(),
  ]);
  if (!vendor) notFound();

  return (
    <div className="space-y-4">
      <Link
        href={`/admin/vendors/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> {vendor.name}
      </Link>
      <h1 className="text-[22px] font-extrabold tracking-tight">Edit vendor</h1>
      <VendorForm vendor={vendor} categories={categories.map((c) => c.name)} />
    </div>
  );
}
