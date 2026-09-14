"use client";

import { create } from "zustand";

/**
 * What this customer searched for last.
 *
 * The Search tab opened on the same five hard-coded suggestions for everybody,
 * every time — "Paneer, Biryani, Pizza, Cold coffee, Dosa" — which is a
 * reasonable guess about a market and a poor one about a person. The best thing
 * to offer somebody opening search is usually what they searched for before,
 * and nothing recorded it.
 *
 * No backend: this is one device's memory of its own typing, and a delivery
 * history is not something to ship to a server without a reason. Same shape as
 * the other client stores (ui, location, grocery-history) — the read from
 * localStorage happens in a `hydrate()` action called from an effect, so it
 * never runs setState inside an effect body.
 */

const KEY = "deligro-search-history";

/**
 * How many to keep — and therefore how many are shown, because everything
 * stored is rendered. The list sits directly under the search field, above the
 * results, so each entry costs a row of the screen somebody opened to look at
 * food. Four is a useful memory that still leaves dishes above the fold.
 */
const MAX = 4;

/**
 * Shortest query worth remembering.
 *
 * The field searches on every keystroke, so there is no "submit" to hook. A
 * single letter is a keystroke on the way somewhere, not a search.
 */
const MIN_LEN = 2;

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    // Written by an older build, or by hand: take only what is usable rather
    // than letting one bad entry throw away the whole list.
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string").slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

function persist(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage full or blocked — keep it in memory for this session
  }
}

interface SearchHistoryState {
  history: string[];
  hydrated: boolean;
  /** Load persisted history. Safe to call repeatedly; no-op on the server. */
  hydrate: () => void;
  /** Record a query at the top. Ignores anything too short to be a search. */
  record: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
}

export const useSearchHistory = create<SearchHistoryState>((set, get) => ({
  history: [],
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    if (get().hydrated) return;
    set({ history: load(), hydrated: true });
  },

  record: (query) => {
    const q = query.trim().toLowerCase();
    if (q.length < MIN_LEN) return;

    /*
     * Collapse near-duplicates by prefix, in both directions.
     *
     * Searching is live, so somebody typing "biryani" passes through "bi",
     * "bir", "biry"… and each of those is a legitimate search that returned
     * results. Recording them all would fill the whole list with one word's
     * keystrokes. Dropping any stored entry that is a prefix of this one — or
     * that this one is a prefix of — keeps exactly one, the most recent, which
     * is the one they actually settled on.
     */
    const rest = get().history.filter(
      (h) => !h.startsWith(q) && !q.startsWith(h)
    );
    const next = [q, ...rest].slice(0, MAX);
    persist(next);
    set({ history: next });
  },

  remove: (query) => {
    const next = get().history.filter((h) => h !== query);
    persist(next);
    set({ history: next });
  },

  clear: () => {
    persist([]);
    set({ history: [] });
  },
}));
