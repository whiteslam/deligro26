import type { NextConfig } from "next";

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
  // cdn.onesignal.com serves the web-push SDK; maps.googleapis.com the Maps JS.
  `script-src 'self' 'unsafe-inline' https://cdn.onesignal.com https://maps.googleapis.com https://maps.gstatic.com${isDev ? " 'unsafe-eval'" : ""}`,
  // Google Maps injects a stylesheet + Roboto webfont.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://images.pexels.com https://*.supabase.co https://*.onesignal.com https://onesignal.com https://*.googleapis.com https://*.gstatic.com https://*.google.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // OneSignal over WSS/HTTPS; Google Maps tiles/geocode/places over HTTPS.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.onesignal.com https://onesignal.com wss://*.onesignal.com https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com",
  // The OneSignal service worker is served from our own origin.
  "worker-src 'self'",
  // Subscription/permission flow may open a OneSignal iframe.
  "frame-src 'self' https://*.onesignal.com https://onesignal.com",
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
