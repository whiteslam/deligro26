"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Section, StatusText, Empty } from "@/components/admin/console";
import { Button } from "@/components/ui/button";
import { Field, fieldCls } from "@/components/ui/field";
import type { DispatchZone } from "@/lib/data-access/manager-analytics";
import { setZoneDispatchAction } from "./actions";

/**
 * How orders reach riders, zone by zone. "Offers" is how Deligro has always
 * worked: the best rider is offered the order and accepts. "Automatic" puts the
 * order straight on the best eligible rider (the same rule as assigning by
 * hand) and falls back to an offer when none can take it. Every change asks
 * for a reason and is recorded in the audit log.
 */
export function DispatchModes({ zones, disabled }: Readonly<{ zones: DispatchZone[]; disabled: boolean }>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const busy = disabled || pending;

  return (
    <Section
      title="How orders reach riders"
      description="Offers let a rider accept or pass. Automatic assignment gives the order to the best eligible rider straight away."
    >
      {error ? (
        <p role="alert" className="mb-2 rounded-xl border border-deal/30 bg-deal-soft px-3.5 py-3 text-sm font-semibold text-deal">
          {error}
        </p>
      ) : null}
      {zones.length === 0 ? (
        <Empty>No zones yet.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {zones.map((z) => (
            <li key={z.zoneId} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {z.name} <span className="text-xs font-normal text-muted">{z.cityName}</span>
                  </p>
                  <p className="text-data mt-0.5 text-xs text-muted">
                    Last 24 h: {z.last24h.auto} automatic · {z.last24h.offerAccepted} accepted by a rider · {z.last24h.ops} by a
                    manager · {z.last24h.fellBackToOffer} fell back to an offer
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusText tone={z.mode === "auto_assign" ? "green" : "neutral"}>
                    {z.mode === "auto_assign" ? `Automatic · max ${z.autoAssignMaxLoad}` : "Offers"}
                  </StatusText>
                  <Button type="button" variant="secondary" disabled={busy} onClick={() => setEditing(editing === z.zoneId ? null : z.zoneId)}>
                    {editing === z.zoneId ? "Close" : "Change"}
                  </Button>
                </div>
              </div>
              {editing === z.zoneId ? (
                <ModeEditor
                  zone={z}
                  busy={busy}
                  onSave={(v) => {
                    setError(null);
                    startTransition(async () => {
                      const res = await setZoneDispatchAction({ zoneId: z.zoneId, ...v });
                      if (!res.ok) {
                        setError(res.error ?? "Couldn't save.");
                        return;
                      }
                      setEditing(null);
                      router.refresh();
                    });
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function ModeEditor({
  zone,
  busy,
  onSave,
}: Readonly<{ zone: DispatchZone; busy: boolean; onSave: (v: { mode: string; maxLoad: number; reason: string }) => void }>) {
  const [mode, setMode] = useState<string>(zone.mode);
  const [maxLoad, setMaxLoad] = useState(String(zone.autoAssignMaxLoad));
  const [reason, setReason] = useState("");
  return (
    <form
      className="admin-measure mt-3 grid gap-3 @3xl:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ mode, maxLoad: Number(maxLoad), reason });
      }}
    >
      <Field label="Mode">
        <select className={fieldCls} value={mode} disabled={busy} onChange={(e) => setMode(e.target.value)}>
          <option value="offer">Offers (a rider accepts)</option>
          <option value="auto_assign">Automatic assignment</option>
        </select>
      </Field>
      <Field label="Deliveries a rider may already carry" hint="0 means only riders with no delivery in progress.">
        <select className={fieldCls} value={maxLoad} disabled={busy || mode !== "auto_assign"} onChange={(e) => setMaxLoad(e.target.value)}>
          {[0, 1, 2, 3].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Field>
      <div className="@3xl:col-span-2">
        <Field label="Why are you changing it?" hint="Kept in the audit log. 3 to 300 characters.">
          <input className={fieldCls} value={reason} disabled={busy} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
      <div className="@3xl:col-span-2">
        <Button type="submit" disabled={busy || reason.trim().length < 3}>
          Save
        </Button>
      </div>
    </form>
  );
}
