/**
 * Pure settlement arithmetic — shared by preview, create, the order-payout
 * screen and the reports, so no two screens can compute a different number for
 * the same order.
 *
 * Everything here is whole rupees and integer arithmetic. That is the entire
 * strategy for "never off by ₹1": there are no floats to accumulate error, each
 * deduction is rounded exactly once at the point it is derived, and a
 * settlement total is the plain integer sum of the line integers that were
 * stored — never a re-derivation from a rate. `checkTotals` below asserts that
 * property rather than trusting it.
 *
 * The subtraction, in the order the statement prints it:
 *
 *   order total            what the customer paid
 *   − delivery fee         platform's
 *   − GST / taxes          the government's
 *   − tip                  the rider's, in full
 *   ─────────────────────
 *   = food value           the vendor's share of the bill
 *   − platform commission  commissionPct of food value
 *   − GST on commission    commissionGstPct of that commission
 *   − other charges        fixed per-order deduction (packaging, gateway)
 *   ─────────────────────
 *   = vendor payout        before refunds
 *
 * Who is holding the money then decides the direction:
 *   online paid → the platform holds it and remits `vendorNet` (less refunds).
 *   COD         → the shop already took the cash, so the platform recovers the
 *                 deductions instead, and the line contributes a negative.
 */

/**
 * One dish on an order, as it was named when it was sold.
 *
 * Lives here rather than beside the query that loads it because the payout
 * tables are rendered from Client Components, and `data-access/admin-settlements`
 * is `server-only` — importing a formatting helper out of it would drag the
 * service-role module graph into the browser bundle.
 */
export interface OrderLineItem {
  name: string;
  qty: number;
}

/** "Chicken Biryani ×2 · Coke" — the items on one line, for a table cell. */
export function itemsLabel(items: OrderLineItem[]): string {
  return items
    .map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name))
    .join(" · ");
}

export type SettlementPaymentMethod = "cod" | "online" | null;
export type SettlementPaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "refunded"
  | null;

export interface SettlementOrderInput {
  total: number;
  deliveryFee: number;
  taxAmount: number;
  tip: number;
  commissionPct: number;
  /** GST charged on the platform commission, whole percent. */
  commissionGstPct?: number;
  /** Fixed deduction for this order, whole rupees. */
  otherCharges?: number;
  paymentMethod: SettlementPaymentMethod;
  paymentStatus: SettlementPaymentStatus;
  /** Sum of approved refund amounts on this order, whole rupees. */
  approvedRefunds: number;
}

export interface SettlementOrderBreakdown {
  /** What the customer paid, for the top of the statement. */
  orderTotal: number;
  deliveryFee: number;
  taxAmount: number;
  tip: number;
  foodGross: number;
  commission: number;
  commissionGst: number;
  otherCharges: number;
  /** foodGross − commission − commissionGst − otherCharges. */
  vendorNet: number;
  refundRecovered: number;
  contribution: number;
  /** True when platform held the customer's money and owes the vendor. */
  remitsVendor: boolean;
}

/** Everything the platform keeps from this order, before refunds. */
export function platformDeductions(
  b: Pick<
    SettlementOrderBreakdown,
    "commission" | "commissionGst" | "otherCharges"
  >
): number {
  return b.commission + b.commissionGst + b.otherCharges;
}

export function foodGrossFromOrder(input: {
  total: number;
  deliveryFee: number;
  taxAmount: number;
  tip: number;
}): number {
  return Math.max(
    0,
    Math.round(input.total) -
      Math.round(input.deliveryFee) -
      Math.round(input.taxAmount) -
      Math.round(input.tip)
  );
}

export function commissionOn(foodGross: number, commissionPct: number): number {
  const pct = clampPct(commissionPct);
  return Math.round(foodGross * (pct / 100));
}

/**
 * GST is charged on the COMMISSION, not on the food. Deriving it from the food
 * value instead is the mistake this signature exists to make impossible — it
 * would be roughly five times too large at an 18% rate.
 */
export function gstOnCommission(
  commission: number,
  commissionGstPct: number
): number {
  return Math.round(commission * (clampPct(commissionGstPct) / 100));
}

function clampPct(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return Math.min(100, Math.max(0, pct));
}

