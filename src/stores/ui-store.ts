"use client";

import { create } from "zustand";

export type Theme = "light" | "dark";

interface UIState {
  theme: Theme;
  cartOpen: boolean;
  hydrated: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
  openCart: () => void;
  closeCart: () => void;
}

function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export const useUI = create<UIState>((set, get) => ({
  theme: "light",
  cartOpen: false,
  hydrated: false,

  setTheme: (theme) => {
    applyTheme(theme);
    try {
      localStorage.setItem("deligro-theme", theme);
    } catch {}
    set({ theme });
  },

  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },

  // Sync store state to whatever the pre-paint bootstrap script already set.
  initTheme: () => {
    if (typeof document === "undefined") return;
    const attr = document.documentElement.getAttribute("data-theme");
    const theme: Theme = attr === "dark" ? "dark" : "light";
    set({ theme, hydrated: true });
  },

  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
}));
