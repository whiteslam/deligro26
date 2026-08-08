"use client";

import { useEffect } from "react";
import { TriangleAlert, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for the admin section.
 *
 * Scoped here so a failed screen renders inside the admin shell — the layout
 * supplies `.device` / `.app-shell`, so this must not add its own — leaving the
 * operator in the portal instead of dropping them on a bare full-page error.
 *
 * The admin data layer throws rather than degrading: `getCustomerDetail` throws
 * on a failed profile read, and the probed selects in `admin-orders.ts` throw on
 * anything that is not a missing column. That is the right call — an operator
 * shown an empty order list during an outage will act on it — but it only holds
 * up if something catches the throw, which is what this is.
 *
 * `error.message` is not rendered. Next replaces it with a generic string for
 * anything thrown in a Server Component so that query text and row contents
 * cannot reach the browser; the digest is the safe half and is what ties this
 * screen to the server log.
 */
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  // Next 16 renamed this from `reset`; the old name would be undefined here and
  // the retry button would render but do nothing.
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-10 text-center">
      <span className="mb-1 grid size-12 place-items-center rounded-2xl bg-red-500/10 text-red-600">
        <TriangleAlert className="size-6" />
      </span>
      <p className="font-semibold">This screen failed to load</p>
      <p className="max-w-xs text-sm text-muted">
        The database did not answer. Nothing was changed — retrying is safe.
      </p>
      <div className="mt-3">
        <Button size="sm" variant="secondary" onClick={() => unstable_retry()}>
          <RotateCw className="size-4" /> Try again
        </Button>
      </div>
      {error.digest ? (
        <p className="text-data mt-2 text-[11px] text-muted">
          Reference: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
