/**
 * Home page skeleton — shown while the catalog/orders/banners/categories
 * `Promise.all` in page.tsx resolves, instead of a blank screen. Sized to
 * roughly match HomeView's actual shape (header, banner, category strip,
 * restaurant cards) so the swap-in doesn't jump.
 */
export default function HomeLoading() {
  return (
    <div className="animate-pulse space-y-5 px-4 pt-3">
      <div className="h-14 rounded-2xl bg-surface-2" />
      <div className="h-40 rounded-2xl bg-surface-2" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="size-16 shrink-0 rounded-2xl bg-surface-2" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-40 w-full rounded-2xl bg-surface-2" />
            <div className="h-4 w-2/3 rounded bg-surface-2" />
            <div className="h-3 w-1/3 rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
