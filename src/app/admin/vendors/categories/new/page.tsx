import { AdminHero } from "@/components/admin/admin-ui";
import { CategoryForm } from "../category-form";

export const dynamic = "force-dynamic";

export default function NewCategoryPage() {
  return (
    <div className="admin-measure space-y-4">
      <AdminHero
        backHref="/admin/vendors/categories"
        backLabel="Categories"
        title="New category"
        subtitle="Add a vendor category like Restaurant, Café or Grocery"
      />
      <CategoryForm />
    </div>
  );
}
