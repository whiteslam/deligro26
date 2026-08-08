import { notFound } from "next/navigation";
import { getCategory } from "@/lib/data-access/vendor-categories";
import { AdminHero } from "@/components/admin/admin-ui";
import { CategoryForm } from "../category-form";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getCategory(id);
  if (!category) notFound();

  return (
    <div className="admin-measure space-y-4">
      <AdminHero
        backHref="/admin/vendors/categories"
        backLabel="Categories"
        title="Edit category"
        subtitle="Rename, re-slug or disable this category"
      />
      <CategoryForm category={category} />
    </div>
  );
}
