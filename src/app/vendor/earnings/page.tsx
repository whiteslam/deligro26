import { StatCard, SectionTitle } from "@/components/roles/role-ui";
import { formatINR } from "@/lib/utils/format";
import { getVendorEarnings } from "@/lib/data-access/vendor-earnings";

/**
 * Earnings, counted from this restaurant's own delivered orders.
 *
 * Every number on this page used to be invented — a hardcoded week of revenue, a
 * fabricated order count, an "18% commission" that is applied nowhere in the
 * order path, and payouts "settled to HDFC ••4821". A real vendor, behind a real
 * login, was shown money that did not exist.
 *
 * Commission and payouts are simply not shown: neither exists in the system yet,
 * and a blank where a feature isn't built is honest in a way that a plausible
 * number never is.
 */
export const dynamic = "force-dynamic";

export default async function RestaurantEarningsPage() {
  const { week, weekTotal, weekOrders, empty } = await getVendorEarnings();
  const max = Math.max(...week.map((d) => d.amount), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading">Earnings</h1>
        <p className="text-sm text-muted">
          Delivered orders, last 7 days. Payouts aren&rsquo;t automated yet.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
        <StatCard
          label="Last 7 days"
          value={formatINR(weekTotal)}
          tone="green"
        />
        <StatCard label="Orders delivered" value={String(weekOrders)} />
      </div>

      <section className="card p-4">
        <SectionTitle>Daily revenue</SectionTitle>
        {empty ? (
          <p className="py-6 text-sm text-muted">
            No delivered orders in the last 7 days. Revenue appears here as
            orders are completed.
          </p>
        ) : (
          <div className="flex h-40 items-end justify-between gap-2">
            {week.map((d) => (
              <div
                key={d.date}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-accent/80"
                    style={{ height: `${(d.amount / max) * 100}%` }}
                    title={formatINR(d.amount)}
                  />
                </div>
                <span className="text-[11px] text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
