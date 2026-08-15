/**
 * Pure settlement arithmetic — shared by preview and create so the admin
 * screen never recomputes a different number from the one that gets stored.
 *
 * food_gross excludes delivery, tax, and tip (those are not the vendor's share).
 * Online paid: platform remits vendor_net (minus refunds recovered).
 * COD: vendor already holds cash; the period payout is reduced by commission.
 */

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
  paymentMethod: SettlementPaymentMethod;
  paymentStatus: SettlementPaymentStatus;
  /** Sum of approved refund amounts on this order, whole rupees. */
  approvedRefunds: number;
}

export interface SettlementOrderBreakdown {
  foodGross: number;
  commission: number;
  vendorNet: number;
  refundRecovered: number;
  contribution: number;
  /** True when platform held the customer's money and owes the vendor. */
  remitsVendor: boolean;
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
  const pct = Math.min(100, Math.max(0, commissionPct));
  return Math.round(foodGross * (pct / 100));
}

export function breakdownOrder(
  input: SettlementOrderInput
): SettlementOrderBreakdown {
  const foodGross = foodGrossFromOrder(input);
  const commission = commissionOn(foodGross, input.commissionPct);
  const vendorNet = foodGross - commission;
  const remitsVendor =
    input.paymentMethod === "online" && input.paymentStatus === "paid";
  const refundRecovered = Math.max(0, Math.round(input.approvedRefunds));

  const contribution = remitsVendor
    ? vendorNet - refundRecovered
    : -commission - refundRecovered;

  return {
    foodGross,
    commission,
    vendorNet,
    refundRecovered,
    contribution,
    remitsVendor,
  };
}

export function sumSettlementTotals(
  lines: Pick<
    SettlementOrderBreakdown,
    "foodGross" | "commission" | "refundRecovered" | "contribution"
  >[]
): {
  foodGross: number;
  commission: number;
  refundsRecovered: number;
  netPayable: number;
} {
  let foodGross = 0;
  let commission = 0;
  let refundsRecovered = 0;
  let netPayable = 0;
  for (const line of lines) {
    foodGross += line.foodGross;
    commission += line.commission;
    refundsRecovered += line.refundRecovered;
    netPayable += line.contribution;
  }
  return { foodGross, commission, refundsRecovered, netPayable };
}
