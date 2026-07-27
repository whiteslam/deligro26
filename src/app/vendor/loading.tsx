export default function VendorLoading() {
  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden lg:space-y-6">
      <div className="h-28 animate-pulse rounded-[var(--radius-sheet)] bg-surface-2" />
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-[var(--radius-block)] bg-surface-2"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[var(--radius-block)] bg-surface-2" />
      <div className="hidden h-48 animate-pulse rounded-[var(--radius-block)] bg-surface-2 lg:block" />
    </div>
  );
}
