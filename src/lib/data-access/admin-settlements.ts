import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { shortOrderId } from "@/lib/utils/order-map";
import { addIstDays, startOfIstDay, startOfIstWeek } from "@/lib/utils/ist-time";
import {
  breakdownOrder,
  sumSettlementTotals,
  type SettlementPaymentMethod,
  type SettlementPaymentStatus,
} from "@/lib/settlements/math";
import {
  effectiveCommissionPct,
  getVendorCommissionDefault,
} from "@/lib/data-access/admin-commission";

/**
 * Admin vendor settlements — the settle-out ledger.
 *
 * Caller MUST already be admin-gated (layout requireRole or action requireRole).
 * Service-role client is authorization-backed by that gate (AGENTS.md §5).
 */

export type SettlementStatus = "draft" | "paid" | "void";

export interface SettlementListItem {
  id: string;
  restaurantId: string;
  restaurantName: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  foodGross: number;
  commission: number;
  refundsRecovered: number;
  netPayable: number;
  status: SettlementStatus;
  orderCount: number;
  createdAt: string;
  paidAt: string | null;
  paymentRef: string | null;
}

export interface SettlementLine {
  orderId: string;
  code: string;
  foodGross: number;
  commission: number;
  vendorNet: number;
  contribution: number;
  refundRecovered: number;
  paymentMethod: SettlementPaymentMethod;
  paymentStatus: SettlementPaymentStatus;
  remitsVendor: boolean;
  deliveredAt: string;
}

export interface SettlementPayoutSnapshot {
  upiId: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  commissionPct: number;
}

export interface SettlementDetail extends SettlementListItem {
  notes: string | null;
  createdBy: string | null;
  paidBy: string | null;
  voidedAt: string | null;
  payout: SettlementPayoutSnapshot;
  lines: SettlementLine[];
}

export interface SettlementPreviewLine extends SettlementLine {
  total: number;
}

export interface SettlementPreview {
  restaurantId: string;
  restaurantName: string;
  commissionPct: number;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  foodGross: number;
  commission: number;
  refundsRecovered: number;
  netPayable: number;
  lines: SettlementPreviewLine[];
  payout: SettlementPayoutSnapshot;
}

