import "server-only";
import { createClient } from "@/lib/supabase/server";
import { onlinePaymentsEnabled } from "@/lib/payments/availability";
import {
  DEFAULT_PAYMENT_RULES,
  type VendorPaymentRules,
} from "@/lib/payments/cod-rules";
import {
  columnKnownMissing,
  isMissingColumn,
  rememberColumn,
} from "@/lib/data-access/schema-probe";

/**
 * Resolve a shop's payment rules, with the platform gate already applied.
 *
 * `acceptOnline` that comes back from here is the AND of three facts — the
 * vendor's switch, the admin's platform switch, and the Razorpay keys being
 * present. Callers get one boolean and cannot accidentally honour the vendor's
 * half without the platform's: a shop that says "yes, online" on a keyless
 * environment would otherwise be offered a checkout that dead-ends, which is
 * the fail-open shape AGENTS.md §2 rules out.
 *
 * Cash is the safe fallback in the other direction. Before migration 0034 the
 * columns do not exist, so the answer is DEFAULT_PAYMENT_RULES — both methods,
 * no ceiling — which is exactly how the app behaved before this feature. A
 * missing migration must not start refusing orders.
 */

const RULE_COLUMNS = "restaurants.accept_cod";

interface RuleRow {
  accept_cod?: boolean | null;
  accept_online?: boolean | null;
  cod_max_order?: number | null;
}

function mapRules(row: RuleRow | null, onlineOffered: boolean): VendorPaymentRules {
  return {
    acceptCod: row?.accept_cod ?? true,
    // The vendor switch can only ever narrow what the platform already offers.
    acceptOnline: onlineOffered && (row?.accept_online ?? true),
    codMaxOrder: Math.max(0, Math.round(Number(row?.cod_max_order ?? 0))),
  };
}

async function fetchRules(
  column: "id" | "slug",
  value: string
): Promise<VendorPaymentRules> {
  const [supabase, onlineOffered] = await Promise.all([
    createClient(),
    onlinePaymentsEnabled(),
  ]);

  if (columnKnownMissing(RULE_COLUMNS)) {
    return { ...DEFAULT_PAYMENT_RULES, acceptOnline: onlineOffered };
  }

  const { data, error } = await supabase
    .from("restaurants")
    .select("accept_cod, accept_online, cod_max_order")
    .eq(column, value)
    .maybeSingle();

  if (error) {
    if (isMissingColumn(error)) {
      rememberColumn(RULE_COLUMNS, false);
      return { ...DEFAULT_PAYMENT_RULES, acceptOnline: onlineOffered };
    }
    throw error;
  }

  rememberColumn(RULE_COLUMNS, true);
  return mapRules(data as RuleRow | null, onlineOffered);
}

export function getVendorPaymentRules(
  restaurantId: string
): Promise<VendorPaymentRules> {
  return fetchRules("id", restaurantId);
}

export function getVendorPaymentRulesBySlug(
  slug: string
): Promise<VendorPaymentRules> {
  return fetchRules("slug", slug);
}
