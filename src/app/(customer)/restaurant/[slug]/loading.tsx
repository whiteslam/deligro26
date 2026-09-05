/**
 * Restaurant page skeleton — shown while `getRestaurant` (etc.) resolve in
 * page.tsx. Sized to roughly match the real layout: hero photo, then a menu
 * item list.
 */
export default function RestaurantLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-[calc(13rem+var(--status-h))] w-full bg-surface-2" />
      <div className="space-y-4 px-4 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3.5 py-1.5">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-surface-2" />
              <div className="h-3 w-full rounded bg-surface-2" />
              <div className="h-3 w-1/4 rounded bg-surface-2" />
            </div>
            <div className="size-24 shrink-0 rounded-lg bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
