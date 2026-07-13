"use client";

import { create } from "zustand";

/**
 * Searching within one restaurant's menu.
 *
 * The magnifier lives in the hero and the results render in the menu below —
 * two components with no parent between them that isn't a server component, so
 * the state sits here rather than being threaded through the page.
 *
 * `reset` is called when the menu mounts: a query left over from the last
 * restaurant would otherwise filter this one's menu on arrival.
 */
interface MenuSearchState {
  open: boolean;
  query: string;
  toggle: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  reset: () => void;
}

export const useMenuSearch = create<MenuSearchState>((set) => ({
  open: false,
  query: "",
  toggle: () => set((s) => ({ open: !s.open, query: s.open ? "" : s.query })),
  close: () => set({ open: false, query: "" }),
  setQuery: (query) => set({ query }),
  reset: () => set({ open: false, query: "" }),
}));
