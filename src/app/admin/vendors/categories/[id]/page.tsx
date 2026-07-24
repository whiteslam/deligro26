import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCategory } from "@/lib/data-access/vendor-categories";
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
    <div className="space-y-4">
      <Link
        href="/admin/vendors/categories"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Categories
      </Link>
      <h1 className="text-[22px] font-extrabold tracking-tight">Edit category</h1>
      <CategoryForm category={category} />
    </div>
  );
}
