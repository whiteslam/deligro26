import { AdminHero } from "@/components/admin/admin-ui";
import { ConsoleOnly } from "@/components/admin/console-only";
import { DataTable, type Column } from "@/components/admin/data-table";
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
 *
 * ## What a phone gets
 *
 * The figures and the rows, not the exports. Reading last week's takings on the
 * way to a shop is a real thing an operator does, so nothing read-only is taken
 * away; the table goes through `DataTable`, which stacks into cards below the
 * console breakpoint instead of scrolling a 640px slab sideways in a 370px
 * column.
 *
 * The Excel and Save-as-PDF buttons are console-only. An .xlsx that lands in a
 * phone's downloads folder is not a file anybody is going to do anything with,
 * and "Save as PDF" is a desktop print dialogue. That is a presentation
 * decision like every other `ConsoleOnly`: the report data is admin-gated
 * server-side and none of that changes.
 */
export const dynamic = "force-dynamic";

const money = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** A report's rows are shaped by its kind, so the columns are built per report. */
type ReportRow = Record<string, string | number>;

function cellValue(row: ReportRow, key: string, isMoney?: boolean) {
  return isMoney ? money(Number(row[key]) || 0) : (row[key] ?? "—");
}

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
            <ConsoleOnly tool="Exporting a report" notice={false}>
              <ReportExport report={report} />
            </ConsoleOnly>
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

              <DataTable<ReportRow>
                caption={report.title}
                columns={report.table.columns.map((c, i): Column<ReportRow> => ({
                  key: c.key,
                  header: c.label,
                  align: c.align,
                  // The first column names the row; in a card it is the
                  // headline, and every other column becomes a labelled line.
                  role: i === 0 ? "title" : undefined,
                  cell: (row) => cellValue(row, c.key, c.money),
                }))}
                // Keyed by position: a report's first column is a date, a shop
                // name or an order code depending on the kind, and only some of
                // those are unique.
                rows={report.table.rows.map((row, i) => ({ ...row, __row: i }))}
                rowKey={(row) => String(row.__row)}
                minWidth={640}
                totals={
                  report.table.totals
                    ? {
                        // Only columns the report actually totals. A cell left
                        // out lets DataTable put its "Total" label in the first
                        // column, where an em-dash would otherwise sit.
                        cells: Object.fromEntries(
                          report.table.columns
                            .filter(
                              (c) => report.table.totals?.[c.key] !== undefined
                            )
                            .map((c) => [
                              c.key,
                              cellValue(report.table.totals!, c.key, c.money),
                            ])
                        ),
                      }
                    : undefined
                }
              />
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
