import { AdminShell } from "@/components/admin/admin-shell";
import { getProfile, requireRole } from "@/lib/auth";
import { requireOperatorMfa } from "@/lib/auth/mfa";
import {
  getAdminNavCounts,
  type AdminNavCounts,
} from "@/lib/data-access/admin-stats";
import { getConsoleHealth, type ConsoleHealth } from "@/lib/console-health";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const NO_COUNTS: AdminNavCounts = {
  pendingApprovals: 0,
  pendingRefunds: 0,
  liveOrders: 0,
};

/** Nothing configured reads as "nothing configured", never as healthy. */
const NO_HEALTH: ConsoleHealth = {
  ok: false,
  rows: [{ label: "Database", value: "Not configured", ok: false }],
};

/**
 * The operator's own email, for the rail's account row. `profiles` does not
 * carry one — it lives on the auth user — and this is chrome, so a failure
 * here drops the line rather than the page.
 */
async function operatorEmail(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? null;
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin");
  await requireOperatorMfa("/admin", "admin"); // opt-in: challenges enrolled admins, lets others through

  // The console's badges and its "signed in as". Both are chrome: a failure
  // here must not take the page under it down, so counts fall back to zero
  // (nothing to do) and the name to a neutral label — never to someone else's.
  const [counts, profile, email, health] = await Promise.all([
    isSupabaseConfigured
      ? getAdminNavCounts().catch(() => NO_COUNTS)
      : Promise.resolve(NO_COUNTS),
    getProfile().catch(() => null),
    operatorEmail(),
    getConsoleHealth().catch(() => NO_HEALTH),
  ]);

  return (
    <AdminShell
      counts={counts}
      health={health}
      name={profile?.full_name?.trim() || "Admin"}
      email={email}
    >
      {children}
    </AdminShell>
  );
}
