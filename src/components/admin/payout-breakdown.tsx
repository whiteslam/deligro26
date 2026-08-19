import { formatINR } from "@/lib/utils/format";
import type { SettlementLine } from "@/lib/data-access/admin-settlements";
import { itemsLabel, type SettlementTotals } from "@/lib/settlements/math";

/**
 * How a payout is shown — once, for every screen that shows one.
 *
 * The settlement preview, the saved statement and the order-payouts list were
 * always going to print the same subtraction, and three copies of it is three
 * chances for one screen to quietly omit a deduction and disagree with the
 * others about what a vendor is owed. So the subtraction is written here and
 * imported, in the same spirit as `pricing.ts` on the customer side.
 *
 * The wording is the plain-English version throughout: "What the customer paid",
 * not "GMV"; "Shop's share of the food", not "food gross".
 */

/** A row of the subtraction: label, amount, and whether it is taken away. */
function Line({
  label,
  amount,
  note,
  negative,
  strong,
  rule,
}: {
  label: string;
  amount: number;
  note?: string;
  negative?: boolean;
  strong?: boolean;
  /** Draw a divider above — marks a subtotal. */
  rule?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-baseline justify-between gap-3 py-1.5",
        rule ? "mt-1 border-t border-line pt-2.5" : "",
      ].join(" ")}
    >
      <span
        className={
          strong
            ? "text-[13.5px] font-semibold text-ink"
            : "text-[13px] text-muted"
        }
      >
        {label}
        {note ? (
          <span className="ml-1.5 text-[11.5px] text-muted">{note}</span>
        ) : null}
      </span>
      <span
        className={[
          "text-data shrink-0 tabular-nums",
          strong ? "text-[15px] font-bold text-ink" : "text-[13px] text-ink",
          negative && amount !== 0 ? "text-deal" : "",
        ].join(" ")}
      >
        {negative && amount !== 0 ? "− " : ""}
        {formatINR(Math.abs(amount))}
      </span>
    </div>
  );
}

/**
 * One order, from what the customer paid down to what the shop is owed.
 *
 * Every deduction is listed even when it is zero. A row that disappears when
 * it is nil is a row a vendor cannot check for, and "why is this ₹18 short"
 * is the question this component exists to pre-empt.
 */
