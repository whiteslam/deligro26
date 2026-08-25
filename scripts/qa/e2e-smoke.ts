/**
 * Lightweight E2E smoke against a running app (local or staging).
 *
 * Checks public entry, guest browse gate, auth walls, security headers,
 * and that operator portals bounce anonymous visitors.
 *
 *   BASE_URL=http://localhost:3003 npm run test:e2e
 */
import { BASE_URL } from "./_env";
import { CUSTOMER_LOGIN } from "../../src/lib/auth/portals";

/**
 * The customer entry page. Read from `portals.ts` rather than written out:
 * these cases used to hard-code `/welcome`, which stopped existing when the
 * entry screen became the login page, and the suite sat with two permanently
 * red cases that had nothing to do with the app.
 */
const ENTRY = CUSTOMER_LOGIN;

interface CaseResult {
  name: string;
  ok: boolean;
  detail?: string;
}

const results: CaseResult[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail: string) {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name} — ${detail}`);
}

async function get(
  path: string,
  opts: { cookie?: string; redirect?: RequestRedirect } = {}
) {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.Cookie = opts.cookie;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    redirect: opts.redirect ?? "manual",
    signal: AbortSignal.timeout(15_000),
  });
  return res;
}

async function main() {
  console.log(`Deligro E2E smoke — ${BASE_URL}\n`);

  try {
    const entry = await get(ENTRY);
    if (entry.status === 200) pass(`GET ${ENTRY} → 200`);
    else fail(`GET ${ENTRY} → 200`, `got ${entry.status}`);
  } catch (e) {
    fail(
      `GET ${ENTRY} → 200`,
      e instanceof Error ? e.message : "unreachable — is the app running?"
    );
    summarize();
    process.exit(1);
  }

  {
    const res = await get("/");
    // Anon without guest cookie → the entry page.
    if (
      (res.status === 307 || res.status === 302) &&
      (res.headers.get("location") ?? "").includes(ENTRY)
    ) {
      pass(`anon GET / → redirect ${ENTRY}`);
    } else if (res.status === 200) {
      pass("anon GET / → 200 (demo mode or already guest)");
    } else {
      fail(`anon GET / → redirect ${ENTRY}`, `got ${res.status}`);
    }
  }

  {
    const res = await get("/", { cookie: "deligro-guest=1" });
    if (res.status === 200) pass("guest GET / → 200");
    else if (res.status === 307 || res.status === 302) {
      // May bounce depending on cookie name — still acceptable if not login
      const loc = res.headers.get("location") ?? "";
      if (!loc.includes("/login")) pass("guest GET / redirected (non-login)", loc);
      else fail("guest GET / → 200", `→ ${loc}`);
    } else fail("guest GET / → 200", `got ${res.status}`);
  }

  for (const path of ["/checkout", "/orders", "/profile"] as const) {
    const res = await get(path, { cookie: "deligro-guest=1" });
    const loc = res.headers.get("location") ?? "";
    const toAuth =
      (res.status === 307 || res.status === 302) &&
      (loc.includes("/signin") || loc.includes("/login"));
    if (toAuth) {
      pass(`guest GET ${path} → auth gate`, loc);
    } else {
      fail(
        `guest GET ${path} → auth gate`,
        `status=${res.status} loc=${loc} (expect /signin or /login)`
      );
    }
  }

  for (const path of ["/admin", "/vendor", "/driver"] as const) {
    const res = await get(path);
    const loc = res.headers.get("location") ?? "";
    if (
      (res.status === 307 || res.status === 302) &&
      loc.includes("/login")
    ) {
      pass(`anon GET ${path} → /login`);
    } else {
      fail(`anon GET ${path} → /login`, `status=${res.status} loc=${loc}`);
    }
  }

  {
    const res = await get(ENTRY);
    const csp = res.headers.get("content-security-policy");
    const xfo = res.headers.get("x-frame-options");
    const nosniff = res.headers.get("x-content-type-options");
    if (csp && csp.includes("default-src")) pass("CSP header present");
    else fail("CSP header present", String(csp));
    if (xfo?.toUpperCase() === "DENY") pass("X-Frame-Options: DENY");
    else fail("X-Frame-Options: DENY", String(xfo));
    if (nosniff === "nosniff") pass("X-Content-Type-Options: nosniff");
    else fail("X-Content-Type-Options: nosniff", String(nosniff));
  }

  {
    const res = await get("/api/orders");
    if (res.status === 401 || res.status === 503) {
      pass(`GET /api/orders unauthenticated → ${res.status}`);
    } else {
      fail("GET /api/orders unauthenticated → 401|503", `got ${res.status}`);
    }
  }

  // The app update gate. Unauthenticated on purpose — an app has to learn it is
  // too old to run before it has a session — so this is the one API route the
  // smoke can exercise for a real 200 rather than for a locked door.
  // `lib/releases/app-version.ts` covers the arithmetic offline
  // (`npm run test:app-version`); these cases cover the wiring.
  {
    const res = await get("/api/app-version?app=rider&versionCode=1");
    if (res.status !== 200) {
      fail("GET /api/app-version → 200", `got ${res.status}`);
    } else {
      const body = (await res.json()) as Record<string, unknown>;
      const shaped =
        typeof body.latestVersionCode === "number" &&
        typeof body.minSupportedVersionCode === "number" &&
        typeof body.updateAvailable === "boolean" &&
        typeof body.forceUpdate === "boolean" &&
        typeof body.apkUrl === "string" &&
        typeof body.releaseNotes === "string";
      if (shaped) pass("GET /api/app-version → 200, full payload");
      else fail("GET /api/app-version payload shape", JSON.stringify(body));

      // Holds on a configured platform AND on an un-migrated or unreadable one:
      // every version code defaults to 1, so versionCode 1 is never behind. A
      // force-update here would mean the fallback path had inverted.
      if (body.forceUpdate === false) {
        pass("GET /api/app-version does not force-update the floor build");
      } else {
        fail(
          "GET /api/app-version does not force-update the floor build",
          `forceUpdate=${String(body.forceUpdate)} at versionCode 1`
        );
      }
    }
  }

  for (const [name, query] of [
    ["an unknown app", "?app=driver&versionCode=1"],
    ["a missing app", "?versionCode=1"],
    ["a non-numeric versionCode", "?app=rider&versionCode=1.2.3"],
    ["a missing versionCode", "?app=rider"],
  ] as const) {
    const res = await get(`/api/app-version${query}`);
    if (res.status === 400) pass(`GET /api/app-version with ${name} → 400`);
    else fail(`GET /api/app-version with ${name} → 400`, `got ${res.status}`);
  }

  summarize();
  if (results.some((r) => !r.ok)) process.exit(1);
}

function summarize() {
  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);
  console.log(`\nResult: ${passed.length} passed · ${failed.length} failed`);
  for (const f of failed) console.log(`  FAIL: ${f.name} — ${f.detail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
