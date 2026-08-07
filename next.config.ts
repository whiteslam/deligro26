import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Security headers (checklist §7 + §4). Applied to every response.
 *
 * The CSP below is the pragmatic budget tier: it locks img/connect/frame/base
 * sources down hard, but allows 'unsafe-inline' for scripts/styles because the
 * app ships an inline pre-paint theme bootstrap and Tailwind inline styles.
 * Upgrade path (documented in SECURITY.md): switch to a per-request nonce in
 * src/proxy.ts and drop 'unsafe-inline' from script-src for full XSS hardening.
 */
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // React dev mode uses eval() for stack traces; production never needs it.
  // cdn.onesignal.com serves the web-push SDK; maps.googleapis.com the Maps JS;
  // checkout.razorpay.com the payment SDK, loaded on demand at checkout.
  `script-src 'self' 'unsafe-inline' https://cdn.onesignal.com https://maps.googleapis.com https://maps.gstatic.com https://checkout.razorpay.com${isDev ? " 'unsafe-eval'" : ""}`,
  // Google Maps injects a stylesheet + Roboto webfont.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://*.onesignal.com https://onesignal.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.razorpay.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // OneSignal over WSS/HTTPS; Google Maps tiles/geocode/places over HTTPS;
  // Razorpay's API + its lumberjack telemetry host, both under *.razorpay.com.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.onesignal.com https://onesignal.com wss://*.onesignal.com https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com https://*.razorpay.com",
  // The OneSignal service worker is served from our own origin.
  "worker-src 'self'",
  // Subscription/permission flow may open a OneSignal iframe. Razorpay Checkout
  // is an iframe too, and the bank/UPI redirect legs happen inside it — which
  // is why they need frame-src and not a hole in form-action.
  "frame-src 'self' https://*.onesignal.com https://onesignal.com https://*.razorpay.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
];

const nextConfig: NextConfig = {
  // Parent ~/package-lock.json (unrelated) + this app's lockfiles confuse
  // Turbopack's workspace-root inference — pin explicitly to this project.
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Every /api response is either user-scoped or an auth step. Next does
        // not cache route handlers by default, but nothing here says so out
        // loud — and a CDN or reverse proxy added later would happily serve one
        // customer's /api/me or /api/orders to the next visitor. Make it
        // explicit at the edge rather than relying on a framework default.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
