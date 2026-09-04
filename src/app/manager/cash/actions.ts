"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  recordCodHandover,
  type CashHandoverLeg,
} from "@/lib/data-access/cod-handovers";
import {
  recordOperationalExpense,
  type ExpenseCategory,
  type ExpensePaymentMethod,
} from "@/lib/data-access/operational-expenses";

/**
 * Two server actions for the offline-but-recorded cash chain: a handover leg
 * (rider to manager, or manager to owner) and an operational expense (rider
 * salary, EV bike maintenance/charging, or another small cost).
 *
 * Both write to a table with no insert policy for any authenticated role —
 * every write goes through the service role from here, behind
 * requireRole(["manager", "admin"]), matching the /manager layout. Neither
 * moves money: they record that a handover or a spend happened, which is the
 * point (AGENTS.md #3: a Server Action is a public HTTP endpoint).
 */

const DEMO = "Demo mode: connect Supabase and apply migration 0047 to record cash.";

export interface CashActionResult {
  ok: boolean;
  error?: string;
}

export async function recordHandoverAction(input: {
  leg: CashHandoverLeg;
  fromUserId?: string | null;
  toUserId?: string | null;
  amount: number;
  note?: string;
}): Promise<CashActionResult> {
  const profile = await requireRole(["manager", "admin"]);
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };

  // A handful of these a day at most — well above what a real shift needs,
  // tight enough to slow a stolen session down.
  const limit = await rateLimit(`cod-handover:${profile.id}`, 30, 60_000);
  if (!limit.ok) return { ok: false, error: "Slow down a moment." };

  const result = await recordCodHandover({ ...input, recordedBy: profile.id });
  if (result.ok) revalidatePath("/manager/cash");
  return result;
}

export async function recordExpenseAction(input: {
  category: ExpenseCategory;
  amount: number;
  riderId?: string | null;
  paymentMethod: ExpensePaymentMethod;
  note?: string;
}): Promise<CashActionResult> {
  const profile = await requireRole(["manager", "admin"]);
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };

  const limit = await rateLimit(`operational-expense:${profile.id}`, 30, 60_000);
  if (!limit.ok) return { ok: false, error: "Slow down a moment." };

  const result = await recordOperationalExpense({ ...input, recordedBy: profile.id });
  if (result.ok) revalidatePath("/manager/cash");
  return result;
}
