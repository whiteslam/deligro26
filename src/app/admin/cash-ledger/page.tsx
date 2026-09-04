import { Wallet } from "lucide-react";
import { AdminHero, EmptyState } from "@/components/admin/admin-ui";
import { StatTile, StatTiles } from "@/components/admin/console-ui";
import { formatINR } from "@/lib/utils/format";
import {
  codDaySummary,
  codOutstandingSummary,
  listCodHandovers,
} from "@/lib/data-access/cod-handovers";
import {
  listOperationalExpenses,
  operationalExpenseMonthTotals,
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_PAYMENT_METHOD_LABEL,
} from "@/lib/data-access/operational-expenses";

export const dynamic = "force-dynamic";

/**
 * Admin -> Cash & expenses. The owner's view of the record that /manager/cash
 * writes to: today's cash-on-delivery collection and handover chain, and
 * every operational expense (EV bike costs, rider salary, small spend) that
 * has been logged, whether the underlying payment happened offline or not.
 *
 * Read-only by design. This screen exists so nothing recorded offline is also
 * invisible to the owner — it does not add an approval step, a payment
 * execution, or a reconciliation gate that does not already exist elsewhere
 * in this app.
 *
 * Platform: BOTH. Read-only, so it stays worth opening on a phone; the three
 * tables are `w-full` inside `overflow-x-auto` rather than fixed-width, and
 * the screen uses no viewport breakpoints. Not gated `reach: "console"` for
 * that reason — see AGENTS.md, "New admin features declare a platform".
 */
export default async function AdminCashLedgerPage() {
  const [summary, outstanding, handovers, expenses, monthTotals] = await Promise.all([
    codDaySummary(),
    codOutstandingSummary(),
    listCodHandovers(50),
    listOperationalExpenses(50),
    operationalExpenseMonthTotals(),
  ]);

  const monthTotal = Object.values(monthTotals).reduce((sum, v) => sum + v, 0);
  const ridersWithOutstanding = outstanding.byRider.filter((r) => r.outstanding !== 0);

  return (
    <>
      <AdminHero
        title="Cash & expenses"
        tag={
          outstanding.outstandingWithRiders + outstanding.outstandingWithManagers > 0
            ? `${formatINR(outstanding.outstandingWithRiders + outstanding.outstandingWithManagers)} outstanding`
            : "Nothing outstanding"
        }
        subtitle="COD collection, the rider → manager → owner handover chain, and EV bike / rider operating costs"
      />

      <p className="rounded-xl border border-line bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-muted">
        The cash itself still moves by hand. This screen only shows what has
        been <strong className="text-ink">recorded</strong>: a manager enters
        it from <span className="font-mono text-ink">/manager/cash</span> as
        the day goes. Outstanding figures are all-time, not reset daily, so a
        missing handover from last week is still visible here, not just today.
        Nothing below is corrected automatically; a gap is a prompt to ask.
      </p>

      <StatTiles>
        <StatTile
          label="Collected today (COD)"
          value={formatINR(summary.collectedToday)}
        />
        <StatTile
          label="Outstanding with riders"
          value={formatINR(outstanding.outstandingWithRiders)}
          note="Collected, not yet handed to a manager"
        />
        <StatTile
          label="Outstanding with managers"
          value={formatINR(outstanding.outstandingWithManagers)}
          note="Received from riders, not yet handed to the owner"
        />
        <StatTile
          label="Expenses this month"
          value={formatINR(monthTotal)}
          note={`${EXPENSE_CATEGORY_LABEL.ev_bike_maintenance} + ${EXPENSE_CATEGORY_LABEL.ev_bike_charging}: ${formatINR(monthTotals.ev_bike_maintenance + monthTotals.ev_bike_charging)}`}
        />
      </StatTiles>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-ink">Rider cash outstanding</h2>
        {ridersWithOutstanding.length === 0 && outstanding.unattributedCollected === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Every rider&apos;s recorded collections match what they&apos;ve
            handed to a manager.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Rider</th>
                  <th className="px-3 py-2 text-right">Collected (all-time)</th>
                  <th className="px-3 py-2 text-right">Handed to manager</th>
                  <th className="px-3 py-2 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {ridersWithOutstanding.map((r) => (
                  <tr key={r.riderId} className="border-t border-line">
                    <td className="px-3 py-2">{r.riderName}</td>
                    <td className="px-3 py-2 text-right">{formatINR(r.collected)}</td>
                    <td className="px-3 py-2 text-right">{formatINR(r.handedToManager)}</td>
                    <td
                      className={`px-3 py-2 text-right font-semibold ${r.outstanding > 0 ? "text-ink" : "text-deal"}`}
                    >
                      {formatINR(r.outstanding)}
                    </td>
                  </tr>
                ))}
                {outstanding.unattributedCollected > 0 ||
                outstanding.unattributedHandedToManager > 0 ? (
                  <tr className="border-t border-line">
                    <td className="px-3 py-2 text-muted">Not attributed to a named rider</td>
                    <td className="px-3 py-2 text-right">
                      {formatINR(outstanding.unattributedCollected)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatINR(outstanding.unattributedHandedToManager)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-ink">
                      {formatINR(
                        outstanding.unattributedCollected -
                          outstanding.unattributedHandedToManager
                      )}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-ink">Cash handovers</h2>
        {handovers.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No handovers recorded yet"
            description="They are logged from the manager app as riders hand over collected cash."
          />
        ) : (
          <div className="mt-2 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Leg</th>
                  <th className="px-3 py-2">From</th>
                  <th className="px-3 py-2">To</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Recorded by</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {handovers.map((h) => (
                  <tr key={h.id} className="border-t border-line">
                    <td className="px-3 py-2">{h.handoverDate}</td>
                    <td className="px-3 py-2">
                      {h.leg === "rider_to_manager" ? "Rider → manager" : "Manager → owner"}
                    </td>
                    <td className="px-3 py-2">{h.fromUserName ?? "—"}</td>
                    <td className="px-3 py-2">{h.toUserName ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-ink">
                      {formatINR(h.amount)}
                    </td>
                    <td className="px-3 py-2 text-muted">{h.recordedByName ?? "—"}</td>
                    <td className="px-3 py-2 text-muted">{h.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-8 mt-6">
        <h2 className="text-sm font-bold text-ink">Operational expenses</h2>
        {expenses.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No expenses recorded yet"
            description="EV bike maintenance and charging, rider salary, and other small spend are logged from the manager app."
          />
        ) : (
          <div className="mt-2 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Rider</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Paid via</th>
                  <th className="px-3 py-2">Recorded by</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="px-3 py-2">{e.expenseDate}</td>
                    <td className="px-3 py-2">{EXPENSE_CATEGORY_LABEL[e.category]}</td>
                    <td className="px-3 py-2">{e.riderName ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-ink">
                      {formatINR(e.amount)}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {EXPENSE_PAYMENT_METHOD_LABEL[e.paymentMethod]}
                    </td>
                    <td className="px-3 py-2 text-muted">{e.recordedByName ?? "—"}</td>
                    <td className="px-3 py-2 text-muted">{e.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
