"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { MapPicker } from "@/components/location/map-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { AddressInput } from "@/hooks/use-saved-addresses";

const LABELS = ["Home", "Work", "Other"] as const;

export function AddAddressForm({
  onSave,
  onCancel,
  compact,
}: {
  onSave: (input: AddressInput) => Promise<void>;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [label, setLabel] = useState<string>("Home");
  const [line, setLine] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (line.trim().length < 6) {
      setError("Enter a complete street address.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSave({
        label,
        line: line.trim(),
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
    } catch {
      setError("Could not save address. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-3", compact ? "p-0" : "p-4")}>
      <MapPicker
        variant={compact ? "checkout" : "form"}
        initial={coords}
        onPick={({ lat, lng, address }) => {
          setCoords({ lat, lng });
          if (address) setLine(address);
        }}
      />

      <div className="flex flex-wrap gap-2">
        {LABELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLabel(l)}
            className={cn(
              "press rounded-full border px-3 py-1.5 text-xs font-semibold",
              label === l
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-line text-muted"
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <textarea
        value={line}
        onChange={(e) => setLine(e.target.value)}
        rows={2}
        placeholder="Flat / house no, street, area, city, pincode"
        className="w-full resize-none rounded-xl bg-surface-2 px-3.5 py-3 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/30"
      />

      {error ? <p className="text-sm text-deal">{error}</p> : null}

      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={busy || line.trim().length < 6}
          onClick={handleSubmit}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Save address"}
        </Button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="press px-3 text-sm font-semibold text-muted"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
