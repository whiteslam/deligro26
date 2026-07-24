/**
 * E2E QA — IDOR + cross-account authorization suite.
 *
 * Covers the three checks from SECURITY.md:
 *   1. Authenticated  — unauthenticated requests get 401
 *   2. Authorized role — wrong portal role is denied
 *   3. Resource ownership — foreign ids return 404 (never leak existence)
 *
 * Layers:
 *   • RLS (Supabase anon + user JWT) — the real boundary
 *   • HTTP (/api/* with session cookies) — when BASE_URL is reachable
 *   • Portal redirects — customer hitting /admin etc.
 *
 * Usage:
 *   QA_PASSWORD='…' npm run test:idor
 *   BASE_URL=https://staging.example npm run test:idor
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import {
  BASE_URL,
  QA_PASSWORD,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  requireSupabase,
} from "./_env";

requireSupabase();

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Role = "customer" | "restaurant" | "driver" | "admin";

interface Account {
  email: string;
  role: Role;
  fullName: string;
  id?: string;
}

const QA_ACCOUNTS: Account[] = [
  { email: "qa-customer-a@deligro.qa", role: "customer", fullName: "QA Customer A" },
  { email: "qa-customer-b@deligro.qa", role: "customer", fullName: "QA Customer B" },
  { email: "vendor@deligro.demo", role: "restaurant", fullName: "Demo Vendor" },
  { email: "driver@deligro.demo", role: "driver", fullName: "Demo Driver" },
  { email: "admin@deligro.demo", role: "admin", fullName: "Demo Admin" },
];

interface CaseResult {
  name: string;
  ok: boolean;
  detail?: string;
  skipped?: boolean;
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

function skip(name: string, detail: string) {
  results.push({ name, ok: true, detail, skipped: true });
  console.log(`  ○ ${name} — skipped (${detail})`);
}

async function findUserId(email: string): Promise<string | undefined> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 1000) break;
  }
  return undefined;
}

async function ensureAccount(a: Account): Promise<string> {
  let userId = await findUserId(a.email);
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: a.email,
      password: QA_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: a.fullName },
    });
    if (error) throw error;
    userId = data.user.id;
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: QA_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
  }

  const { error: roleErr } = await admin
    .from("profiles")
    .upsert(
      { id: userId, role: a.role, full_name: a.fullName },
      { onConflict: "id" }
    );
  if (roleErr) throw roleErr;
  a.id = userId;
  return userId;
}

function userClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email: string): Promise<SupabaseClient> {
  const client = userClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: QA_PASSWORD,
  });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

/** Build a Cookie header the Next.js SSR client will accept. */
async function sessionCookieHeader(email: string): Promise<string> {
  const jar = new Map<string, string>();
  const client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () =>
        [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) {
          if (value) jar.set(name, value);
          else jar.delete(name);
        }
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: QA_PASSWORD,
  });
  if (error) throw new Error(`cookie sign-in failed for ${email}: ${error.message}`);
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function httpReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/welcome`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    return res.status > 0;
  } catch {
    return false;
  }
}

async function api(
  path: string,
  opts: { method?: string; cookie?: string; body?: unknown } = {}
): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  let json: Record<string, unknown> | null = null;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function setupFixtures(customerAId: string): Promise<{
  orderId: string;
  addressId: string;
  restaurantId: string;
}> {
  const { data: restaurant, error: rErr } = await admin
    .from("restaurants")
    .select("id")
    .eq("approved", true)
    .limit(1)
    .maybeSingle();
  if (rErr) throw rErr;
  if (!restaurant?.id) {
    throw new Error(
      "No approved restaurant found — run `npm run db:seed` or import legacy catalog first."
    );
  }

  const { data: order, error: oErr } = await admin
    .from("orders")
    .insert({
      customer_id: customerAId,
      restaurant_id: restaurant.id,
      status: "placed",
      total: 199,
      delivery_fee: 29,
      tax_amount: 10,
      address: { label: "QA", line: "QA fixture address" },
    })
    .select("id")
    .single();
  if (oErr) throw oErr;

  const { data: address, error: aErr } = await admin
    .from("addresses")
    .insert({
      user_id: customerAId,
      label: "QA Home",
      line: "1 QA Street, Bemetara",
      is_default: false,
    })
    .select("id")
    .single();
  if (aErr) throw aErr;

  return {
    orderId: order.id,
    addressId: address.id,
    restaurantId: restaurant.id,
  };
}

async function cleanupFixtures(orderId: string, addressId: string) {
  await admin.from("order_items").delete().eq("order_id", orderId);
  await admin.from("orders").delete().eq("id", orderId);
  await admin.from("addresses").delete().eq("id", addressId);
}

// ---------- RLS layer ----------

async function testRlsIdor(
  orderId: string,
  addressId: string,
  customerAId: string
) {
  console.log("\n[RLS] Cross-account ownership");

  const asA = await signIn("qa-customer-a@deligro.qa");
  const asB = await signIn("qa-customer-b@deligro.qa");

  {
    const { data, error } = await asA
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .maybeSingle();
    if (error) fail("owner can read own order (RLS)", error.message);
    else if (data?.id === orderId) pass("owner can read own order (RLS)");
    else fail("owner can read own order (RLS)", "row missing");
  }

  {
    const { data, error } = await asB
      .from("orders")
      .select("id, total, status")
      .eq("id", orderId)
      .maybeSingle();
    if (error) fail("peer cannot read foreign order (RLS)", error.message);
    else if (data === null) pass("peer cannot read foreign order (RLS)", "null");
    else fail("peer cannot read foreign order (RLS)", `leaked: ${JSON.stringify(data)}`);
  }

  {
    const { data, error } = await asB
      .from("addresses")
      .select("id, line")
      .eq("id", addressId)
      .maybeSingle();
    if (error) fail("peer cannot read foreign address (RLS)", error.message);
    else if (data === null) pass("peer cannot read foreign address (RLS)");
    else fail("peer cannot read foreign address (RLS)", `leaked: ${JSON.stringify(data)}`);
  }

  {
    const { data, error } = await asB
      .from("addresses")
      .update({ line: "HACKED" })
      .eq("id", addressId)
      .select("id")
      .maybeSingle();
    if (error) fail("peer cannot update foreign address (RLS)", error.message);
    else if (data === null) pass("peer cannot update foreign address (RLS)");
    else fail("peer cannot update foreign address (RLS)", "update succeeded");
  }

  {
    // Confirm A's address was not mutated.
    const { data } = await admin
      .from("addresses")
      .select("line")
      .eq("id", addressId)
      .maybeSingle();
    if (data?.line === "1 QA Street, Bemetara") {
      pass("foreign address content unchanged after peer update");
    } else {
      fail(
        "foreign address content unchanged after peer update",
        `got: ${data?.line}`
      );
    }
  }

  {
    const { data, error } = await asB
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .select("id")
      .maybeSingle();
    // Customers are not in the orders UPDATE policy at all.
    if (error) fail("peer cannot update foreign order (RLS)", error.message);
    else if (data === null) pass("peer cannot update foreign order (RLS)");
    else fail("peer cannot update foreign order (RLS)", "update succeeded");
  }

  {
    const { error } = await asB.from("profiles").update({ role: "admin" }).eq("id", customerAId);
    // lock_role trigger + RLS should block escalation / foreign profile writes.
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", customerAId)
      .maybeSingle();
    if (profile?.role === "customer") {
      pass("lock_role / RLS blocks peer role escalation", error?.message ?? "blocked");
    } else {
      fail("lock_role / RLS blocks peer role escalation", `role=${profile?.role}`);
    }
  }

  {
    const self = await asB.auth.getUser();
    const myId = self.data.user?.id;
    if (!myId) {
      fail("self cannot escalate own role", "no user");
    } else {
      const { error } = await asB
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", myId);
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", myId)
        .maybeSingle();
      if (profile?.role === "customer") {
        pass("lock_role blocks self-escalation to admin", error?.message ?? "blocked");
      } else {
        fail("lock_role blocks self-escalation to admin", `role=${profile?.role}`);
      }
    }
  }

  await asA.auth.signOut();
  await asB.auth.signOut();
}

async function testVendorIsolation(orderId: string, restaurantId: string) {
  console.log("\n[RLS] Vendor / driver isolation");

  // Order belongs to restaurantId. A vendor who does NOT own it must not see it.
  // Demo vendor may own this restaurant — pick another owner or create a throwaway.
  const { data: otherRest } = await admin
    .from("restaurants")
    .select("id, owner_id")
    .neq("id", restaurantId)
    .not("owner_id", "is", null)
    .limit(1)
    .maybeSingle();

  try {
    const vendor = await signIn("vendor@deligro.demo");
    const { data: ownRows } = await vendor
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .maybeSingle();

    const { data: rest } = await admin
      .from("restaurants")
      .select("owner_id")
      .eq("id", restaurantId)
      .maybeSingle();

    const vendorUser = (await vendor.auth.getUser()).data.user;
    const ownsFixture = rest?.owner_id === vendorUser?.id;

    if (ownsFixture) {
      if (ownRows?.id === orderId) {
        pass("owning vendor can read restaurant order (RLS)");
      } else {
        fail("owning vendor can read restaurant order (RLS)", "row missing");
      }
    } else if (ownRows === null) {
      pass("non-owning vendor cannot read foreign restaurant order (RLS)");
    } else {
      fail(
        "non-owning vendor cannot read foreign restaurant order (RLS)",
        "leaked"
      );
    }

    if (otherRest?.id) {
      // Create an order on another restaurant; vendor must not see it unless they own it.
      const { data: foreignOrder, error } = await admin
        .from("orders")
        .insert({
          customer_id: QA_ACCOUNTS[0].id!,
          restaurant_id: otherRest.id,
          status: "placed",
          total: 50,
          delivery_fee: 0,
          tax_amount: 0,
          address: { label: "QA", line: "other" },
        })
        .select("id")
        .single();
      if (error || !foreignOrder) {
        skip("vendor cannot read other-restaurant order", error?.message ?? "insert failed");
      } else {
        const { data } = await vendor
          .from("orders")
          .select("id")
          .eq("id", foreignOrder.id)
          .maybeSingle();
        const vendorOwnsOther = otherRest.owner_id === vendorUser?.id;
        if (vendorOwnsOther) {
          skip("vendor cannot read other-restaurant order", "demo vendor owns both");
        } else if (data === null) {
          pass("vendor cannot read other-restaurant order (RLS)");
        } else {
          fail("vendor cannot read other-restaurant order (RLS)", "leaked");
        }
        await admin.from("orders").delete().eq("id", foreignOrder.id);
      }
    } else {
      skip("vendor cannot read other-restaurant order", "no second restaurant");
    }

    await vendor.auth.signOut();
  } catch (e) {
    skip(
      "vendor isolation checks",
      e instanceof Error ? e.message : "vendor sign-in failed"
    );
  }

  try {
    const driver = await signIn("driver@deligro.demo");
    const { data } = await driver
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .maybeSingle();
    // Unassigned driver must not see customer order.
    if (data === null) pass("unassigned driver cannot read order (RLS)");
    else fail("unassigned driver cannot read order (RLS)", "leaked");
    await driver.auth.signOut();
  } catch (e) {
    skip(
      "unassigned driver cannot read order",
      e instanceof Error ? e.message : "driver sign-in failed"
    );
  }
}

// ---------- HTTP layer ----------

async function testHttpIdor(orderId: string, addressId: string) {
  console.log(`\n[HTTP] API IDOR against ${BASE_URL}`);

  const reachable = await httpReachable();
  if (!reachable) {
    skip("HTTP IDOR suite", `BASE_URL not reachable (${BASE_URL}) — start the app or set BASE_URL`);
    return;
  }

  const cookieA = await sessionCookieHeader("qa-customer-a@deligro.qa");
  const cookieB = await sessionCookieHeader("qa-customer-b@deligro.qa");

  {
    const { status } = await api(`/api/orders/${orderId}`);
    if (status === 401) pass("unauthenticated GET /api/orders/:id → 401");
    else fail("unauthenticated GET /api/orders/:id → 401", `got ${status}`);
  }

  {
    const { status, json } = await api(`/api/orders/${orderId}`, {
      cookie: cookieA,
    });
    if (status === 200 && json?.order) pass("owner GET /api/orders/:id → 200");
    else fail("owner GET /api/orders/:id → 200", `got ${status}`);
  }

  {
    const { status, json } = await api(`/api/orders/${orderId}`, {
      cookie: cookieB,
    });
    if (status === 404 && json?.error === "not_found") {
      pass("peer GET /api/orders/:id → 404 not_found");
    } else {
      fail("peer GET /api/orders/:id → 404 not_found", `got ${status} ${JSON.stringify(json)}`);
    }
  }

  {
    const { status, json } = await api(`/api/orders/${orderId}/tracking`, {
      cookie: cookieB,
    });
    if (status === 404) pass("peer GET /api/orders/:id/tracking → 404");
    else fail("peer GET /api/orders/:id/tracking → 404", `got ${status} ${JSON.stringify(json)}`);
  }

  {
    const { status, json } = await api(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      cookie: cookieB,
    });
    if (status === 404 && json?.error === "not_found") {
      pass("peer POST /api/orders/:id/cancel → 404");
    } else {
      fail("peer POST /api/orders/:id/cancel → 404", `got ${status} ${JSON.stringify(json)}`);
    }
  }

  {
    const { status, json } = await api(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      cookie: cookieB,
      body: { status: "kitchen" },
    });
    if (status === 404) pass("peer PATCH /api/orders/:id/status → 404");
    else fail("peer PATCH /api/orders/:id/status → 404", `got ${status} ${JSON.stringify(json)}`);
  }

  {
    const { status, json } = await api(`/api/addresses/${addressId}`, {
      method: "PATCH",
      cookie: cookieB,
      body: { line: "HACKED via API" },
    });
    if (status === 404) pass("peer PATCH /api/addresses/:id → 404");
    else fail("peer PATCH /api/addresses/:id → 404", `got ${status} ${JSON.stringify(json)}`);
  }

  {
    const { status } = await api(`/api/addresses/${addressId}`, {
      method: "DELETE",
      cookie: cookieB,
    });
    // Prefer 404; some handlers return 200 with a no-op delete under RLS.
    const { data: stillThere } = await admin
      .from("addresses")
      .select("id")
      .eq("id", addressId)
      .maybeSingle();
    if (stillThere?.id === addressId) {
      if (status === 404) pass("peer DELETE /api/addresses/:id → 404 (row kept)");
      else {
        fail(
          "peer DELETE /api/addresses/:id → 404 (row kept)",
          `row kept but status=${status}`
        );
      }
    } else {
      fail("peer DELETE /api/addresses/:id keeps row", "address was deleted");
    }
  }

  // Role portal gates
  console.log("\n[HTTP] Role portal gates");
  {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: cookieB },
      redirect: "manual",
    });
    const loc = res.headers.get("location") ?? "";
    if (
      res.status === 307 ||
      res.status === 302 ||
      res.status === 303
    ) {
      if (loc.includes("denied=1") || loc.includes("/login")) {
        pass("customer GET /admin → redirect denied/login", loc);
      } else {
        fail("customer GET /admin → redirect denied/login", `→ ${loc}`);
      }
    } else if (res.status === 200) {
      // requireRole may redirect in RSC; follow once.
      const html = await res.text();
      if (html.includes("denied") || html.length < 50) {
        pass("customer GET /admin denied (body)", `status=${res.status}`);
      } else {
        // Next may render login via client redirect — check Location after follow
        const followed = await fetch(`${BASE_URL}/admin`, {
          headers: { Cookie: cookieB },
          redirect: "follow",
        });
        if (followed.url.includes("denied=1") || followed.url.includes("/login")) {
          pass("customer GET /admin → login?denied=1", followed.url);
        } else {
          fail("customer GET /admin → login?denied=1", `landed ${followed.url}`);
        }
      }
    } else {
      fail("customer GET /admin → redirect denied/login", `status=${res.status}`);
    }
  }

  {
    const res = await fetch(`${BASE_URL}/vendor`, {
      headers: { Cookie: cookieB },
      redirect: "manual",
    });
    const loc = res.headers.get("location") ?? "";
    if ((res.status === 307 || res.status === 302) && (loc.includes("denied") || loc.includes("/login"))) {
      pass("customer GET /vendor → redirect denied/login", loc);
    } else {
      const followed = await fetch(`${BASE_URL}/vendor`, {
        headers: { Cookie: cookieB },
        redirect: "follow",
      });
      if (followed.url.includes("denied=1") || followed.url.includes("/login")) {
        pass("customer GET /vendor → login?denied=1", followed.url);
      } else {
        fail("customer GET /vendor → login?denied=1", `landed ${followed.url} (status ${res.status})`);
      }
    }
  }
}

async function main() {
  console.log("Deligro IDOR / cross-account QA suite");
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  BASE_URL: ${BASE_URL}`);

  console.log("\n[setup] Ensuring QA accounts…");
  for (const a of QA_ACCOUNTS) {
    try {
      await ensureAccount(a);
      console.log(`  · ${a.email} (${a.role})`);
    } catch (e) {
      console.warn(
        `  ! ${a.email}: ${e instanceof Error ? e.message : e}`
      );
    }
  }

  const customerAId = QA_ACCOUNTS[0].id;
  if (!customerAId) {
    console.error("Failed to provision qa-customer-a");
    process.exit(1);
  }

  console.log("\n[setup] Creating fixtures (order + address for A)…");
  const fixtures = await setupFixtures(customerAId);
  console.log(`  · order ${fixtures.orderId}`);
  console.log(`  · address ${fixtures.addressId}`);

  try {
    await testRlsIdor(fixtures.orderId, fixtures.addressId, customerAId);
    await testVendorIsolation(fixtures.orderId, fixtures.restaurantId);
    await testHttpIdor(fixtures.orderId, fixtures.addressId);
  } finally {
    console.log("\n[cleanup] Removing fixtures…");
    await cleanupFixtures(fixtures.orderId, fixtures.addressId);
  }

  const failed = results.filter((r) => !r.ok);
  const skipped = results.filter((r) => r.skipped);
  const passed = results.filter((r) => r.ok && !r.skipped);

  console.log(
    `\nResult: ${passed.length} passed · ${failed.length} failed · ${skipped.length} skipped`
  );
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL: ${f.name} — ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
