"use client";

import { create } from "zustand";

/**
 * Reorder history for the grocery-list feature. It has no backend, so past
 * typed lists live in localStorage. Only typed lists are recorded — photo sends
 * can't be replayed because the image file isn't retained.
 *
 * Follows the same shape as the other client stores (ui, location): the read
 * from localStorage happens in a `hydrate()` action called from an effect, so it
 * never runs setState inside a React effect body.
 */

export type GroceryListEntry = { id: string; text: string; ts: number };

const KEY = "deligro-grocery-history";
const MAX = 6;

function load(): GroceryListEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GroceryListEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(list: GroceryListEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage full or blocked — keep it in memory for this session
  }
}

interface GroceryHistoryState {
  history: GroceryListEntry[];
  hydrated: boolean;
  /** Load persisted history. Safe to call repeatedly; no-op on the server. */
  hydrate: () => void;
  /** Record a sent list at the top, de-duped, capped. */
  record: (text: string) => void;
}

export const useGroceryHistory = create<GroceryHistoryState>((set, get) => ({
  history: [],
  hydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    set({ history: load(), hydrated: true });
  },
  record: (text) => {
    const next = [
      { id: `${Date.now()}-${get().history.length}`, text, ts: Date.now() },
      ...get().history.filter((h) => h.text !== text),
    ].slice(0, MAX);
    persist(next);
    set({ history: next });
  },
}));
