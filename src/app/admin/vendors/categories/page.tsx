import Link from "next/link";
import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { AdminHero, EmptyState } from "@/components/admin/admin-ui";
import { CategoryRowActions } from "./category-row-actions";

export const dynamic = "force-dynamic";

export default async function VendorCategoriesPage() {
  // includeDisabled: admins manage the full taxonomy, enabled or not.
  const categories = await listCategories(true);

  return (
    <div className="space-y-5">
      <AdminHero
        backHref="/admin/vendors"
        backLabel="Vendors"
        title="Categories"
        subtitle="Vendor category taxonomy"
        action={
          <Link href="/admin/vendors/categories/new">
            <Button size="sm">
              <Plus className="size-4" /> Add
            </Button>
          </Link>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Add categories like Restaurant, Café or Grocery."
          action={
            <Link href="/admin/vendors/categories/new">
              <Button size="sm">
                <Plus className="size-4" /> Add category
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <Tags className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate font-semibold">{c.name}</p>
                  {!c.enabled ? (
                    <span className="pill pill-muted">disabled</span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted">
                  {c.description || `/${c.slug}`}
                </p>
              </div>
              <CategoryRowActions id={c.id} name={c.name} enabled={c.enabled} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
