import { Suspense } from "react";
import { SearchView } from "@/components/search/search-view";
import { listRestaurants } from "@/lib/catalog";
import { dailyRotationSeed } from "@/lib/search/rotation";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const [{ category, q }, restaurants] = await Promise.all([
    searchParams,
    listRestaurants(),
  ]);

  return (
    <Suspense>
      <SearchView
        initialCategory={category}
        initialQuery={q}
        restaurants={restaurants}
        rotationSeed={dailyRotationSeed()}
      />
    </Suspense>
  );
}