export interface SettlementStats {
  draftCount: number;
  paidThisWeek: number;
  paidThisWeekAmount: number;
  unsettledOnlineVolume: number;
  unsettledOrderCount: number;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function periodLabel(startIso: string, endExclusiveIso: string): string {
  const start = new Date(startIso);
  const lastDay = new Date(new Date(endExclusiveIso).getTime() - 1);
  return `${dateFmt.format(start)} – ${dateFmt.format(lastDay)}`;
}

/** Parse YYYY-MM-DD as IST calendar day start; reject garbage. */
export function parseIstDateInput(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T00:00:00+05:30`;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return startOfIstDay(dt);
}

function asMethod(v: string | null | undefined): SettlementPaymentMethod {
  if (v === "cod" || v === "online") return v;
  return null;
}

function asPayStatus(v: string | null | undefined): SettlementPaymentStatus {
  if (
    v === "pending" ||
    v === "authorized" ||
    v === "paid" ||
    v === "failed" ||
    v === "refunded"
  ) {
    return v;
  }
  return null;
}

interface OrderRow {
  id: string;
  total: number;
  delivery_fee: number | null;
  tax_amount: number | null;
  tip: number | null;
  status: string;
  created_at: string;
  payment_method?: string | null;
  payment_status?: string | null;
}

interface RestaurantRow {
  id: string;
  name: string;
  commission_pct: number | null;
  upi_id: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
}

/**
 * `platformDefault` is the rate from platform settings; the row's own
 * `commission_pct` overrides it when non-null. `?? 0` would have been wrong
 * here after 0032 — it cannot tell "inherit" from a vendor deliberately set to
 * free, and would have quietly billed every inheriting vendor nothing.
 */
function payoutFrom(
  r: RestaurantRow,
  platformDefault: number
): SettlementPayoutSnapshot {
  return {
    upiId: r.upi_id,
    bankAccountName: r.bank_account_name,
    bankAccountNumber: r.bank_account_number,
    bankIfsc: r.bank_ifsc,
    bankName: r.bank_name,
    commissionPct: effectiveCommissionPct(r.commission_pct, platformDefault),
  };
}

async function loadApprovedRefunds(
  orderIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (orderIds.length === 0) return map;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("refunds")
    .select("order_id, amount")
    .in("order_id", orderIds)
    .eq("status", "approved");
  if (error) throw error;
  for (const row of data ?? []) {
    const id = row.order_id as string;
    map.set(id, (map.get(id) ?? 0) + Number(row.amount ?? 0));
  }
  return map;
}

async function alreadySettledOrderIds(
  restaurantId: string
): Promise<Set<string>> {
  const supabase = createAdminClient();
  // Live settlements only — voided headers have no child rows.
  const { data: settlements, error: sErr } = await supabase
    .from("vendor_settlements")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .neq("status", "void");
  if (sErr) throw sErr;
  const ids = (settlements ?? []).map((s) => s.id as string);
  if (ids.length === 0) return new Set();

  const { data: lines, error: lErr } = await supabase
    .from("vendor_settlement_orders")
    .select("order_id")
    .in("settlement_id", ids);
  if (lErr) throw lErr;
  return new Set((lines ?? []).map((l) => l.order_id as string));
}

/**
 * Build a preview for a vendor + IST-inclusive date range (from/to as YYYY-MM-DD).
 * `to` is the last included calendar day; stored period_end is the next midnight.
 */
export async function previewSettlement(input: {
  restaurantId: string;
  fromDate: string;
  toDate: string;
}): Promise<SettlementPreview | { error: string }> {
  if (!UUID_RE.test(input.restaurantId)) {
    return { error: "Invalid restaurant." };
  }
  const periodStart = parseIstDateInput(input.fromDate);
  const toStart = parseIstDateInput(input.toDate);
  if (!periodStart || !toStart) {
    return { error: "Use dates as YYYY-MM-DD." };
  }
  if (toStart < periodStart) {
    return { error: "End date must be on or after the start date." };
  }
  const periodEnd = addIstDays(toStart, 1);

  const supabase = createAdminClient();
  const { data: restaurant, error: rErr } = await supabase
    .from("restaurants")
    .select(
      "id, name, commission_pct, upi_id, bank_account_name, bank_account_number, bank_ifsc, bank_name"
    )
    .eq("id", input.restaurantId)
    .maybeSingle();
  if (rErr) throw rErr;
  if (!restaurant) return { error: "Restaurant not found." };

  const rest = restaurant as RestaurantRow;
  const platformDefault = await getVendorCommissionDefault();
  const commissionPct = effectiveCommissionPct(
    rest.commission_pct,
    platformDefault
  );

  const { data: orders, error: oErr } = await supabase
    .from("orders")
    .select(
      "id, total, delivery_fee, tax_amount, tip, status, created_at, payment_method, payment_status"
    )
    .eq("restaurant_id", input.restaurantId)
    .eq("status", "delivered")
    .gte("created_at", periodStart.toISOString())
    .lt("created_at", periodEnd.toISOString())
    .order("created_at", { ascending: true });
  if (oErr) throw oErr;

  const settled = await alreadySettledOrderIds(input.restaurantId);
  const eligible = ((orders ?? []) as OrderRow[]).filter(
    (o) => !settled.has(o.id)
  );
  const refunds = await loadApprovedRefunds(eligible.map((o) => o.id));

  const lines: SettlementPreviewLine[] = eligible.map((o) => {
    const paymentMethod = asMethod(o.payment_method);
    const paymentStatus = asPayStatus(o.payment_status);
    const bd = breakdownOrder({
      total: Number(o.total) || 0,
      deliveryFee: Number(o.delivery_fee) || 0,
      taxAmount: Number(o.tax_amount) || 0,
      tip: Number(o.tip) || 0,
      commissionPct,
      paymentMethod,
      paymentStatus,
      approvedRefunds: refunds.get(o.id) ?? 0,
    });
    return {
      orderId: o.id,
      code: shortOrderId(o.id),
      foodGross: bd.foodGross,
      commission: bd.commission,
      vendorNet: bd.vendorNet,
      contribution: bd.contribution,
      refundRecovered: bd.refundRecovered,
      paymentMethod,
      paymentStatus,
      remitsVendor: bd.remitsVendor,
      deliveredAt: o.created_at,
      total: Number(o.total) || 0,
    };
  });

  const totals = sumSettlementTotals(lines);
  const startIso = periodStart.toISOString();
  const endIso = periodEnd.toISOString();

  return {
    restaurantId: rest.id,
    restaurantName: rest.name,
    commissionPct,
    periodStart: startIso,
    periodEnd: endIso,
    periodLabel: periodLabel(startIso, endIso),
    ...totals,
    lines,
    payout: payoutFrom(rest, platformDefault),
  };
}

export async function createSettlementDraft(input: {
  restaurantId: string;
  fromDate: string;
  toDate: string;
  adminId: string;
  notes?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const preview = await previewSettlement({
    restaurantId: input.restaurantId,
    fromDate: input.fromDate,
    toDate: input.toDate,
  });
  if ("error" in preview) return preview;
  if (preview.lines.length === 0) {
    return { error: "No unsettled delivered orders in that range." };
  }

  const supabase = createAdminClient();
  const { data: header, error: hErr } = await supabase
    .from("vendor_settlements")
    .insert({
      restaurant_id: preview.restaurantId,
      period_start: preview.periodStart,
      period_end: preview.periodEnd,
      food_gross: preview.foodGross,
      commission: preview.commission,
      refunds_recovered: preview.refundsRecovered,
      net_payable: preview.netPayable,
      status: "draft",
      created_by: input.adminId,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();
  if (hErr) {
    // Unique order collision — another draft won the race.
    if (hErr.code === "23505") {
      return { error: "One or more orders were just settled elsewhere. Refresh and try again." };
    }
    throw hErr;
  }

  const settlementId = header.id as string;
  const rows = preview.lines.map((l) => ({
    settlement_id: settlementId,
    order_id: l.orderId,
    food_gross: l.foodGross,
    commission: l.commission,
    vendor_net: l.vendorNet,
    contribution: l.contribution,
    refund_recovered: l.refundRecovered,
    payment_method: l.paymentMethod,
    payment_status: l.paymentStatus,
  }));

  const { error: lErr } = await supabase
    .from("vendor_settlement_orders")
    .insert(rows);
  if (lErr) {
    // Roll back the header so we don't leave an empty draft.
    await supabase.from("vendor_settlements").delete().eq("id", settlementId);
    if (lErr.code === "23505") {
      return { error: "One or more orders were just settled elsewhere. Refresh and try again." };
    }
    throw lErr;
  }

  return { id: settlementId };
}

export async function listSettlements(limit = 50): Promise<SettlementListItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vendor_settlements")
    .select(
      "id, restaurant_id, period_start, period_end, food_gross, commission, refunds_recovered, net_payable, status, created_at, paid_at, payment_ref, restaurants(name), vendor_settlement_orders(count)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((r) => {
    const rest = r.restaurants as { name: string } | { name: string }[] | null;
    const name = Array.isArray(rest) ? rest[0]?.name : rest?.name;
    const counts = r.vendor_settlement_orders as
      | { count: number }[]
      | { count: number }
      | null;
    const orderCount = Array.isArray(counts)
      ? (counts[0]?.count ?? 0)
      : (counts?.count ?? 0);
    return {
      id: r.id as string,
      restaurantId: r.restaurant_id as string,
      restaurantName: name?.trim() || "Restaurant",
      periodStart: r.period_start as string,
      periodEnd: r.period_end as string,
      periodLabel: periodLabel(
        r.period_start as string,
        r.period_end as string
      ),
      foodGross: Number(r.food_gross) || 0,
      commission: Number(r.commission) || 0,
      refundsRecovered: Number(r.refunds_recovered) || 0,
      netPayable: Number(r.net_payable) || 0,
      status: r.status as SettlementStatus,
      orderCount,
      createdAt: r.created_at as string,
      paidAt: (r.paid_at as string | null) ?? null,
      paymentRef: (r.payment_ref as string | null) ?? null,
    };
  });
}

export async function getSettlement(
  id: string
): Promise<SettlementDetail | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vendor_settlements")
    .select(
      `id, restaurant_id, period_start, period_end, food_gross, commission,
       refunds_recovered, net_payable, status, created_at, paid_at, payment_ref,
       notes, created_by, paid_by, voided_at,
       restaurants(id, name, commission_pct, upi_id, bank_account_name,
         bank_account_number, bank_ifsc, bank_name)`
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const restRaw = data.restaurants as RestaurantRow | RestaurantRow[] | null;
  const rest = Array.isArray(restRaw) ? restRaw[0] : restRaw;
  if (!rest) return null;

  // The stored `commission` in rupees stays authoritative for this settlement;
  // this only labels the rate the vendor is on now.
  const platformDefault = await getVendorCommissionDefault();

  const { data: lines, error: lErr } = await supabase
    .from("vendor_settlement_orders")
    .select(
      "order_id, food_gross, commission, vendor_net, contribution, refund_recovered, payment_method, payment_status, orders(created_at)"
    )
    .eq("settlement_id", id)
    .order("created_at", { ascending: true });
  if (lErr) throw lErr;

  const mapped: SettlementLine[] = (lines ?? []).map((l) => {
    const ord = l.orders as
      | { created_at: string }
      | { created_at: string }[]
      | null;
    const createdAt = Array.isArray(ord)
      ? ord[0]?.created_at
      : ord?.created_at;
    const paymentMethod = asMethod(l.payment_method as string | null);
    const paymentStatus = asPayStatus(l.payment_status as string | null);
    const remitsVendor =
      paymentMethod === "online" && paymentStatus === "paid";
    return {
      orderId: l.order_id as string,
      code: shortOrderId(l.order_id as string),
      foodGross: Number(l.food_gross) || 0,
      commission: Number(l.commission) || 0,
      vendorNet: Number(l.vendor_net) || 0,
      contribution: Number(l.contribution) || 0,
      refundRecovered: Number(l.refund_recovered) || 0,
      paymentMethod,
      paymentStatus,
      remitsVendor,
      deliveredAt: createdAt ?? "",
    };
  });

  return {
    id: data.id as string,
    restaurantId: data.restaurant_id as string,
    restaurantName: rest.name?.trim() || "Restaurant",
    periodStart: data.period_start as string,
    periodEnd: data.period_end as string,
    periodLabel: periodLabel(
      data.period_start as string,
      data.period_end as string
    ),
    foodGross: Number(data.food_gross) || 0,
    commission: Number(data.commission) || 0,
    refundsRecovered: Number(data.refunds_recovered) || 0,
    netPayable: Number(data.net_payable) || 0,
    status: data.status as SettlementStatus,
    orderCount: mapped.length,
    createdAt: data.created_at as string,
    paidAt: (data.paid_at as string | null) ?? null,
    paymentRef: (data.payment_ref as string | null) ?? null,
    notes: (data.notes as string | null) ?? null,
    createdBy: (data.created_by as string | null) ?? null,
    paidBy: (data.paid_by as string | null) ?? null,
    voidedAt: (data.voided_at as string | null) ?? null,
    payout: payoutFrom(rest, platformDefault),
    lines: mapped,
  };
}

export async function markSettlementPaid(input: {
  id: string;
  adminId: string;
  paymentRef: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!UUID_RE.test(input.id)) return { error: "Invalid settlement." };
  const ref = input.paymentRef.trim();
  if (!ref) return { error: "Enter the UTR / payment reference." };

  const supabase = createAdminClient();
  const { data: row, error: gErr } = await supabase
    .from("vendor_settlements")
    .select("id, status, net_payable")
    .eq("id", input.id)
    .maybeSingle();
  if (gErr) throw gErr;
  if (!row) return { error: "Settlement not found." };
  if (row.status !== "draft") {
    return { error: "Only a draft settlement can be marked paid." };
  }
  if (Number(row.net_payable) < 0) {
    return {
      error:
        "Net is negative (vendor owes the platform). Collect that separately — do not mark as paid out.",
    };
  }

  const { error } = await supabase
    .from("vendor_settlements")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: input.adminId,
      payment_ref: ref,
    })
    .eq("id", input.id)
    .eq("status", "draft");
  if (error) throw error;
  return { ok: true };
}

/**
 * Void a draft: delete order lines so those orders can be resettled, keep the
 * header with status=void for the audit trail.
 */
export async function voidSettlement(input: {
  id: string;
  adminId: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!UUID_RE.test(input.id)) return { error: "Invalid settlement." };
  const supabase = createAdminClient();
  const { data: row, error: gErr } = await supabase
    .from("vendor_settlements")
    .select("id, status")
    .eq("id", input.id)
    .maybeSingle();
  if (gErr) throw gErr;
  if (!row) return { error: "Settlement not found." };
  if (row.status !== "draft") {
    return { error: "Only a draft settlement can be voided." };
  }

  const { error: dErr } = await supabase
    .from("vendor_settlement_orders")
    .delete()
    .eq("settlement_id", input.id);
  if (dErr) throw dErr;

  const { error } = await supabase
    .from("vendor_settlements")
    .update({
      status: "void",
      voided_at: new Date().toISOString(),
      voided_by: input.adminId,
    })
    .eq("id", input.id)
    .eq("status", "draft");
  if (error) throw error;
  return { ok: true };
}

/** Vendors for the settlement picker — active shops, name order. */
export async function listSettlementVendors(): Promise<
  {
    id: string;
    name: string;
    commissionPct: number;
    inheritsPlatformRate: boolean;
  }[]
> {
  const supabase = createAdminClient();
  const [{ data, error }, platformDefault] = await Promise.all([
    supabase
      .from("restaurants")
      .select("id, name, commission_pct, status")
      .in("status", ["active", "inactive", "pending"])
      .order("name", { ascending: true })
      .limit(500),
    getVendorCommissionDefault(),
  ]);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: (r.name as string)?.trim() || "Restaurant",
    commissionPct: effectiveCommissionPct(
      r.commission_pct as number | null,
      platformDefault
    ),
    // The picker distinguishes the two so an admin can see at a glance which
    // vendors will move when the platform rate changes.
    inheritsPlatformRate: r.commission_pct === null,
  }));
}

export async function getSettlementStats(): Promise<SettlementStats> {
  const supabase = createAdminClient();
  const monday = startOfIstWeek(new Date());

  const { count: draftCount, error: dErr } = await supabase
    .from("vendor_settlements")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft");
  if (dErr) throw dErr;

  const { data: paidRows, error: pErr } = await supabase
    .from("vendor_settlements")
    .select("net_payable")
    .eq("status", "paid")
    .gte("paid_at", monday.toISOString());
  if (pErr) throw pErr;

  const paidThisWeekAmount = (paidRows ?? []).reduce(
    (sum, r) => sum + (Number(r.net_payable) || 0),
    0
  );

  const { data: settledLines, error: sErr } = await supabase
    .from("vendor_settlement_orders")
    .select("order_id");
  if (sErr) throw sErr;
  const settledIds = new Set(
    (settledLines ?? []).map((l) => l.order_id as string)
  );

  const { data: onlineOrders, error: oErr } = await supabase
    .from("orders")
    .select(
      "id, total, delivery_fee, tax_amount, tip, payment_method, payment_status"
    )
    .eq("status", "delivered")
    .eq("payment_method", "online")
    .eq("payment_status", "paid")
    .limit(2000);

  if (oErr) {
    // Database predating 0025 — no payment columns.
    return {
      draftCount: draftCount ?? 0,
      paidThisWeek: paidRows?.length ?? 0,
      paidThisWeekAmount,
      unsettledOnlineVolume: 0,
      unsettledOrderCount: 0,
    };
  }

  const unsettled = (onlineOrders ?? []).filter(
    (o) => !settledIds.has(o.id as string)
  );
  let unsettledOnlineVolume = 0;
  for (const o of unsettled) {
    // Food gross held by the platform — exact net (after commission) is on preview.
    unsettledOnlineVolume += Math.max(
      0,
      (Number(o.total) || 0) -
        (Number(o.delivery_fee) || 0) -
        (Number(o.tax_amount) || 0) -
        (Number(o.tip) || 0)
    );
  }

  return {
    draftCount: draftCount ?? 0,
    paidThisWeek: paidRows?.length ?? 0,
    paidThisWeekAmount,
    unsettledOnlineVolume,
    unsettledOrderCount: unsettled.length,
  };
}
