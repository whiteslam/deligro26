/**
 * Search page skeleton — shown while the catalog read in page.tsx resolves.
 * Sized to roughly match SearchView's shape: search bar, tab pill, the two
 * control buttons, dish rows. It used to draw four chip placeholders for a row
 * of chips that no longer exists, which made the screen jump when it resolved.
 */
export default function SearchLoading() {
  return (
    <div className="animate-pulse px-4 pt-3">
      <div className="h-12 rounded-full bg-surface-2" />
      <div className="mt-2.5 h-9 rounded-full bg-surface-2" />
      <div className="mt-3 flex gap-2">
        <div className="h-9 w-24 rounded-full bg-surface-2" />
        <div className="h-9 w-32 rounded-full bg-surface-2" />
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
