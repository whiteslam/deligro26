import { AdminHero } from "@/components/admin/admin-ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  buildReport,
  defaultRange,
  listReportVendors,
  REPORT_KINDS,
  type PaymentFilter,
  type ReportKind,
} from "@/lib/data-access/admin-reports";
import { ReportFilters } from "./report-filters";
import { ReportExport } from "./report-export";

/**
 * Admin → Reports.
 *
 * Five reports, one screen, one set of filters. Everything a shop owner or the
 * platform owner needs to close their books, in the same plain words the rest
 * of the console now uses — "Customer paid", not "GMV"; "Shop earned", not
 * "vendor net".
 *
 * Every money figure is produced by the same arithmetic the settlement screen
 * uses (`@/lib/settlements/math`), so a report and a payout statement covering
 * the same orders agree to the rupee.
 */
export const dynamic = "force-dynamic";

const money = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function isKind(v: string | undefined): v is ReportKind {
  return REPORT_KINDS.some((r) => r.value === v);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string;
    from?: string;
    to?: string;
    vendor?: string;
    payment?: string;
  }>;
}) {
  const sp = await searchParams;
  const kind: ReportKind = isKind(sp.kind) ? sp.kind : "sales";
  const fallback = defaultRange();
  const from = sp.from || fallback.from;
  const to = sp.to || fallback.to;
  const vendorId = sp.vendor ?? "";
  const payment: PaymentFilter =
    sp.payment === "cod" || sp.payment === "online" ? sp.payment : "all";

  if (!isSupabaseConfigured) {
    return (
      <AdminHero
        title="Reports"
        subtitle="Connect Supabase to build reports."
      />
    );
  }

  const vendors = await listReportVendors().catch(() => []);
  const result = await buildReport({
    kind,
    from,
    to,
    vendorId: vendorId || undefined,
    payment,
  }).catch(() => ({
    error: "Could not build that report. Try a shorter date range.",
  }));

  const error = "error" in result ? result.error : null;
  const report = "error" in result ? null : result;
  const blurb = REPORT_KINDS.find((r) => r.value === kind)?.blurb ?? "";

  return (
    <>
      <AdminHero title="Reports" subtitle={blurb} />

      <ReportFilters
        vendors={vendors}
        kind={kind}
        from={from}
        to={to}
        vendorId={vendorId}
        payment={payment}
      />

      {error ? (
        <p className="rounded-xl border border-deal/30 bg-deal-soft px-3.5 py-3 text-sm text-deal">
          {error}
        </p>
      ) : null}

      {report ? (
        <div className="space-y-4">
          {/* The printed page needs its own heading: the console chrome is
              hidden by print CSS, so without this a saved PDF is a table with
              no idea what it is a table of. */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[19px] font-bold tracking-[-0.02em] text-ink">
                {report.title}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted">{report.subtitle}</p>
            </div>
            <ReportExport report={report} />
          </div>

          {report.empty ? (
            <p className="rounded-xl border border-line bg-surface-2 px-3.5 py-8 text-center text-sm text-muted">
              Nothing to report for these dates. Try a wider range, or a
              different shop.
            </p>
          ) : (
            <>
              {/* Same construction as KpiStrip: the container border draws the
                  rounded outline, the 1px gaps draw the dividers, and nothing
                  paints a square ring over the corners. */}
              <div className="flex flex-wrap gap-px overflow-hidden rounded-xl border border-line bg-[var(--line)]">
                {report.highlights.map((h) => (
                  <div
                    key={h.label}
                    className="flex min-w-0 flex-1 basis-48 flex-col gap-1.5 bg-surface px-4 py-3.5"
                  >
                    <span className="text-[11.5px] font-semibold leading-tight text-muted">
                      {h.label}
                    </span>
                    <span className="text-data truncate text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums text-ink">
                      {h.value}
                    </span>
                    {h.note ? (
                      <span className="truncate text-[11px] text-muted">
                        {h.note}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <caption className="sr-only">{report.title}</caption>
                  <thead className="border-b border-line bg-surface-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    <tr>
                      {report.table.columns.map((c) => (
                        <th
                          key={c.key}
                          className={`px-3 py-2.5 ${c.align === "right" ? "text-right" : ""}`}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.table.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-line last:border-0"
                      >
                        {report.table.columns.map((c) => (
                          <td
                            key={c.key}
                            className={`px-3 py-2.5 ${
                              c.align === "right"
                                ? "text-right tabular-nums"
                                : ""
                            }`}
                          >
                            {c.money
                              ? money(Number(row[c.key]) || 0)
                              : (row[c.key] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {report.table.totals ? (
                    <tfoot>
                      <tr className="border-t-2 border-line bg-surface-2 font-semibold text-ink">
                        {report.table.columns.map((c) => (
                          <td
                            key={c.key}
                            className={`px-3 py-2.5 ${
                              c.align === "right"
                                ? "text-right tabular-nums"
                                : ""
                            }`}
                          >
                            {c.money
                              ? money(Number(report.table.totals![c.key]) || 0)
                              : (report.table.totals![c.key] ?? "")}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
