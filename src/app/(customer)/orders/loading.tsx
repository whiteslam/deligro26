/**
 * Orders list skeleton — shown while `getOrdersPageData` resolves in
 * page.tsx. Sized to roughly match the real header + OrderCard rows.
 */
export default function OrdersLoading() {
  return (
    <div className="animate-pulse">
      <div className="px-4 pb-3 pt-5">
        <div className="h-7 w-32 rounded bg-surface-2" />
      </div>
      <div className="divide-y divide-line px-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3.5">
            <div className="size-12 shrink-0 rounded-xl bg-surface-2" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-surface-2" />
              <div className="h-3 w-1/3 rounded bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
