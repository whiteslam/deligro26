import { ManagerShell } from "@/components/manager/manager-shell";
import { requireRole } from "@/lib/auth";
import { resolveShellMode } from "@/lib/shell-mode.server";

/**
 * The Manager / Sub-Admin portal.
 *
 * Managers work from a phone at a gate and from a desk in an ops room, so this
 * carries the same app ↔ web switch as admin and vendor rather than forcing one
 * of them. It used to be `.device` unconditionally: an admin (this layout
 * admits them) or a manager on a laptop got a 402px iPhone mock with no way
 * out. See `ManagerShell`.
 *
 * The shell is resolved server-side so the console is the console in the first
 * byte of HTML — never a phone frame that swaps after hydration.
 */
export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, shellMode] = await Promise.all([
    requireRole(["manager", "admin"]),
    resolveShellMode("manager"),
  ]);

  return <ManagerShell initialMode={shellMode}>{children}</ManagerShell>;
}
