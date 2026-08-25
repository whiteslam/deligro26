import { redirect } from "next/navigation";

/** Old URL — Storage is the page now. Keep the query so a search still lands. */
export default async function FoodImagesRedirect({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  redirect(query ? `/admin/storage?q=${encodeURIComponent(query)}` : "/admin/storage");
}
