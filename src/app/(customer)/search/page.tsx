import { Suspense } from "react";
import { SearchView } from "@/components/search/search-view";
import { listRestaurants } from "@/lib/catalog";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category }, restaurants] = await Promise.all([
    searchParams,
    listRestaurants(),
  ]);

  return (
    <Suspense>
      <SearchView initialCategory={category} restaurants={restaurants} />
    </Suspense>
  );
}
