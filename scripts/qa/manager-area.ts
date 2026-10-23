/**
 * QA — the city filter (§17.8): `city` narrows what a manager already sees,
 * never widens it; `zone` wins when both are sent; city rollups sum counts and
 * recompute rates instead of averaging percentages.
 *
 * Pure plus file scans, no I/O. Usage: npx tsx scripts/qa/manager-area.ts
 */
import fs from "node:fs";
import path from "node:path";
import { narrowScope, type ManagerScope } from "../../src/lib/auth/manager-scope";
import { areaLabel, parseAreaQuery, rollupByCity } from "../../src/lib/ops/area";
import { featuresFor } from "../../src/lib/features/catalog";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
  }
}

const A1 = "a1111111-1111-4111-8111-111111111111";
const A2 = "a2222222-2222-4222-8222-222222222222";
const B1 = "b1111111-1111-4111-8111-111111111111";
const CA = "ca111111-1111-4111-8111-111111111111";
const CB = "cb111111-1111-4111-8111-111111111111";
const zoneCity = new Map<string, string>([
  [A1, CA],
  [A2, CA],
  [B1, CB],
]);
const admin: ManagerScope = { all: true };
const mgr: ManagerScope = { all: false, zoneIds: [A1, B1] };
const same = (a: ManagerScope, b: ManagerScope) => JSON.stringify(a) === JSON.stringify(b);

// ── parseAreaQuery ──────────────────────────────────────────────────────────
console.log("parseAreaQuery");
{
  const ok = parseAreaQuery(new URLSearchParams(`zone=${A1}`));
  check("a uuid zone parses", "error" in ok ? false : ok.zone === A1 && ok.city === null);
  const c = parseAreaQuery(new URLSearchParams(`city=${CA.toUpperCase()}`));
  check("a uuid city parses, lower-cased", "error" in c ? false : c.city === CA);
  const none = parseAreaQuery(new URLSearchParams(""));
  check("no area is fine", "error" in none ? false : none.zone === null && none.city === null);
  const badZone = parseAreaQuery(new URLSearchParams("zone=nope"));
  check("a non-uuid zone is a 400 on `zone`", "error" in badZone && badZone.field === "zone");
  const badCity = parseAreaQuery(new URLSearchParams("city=nope"));
  check("a non-uuid city is a 400 on `city`", "error" in badCity && badCity.field === "city");
  const empty = parseAreaQuery(new URLSearchParams("zone=&city="));
  check("empty values mean no filter", "error" in empty ? false : empty.zone === null && empty.city === null);
}

// ── narrowScope ─────────────────────────────────────────────────────────────
console.log("narrowScope with a city");
check(
  "a city narrows to the manager's zones in it",
  same(narrowScope(mgr, { city: CA }, zoneCity), { all: false, zoneIds: [A1] })
);
check(
  "a city the manager has no zone in is empty",
  same(narrowScope({ all: false, zoneIds: [A1] }, { city: CB }, zoneCity), { all: false, zoneIds: [] })
);
check(
  "a city never widens (A2 is in the city but not the manager's)",
  !JSON.stringify(narrowScope(mgr, { city: CA }, zoneCity)).includes(A2)
);
check(
  "zone wins when both are sent",
  same(narrowScope(mgr, { zone: B1, city: CA }, zoneCity), { all: false, zoneIds: [B1] })
);
check(
  "a zone the manager lacks is empty even with a matching city",
  same(narrowScope(mgr, { zone: A2, city: CA }, zoneCity), { all: false, zoneIds: [] })
);
check(
  "an admin with a city gets that city's zones",
  (() => {
    const s = narrowScope(admin, { city: CA }, zoneCity);
    return !s.all && s.zoneIds.length === 2 && s.zoneIds.includes(A1) && s.zoneIds.includes(A2);
  })()
);
check("an admin with an unknown city gets nothing", same(narrowScope(admin, { city: CB.replace("cb", "cc") }, zoneCity), { all: false, zoneIds: [] }));
check("no area leaves the scope alone", narrowScope(mgr, {}, zoneCity) === mgr);
check("the old (scope, zone) form still works", same(narrowScope(mgr, A1), { all: false, zoneIds: [A1] }));
check("the old form with a foreign zone is empty", same(narrowScope(mgr, A2), { all: false, zoneIds: [] }));
check("a manager with no zones stays empty under any city", same(narrowScope({ all: false, zoneIds: [] }, { city: CA }, zoneCity), { all: false, zoneIds: [] }));

