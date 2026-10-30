/**
 * Order tracking skeleton — shown while `getOrderForTracking` and the ETA read
 * resolve in page.tsx.
 *
 * Without its own file this route inherited `orders/loading.tsx`, so opening a
 * live order flashed the *orders list* (a history of rows and filter chips)
 * before the map and sheet replaced it. Shaped like the real screen instead:
 * the header, the map, and the sheet over it with the ETA headline, the
 * progress steps and the courier card.
 */
export default function OrderTrackingLoading() {
  return (
    <div className="owns-bottom flex h-full animate-pulse flex-col">
      <div className="flex shrink-0 items-center gap-3 px-4 py-3">
        <div className="size-11 shrink-0 rounded-full bg-surface-2" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-4 w-40 rounded bg-surface-2" />
          <div className="h-3 w-28 rounded bg-surface-2" />
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[45%] bg-surface-2" />

        <div className="absolute inset-x-0 bottom-0 top-[40%] rounded-t-[20px] bg-surface px-4 pt-3 shadow-[var(--shadow-lg)]">
          <div className="mx-auto h-1 w-10 rounded-full bg-line" />

          <div className="mt-5 flex flex-col items-center gap-2">
            <div className="h-3.5 w-36 rounded bg-surface-2" />
            <div className="h-8 w-28 rounded-lg bg-surface-2" />
            <div className="h-3 w-48 rounded bg-surface-2" />
          </div>

          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-6 shrink-0 rounded-full bg-surface-2" />
                <div className="h-3.5 w-1/2 rounded bg-surface-2" />
              </div>
            ))}
          </div>

          <div className="mt-6 h-24 rounded-2xl border border-line bg-surface-2" />
        </div>
      </div>
    </div>
  );
}
