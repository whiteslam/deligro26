import Link from "next/link";
import { ArrowLeft, Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { CategoryRowActions } from "./category-row-actions";

export const dynamic = "force-dynamic";

export default async function VendorCategoriesPage() {
  // includeDisabled: admins manage the full taxonomy, enabled or not.
  const categories = await listCategories(true);

  return (
    <div className="space-y-4">
      <Link
        href="/admin/vendors"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Vendors
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight">Categories</h1>
          <p className="mt-0.5 text-sm text-muted">Vendor category taxonomy</p>
        </div>
        <Link href="/admin/vendors/categories/new" className="shrink-0">
          <Button size="sm">
            <Plus className="size-4" /> Add
          </Button>
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-10 text-center">
          <Tags className="size-8 text-muted" />
          <p className="font-semibold">No categories yet</p>
          <p className="text-sm text-muted">
            Add categories like Restaurant, Café or Grocery.
          </p>
          <Link href="/admin/vendors/categories/new">
            <Button size="sm">
              <Plus className="size-4" /> Add category
            </Button>
          </Link>
        </div>
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
