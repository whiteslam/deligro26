import Link from "next/link";
import type { LiveBoardRow } from "@/lib/data-access/admin-dispatch";
import { ORDER_STATUS } from "@/components/admin/order-status";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * The dashboard's live order board: what is moving right now, worst-late first.
 *
 * Its own table rather than DataTable — this one is six fixed-ish columns at
 * console density inside a card, with no sorting, no card fallback and no
 * pagination, and bending the general list primitive into that shape would
 * cost more than the forty lines it saves. It scrolls sideways below 660px
 * instead of collapsing, because a rider's name truncated to "R…" is not a
 * smaller version of the information, it is the absence of it.
 */
export function LiveBoard({ rows }: { rows: LiveBoardRow[] }) {
  if (!rows.length) {
    return (
      <p className="rounded-lg bg-surface-2 px-3.5 py-8 text-center text-[13px] text-muted">
        Nothing in flight. Every order placed has been delivered or closed.
      </p>
    );
  }

  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full min-w-[660px] border-collapse text-left">
        <caption className="sr-only">Orders currently in flight</caption>
        <thead>
          <tr className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted">
            <Th className="w-[92px] pl-4">Order</Th>
            <Th>Vendor / customer</Th>
            <Th className="w-[116px]">Stage</Th>
            <Th className="w-[96px]">Rider</Th>
            <Th className="w-[84px] text-right">Value</Th>
            <Th className="w-[78px] pr-4 text-right">Late by</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const late = (o.lateByMinutes ?? 0) > 0;
            const stage = ORDER_STATUS[o.status];
            return (
              <tr
                key={o.id ?? o.code}
                className={cn(
                  "c-rowin border-t border-[color:var(--c-divider)] transition-colors hover:bg-[var(--c-hover)]",
                  late && "bg-deal/[0.035]"
                )}
              >
                <td className="py-2.5 pl-4 pr-2 align-middle">
                  {o.id ? (
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-data press text-xs text-ink"
                    >
                      {o.code}
                    </Link>
                  ) : (
                    <span className="text-data text-xs text-ink">{o.code}</span>
                  )}
                </td>
                <td className="min-w-0 py-2.5 pr-2 align-middle">
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {o.restaurant}
                  </p>
                  <p className="truncate text-[11.5px] text-muted">{o.customer}</p>
                </td>
                <td className="py-2.5 pr-2 align-middle">
                  <span className={`pill ${stage.cls}`}>{stage.short}</span>
                </td>
                <td className="py-2.5 pr-2 align-middle">
                  <span
                    className={cn(
                      "block truncate text-[12.5px]",
                      o.rider ? "text-ink" : "text-muted"
                    )}
                  >
                    {o.rider ?? "Unassigned"}
                  </span>
                </td>
                <td className="text-data py-2.5 pr-2 text-right align-middle text-[12.5px] tabular-nums text-ink">
                  {formatINR(o.total)}
                </td>
                <td
                  className={cn(
                    "text-data py-2.5 pr-4 text-right align-middle text-[12.5px] font-semibold tabular-nums",
                    late ? "text-deal" : "text-[color:var(--c-faint)]"
                  )}
                >
                  {late ? `${o.lateByMinutes}m` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th scope="col" className={cn("whitespace-nowrap px-2 pb-1.5", className)}>
      {children}
    </th>
  );
}
