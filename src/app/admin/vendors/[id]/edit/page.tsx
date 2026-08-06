import { notFound } from "next/navigation";
import { getVendorDetail } from "@/lib/data-access/admin-vendors";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { AdminHero } from "@/components/admin/admin-ui";
import { VendorForm } from "./vendor-form";
import { VendorCredentials } from "./vendor-credentials";

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
      <AdminHero
        backHref={`/admin/vendors/${id}`}
        backLabel={vendor.name}
        title="Edit vendor"
        subtitle="Update shop details, credentials & status"
      />
      <VendorCredentials
        id={vendor.id}
        passwordResetAt={vendor.passwordResetAt}
        ownerMobile={vendor.ownerMobile}
        ownerPhoneVerified={vendor.ownerPhoneVerified}
      />
      <VendorForm vendor={vendor} categories={categories.map((c) => c.name)} />
    </div>
  );
}