export function OrderPayoutBreakdown({
  line,
  commissionPct,
  commissionGstPct,
}: {
  line: SettlementLine;
  commissionPct: number;
  commissionGstPct: number;
}) {
  const deductions =
    line.commission + line.commissionGst + line.otherCharges;

  return (
    <div className="space-y-0.5">
      <Line label="What the customer paid" amount={line.orderTotal} strong />
      <Line label="Delivery fee (platform)" amount={line.deliveryFee} negative />
      <Line label="GST / taxes (government)" amount={line.taxAmount} negative />
      <Line label="Tip (rider keeps all of it)" amount={line.tip} negative />
      <Line
        label="Shop's share of the food"
        amount={line.foodGross}
        strong
        rule
      />
      <Line
        label="Platform commission"
        note={`${commissionPct}%`}
        amount={line.commission}
        negative
      />
      <Line
        label="GST on commission"
        note={`${commissionGstPct}% of commission`}
        amount={line.commissionGst}
        negative
      />
      <Line label="Other charges" amount={line.otherCharges} negative />
      {line.refundRecovered > 0 ? (
        <Line
          label="Refund recovered"
          amount={line.refundRecovered}
          negative
        />
      ) : null}
      <Line
        label={
          line.remitsVendor
            ? "Shop is paid"
            : "Shop already took the cash — platform collects"
        }
        amount={Math.abs(line.contribution)}
        strong
        rule
      />
      {!line.remitsVendor ? (
        <p className="pt-1 text-[11.5px] leading-snug text-muted">
          Cash order. The shop kept {formatINR(line.foodGross)} at the door, so
          the {formatINR(deductions + line.refundRecovered)} above is taken off
          the next payout instead of being sent.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The footer of a settlement: the same subtraction, summed.
 *
 * `mismatch` is displayed rather than hidden. It is always 0 — the header is
 * written as the integer sum of the lines and re-verified on read — and saying
 * so out loud is what makes the claim checkable instead of merely asserted.
 */
export function PayoutTotals({
  totals,
  commissionPct,
  commissionGstPct,
  orderCount,
  mismatch = 0,
}: {
  totals: SettlementTotals;
  commissionPct: number;
  commissionGstPct: number;
  orderCount: number;
  mismatch?: number;
}) {
  const owesPlatform = totals.netPayable < 0;

  return (
    <div className="space-y-0.5">
      <Line
        label={`Shop's share of the food · ${orderCount} order${orderCount === 1 ? "" : "s"}`}
        amount={totals.foodGross}
        strong
      />
      <Line
        label="Platform commission"
        note={`${commissionPct}%`}
        amount={totals.commission}
        negative
      />
      <Line
        label="GST on commission"
        note={`${commissionGstPct}%`}
        amount={totals.commissionGst}
        negative
      />
      <Line label="Other charges" amount={totals.otherCharges} negative />
      <Line
        label="Refunds recovered"
        amount={totals.refundsRecovered}
        negative
      />
      <Line
        label={owesPlatform ? "Shop owes the platform" : "Total to pay the shop"}
        amount={totals.netPayable}
        strong
        rule
      />
      {mismatch !== 0 ? (
        <p className="mt-2 rounded-lg border border-deal/30 bg-deal/10 px-3 py-2 text-[12px] font-medium text-deal">
          These rows do not add up to the stored total — a difference of{" "}
          {formatINR(mismatch)}. Do not pay from this statement; report it.
        </p>
      ) : (
        <p className="pt-1.5 text-[11.5px] text-muted">
          Every order above is added up to the rupee — no rounding is applied to
          this total.
        </p>
      )}
    </div>
  );
}

/** How an order was paid, as a word rather than a code. */
export function payWord(line: SettlementLine): string {
  if (line.remitsVendor) return "Paid online";
  if (line.paymentMethod === "cod") return "Cash";
  if (line.paymentMethod === "online") return "Online, unpaid";
  return "Unknown";
}

/**
 * The per-order table shared by the preview and the saved statement.
 *
 * Scrolls sideways rather than dropping columns on a narrow screen: a payout
 * table that hides the commission column on a phone is a payout table an
 * operator cannot check on a phone.
 */
/**
 * Every order in the payout, one per row.
 *
 * The "Ordered" column is the one that makes a disputed line resolvable: an
 * order code and an amount are not something a vendor can check against their
 * own kitchen records, and "Chicken Biryani ×2" is. Names are the snapshot
 * taken when the order was sold, so a later menu rename cannot rewrite a
 * statement.
 *
 * `rowAction` is how the settlement preview puts a Mark paid control on each
 * line without this table — shared with the saved statement, which must stay
 * read-only — learning what paying is.
 */
export function PayoutLinesTable({
  lines,
  rowAction,
}: {
  lines: SettlementLine[];
  rowAction?: (line: SettlementLine) => React.ReactNode;
}) {
  if (lines.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-sm text-muted">
        No orders in this range.
      </p>
    );
  }

  const showItems = lines.some((l) => l.items.length > 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[860px] text-left text-sm">
        <caption className="sr-only">Payout for each order</caption>
        <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2.5 font-medium">Order</th>
            {showItems ? (
              <th className="px-3 py-2.5 font-medium">Ordered</th>
            ) : null}
            <th className="px-3 py-2.5 font-medium">Paid by</th>
            <th className="px-3 py-2.5 text-right font-medium">Customer paid</th>
            <th className="px-3 py-2.5 text-right font-medium">Food</th>
            <th className="px-3 py-2.5 text-right font-medium">Commission</th>
            <th className="px-3 py-2.5 text-right font-medium">GST</th>
            <th className="px-3 py-2.5 text-right font-medium">Other</th>
            <th className="px-3 py-2.5 text-right font-medium">Refund</th>
            <th className="px-3 py-2.5 text-right font-medium">Shop gets</th>
            {rowAction ? (
              <th className="px-3 py-2.5 text-right font-medium">Settle</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.orderId} className="border-b border-line last:border-0">
              <td className="px-3 py-2.5 font-medium text-ink">{l.code}</td>
              {showItems ? (
                <td className="max-w-[260px] px-3 py-2.5 text-muted">
                  <span className="line-clamp-2" title={itemsLabel(l.items)}>
                    {l.items.length ? itemsLabel(l.items) : "—"}
                  </span>
                </td>
              ) : null}
              <td className="px-3 py-2.5 text-muted">{payWord(l)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted">
                {l.orderTotal ? formatINR(l.orderTotal) : "—"}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {formatINR(l.foodGross)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {formatINR(l.commission)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {l.commissionGst ? formatINR(l.commissionGst) : "—"}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {l.otherCharges ? formatINR(l.otherCharges) : "—"}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {l.refundRecovered ? formatINR(l.refundRecovered) : "—"}
              </td>
              <td
                className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                  l.contribution < 0 ? "text-deal" : "text-ink"
                }`}
              >
                {l.contribution < 0 ? "− " : ""}
                {formatINR(Math.abs(l.contribution))}
              </td>
              {rowAction ? (
                <td className="px-3 py-2.5 text-right">{rowAction(l)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
