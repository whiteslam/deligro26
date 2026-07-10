"use client";

import { create } from "zustand";
import type { MenuItem, Restaurant } from "@/types";

/** Holds the menu item whose Bolt-style detail popup is open (app-shell level). */
interface ItemSheetState {
  item: MenuItem | null;
  restaurant: Restaurant | null;
  open: (item: MenuItem, restaurant: Restaurant) => void;
  close: () => void;
}

export const useItemSheet = create<ItemSheetState>((set) => ({
  item: null,
  restaurant: null,
  open: (item, restaurant) => set({ item, restaurant }),
  close: () => set({ item: null, restaurant: null }),
}));
