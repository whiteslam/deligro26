import type { MetadataRoute } from "next";

/**
 * Web app manifest — what makes the app installable.
 *
 * The root layout has always declared `appleWebApp: { capable: true }`, so
 * home-screen install was intended from the start; without this file Android
 * Chrome never offers it and the app can only be reached by typing a URL. In a
 * tier-3 market that is often the difference between a repeat customer and a
 * one-time visitor, and an installed vendor board is far less likely to be
 * closed by accident than a browser tab.
 *
 * It also matters for the push notifications this app already sends. OneSignal
 * is wired up and the server fans out order events (notifyOrderAccepted,
 * notifyOnTheWay, notifyDelivered) — installability is what makes those
 * reliably deliverable on Android.
 *
 * `start_url` is the customer feed, not a portal: operators reach their console
 * through /switch after signing in, and an installed icon that opened the admin
 * panel for a shopper would be the wrong front door.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Deligro — food delivery in Bemetara",
    short_name: "Deligro",
    description:
      "Freshly made, delivered warm — usually in under 30 minutes. Order from restaurants across Bemetara.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f1215",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops icons to a circle or squircle. The `any` icons above have
      // transparent corners and would be visibly clipped; this one bleeds to
      // every edge with the artwork inside the centre 80% safe zone.
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
