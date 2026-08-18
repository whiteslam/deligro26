"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportResult } from "@/lib/reports/kinds";

/**
 * Getting a report out of the browser.
 *
 * Excel goes through SheetJS, which the project already carries for menu
 * imports — so a real .xlsx, with numbers as numbers, rather than a CSV that
 * Excel mangles the moment an order code looks like a date.
 *
 * PDF goes through the browser's own print dialogue ("Save as PDF"), not a
 * bundled PDF library. That is a deliberate trade: a PDF renderer is ~300 KB of
 * JavaScript shipped to every admin, it would need its own table layout code,
 * and its output would drift from what this page shows. Print CSS renders the
 * page the reader is already looking at, paginates properly, and costs nothing.
 * The button says "Save as PDF" because that is the option the dialogue offers.
 */
export function ReportExport({ report }: { report: ReportResult }) {
  const [busy, setBusy] = useState(false);

  const filename = `${report.kind}-report-${new Date()
    .toISOString()
    .slice(0, 10)}`;

  const toExcel = async () => {
    setBusy(true);
    try {
      // Imported on demand: SheetJS is large, and a report is usually read on
      // screen and never exported.
      const XLSX = await import("xlsx");

      const header = report.table.columns.map((c) => c.label);
      const body = report.table.rows.map((row) =>
        report.table.columns.map((c) => row[c.key] ?? "")
      );
      if (report.table.totals) {
        body.push(
          report.table.columns.map((c) => report.table.totals![c.key] ?? "")
        );
      }

      const sheet = XLSX.utils.aoa_to_sheet([
        [report.title],
        [report.subtitle],
        [],
        header,
        ...body,
      ]);
      // Column widths from the longest cell, so nothing opens as "#####".
      sheet["!cols"] = report.table.columns.map((c, i) => ({
        wch: Math.min(
          40,
          Math.max(
            c.label.length + 2,
            ...body.map((r) => String(r[i] ?? "").length + 2)
          )
        ),
      }));

      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Report");
      XLSX.writeFile(book, `${filename}.xlsx`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button type="button" size="sm" variant="secondary" onClick={toExcel} disabled={busy}>
        <Download className="size-4" />
        {busy ? "Preparing…" : "Download Excel"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => window.print()}
      >
        <Printer className="size-4" /> Save as PDF
      </Button>
    </div>
  );
}
