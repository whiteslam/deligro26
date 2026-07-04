import { RoleTopBar } from "@/components/roles/role-ui";
import { requireRole } from "@/lib/auth";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("driver"); // delivery partners only
  return (
    <div className="dashboard-shell">
      <RoleTopBar role="Driver partner" accent="var(--blue)" />
      <main className="dashboard-main max-w-[640px]">{children}</main>
    </div>
  );
}
