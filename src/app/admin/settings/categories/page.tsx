import { AdminHero, PreviewNotice } from "@/components/admin/admin-ui";
import { getHomeCategories } from "@/lib/categories";
import {
  categoryImagesReady,
  getCategoryImageOverrides,
} from "@/lib/data-access/category-images";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CategoriesForm } from "./categories-form";

/**
 * The pictures on the Home cuisine strip.
 *
 * Each category ships with a curated stock photograph of the dish family. This
 * page is how those get replaced with photographs of the real product from real
 * shops — the tiles are the first thing a customer sees, and a stock plate of
 * biryani is a stand-in, not the goal.
 *
 * Not console-only, unlike Platform configuration. Swapping a picture is
 * low-blast-radius and is exactly the sort of thing someone does from a phone
 * while standing in the shop that just sent them the photo.
 */
export const dynamic = "force-dynamic";

export default async function CategoryPicturesPage() {
  const [categories, ready, overrides] = await Promise.all([
    getHomeCategories(),
    isSupabaseConfigured ? categoryImagesReady() : Promise.resolve(false),
    isSupabaseConfigured
      ? getCategoryImageOverrides().catch(() => new Map<string, string>())
      : Promise.resolve(new Map<string, string>()),
  ]);

  return (
    <>
      <AdminHero
        backHref="/admin/settings"
        backLabel="Settings"
        title="Category pictures"
        subtitle="The tiles on the customer home screen. Replace any with a photo of the real thing."
      />

      {!ready ? (
        <PreviewNotice>
          Showing the default pictures. Apply migration{" "}
          <code className="rounded bg-surface-2 px-1">
            0037_category_images.sql
          </code>{" "}
          to your database to save replacements. Until then the app runs on
          these defaults, which is a working strip — nothing is broken.
        </PreviewNotice>
      ) : null}

      <p className="admin-measure mb-4 text-sm text-muted">
        Pictures must be <strong>https</strong> and hosted on{" "}
        <code className="rounded bg-surface-2 px-1">images.unsplash.com</code> or
        your Supabase storage — the app&apos;s content-security policy blocks
        every other host, so a URL from anywhere else would save and then render
        blank. To use your own photo, upload it to Supabase storage and paste the
        public URL.
      </p>

      <div className="admin-measure">
        <CategoriesForm
          categories={categories}
          overridden={[...overrides.keys()]}
        />
      </div>
    </>
  );
}
