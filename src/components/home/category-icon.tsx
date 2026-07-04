"use client";

import { useState } from "react";

/** Category ids that have a 3D icon in /public/icons/categories/<id>.svg. */
const ICON_IDS = new Set(["burgers", "chinese", "desserts", "south"]);

type Props = {
  /** Category id — resolves to /icons/categories/<id>.svg */
  id: string;
  /** Emoji fallback for categories without a 3D asset (or if it fails to load). */
  emoji: string;
  label: string;
};

/**
 * Renders the 3D category icon when one exists, otherwise the emoji.
 * The onError guard also falls back gracefully if an asset is ever missing.
 */
export function CategoryIcon({ id, emoji, label }: Props) {
  const [failed, setFailed] = useState(false);

  if (!ICON_IDS.has(id) || failed) {
    return <span className="text-4xl">{emoji}</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/categories/${id}.svg`}
      alt={label}
      width={60}
      height={60}
      loading="lazy"
      className="size-[60px] object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
      onError={() => setFailed(true)}
    />
  );
}
