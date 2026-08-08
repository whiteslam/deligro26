import { AdminHero } from "@/components/admin/admin-ui";
import { listEmployees } from "@/lib/data-access/employees";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { EmployeesManager } from "./employees-manager";

/**
 * Settings → Team. An operator creates staff logins here: a manager (full admin
 * access) or a driver (delivery app). The list shows everyone who currently has
 * a privileged role. Reached from the Settings menu.
 */
export const dynamic = "force-dynamic";

export default async function AdminEmployeesPage() {
  const employees = isSupabaseConfigured
    ? await listEmployees().catch(() => [])
    : [];

  return (
    <div className="admin-measure space-y-5">
      <AdminHero
        backHref="/admin/settings"
        backLabel="Settings"
        title="Team"
        subtitle="Create manager &amp; driver logins, and see who has access."
      />

      <EmployeesManager employees={employees} configured={isSupabaseConfigured} />
    </div>
  );
}
