"use client";

import { useEffect } from "react";
import { useCart } from "@/stores/cart-store";

/** Rehydrate persisted cart state on the client (Next.js App Router). */
export function CartHydrator() {
  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);

  return null;
}