// ── areaLabel ───────────────────────────────────────────────────────────────
console.log("areaLabel");
{
  const names = { zones: new Map([[A1, "Bemetara"]]), cities: new Map([[CA, "Durg"]]) };
  const l1 = areaLabel(mgr, { zone: A1 }, names);
  check("zone label", l1.type === "zone" && l1.id === A1 && l1.name === "Bemetara");
  const l2 = areaLabel(mgr, { city: CA }, names);
  check("city label", l2.type === "city" && l2.id === CA && l2.name === "Durg");
  const l3 = areaLabel(mgr, {}, names);
  check("scope label", l3.type === "scope" && l3.id === null && l3.name === "All my zones");
  const l4 = areaLabel(mgr, { zone: A1, city: CA }, names);
  check("zone beats city in the label too", l4.type === "zone");
}

// ── rollupByCity ────────────────────────────────────────────────────────────
console.log("rollupByCity");
{
  const rows = [
    { zoneId: A1, orders: 10, breaches: 1 },
    { zoneId: A2, orders: 30, breaches: 9 },
    { zoneId: B1, orders: 20, breaches: 2 },
  ];
  const cityOf = new Map([
    [A1, { id: CA, name: "Durg" }],
    [A2, { id: CA, name: "Durg" }],
    [B1, { id: CB, name: "Raipur" }],
  ]);
  const out = rollupByCity(rows, cityOf, {
    sum: ["orders", "breaches"],
    ratios: [{ key: "rate" as never, num: "breaches", den: "orders" }],
  });
  const durg = out.find((r) => r.cityId === CA) as Record<string, number | string> | undefined;
  check("counts are summed", durg?.orders === 40 && durg?.breaches === 10);
  check("the rate is recomputed (10/40 = 0.25, not the 0.2 average of 0.1 and 0.3)", durg?.rate === 0.25, JSON.stringify(durg));
  check("another city stays separate", (out.find((r) => r.cityId === CB) as { orders?: number } | undefined)?.orders === 20);
  const zero = rollupByCity([{ zoneId: A1, orders: 0, breaches: 0 }], cityOf, {
    sum: ["orders", "breaches"],
    ratios: [{ key: "rate" as never, num: "breaches", den: "orders" }],
  });
  check("a zero denominator gives null, not NaN", (zero[0] as { rate?: number | null }).rate === null);
  const unknown = rollupByCity([{ zoneId: "zzzz", orders: 5, breaches: 0 }], cityOf, { sum: ["orders"] });
  check("a zone with no known city is left out", unknown.length === 0);
}

// ── structural ──────────────────────────────────────────────────────────────
console.log("structure");
const root = path.resolve(__dirname, "../..");
function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
{
  const routes = walk(path.join(root, "src/app/api/manager")).filter((f) => f.endsWith("route.ts"));
  const offenders: string[] = [];
  for (const f of routes) {
    const src = fs.readFileSync(f, "utf8");
    // Every handler that takes `request` and opens the gate must hand it over,
    // so `city` narrows the scope in one place and no route can forget it.
    const handlers = src.split(/export async function /).slice(1);
    for (const h of handlers) {
      const head = h.slice(0, h.indexOf("{"));
      if (!/\(request: Request/.test(head)) continue;
      const calls = h.match(/managerApiContext\([^)]*\)/g) ?? [];
      for (const c of calls) if (!/request\)$/.test(c)) offenders.push(`${path.relative(root, f)}: ${c}`);
    }
  }
  check("every handler with a request passes it to managerApiContext", offenders.length === 0, offenders.slice(0, 5).join("\n         "));

  const ctx = fs.readFileSync(path.join(root, "src/lib/auth/manager-api.server.ts"), "utf8");
  check("managerApiContext applies the area filter", /parseAreaQuery/.test(ctx) && /narrowScope/.test(ctx));

  const bad: string[] = [];
  for (const dir of ["src/app/api/manager/insights", "src/lib/ops/insights"]) {
    for (const f of walk(path.join(root, dir))) {
      if (!/\.(ts|tsx)$/.test(f)) continue;
      const src = fs.readFileSync(f, "utf8");
      if (/loadMetricOrders|\breadAll\b/.test(src)) bad.push(path.relative(root, f));
      if (/[ऀ-ॿ]/.test(src)) bad.push(`${path.relative(root, f)} (Devanagari)`);
    }
  }
  check("no insight file pulls unbounded rows or contains Devanagari", bad.length === 0, bad.join(", "));
}
{
  const defs = featuresFor("manager");
  const get = (k: string) => defs.find((d) => d.key === k) as { defaultOn?: boolean; labelHi?: string } | undefined;
  check("manager.insights.view exists and is on by default", !!get("manager.insights.view") && get("manager.insights.view")?.defaultOn !== false);
  check("manager.dispatch.configure exists and is off by default", get("manager.dispatch.configure")?.defaultOn === false);
  check("manager.accounting.export exists and is off by default", get("manager.accounting.export")?.defaultOn === false);
  check(
    "none of the three has a Hindi label",
    ["manager.insights.view", "manager.dispatch.configure", "manager.accounting.export"].every((k) => !get(k)?.labelHi)
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
