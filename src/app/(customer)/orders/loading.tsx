/**
 * Orders list skeleton — shown while `getOrdersPageData` resolves in
 * page.tsx. Sized to roughly match the real header, the live order card and
 * the history rows under it.
 */
export default function OrdersLoading() {
  return (
    <div className="animate-pulse px-4">
      <div className="pb-3 pt-5">
        <div className="h-7 w-32 rounded bg-surface-2" />
      </div>

      {/* The live card is the tall thing at the top; a flat row here would make
          the screen jump a card's height the moment it resolves. */}
      <div className="h-36 rounded-2xl border border-line bg-surface-2" />

      <div className="mt-5 flex gap-2">
        {[56, 88, 92].map((w) => (
          <div
            key={w}
            className="h-8 rounded-full bg-surface-2"
            style={{ width: w }}
          />
        ))}
      </div>

      <div className="mt-4 divide-y divide-line">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="size-12 shrink-0 rounded-xl bg-surface-2" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-surface-2" />
              <div className="h-3 w-1/2 rounded bg-surface-2" />
              <div className="h-3 w-1/3 rounded bg-surface-2" />
            </div>
            <div className="h-9 w-20 shrink-0 rounded-full bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
