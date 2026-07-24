"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteCategoryAction, setCategoryEnabledAction } from "../actions";

export function CategoryRowActions({
  id,
  name,
  enabled,
}: {
  id: string;
  name: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onToggle = () =>
    start(async () => {
      const res = await setCategoryEnabledAction(id, !enabled);
      if (!res.ok && res.error) window.alert(res.error);
      router.refresh();
    });

  const onDelete = () =>
    start(async () => {
      const res = await deleteCategoryAction(id);
      setConfirmDelete(false);
      if (!res.ok && res.error) window.alert(res.error);
      router.refresh();
    });

  const btn =
    "press grid size-9 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink disabled:opacity-50";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={btn}
        disabled={pending}
        title={enabled ? "Disable" : "Enable"}
        aria-label={enabled ? "Disable category" : "Enable category"}
        onClick={onToggle}
      >
        {enabled ? <PowerOff className="size-4" /> : <Power className="size-4" />}
      </button>
      <Link
        href={`/admin/vendors/categories/${id}`}
        className={btn}
        title="Edit"
        aria-label="Edit category"
      >
        <Pencil className="size-4" />
      </Link>
      <button
        type="button"
        className={`${btn} hover:bg-deal/10 hover:text-deal`}
        disabled={pending}
        title="Delete"
        aria-label="Delete category"
        onClick={() => setConfirmDelete(true)}
      >
        <Trash2 className="size-4" />
      </button>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete category?"
        message={
          <>
            Remove <b className="text-ink">{name}</b>? Vendors already tagged with
            it keep the label — it just stops being suggested.
          </>
        }
        confirmLabel="Delete"
        danger
        busy={pending}
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
