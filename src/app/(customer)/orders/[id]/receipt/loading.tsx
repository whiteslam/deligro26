/**
 * Receipt skeleton. Without its own file the receipt inherited the tracking
 * skeleton beside it (a map and a sheet) for what is a single printed card:
 * a title and order id, a few labelled facts, the item table and the totals.
 */
export default function ReceiptLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="size-11 shrink-0 rounded-full bg-surface-2" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-4 w-24 rounded bg-surface-2" />
          <div className="h-3 w-32 rounded bg-surface-2" />
        </div>
      </div>
      <div className="admin-measure mx-auto px-4 pb-8">
        <div className="card mt-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-surface-2" />
              <div className="h-6 w-28 rounded bg-surface-2" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="h-3.5 w-24 rounded bg-surface-2" />
              <div className="h-3 w-20 rounded bg-surface-2" />
            </div>
          </div>

          <div className="mt-4 space-y-2.5 border-t border-line pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between gap-4">
                <div className="h-3 w-20 rounded bg-surface-2" />
                <div className="h-3 w-32 rounded bg-surface-2" />
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between gap-4">
                <div className="h-3.5 w-1/2 rounded bg-surface-2" />
                <div className="h-3.5 w-14 rounded bg-surface-2" />
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t border-line pt-4">
            <div className="flex justify-between">
              <div className="h-3 w-16 rounded bg-surface-2" />
              <div className="h-3 w-12 rounded bg-surface-2" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-20 rounded bg-surface-2" />
              <div className="h-4 w-16 rounded bg-surface-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
