"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { AddAddressForm } from "@/components/addresses/add-address-form";
import { useSavedAddresses } from "@/hooks/use-saved-addresses";
import { cn } from "@/lib/utils/cn";

export default function ProfileAddressesPage() {
  const {
    addresses,
    loading,
    create,
    remove,
    setDefault,
    refresh,
  } = useSavedAddresses();
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this address?")) return;
    setBusyId(id);
    try {
      await remove(id);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetDefault(id: string) {
    setBusyId(id);
    try {
      await setDefault(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative min-h-full">
      <header className="glass sticky top-0 z-20 flex items-center gap-3 px-4 py-3">
        <Link
          href="/profile"
          aria-label="Back to profile"
          className="press grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="min-w-0 flex-1 text-[17px] font-extrabold tracking-tight">
          Saved addresses
        </h1>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          aria-label="Add address"
          className="press grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink"
        >
          <Plus className="size-5" />
        </button>
      </header>

      <div className="px-4 pb-6 pt-3">
        {loading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> Loading addresses…
          </p>
        ) : addresses.length === 0 && !showAdd ? (
          <div className="card p-6 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
              <MapPin className="size-7" />
            </span>
            <p className="mt-4 text-[15px] font-bold">No saved addresses</p>
            <p className="mt-1 text-sm text-muted">
              Add where we should deliver your orders.
            </p>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="press mt-4 rounded-full bg-accent px-6 py-3 text-sm font-bold text-white"
            >
              Add address
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {addresses.map((a) => (
              <li key={a.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink">
                    <MapPin className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[15px] font-bold">
                      {a.label}
                      {a.isDefault ? (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-ink">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm leading-snug text-muted">
                      {a.line}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {!a.isDefault ? (
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => handleSetDefault(a.id)}
                      className="press inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink"
                    >
                      {busyId === a.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Star className="size-3.5" />
                      )}
                      Set default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => handleDelete(a.id)}
                    className={cn(
                      "press inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-deal",
                      a.isDefault && addresses.length > 1 && "opacity-50"
                    )}
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {showAdd ? (
          <section className="card mt-4 overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[15px] font-bold">New address</h2>
            </div>
            <AddAddressForm
              onSave={async (input) => {
                await create(input);
                setShowAdd(false);
                await refresh();
              }}
              onCancel={() => setShowAdd(false)}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
