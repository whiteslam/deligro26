"use client";

import { create } from "zustand";
import type { ShellMode } from "@/components/shared/desktop-shell-switcher";

const STORAGE_KEY = "deligro-vendor-shell";

interface VendorShellState {
  mode: ShellMode;
  hydrated: boolean;
  setMode: (mode: ShellMode) => void;
  init: () => void;
}

export const useVendorShell = create<VendorShellState>((set) => ({
  // Vendor is desktop-first; app mode is the phone-frame preview.
  mode: "web",
  hydrated: false,

  setMode: (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    set({ mode });
  },

  init: () => {
    if (typeof window === "undefined") return;
    let mode: ShellMode = "web";
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "web" || stored === "app") mode = stored;
    } catch {
      /* ignore */
    }
    set({ mode, hydrated: true });
  },
}));
