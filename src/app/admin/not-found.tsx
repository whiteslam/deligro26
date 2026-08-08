import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/admin/admin-ui";

/**
 * 404 inside the admin section.
 *
 * Scoped here rather than left to the root `not-found.tsx` so it renders inside
 * the admin layout — which already supplies the `.device` / `.app-shell`
 * chrome, so this must not wrap itself in another one — and keeps the operator
 * in the portal with the tab bar still under them.
 *
 * This is a routine screen, not an edge case: `/admin/orders/[id]` and
 * `/admin/customers/[id]` both call `notFound()` for an id that does not exist,
 * one that is not a uuid, and (for customers) one belonging to a non-customer
 * profile. All three answer identically on purpose, so the page never confirms
 * that an id exists somewhere else in the system.
 */
export default function AdminNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Not found"
      description="This record doesn't exist, or it has been removed since the link was made."
      action={
        <Link
          href="/admin"
          className="press inline-flex h-10 items-center justify-center rounded-full bg-surface-2 px-4 text-sm font-semibold text-ink"
        >
          Back to dashboard
        </Link>
      }
    />
  );
}
