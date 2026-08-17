/**
 * What a report IS — the kinds, the filters and the shape of the result.
 *
 * Split out of `data-access/admin-reports.ts` because that module is
 * `server-only` (it holds the service-role client), and the filter bar is a
 * Client Component that needs the list of report kinds to render its tabs.
 * Importing the server module from the browser pulls the service-role key's
 * module graph into the client bundle, which is the sort of mistake the
 * `server-only` marker exists to make loud rather than subtle.
 *
 * Pure data and types. No queries, no secrets.
 */

export type ReportKind =
  | "sales"
  | "earnings"
  | "orders"
  | "average-order"
  | "settlement";

export const REPORT_KINDS: { value: ReportKind; label: string; blurb: string }[] =
  [
    {
      value: "sales",
      label: "Sales report",
      blurb: "What customers paid, day by day.",
    },
    {
      value: "earnings",
      label: "Earnings report",
      blurb: "What the platform kept, and what each shop earned.",
    },
    {
      value: "orders",
      label: "Orders report",
      blurb: "Every order, one per line.",
    },
    {
      value: "average-order",
      label: "Average order report",
      blurb: "Average value of an order, day by day.",
    },
    {
      value: "settlement",
      label: "Settlement report",
      blurb: "Payouts made to shops, and what is still owed.",
    },
  ];

export type PaymentFilter = "all" | "cod" | "online";

export interface ReportFilters {
  kind: ReportKind;
  /** Inclusive IST calendar days, "YYYY-MM-DD". */
  from: string;
  to: string;
  /** Restaurant id, or omitted for every shop. */
  vendorId?: string;
  payment?: PaymentFilter;
}

/** A report is a title, some headline figures, and a table anyone can export. */
export interface ReportTable {
  columns: { key: string; label: string; align?: "right"; money?: boolean }[];
  rows: Record<string, string | number>[];
  /** Optional totals row, rendered bold and exported as the last line. */
  totals?: Record<string, string | number>;
}

export interface ReportResult {
  kind: ReportKind;
  title: string;
  subtitle: string;
  /** Big numbers above the table. */
  highlights: { label: string; value: string; note?: string }[];
  table: ReportTable;
  /** Empty when the range has no data — the UI says so rather than showing 0s. */
  empty: boolean;
}
