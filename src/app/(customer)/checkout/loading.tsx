/**
 * Checkout skeleton — shown while `requireUser` and the platform settings
 * resolve in page.tsx.
 *
 * Without its own file this route inherited the home skeleton at the root of
 * the group (a promo banner, a category strip, restaurant cards), so tapping
 * "View basket" flashed the feed before the basket appeared. Shaped like the
 * real screen: the header, the address card, the payment card, the bill, and
 * the place-order dock at the foot.
 */
export default function CheckoutLoading() {
  return (
    <div className="owns-bottom relative flex min-h-full animate-pulse flex-col">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="size-10 shrink-0 rounded-full bg-surface-2" />
        <div className="h-4 w-40 rounded bg-surface-2" />
      </div>

      <div className="flex-1 space-y-3 px-4 pb-4 pt-3">
        <div className="card flex items-center gap-3 p-4">
          <div className="size-9 shrink-0 rounded-xl bg-surface-2" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-surface-2" />
            <div className="h-3 w-2/3 rounded bg-surface-2" />
          </div>
        </div>

        <div className="card space-y-3 p-4">
          <div className="h-4 w-24 rounded bg-surface-2" />
          <div className="h-12 rounded-xl bg-surface-2" />
          <div className="h-12 rounded-xl bg-surface-2" />
        </div>

        <div className="card space-y-2.5 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3 w-24 rounded bg-surface-2" />
              <div className="h-3 w-14 rounded bg-surface-2" />
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-3">
            <div className="h-4 w-20 rounded bg-surface-2" />
            <div className="h-4 w-16 rounded bg-surface-2" />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <div className="h-[52px] rounded-full bg-surface-2" />
      </div>
    </div>
  );
}
