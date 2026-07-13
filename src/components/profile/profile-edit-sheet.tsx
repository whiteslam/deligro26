"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfileEditSheet({
  open,
  field,
  value,
  onClose,
}: {
  open: boolean;
  field: "name" | "phone";
  value: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(value);
      setError(null);
    }
  }, [open, value]);

  if (!open) return null;

  const title = field === "name" ? "Edit name" : "Edit phone";
  const placeholder = field === "name" ? "Your full name" : "+91 98765 43210";

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          field === "name" ? { fullName: draft } : { phone: draft }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "invalid_phone"
            ? "Enter a valid phone number."
            : "Could not save. Try again."
        );
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="bolt-sheet animate-sheet-in absolute inset-x-0 bottom-0 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-heading">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="press grid size-9 place-items-center rounded-full bg-surface-2 text-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <input
          type={field === "phone" ? "tel" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl bg-surface-2 px-3.5 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent/30"
        />
        {error ? <p className="mt-2 text-sm text-deal">{error}</p> : null}
        <Button className="mt-4 w-full" disabled={busy} onClick={save}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
