import { Suspense } from "react";
import { SearchView } from "@/components/search/search-view";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  return (
    <Suspense>
      <SearchView initialCategory={category} />
    </Suspense>
  );
}
