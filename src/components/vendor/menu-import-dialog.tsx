"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importMenuCsvAction } from "@/app/vendor/actions";
import {
  downloadTextFile,
  menuTemplateCsv,
  parseMenuCsv,
  type ParsedMenuCsvRow,
} from "@/lib/vendor/menu-csv";

export function MenuImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [rows, setRows] = useState<ParsedMenuCsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<
    { line: number; message: string }[]
  >([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const preview = useMemo(() => rows.slice(0, 8), [rows]);
  const withId = rows.filter((r) => r.externalId).length;
  const withoutId = rows.length - withId;

  if (!open) return null;

  function reset() {
    setRows([]);
    setParseErrors([]);
    setFileName(null);
    setResultMsg(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    setError(null);
    setResultMsg(null);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseMenuCsv(text);
    setRows(parsed.rows);
    setParseErrors(parsed.errors);
  }

  function handleImport() {
    if (rows.length === 0) {
      setError("No valid rows to import.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await importMenuCsvAction(
          rows.map((r) => ({
            externalId: r.externalId,
            name: r.name,
            category: r.category,
            price: r.price,
            description: r.description,
            veg: r.veg,
            available: r.available,
            popular: r.popular,
            bestseller: r.bestseller,
            imageUrl: r.imageUrl,
          }))
        );
        setResultMsg(
          `Imported: ${result.created} created, ${result.updated} updated` +
            (result.failed ? `, ${result.failed} failed` : "")
        );
        onImported();
      } catch {
        setError("Import failed. Check the sheet and try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div
        className="card flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:max-h-[90vh] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-import-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <div>
            <h2 id="menu-import-title" className="text-lg font-bold">
              Import from sheet
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Download the template, fill in Excel/Sheets, then upload CSV.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="press rounded-full p-2 text-muted"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                downloadTextFile("deligro-menu-template.csv", menuTemplateCsv())
              }
            >
              <Download className="size-4" /> Download template
            </Button>
            <label className="press inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-semibold">
              <Upload className="size-4" />
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {fileName ? (
            <p className="inline-flex items-center gap-2 text-xs text-muted">
              <FileSpreadsheet className="size-3.5" />
              {fileName}
            </p>
          ) : null}

          {rows.length > 0 ? (
            <div className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
              <p className="font-semibold">
                {rows.length} valid row{rows.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-xs text-muted">
                ~{withId} with external_id (update if exists) · {withoutId} new
                inserts
              </p>
            </div>
          ) : null}

          {parseErrors.length > 0 ? (
            <ul className="max-h-28 space-y-1 overflow-y-auto rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-500">
              {parseErrors.slice(0, 12).map((e, i) => (
                <li key={`${e.line}-${i}`}>
                  {e.line > 0 ? `Line ${e.line}: ` : ""}
                  {e.message}
                </li>
              ))}
            </ul>
          ) : null}

          {preview.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[28rem] text-left text-xs">
                <thead className="bg-surface-2 text-muted">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Name</th>
                    <th className="px-2 py-2 font-semibold">Category</th>
                    <th className="px-2 py-2 font-semibold">₹</th>
                    <th className="px-2 py-2 font-semibold">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={`${r.line}-${r.name}`} className="border-t border-line">
                      <td className="px-2 py-2 font-medium">{r.name}</td>
                      <td className="px-2 py-2 text-muted">{r.category}</td>
                      <td className="text-data px-2 py-2">{r.price}</td>
                      <td className="px-2 py-2 text-muted">
                        {r.externalId ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > preview.length ? (
                <p className="border-t border-line px-2 py-2 text-[11px] text-muted">
                  +{rows.length - preview.length} more rows
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {resultMsg ? (
            <p className="text-sm font-semibold text-green">{resultMsg}</p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-line p-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Close
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={pending || rows.length === 0}
            onClick={handleImport}
          >
            {pending ? "Importing…" : `Import ${rows.length || ""}`.trim()}
          </Button>
        </div>
      </div>
    </div>
  );
}
