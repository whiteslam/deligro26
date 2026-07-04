"use client";

import { create } from "zustand";

/**
 * First-run onboarding state.
 *
 * Visibility lives here (not in component state) so the effect that reads
 * localStorage just calls a store action — the same pattern the location
 * explainer uses. Shown once per device; `markSeen` latches the flag.
 */

const SEEN_KEY = "deligro-onboarded";

interface OnboardingState {
  open: boolean;
  index: number;
  leaving: boolean;
  slideCount: number;

  /** Decide on app open whether this is a first run. */
  maybeShow: () => void;
  /** Advance to the next slide, or finish on the last one. */
  next: () => void;
  /** Dismiss for good (Skip or finish): latch the flag, then fade out. */
  finish: () => void;
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {}
}

export const useOnboarding = create<OnboardingState>((set, get) => ({
  open: false,
  index: 0,
  leaving: false,
  slideCount: 3,

  maybeShow: () => {
    if (typeof window === "undefined") return;
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    if (!seen) set({ open: true });
  },

  next: () => {
    const { index, slideCount } = get();
    if (index >= slideCount - 1) {
      get().finish();
    } else {
      set({ index: index + 1 });
    }
  },

  finish: () => {
    markSeen();
    set({ leaving: true });
    setTimeout(() => set({ open: false }), 450);
  },
}));
