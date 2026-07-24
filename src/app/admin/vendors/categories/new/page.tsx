import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CategoryForm } from "../category-form";

export const dynamic = "force-dynamic";

export default function NewCategoryPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/admin/vendors/categories"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Categories
      </Link>
      <h1 className="text-[22px] font-extrabold tracking-tight">New category</h1>
      <CategoryForm />
    </div>
  );
}
