"use client";

import { useCallback, useEffect, useState } from "react";
import { ADDRESSES } from "@/lib/data";
import type { Address } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type SavedAddress = Address & {
  lat?: number | null;
  lng?: number | null;
};

export interface AddressInput {
  label: string;
  line: string;
  lat?: number | null;
  lng?: number | null;
  isDefault?: boolean;
}

export function useSavedAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>(
    isSupabaseConfigured ? [] : ADDRESSES
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [selectedId, setSelectedId] = useState<string>(
    isSupabaseConfigured
      ? ""
      : (ADDRESSES.find((a) => a.isDefault)?.id ?? ADDRESSES[0]?.id ?? "")
  );

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setAddresses(ADDRESSES);
      setSelectedId(
        ADDRESSES.find((a) => a.isDefault)?.id ?? ADDRESSES[0]?.id ?? ""
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/addresses");
      const data = await res.json();
      const list: SavedAddress[] = data.addresses ?? [];
      setAddresses(list);
      setSelectedId((prev) => {
        if (prev && list.some((a) => a.id === prev)) return prev;
        return list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? "";
      });
    } catch {
      setAddresses([]);
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected =
    addresses.find((a) => a.id === selectedId) ?? addresses[0] ?? null;

  const create = useCallback(
    async (input: AddressInput) => {
      if (!isSupabaseConfigured) {
        const mock: SavedAddress = {
          id: `demo-${Date.now()}`,
          label: input.label,
          line: input.line,
          isDefault: addresses.length === 0,
        };
        setAddresses((prev) => [...prev, mock]);
        setSelectedId(mock.id);
        return mock;
      }

      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.address) throw new Error("save_failed");
      await refresh();
      setSelectedId(data.address.id);
      return data.address as SavedAddress;
    },
    [addresses.length, refresh]
  );

  const update = useCallback(
    async (id: string, input: Partial<AddressInput>) => {
      if (!isSupabaseConfigured) {
        setAddresses((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  ...input,
                  label: input.label ?? a.label,
                  line: input.line ?? a.line,
                }
              : a
          )
        );
        return true;
      }

      const res = await fetch(`/api/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("update_failed");
      await refresh();
      return true;
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
        setSelectedId((prev) => (prev === id ? "" : prev));
        return true;
      }

      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete_failed");
      await refresh();
      return true;
    },
    [refresh]
  );

  const setDefault = useCallback(
    async (id: string) => update(id, { isDefault: true }),
    [update]
  );

  return {
    addresses,
    loading,
    selectedId,
    setSelectedId,
    selected,
    refresh,
    create,
    update,
    remove,
    setDefault,
  };
}
