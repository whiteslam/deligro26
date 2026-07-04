import { StatCard, SectionTitle } from "@/components/roles/role-ui";
import { formatINR } from "@/lib/utils/format";

const WEEK = [
  { day: "Mon", amount: 8200 },
  { day: "Tue", amount: 9400 },
  { day: "Wed", amount: 7600 },
  { day: "Thu", amount: 11200 },
  { day: "Fri", amount: 14800 },
  { day: "Sat", amount: 16900 },
  { day: "Sun", amount: 13100 },
];

export default function RestaurantEarningsPage() {
  const total = WEEK.reduce((s, d) => s + d.amount, 0);
  const max = Math.max(...WEEK.map((d) => d.amount));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading">Earnings</h1>
        <p className="text-sm text-muted">This week · payouts settle weekly.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="This week" value={formatINR(total)} tone="green" />
        <StatCard label="Orders" value="212" />
        <StatCard label="Commission" value="18%" tone="muted" />
        <StatCard label="Next payout" value="Mon" tone="accent" />
      </div>

      <section className="card p-4">
        <SectionTitle>Daily revenue</SectionTitle>
        <div className="flex h-40 items-end justify-between gap-2">
          {WEEK.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-accent/80"
                  style={{ height: `${(d.amount / max) * 100}%` }}
                  title={formatINR(d.amount)}
                />
              </div>
              <span className="text-[11px] text-muted">{d.day}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card divide-y divide-line">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-semibold">Payout · last week</p>
            <p className="text-xs text-muted">Settled to HDFC ••4821</p>
          </div>
          <span className="text-data font-semibold text-green">
            {formatINR(72400)}
          </span>
        </div>
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-semibold">Payout · 2 weeks ago</p>
            <p className="text-xs text-muted">Settled to HDFC ••4821</p>
          </div>
          <span className="text-data font-semibold text-green">
            {formatINR(68150)}
          </span>
        </div>
      </section>
    </div>
  );
}
