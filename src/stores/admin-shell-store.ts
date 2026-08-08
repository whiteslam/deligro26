"use client";

import { create } from "zustand";
import type { ShellMode } from "@/components/shared/desktop-shell-switcher";

const STORAGE_KEY = "deligro-admin-shell";

interface AdminShellState {
  mode: ShellMode;
  hydrated: boolean;
  setMode: (mode: ShellMode) => void;
  init: () => void;
}

/**
 * Web is the default on a computer: the admin console is a desktop tool, and
 * the phone frame is the preview. (This used to default to "app", which is why
 * a first-time operator on a laptop met a 390px column.) The stored preference
 * still wins once the operator has expressed one.
 */
export const useAdminShell = create<AdminShellState>((set) => ({
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
