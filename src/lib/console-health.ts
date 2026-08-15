import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import { settingsBackendReady } from "@/lib/settings";

/**
 * What the sidebar's system card reports.
 *
 * The redesign puts a health block at the foot of the rail. The design's demo
 * copy for it was "Dispatch latency 1.2s / Webhook queue 3" — neither of which
 * this platform measures, and a health indicator that reports an invented
 * figure is worse than no health indicator at all: it is a green light wired to
 * nothing.
 *
 * So the card reports what is actually knowable without a probe request: which
 * of the three backing services this deployment is configured against. That is
 * a real answer to "why is the console behaving oddly" — an operator seeing
 * "Payments: not configured" knows immediately why refunds will not reverse.
 *
 * These are configuration facts, not liveness checks. Nothing here opens a
 * socket, so it is safe to run on every admin page render.
 */
export interface HealthRow {
  label: string;
  value: string;
  ok: boolean;
}

export interface ConsoleHealth {
  /** True when every row is ok — drives the card's headline and dot. */
  ok: boolean;
  rows: HealthRow[];
}

export async function getConsoleHealth(): Promise<ConsoleHealth> {
  // A failed probe reports "unknown", never "fine". Failing open on a health
  // check is the same mistake as failing open on an auth check.
  const settingsReady = await settingsBackendReady().catch(() => false);

  const rows: HealthRow[] = [
    {
      label: "Database",
      value: isSupabaseConfigured ? "Connected" : "Not configured",
      ok: isSupabaseConfigured,
    },
    {
      label: "Payments",
      value: isRazorpayConfigured ? "Live keys" : "Not configured",
      ok: isRazorpayConfigured,
    },
    {
      label: "Settings store",
      value: settingsReady ? "Migrated" : "Preview",
      ok: settingsReady,
    },
  ];

  return { ok: rows.every((r) => r.ok), rows };
}
