/**
 * Search page skeleton — shown while the catalog read in page.tsx resolves.
 * Sized to roughly match SearchView's shape (search bar, tab pill, filter
 * chips, dish rows).
 */
export default function SearchLoading() {
  return (
    <div className="animate-pulse px-4 pt-3">
      <div className="h-12 rounded-full bg-surface-2" />
      <div className="mt-2.5 h-9 rounded-full bg-surface-2" />
      <div className="mt-3 flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-surface-2" />
        ))}
      </div>
      <div className="mt-4 divide-y divide-line">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 py-3.5">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-surface-2" />
              <div className="h-3 w-1/3 rounded bg-surface-2" />
            </div>
            <div className="size-24 shrink-0 rounded-lg bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
