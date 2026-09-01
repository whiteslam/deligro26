/**
 * QA — service-worker caching rules.
 *
 * The worker decides, per request, whether a response may be written to disk on
 * the user's device. Get that wrong in the permissive direction and a shared or
 * handed-on phone hands the next person the previous user's admin console,
 * order history or API payload — somewhere RLS cannot reach, because the bytes
 * are already local.
 *
 * So the classifier is tested rather than trusted. `public/sw-core.js` is a
 * worker script, not a module, so it is evaluated in a `vm` context with a stub
 * `self`: its top-level function declarations land on that context's global,
 * which is what lets this file reach them without exporting anything from a
 * file the browser has to be able to run verbatim.
 *
 * Runs offline. Usage:  npm run test:sw
 */
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

interface SwGlobals {
  isPrivatePath: (pathname: string) => boolean;
  isRscRequest: (req: { headers: Headers }, url: URL) => boolean;
  isImmutableAsset: (url: URL) => boolean;
  isAsset: (req: { destination: string }, url: URL) => boolean;
}

const sandbox = {
  self: {
    addEventListener() {},
    location: { origin: "https://deligro.example" },
    clients: { claim() {} },
  },
  caches: { open: async () => ({}), keys: async () => [], match: async () => undefined },
  fetch: async () => new Response(""),
  Response,
  Request,
  URL,
  Headers,
  console,
};

const context = createContext(sandbox);
runInContext(readFileSync(join(root, "public/sw-core.js"), "utf8"), context);
const sw = context as unknown as SwGlobals;

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} — expected ${String(expected)}, got ${String(actual)}`);
  }
}

console.log("\n═══ Private paths are never cached ═══");

// Every one of these renders something belonging to one signed-in person.
for (const path of [
  "/api/orders",
  "/api/me",
  "/admin",
  "/admin/settings/platform",
  "/vendor",
  "/vendor/earnings",
  "/driver",
  "/manager",
  "/profile",
  "/profile/addresses",
  "/orders",
  "/orders/abc-123",
  "/checkout",
  "/switch",
  "/auth/signout",
]) {
  check(`${path} is private`, sw.isPrivatePath(path), true);
}

console.log("\n═══ Public paths may be cached ═══");

for (const path of ["/", "/login", "/search", "/stores", "/restaurant/burger-republic", "/offline.html"]) {
  check(`${path} is cacheable`, sw.isPrivatePath(path), false);
}

console.log("\n═══ Prefix matching is on segments, not substrings ═══");

// The danger in both directions: "/orders-archive" must not be treated as
// private-by-accident, and more importantly "/adminx" must not slip past the
// gate by not matching "/admin/".
check("/orderly is not the /orders prefix", sw.isPrivatePath("/orderly"), false);
check("/administrative is not the /admin prefix", sw.isPrivatePath("/administrative"), false);
check("/admin exactly is private", sw.isPrivatePath("/admin"), true);
check("/admin/ subtree is private", sw.isPrivatePath("/admin/vendors"), true);

console.log("\n═══ RSC payloads always go to the network ═══");

const rscUrl = new URL("https://deligro.example/orders?_rsc=abc");
const plainUrl = new URL("https://deligro.example/");
check(
  "?_rsc= is an RSC request",
  sw.isRscRequest({ headers: new Headers() }, rscUrl),
  true
);
check(
  "RSC header is an RSC request",
  sw.isRscRequest({ headers: new Headers({ RSC: "1" }) }, plainUrl),
  true
);
check(
  "Next-Router-Prefetch is an RSC request",
  sw.isRscRequest({ headers: new Headers({ "Next-Router-Prefetch": "1" }) }, plainUrl),
  true
);
check(
  "a plain navigation is not",
  sw.isRscRequest({ headers: new Headers() }, plainUrl),
  false
);

console.log("\n═══ Asset classification ═══");

check(
  "/_next/static is immutable",
  sw.isImmutableAsset(new URL("https://deligro.example/_next/static/chunks/a1b2.js")),
  true
);
check(
  "/_next/image is not immutable",
  sw.isImmutableAsset(new URL("https://deligro.example/_next/image?url=x")),
  false
);
check(
  "an icon is an asset",
  sw.isAsset({ destination: "" }, new URL("https://deligro.example/icons/icon-192.png")),
  true
);
check(
  "a webp is an asset",
  sw.isAsset({ destination: "" }, new URL("https://deligro.example/splash-art.webp")),
  true
);
check(
  "an HTML document is not an asset",
  sw.isAsset({ destination: "document" }, new URL("https://deligro.example/")),
  false
);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
