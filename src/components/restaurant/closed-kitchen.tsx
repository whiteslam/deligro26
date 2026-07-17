"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * Cute filler so a closed shop isn't a wall of empty dark space.
 *
 * There are several personalities below and one is picked at random on each
 * visit — sometimes the napping pot, sometimes the chai break. The random pick
 * lives in a useState initializer (stable across re-renders) and we only reveal
 * it once mounted on the client, so the server HTML and first client paint agree
 * and there's no hydration mismatch on the random index.
 */
const VARIANTS = [
  {
    art: "🍲",
    badge: "😴",
    title: "The kitchen's having a little nap",
    caption:
      "Our chefs are off recharging their spice levels. Swing by during opening hours for the good stuff! 🌶️",
  },
  {
    art: "👨‍🍳",
    badge: "💤",
    title: "Chef has left the building",
    caption:
      "The stoves are cold and the aprons are hung up. Come back during opening hours and we'll cook you something lovely.",
  },
  {
    art: "🥘",
    badge: "🌙",
    title: "We're closed for now",
    caption:
      "The pans are resting under the moonlight. We'll be back and sizzling before you know it! ✨",
  },
  {
    art: "🧑‍🍳",
    badge: "☕",
    title: "Gone for a chai break",
    caption:
      "Our cooks are refueling on chai and gossip. Swing by later when the kadhai's hot again! ☕",
  },
  {
    art: "🍕",
    badge: "🛌",
    title: "Out cold (like our ovens)",
    caption:
      "Even the best kitchens need their beauty sleep. Catch us during opening hours for something tasty!",
  },
];

// A no-op subscription: the mounted flag never changes after the first client
// render, so there's nothing to subscribe to.
const noop = () => () => {};

export function ClosedKitchen() {
  // false during SSR and the hydrating render, true once on the client — the
  // sanctioned no-effect way to tell "are we mounted yet?".
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
  const [index] = useState(() => Math.floor(Math.random() * VARIANTS.length));

  // Reserve the space on the first paint so the content doesn't jump in.
  const v = mounted ? VARIANTS[index] : null;

  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-8 py-16 text-center">
      {v ? (
        <>
          <div className="relative mb-5 grid size-24 place-items-center rounded-[28px] bg-surface-2 text-[44px] leading-none">
            <span aria-hidden>{v.art}</span>
            <span
              aria-hidden
              className="absolute -right-2 -top-2 grid size-9 place-items-center rounded-full bg-bg text-xl shadow-sm"
            >
              {v.badge}
            </span>
          </div>
          <h3 className="text-heading">{v.title}</h3>
          <p className="mt-1.5 max-w-[17rem] text-body text-muted">
            {v.caption}
          </p>
        </>
      ) : null}
    </div>
  );
}
