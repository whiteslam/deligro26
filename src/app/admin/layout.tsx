import { StatusBar } from "@/components/layout/status-bar";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminTabBar } from "@/components/admin/admin-tab-bar";
import { requireRole } from "@/lib/auth";
import { requireOperatorMfa } from "@/lib/auth/mfa";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin");
  await requireOperatorMfa("/admin", "admin"); // mandatory — cannot be disabled

  return (
    <div className="device">
      <div className="app-shell">
        <div className="app-scroll no-scrollbar pb-[80px]">
          <AdminHeader />
          <div className="px-4 pb-6 pt-4">{children}</div>
        </div>
        <StatusBar />
        <AdminTabBar />
      </div>
    </div>
  );
}
