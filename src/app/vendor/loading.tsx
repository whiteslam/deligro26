export default function VendorLoading() {
  return (
    <>
      <div className="h-16 animate-pulse rounded-[var(--radius-sheet)] bg-surface-2 @3xl:h-12 @3xl:rounded-none" />
      <div className="grid grid-cols-2 gap-2 sm:gap-3 @3xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-surface-2"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-surface-2" />
    </>
  );
}
