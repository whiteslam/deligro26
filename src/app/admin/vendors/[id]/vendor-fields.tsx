export function fmtDate(iso: string | null): string {
  return iso
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(iso))
    : "—";
}

export function fmtTime(t: string | null): string {
  return t ? t.slice(0, 5) : "—";
}

export function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface px-4 py-3.5">
      <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">
        {title}
      </h2>
      <dl className="mt-1">{children}</dl>
    </section>
  );
}

export function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-[color:var(--c-divider)] py-2 first:border-t-0">
      <dt className="text-[12.5px] text-muted">{label}</dt>
      <dd className="text-right text-[12.5px] font-medium text-ink">
        {value || <span className="text-[color:var(--c-faint)]">—</span>}
      </dd>
    </div>
  );
}
