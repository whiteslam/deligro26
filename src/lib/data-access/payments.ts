import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  notifyPaymentFailed,
  notifyVendorNewOrder,
} from "@/lib/notifications/order-events";
import type { PaymentStatus } from "@/types";

/**
 * Payment records (migration 0025).
 *
 * Reads ride RLS — a customer sees their own order's payments and nothing else.
 * Writes go through the service role, because `payments` deliberately has no
 * INSERT/UPDATE policy: the only thing allowed to say an order is paid is code
 * that has just verified a Razorpay signature. Every `createAdminClient()` call
 * below therefore has a signature check or an ownership check above it in the
 * same path — see the route handlers in src/app/api/payments/razorpay/.
 */

export interface OrderPaymentContext {
  id: string;
  total: number;
  status: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
}

export class PaymentsNotMigratedError extends Error {
  constructor() {
    super("payments_not_migrated");
    this.name = "PaymentsNotMigratedError";
  }
}

function isMissingRelation(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST205" ||
    msg.includes("schema cache")
  );
}

/**
 * The order a payment is being taken for, scoped by RLS to the caller.
 *
 * Returns null when the order does not exist OR is not the caller's — the two
 * are indistinguishable on purpose, so the endpoint cannot be used to probe
 * which order ids exist.
 */
export async function getOrderPaymentContext(
  orderId: string
): Promise<OrderPaymentContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, total, status, payment_method, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) throw new PaymentsNotMigratedError();
    throw error;
  }
  if (!data) return null;

  return {
    id: data.id as string,
    total: Number(data.total ?? 0),
    status: String(data.status ?? ""),
    paymentMethod: String(data.payment_method ?? "cod"),
    paymentStatus: (data.payment_status ?? "pending") as PaymentStatus,
  };
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  providerOrderId: string;
  providerPaymentId: string | null;
  amountPaise: number;
  currency: string;
  status: PaymentStatus;
}

function mapPayment(row: Record<string, unknown>): PaymentRecord {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    providerOrderId: row.provider_order_id as string,
    providerPaymentId: (row.provider_payment_id as string | null) ?? null,
    amountPaise: Number(row.amount_paise ?? 0),
    currency: String(row.currency ?? "INR"),
    status: (row.status ?? "pending") as PaymentStatus,
  };
}

/**
 * An existing unpaid attempt for this order and amount, if there is one.
 *
 * Double-tapping "Pay" must not mint a second Razorpay order for the same
 * money: the first one stays open, both can be paid, and reconciling that is a
 * refund conversation. The amount is part of the match because a changed total
 * is a different bill and genuinely needs a new attempt.
 */
export async function findReusablePayment(
  orderId: string,
  amountPaise: number
): Promise<PaymentRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, order_id, provider_order_id, provider_payment_id, amount_paise, currency, status"
    )
    .eq("order_id", orderId)
    .eq("amount_paise", amountPaise)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) throw new PaymentsNotMigratedError();
    throw error;
  }
  return data ? mapPayment(data) : null;
}

/**
 * The payment attempt behind a Razorpay order id.
 *
 * The verify route needs this to confirm the signed provider order actually
 * belongs to the Deligro order being settled. Without that check a customer
 * could pay for a ₹50 order, then replay the genuine (and genuinely valid)
 * signature against a ₹5,000 one — the HMAC would verify, because it says
 * nothing about which of our orders it was for.
 */
export async function findPaymentByProviderOrderId(
  providerOrderId: string
): Promise<PaymentRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, order_id, provider_order_id, provider_payment_id, amount_paise, currency, status"
    )
    .eq("provider", "razorpay")
    .eq("provider_order_id", providerOrderId)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) throw new PaymentsNotMigratedError();
    throw error;
  }
  return data ? mapPayment(data) : null;
}

/** Record the Razorpay order we just created, before the customer pays it. */
export async function recordPaymentIntent(input: {
  orderId: string;
  providerOrderId: string;
  amountPaise: number;
  currency: string;
}): Promise<PaymentRecord> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .insert({
      order_id: input.orderId,
      provider: "razorpay",
      provider_order_id: input.providerOrderId,
      amount_paise: input.amountPaise,
      currency: input.currency,
      status: "pending",
    })
    .select(
      "id, order_id, provider_order_id, provider_payment_id, amount_paise, currency, status"
    )
    .single();

  if (error) {
    if (isMissingRelation(error)) throw new PaymentsNotMigratedError();
    throw error;
  }
  return mapPayment(data);
}

export interface SettleInput {
  providerOrderId: string;
  providerPaymentId?: string | null;
  status: PaymentStatus;
  method?: string | null;
  signatureVerified: boolean;
  errorCode?: string | null;
  errorDescription?: string | null;
}

/**
 * Move a payment to its final state and mirror it onto the order.
 *
 * Idempotent, because it is called from two places that race by design: the
 * browser callback and the Razorpay webhook, and the webhook is retried until
 * we answer 2xx. A payment already settled as 'paid' is never walked backwards
 * — a late "failed" delivery for money we hold is a reconciliation problem, not
 * a reason to tell the customer their paid order is unpaid.
 *
 * Returns the order id the payment belongs to, or null if the provider order is
 * unknown to us (which is what a forged or foreign webhook looks like).
 */
export async function settlePayment(input: SettleInput): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: existing, error: readError } = await supabase
    .from("payments")
    .select("id, order_id, status")
    .eq("provider", "razorpay")
    .eq("provider_order_id", input.providerOrderId)
    .maybeSingle();

  if (readError) {
    if (isMissingRelation(readError)) throw new PaymentsNotMigratedError();
    throw readError;
  }
  if (!existing) return null;

  const orderId = existing.order_id as string;
  const current = existing.status as PaymentStatus;

  // Terminal-and-settled. Re-deliveries are acknowledged, not re-applied — and
  // never walked backwards, so a late 'failed' cannot un-pay a paid order.
  if (current === "paid" || current === "refunded") return orderId;
  // Nothing new to record. (`current` is non-terminal here, so this is only
  // ever pending→pending, authorized→authorized or failed→failed.)
  if (current === input.status) return orderId;

  const { error: updateError } = await supabase
    .from("payments")
    .update({
      provider_payment_id: input.providerPaymentId ?? null,
      status: input.status,
      method: input.method ?? null,
      signature_verified: input.signatureVerified,
      error_code: input.errorCode ?? null,
      error_description: input.errorDescription ?? null,
    })
    .eq("id", existing.id);

  if (updateError) throw updateError;

  // The order carries the status the rest of the app reads — the kitchen board
  // gates on it, so it has to follow the payment rather than be set beside it.
  const { error: orderError } = await supabase
    .from("orders")
    .update({ payment_status: input.status })
    .eq("id", orderId);

  if (orderError) throw orderError;

  // The money landing is what makes an online order the kitchen's problem —
  // createOrder deliberately stayed quiet for it, so the alert belongs here.
  // Only on the transition into 'paid', which the guards above make once-only.
  if (input.status === "paid") {
    void notifyVendorNewOrder(orderId);
  } else if (input.status === "failed") {
    void notifyPaymentFailed(orderId);
  }

  return orderId;
}
