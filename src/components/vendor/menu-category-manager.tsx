"use client";

import { useMemo, useState, useTransition } from "react";
import { Layers, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  mergeCategoryAction,
  renameCategoryAction,
} from "@/app/vendor/actions";

export function MenuCategoryManager({
  open,
  categories,
  itemCounts,
  onClose,
  onChanged,
}: {
  open: boolean;
  categories: string[];
  itemCounts: Record<string, number>;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState("");
  const [mergeInto, setMergeInto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const others = useMemo(
    () => categories.filter((c) => c !== selected),
    [categories, selected]
  );

  if (!open) return null;

  function pick(cat: string) {
    setSelected(cat);
    setRenameTo(cat);
    setMergeInto(categories.find((c) => c !== cat) ?? "");
    setError(null);
  }

  function handleRename() {
    if (!selected) return;
    const next = renameTo.trim();
    if (!next) {
      setError("Enter a new category name.");
      return;
    }
    if (next === selected) {
      setError("Name is unchanged.");
      return;
    }
    startTransition(async () => {
      try {
        await renameCategoryAction(selected, next);
        setSelected(next);
        onChanged();
      } catch {
        setError("Could not rename category.");
      }
    });
  }

  function handleMerge() {
    if (!selected || !mergeInto.trim()) {
      setError("Pick a target category to merge into.");
      return;
    }
    if (mergeInto === selected) {
      setError("Pick a different category.");
      return;
    }
    if (
      !confirm(
        `Merge “${selected}” into “${mergeInto}”? All items move; the old name disappears.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await mergeCategoryAction(selected, mergeInto.trim());
        setSelected(mergeInto.trim());
        setRenameTo(mergeInto.trim());
        onChanged();
      } catch {
        setError("Could not merge categories.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div
        className="card flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:max-h-[90vh] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-cat-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-blue/12 text-blue">
              <Layers className="size-4" />
            </span>
            <div>
              <h2 id="menu-cat-title" className="text-lg font-bold">
                Manage categories
              </h2>
              <p className="text-xs text-muted">Rename or merge groups</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press rounded-full p-2 text-muted"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-label">Categories</p>
            {categories.length === 0 ? (
              <p className="text-sm text-muted">No categories yet.</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {categories.map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => pick(cat)}
                      className={`press flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${
                        selected === cat
                          ? "border-accent bg-accent/10 font-semibold"
                          : "border-line bg-surface-2"
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      <span className="text-data text-xs text-muted">
                        {itemCounts[cat] ?? 0}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4">
            {selected ? (
              <>
                <div className="space-y-2">
                  <p className="text-label">Rename “{selected}”</p>
                  <input
                    value={renameTo}
                    onChange={(e) => setRenameTo(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    disabled={pending}
                    onClick={handleRename}
                  >
                    Save name
                  </Button>
                </div>

                {others.length > 0 ? (
                  <div className="space-y-2 border-t border-line pt-4">
                    <p className="text-label">Merge into another category</p>
                    <select
                      value={mergeInto}
                      onChange={(e) => setMergeInto(e.target.value)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                    >
                      {others.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={pending}
                      onClick={handleMerge}
                    >
                      Merge items
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    Add another category (via an item) to enable merge.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">
                Select a category to rename or merge.
              </p>
            )}

            {error ? <p className="text-sm text-red-500">{error}</p> : null}
          </div>
        </div>

        <div className="border-t border-line p-4">
          <Button type="button" variant="outline" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
