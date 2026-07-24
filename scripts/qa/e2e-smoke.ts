/**
 * Lightweight E2E smoke against a running app (local or staging).
 *
 * Checks public entry, guest browse gate, auth walls, security headers,
 * and that operator portals bounce anonymous visitors.
 *
 *   BASE_URL=http://localhost:3003 npm run test:e2e
 */
import { BASE_URL } from "./_env";

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
    const welcome = await get("/welcome");
    if (welcome.status === 200) pass("GET /welcome → 200");
    else fail("GET /welcome → 200", `got ${welcome.status}`);
  } catch (e) {
    fail(
      "GET /welcome → 200",
      e instanceof Error ? e.message : "unreachable — is the app running?"
    );
    summarize();
    process.exit(1);
  }

  {
    const res = await get("/");
    // Anon without guest cookie → /welcome
    if (
      (res.status === 307 || res.status === 302) &&
      (res.headers.get("location") ?? "").includes("/welcome")
    ) {
      pass("anon GET / → redirect /welcome");
    } else if (res.status === 200) {
      pass("anon GET / → 200 (demo mode or already guest)");
    } else {
      fail("anon GET / → redirect /welcome", `got ${res.status}`);
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
    const res = await get("/welcome");
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
