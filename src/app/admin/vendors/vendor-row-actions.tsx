"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Eye,
  Pencil,
  Power,
  PowerOff,
  KeyRound,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { ConfirmDialog, Modal } from "@/components/ui/confirm-dialog";
import type { VendorStatus } from "@/lib/vendor-status";
import {
  deleteVendorAction,
  resetVendorPasswordAction,
  setVendorStatusAction,
} from "./actions";

/**
 * Per-vendor controls on the admin list: view, edit, enable/disable, reset
 * password (reveals a one-time value), delete (guarded — a vendor with orders is
 * disabled, not removed). Each action runs through a transition and refreshes.
 */
export function VendorRowActions({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status: VendorStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tempPw, setTempPw] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const enabled = status === "active";

  const onToggle = () =>
    start(async () => {
      const res = await setVendorStatusAction(id, enabled ? "inactive" : "active");
      if (!res.ok && res.error) window.alert(res.error);
      router.refresh();
    });

  const onDelete = () =>
    start(async () => {
      const res = await deleteVendorAction(id);
      setConfirmDelete(false);
      if (!res.ok) {
        window.alert(res.error ?? "Couldn't delete.");
        return;
      }
      if (res.softDeleted) {
        window.alert(
          `${name} has order history, so it was disabled instead of permanently deleted.`
        );
      }
      router.refresh();
    });

  const onReset = () => {
    if (
      !window.confirm(
        `Reset ${name}'s login password? Their current password will stop working.`
      )
    ) {
      return;
    }
    start(async () => {
      const res = await resetVendorPasswordAction(id);
      if (!res.ok || !res.tempPassword) {
        window.alert(res.error ?? "Couldn't reset the password.");
        return;
      }
      setCopied(false);
      setTempPw(res.tempPassword);
    });
  };

  const copyPw = async () => {
    if (!tempPw) return;
    try {
      await navigator.clipboard.writeText(tempPw);
      setCopied(true);
    } catch {
      // Clipboard blocked — the operator can still read and type it.
    }
  };

  const btn =
    "press grid size-9 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink disabled:opacity-50";

  return (
    <div className="flex items-center gap-1.5">
      <Link href={`/admin/vendors/${id}`} className={btn} title="View" aria-label="View vendor">
        <Eye className="size-4" />
      </Link>
      <Link
        href={`/admin/vendors/${id}/edit`}
        className={btn}
        title="Edit"
        aria-label="Edit vendor"
      >
        <Pencil className="size-4" />
      </Link>
      <button
        type="button"
        className={btn}
        disabled={pending}
        title={enabled ? "Disable" : "Enable"}
        aria-label={enabled ? "Disable vendor" : "Enable vendor"}
        onClick={onToggle}
      >
        {enabled ? <PowerOff className="size-4" /> : <Power className="size-4" />}
      </button>
      <button
        type="button"
        className={btn}
        disabled={pending}
        title="Reset password"
        aria-label="Reset vendor password"
        onClick={onReset}
      >
        <KeyRound className="size-4" />
      </button>
      <button
        type="button"
        className={`${btn} hover:bg-deal/10 hover:text-deal`}
        disabled={pending}
        title="Delete"
        aria-label="Delete vendor"
        onClick={() => setConfirmDelete(true)}
      >
        <Trash2 className="size-4" />
      </button>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete vendor?"
        message={
          <>
            This permanently removes <b className="text-ink">{name}</b> and its
            menu. A vendor with order history is disabled instead, to keep its
            records intact.
          </>
        }
        confirmLabel="Delete"
        danger
        busy={pending}
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(false)}
      />

      <Modal
        open={tempPw !== null}
        onClose={() => {
          setTempPw(null);
          setCopied(false);
        }}
        title="Temporary password"
      >
        <p className="text-sm text-muted">
          Share this with <b className="text-ink">{name}</b> now — it isn&apos;t
          stored and won&apos;t be shown again.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-2 p-2.5">
          <code className="text-data flex-1 truncate px-1 text-[15px] font-semibold text-ink">
            {tempPw}
          </code>
          <button
            type="button"
            onClick={copyPw}
            className="press grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-muted hover:text-ink"
            aria-label="Copy password"
          >
            {copied ? (
              <Check className="size-4 text-green" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