export function breakdownOrder(
  input: SettlementOrderInput
): SettlementOrderBreakdown {
  const orderTotal = Math.round(input.total);
  const deliveryFee = Math.round(input.deliveryFee);
  const taxAmount = Math.round(input.taxAmount);
  const tip = Math.round(input.tip);

  const foodGross = foodGrossFromOrder(input);
  const commission = commissionOn(foodGross, input.commissionPct);
  const commissionGst = gstOnCommission(commission, input.commissionGstPct ?? 0);
  const otherCharges = Math.max(0, Math.round(input.otherCharges ?? 0));

  // Never bill a vendor more than the food was worth. Without the floor, a
  // ₹40 order against a fixed ₹50 packaging charge produces a negative payout
  // on an ONLINE order — i.e. the platform quietly clawing back money it never
  // held. The clamp is applied to the deduction stack rather than to the net so
  // that what is deducted and what is paid still add up to the food value.
  const deductions = Math.min(foodGross, commission + commissionGst + otherCharges);
  const vendorNet = foodGross - deductions;

  const remitsVendor =
    input.paymentMethod === "online" && input.paymentStatus === "paid";
  const refundRecovered = Math.max(0, Math.round(input.approvedRefunds));

  const contribution = remitsVendor
    ? vendorNet - refundRecovered
    : -deductions - refundRecovered;

  return {
    orderTotal,
    deliveryFee,
    taxAmount,
    tip,
    foodGross,
    // Report the clamped figures, not the notional ones: the statement must
    // show what was actually taken, or it will not reconcile with the payout.
    commission: Math.min(commission, deductions),
    commissionGst: Math.min(commissionGst, Math.max(0, deductions - commission)),
    otherCharges: Math.max(0, deductions - commission - commissionGst),
    vendorNet,
    refundRecovered,
    contribution,
    remitsVendor,
  };
}

export interface SettlementTotals {
  foodGross: number;
  commission: number;
  commissionGst: number;
  otherCharges: number;
  refundsRecovered: number;
  netPayable: number;
}

export type SummableLine = Pick<
  SettlementOrderBreakdown,
  | "foodGross"
  | "commission"
  | "commissionGst"
  | "otherCharges"
  | "refundRecovered"
  | "contribution"
>;

/**
 * The header figures, as the integer sum of the line figures. Nothing is
 * recomputed from a rate here — that is what guarantees the statement's rows
 * add up to its footer for every rounding case, including the ones where
 * `round(sum)` and `sum(round)` differ.
 */
export function sumSettlementTotals(lines: SummableLine[]): SettlementTotals {
  const totals: SettlementTotals = {
    foodGross: 0,
    commission: 0,
    commissionGst: 0,
    otherCharges: 0,
    refundsRecovered: 0,
    netPayable: 0,
  };
  for (const line of lines) {
    totals.foodGross += line.foodGross;
    totals.commission += line.commission;
    totals.commissionGst += line.commissionGst;
    totals.otherCharges += line.otherCharges;
    totals.refundsRecovered += line.refundRecovered;
    totals.netPayable += line.contribution;
  }
  return totals;
}

/**
 * A vendor's forecast payout for a period, as the Earnings screen renders it.
 *
 * Declared here rather than beside `settlementEstimateFor` because that module
 * is `server-only` and this is the shape a client component receives — putting
 * it in the arithmetic module keeps the vendor's panel from importing (even
 * type-only) out of the service-role data layer.
 *
 * `grossRevenue` rides along on purpose: it is the sum of `orders.total` that
 * the Earnings screen used to present as "your settlement estimate", and showing
 * it next to the real net is how a vendor who forecast off it sees the gap.
 */
export interface VendorSettlementEstimate extends SettlementTotals {
  commissionPct: number;
  commissionGstPct: number;
  otherChargesPerOrder: number;
  orderCount: number;
  /** Not a payout. What the customers paid, in full. */
  grossRevenue: number;
  /** Delivered in the window but already paid out, so excluded above. */
  settledCount: number;
}

/**
 * Does this settlement add up? Returns the mismatch in rupees, or 0.
 *
 * Called before a draft is written and again when a statement is rendered. It
 * cannot fail while both sides come from `sumSettlementTotals` — which is the
 * point: it is a tripwire for the day someone adds a deduction to the line and
 * forgets the header, and it costs one pass over an array to keep.
 */
export function checkTotals(
  header: SettlementTotals,
  lines: SummableLine[]
): number {
  const recomputed = sumSettlementTotals(lines);
  return (
    Math.abs(header.foodGross - recomputed.foodGross) +
    Math.abs(header.commission - recomputed.commission) +
    Math.abs(header.commissionGst - recomputed.commissionGst) +
    Math.abs(header.otherCharges - recomputed.otherCharges) +
    Math.abs(header.refundsRecovered - recomputed.refundsRecovered) +
    Math.abs(header.netPayable - recomputed.netPayable)
  );
}
