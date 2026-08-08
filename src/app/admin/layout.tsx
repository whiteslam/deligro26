import { AdminShell } from "@/components/admin/admin-shell";
import { getProfile, requireRole } from "@/lib/auth";
import { requireOperatorMfa } from "@/lib/auth/mfa";
import {
  getAdminNavCounts,
  type AdminNavCounts,
} from "@/lib/data-access/admin-stats";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const NO_COUNTS: AdminNavCounts = {
  pendingApprovals: 0,
  pendingRefunds: 0,
  liveOrders: 0,
};

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
  const [counts, profile] = await Promise.all([
    isSupabaseConfigured
      ? getAdminNavCounts().catch(() => NO_COUNTS)
      : Promise.resolve(NO_COUNTS),
    getProfile().catch(() => null),
  ]);

  return (
    <AdminShell counts={counts} name={profile?.full_name?.trim() || "Admin"}>
      {children}
    </AdminShell>
  );
}
