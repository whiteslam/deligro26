// Runs migration 0171 in an in-process Postgres (PGlite) on top of manager-base.mjs + 0142 + 0151:
// the zone grid, vendor benchmarks and SLA targets/breaches behind the Insights screens.
// Needs: npm i --no-save @electric-sql/pglite@0.2.17     Usage: node scripts/qa/sql/migration-0171.mjs
import { managerBase, readMigration, id, IDS } from "./manager-base.mjs";

const { db, ZA, ZB } = await managerBase();
const { A, M, MB, C, R1, R2, D1 } = IDS;
await db.exec(readMigration("0142_manager_orders_live.sql"));
await db.exec(readMigration("0151_manager_riders.sql"));
// Restaurant columns the benchmarks read (0017–0056 add them in the real schema).
await db.exec(`alter table public.restaurants add column if not exists lat double precision, add column if not exists lng double precision,
  add column if not exists rating numeric, add column if not exists rating_count integer default 0;
  update public.restaurants set lat = 21.7, lng = 81.5 where id in ('${R1}','${R2}');`);
const MIGRATION = readMigration("0171_insight_analytics.sql");
await db.exec(MIGRATION);

let passed = 0, failed = 0;
const ok = (n, c, extra) => { if (c) passed++; else failed++; console.log(`  ${c ? "ok  " : "FAIL"} ${n}${!c && extra ? `\n         ${String(extra).slice(0, 300)}` : ""}`); };
async function as(role, sql) {
  const claims = role === "service_role" ? { role: "service_role" } : {};
  await db.exec(`set role ${role}; select set_config('test.jwt','${JSON.stringify(claims)}',false);`);
  try { const r = await db.query(sql); return { ok: true, rows: r.rows }; }
  catch (e) { return { ok: false, msg: String(e.message) }; }
  finally { await db.exec("reset role; select set_config('test.jwt','',false);"); }
}
const srv = (sql) => as("service_role", sql);
const one = async (sql) => (await db.query(sql)).rows[0];
const all = async (sql) => (await db.query(sql)).rows;
const fails = (r, re) => !r.ok && re.test(r.msg);

const zone = await one(`select center_lat as lat, center_lng as lng, radius_km as r from public.delivery_zones where id = '${ZA}'`);
const latStep = 1 / 111.32;
const lngStep = 1 / (111.32 * Math.cos((zone.lat * Math.PI) / 180));
const li0 = Math.floor(zone.lat / latStep), gi0 = Math.floor(zone.lng / lngStep);
const cellCenter = (dl, dg) => ({ lat: (li0 + dl + 0.5) * latStep, lng: (gi0 + dg + 0.5) * lngStep });

let n = 0;
const mk = async (o = {}) => {
  const oid = id(3000 + ++n);
  const {
    rid = R1, cust = C, status = "delivered", total = 100, created = "now() - interval '2 days'", accepted = "null", ready = "null",
    prep = "null", pos = null, mins = null, method = "cod", payment = "pending", picked = null, driver = null, addr = null,
  } = o;
  const address = addr ?? (pos ? `'${JSON.stringify({ lat: pos.lat, lng: pos.lng })}'::jsonb` : "null");
  await db.exec(`insert into public.orders (id, customer_id, restaurant_id, status, total, payment_method, payment_status, created_at, accepted_at, ready_at, prep_minutes, address)
                 values ('${oid}','${cust}','${rid}','${status}',${total},'${method}','${payment}',${created},${accepted},${ready},${prep},${address})`);
  if (mins !== null || picked !== null || driver !== null) {
    await db.exec(`alter table public.deliveries disable trigger user;
      insert into public.deliveries (order_id, status, driver_id, picked_up_at, delivered_at)
      values ('${oid}','${status === "delivered" ? "delivered" : "assigned"}',${driver ? `'${driver}'` : "null"},
              ${picked ?? "null"}, ${mins !== null ? `(${created}) + interval '${mins} minutes'` : "null"});
      alter table public.deliveries enable trigger user;`);
  }
  return oid;
};

const FROM = "now() - interval '5 days'";
const TO = "now() + interval '1 day'";
const grid = async (zones, allFlag, min = 3) =>
  (await srv(`select public.ops_zone_grid(${zones === null ? "null" : `array[${zones.map((z) => `'${z}'`).join(",")}]::uuid[]`}, ${allFlag}, ${FROM}, ${TO}, ${min}) as j`)).rows?.[0]?.j;

console.log("── zone grid ──");
// Three clusters of drops (5, 2 and 30) in three different 1 km cells, all inside the zone.
const A5 = cellCenter(0, 0), B2 = cellCenter(1, 0), C30 = cellCenter(0, 1);
for (let i = 0; i < 5; i++) await mk({ pos: A5, mins: 40 });
for (let i = 0; i < 2; i++) await mk({ pos: B2, mins: 25 });
for (let i = 0; i < 30; i++) await mk({ pos: C30, mins: 20 });
// One drop 12 km north of the centre: outside the radius, alone in its cell.
await mk({ pos: { lat: zone.lat + 12 / 111.32, lng: zone.lng }, mins: 30 });
// Not drops: an unpaid online checkout, a delivered order with no address, a non-numeric address.
await mk({ pos: A5, method: "online", payment: "pending", mins: 10 });
await mk({ mins: 10 });
await mk({ addr: `'{"lat":"north","lng":"east"}'::jsonb`, mins: 10 });

let g = await grid(null, true);
ok("the grid runs for service_role", !!g, "no result");
const zA = g?.zones?.find((z) => z.id === ZA);
ok("the zone total counts every drop (5 + 2 + 30 + 1 outside = 38)", zA?.drops === 38, JSON.stringify(zA));
ok("cells with fewer than 3 drops are omitted: two cells come back", g?.cells?.length === 2, JSON.stringify(g?.cells?.map((c) => c.drops)));
ok("...the 5-drop cell and the 30-drop cell", JSON.stringify(g.cells.map((c) => c.drops).sort((a, b) => a - b)) === "[5,30]");
const c30 = g.cells.find((c) => c.drops === 30);
ok("a cell carries its key, bounds and centre", !!c30?.key && c30.bounds.south < c30.center.lat && c30.center.lat < c30.bounds.north && c30.bounds.west < c30.center.lng && c30.center.lng < c30.bounds.east, JSON.stringify(c30));
ok("...a 1 km cell: height about 1/111.32 degree", Math.abs((c30.bounds.north - c30.bounds.south) - latStep) < 1e-9);
ok("the 30-drop cell took 20 minutes on average", Math.abs(c30.avgDeliveryMinutes - 20) < 0.01 && Math.abs(c30.medianDeliveryMinutes - 20) < 0.01, JSON.stringify(c30));
ok("...and sits inside the zone, with the zone as its nearest", c30.insideZone === true && c30.nearestZoneId === ZA, JSON.stringify(c30));
ok("a cell has a shop-to-drop distance", Number(c30.avgDistanceKm) > 0);
ok("the outside drop shows in outsideRadiusShare (1 of 38)", zA.outsideDrops === 1 && Math.abs(zA.outsideRadiusShare - 1 / 38) < 1e-6, JSON.stringify(zA));
ok("...with the outside centroid", Math.abs(zA.outsideCenter.lat - (zone.lat + 12 / 111.32)) < 1e-6);
ok("the 95th-percentile distance from the centre is reported", Number(zA.p95DistanceKm) > 0 && Number(zA.p95DistanceKm) <= 13, String(zA.p95DistanceKm));
ok("orders per day is counted orders ÷ days in the range", Math.abs(zA.ordersPerDay - 38 / 6) < 0.5, String(zA.ordersPerDay));
const g1 = await grid(null, true, 1);
ok("with a minimum of 1 the small cells return too", g1.cells.length === 4, String(g1?.cells?.length));
ok("the city list has a row for the zone's city", g.cities.some((c) => c.drops >= 38), JSON.stringify(g.cities));
const gb = await grid([ZB], false);
ok("scope ZB lists only ZB, with no cells", gb.zones.length === 1 && gb.zones[0].id === ZB && gb.cells.length === 0, JSON.stringify(gb.zones?.map((z) => z.id)));
const ga = await grid([ZA], false);
ok("scope ZA does not list ZB", !ga.zones.some((z) => z.id === ZB));
const gn = await grid([], false);
ok("an empty scope is empty (fail closed)", gn.zones.length === 0 && gn.cells.length === 0);
const gnull = await grid(null, false);
ok("a null scope without all is empty too", gnull.zones.length === 0 && gnull.cells.length === 0);
ok("authenticated cannot run the grid", fails(await as("authenticated", `select public.ops_zone_grid(null, true, ${FROM}, ${TO}, 3)`), /permission denied/i));

console.log("\n── vendor benchmarks ──");
const C2 = id(2991), C3 = id(2992);
await db.exec(`insert into public.profiles (id, role, full_name) values ('${C2}','customer','Two'),('${C3}','customer','Three') on conflict do nothing`);
const BF = "now() - interval '40 days'";
const t = (d) => `now() - interval '${d} days'`;
// Prep 10, 20, 40 minutes; accept 2, 4, 6 minutes. C orders twice, C2 once; C3's order is cancelled.
await mk({ rid: R2, cust: C, created: t(30), accepted: `${t(30)} + interval '2 minutes'`, ready: `${t(30)} + interval '12 minutes'`, total: 100 });
await mk({ rid: R2, cust: C, created: t(30), accepted: `${t(30)} + interval '4 minutes'`, ready: `${t(30)} + interval '24 minutes'`, total: 200 });
await mk({ rid: R2, cust: C2, created: t(30), accepted: `${t(30)} + interval '6 minutes'`, ready: `${t(30)} + interval '46 minutes'`, total: 300 });
await mk({ rid: R2, cust: C3, created: t(30), status: "cancelled", total: 999 });
await mk({ rid: R2, cust: C2, created: t(30), method: "online", payment: "pending", total: 888 });
await db.exec(`update public.restaurants set rating = 4.4, rating_count = 12 where id = '${R2}'`);
const bench = async (zones, allFlag) =>
  (await srv(`select public.ops_vendor_benchmarks(${zones === null ? "null" : `array[${zones.map((z) => `'${z}'`).join(",")}]::uuid[]`}, ${allFlag}, ${BF}, ${t(20)}) as j`)).rows?.[0]?.j;
const bj = await bench(null, true);
const v2 = bj?.find((v) => v.restaurantId === R2);
ok("the benchmark runs and lists the shop", !!v2, JSON.stringify(bj));
ok("orders count the cancelled one and not the unpaid online checkout (4)", v2?.orders === 4, JSON.stringify(v2));
ok("prep time is the median of 10, 20, 40 → 20", Math.abs(v2?.prepMinutes - 20) < 1e-6, String(v2?.prepMinutes));
ok("accept time is the median of 2, 4, 6 → 4", Math.abs(v2?.acceptMinutes - 4) < 1e-6, String(v2?.acceptMinutes));
ok("cancellation is 1 in 4", Math.abs(v2?.cancellationRate - 0.25) < 1e-9, String(v2?.cancellationRate));
ok("AOV is the customer-paid average of the non-cancelled (200)", Math.abs(v2?.aov - 200) < 1e-6, String(v2?.aov));
ok("repeat rate is 1 of 2 customers → 0.5", Math.abs(v2?.repeatRate - 0.5) < 1e-9, String(v2?.repeatRate));
ok("the rating shows when there are ratings", Math.abs(v2?.rating - 4.4) < 1e-9);
await db.exec(`update public.restaurants set rating_count = 0 where id = '${R2}'`);
ok("...and is null when there are none", (await bench(null, true)).find((v) => v.restaurantId === R2).rating === null);
const zbOnly = await bench([ZA], false);
ok("scope ZA does not list the ZB shop", !zbOnly.some((v) => v.restaurantId === R2));
ok("an empty scope lists nothing", (await bench([], false)).length === 0);
ok("authenticated cannot run the benchmark", fails(await as("authenticated", `select public.ops_vendor_benchmarks(null, true, ${BF}, ${t(20)})`), /permission denied/i));

console.log("\n── SLA targets ──");
const def = await one(`select accept_minutes as a, prep_minutes as p, pickup_minutes as k, deliver_minutes as d from public.ops_sla_targets where zone_id is null`);
ok("the default targets are seeded: 5 / 20 / 10 / 45", def?.a === 5 && def?.p === 20 && def?.k === 10 && def?.d === 45, JSON.stringify(def));
ok("authenticated cannot write the targets", fails(await as("authenticated", `update public.ops_sla_targets set accept_minutes = 1`), /permission denied|row-level/i));

console.log("\n── SLA breaches ──");
const SF = "now() - interval '12 days'", ST = "now() - interval '8 days'";
const ago = (d, mm = 0) => `now() - interval '${d} days' + interval '${mm} minutes'`;
// Five orders in zone A, 10 days ago (5 is the minimum for the vendor and rider tables).
const slaOrders = [];
for (let i = 0; i < 5; i++) {
  const created = ago(10, i);
  const accepted = `(${created}) + interval '${i === 0 ? 6 : 3} minutes'`; // order 0 breaches accept (6 > 5)
  const ready = `(${accepted}) + interval '${i === 1 ? 22 : 15} minutes'`; // order 1 breaches the default prep (22 > 20)
  const picked = `(${ready}) + interval '${i === 2 ? 12 : 5} minutes'`; // order 2 breaches pickup (12 > 10)
  slaOrders.push(await mk({
    created, accepted, ready, picked, driver: D1, mins: i === 3 ? 50 : 30, // order 3 breaches deliver (50 > 45)
    prep: i === 4 ? "25" : "null",
  }));
}
// An order that never got a rider: it reaches accept and prep, never pickup or deliver.
await mk({ created: ago(10, 9), accepted: `(${ago(10, 9)}) + interval '2 minutes'`, ready: `(${ago(10, 9)}) + interval '12 minutes'`, status: "ready" });
// A cancelled order is in no stage.
await mk({ created: ago(10, 10), status: "cancelled", accepted: `(${ago(10, 10)}) + interval '30 minutes'` });
const sla = async (zones, allFlag) =>
  (await srv(`select public.ops_sla_breaches(${zones === null ? "null" : `array[${zones.map((z) => `'${z}'`).join(",")}]::uuid[]`}, ${allFlag}, ${SF}, ${ST}) as j`)).rows?.[0]?.j;
let s = await sla(null, true);
ok("the SLA breakdown runs", !!s?.overall, JSON.stringify(s));
ok("accept: 6 orders reached it, 1 breached (6 minutes vs 5)", s.overall.accept.orders === 6 && s.overall.accept.breaches === 1, JSON.stringify(s.overall.accept));
ok("prep: 6 orders; order 1 (22 min) breaches the default 20; order 4 (22 min?) uses its own 25", s.overall.prep.orders === 6, JSON.stringify(s.overall.prep));
ok("pickup counts only orders that reached ready and were picked up (5), 1 breach", s.overall.pickup.orders === 5 && s.overall.pickup.breaches === 1, JSON.stringify(s.overall.pickup));
ok("deliver is created → delivered end to end: 5 orders, 1 breach (50 > 45)", s.overall.deliver.orders === 5 && s.overall.deliver.breaches === 1, JSON.stringify(s.overall.deliver));
ok("a stage carries rate and median", s.overall.deliver.rate === 0.2 && Math.abs(s.overall.deliver.medianMinutes - 30) < 0.5, JSON.stringify(s.overall.deliver));
ok("the cancelled order is in no stage", s.overall.accept.orders === 6);
// Order 4 has prep_minutes 25 and its prep took 15: no breach either way; make it 22 to prove the own target is used.
await db.exec(`update public.orders set ready_at = accepted_at + interval '22 minutes' where id = '${slaOrders[4]}'`);
s = await sla(null, true);
ok("a prep of 22 minutes against the order's own 25 is not a breach (order 1's 22 against the default 20 is)", s.overall.prep.breaches === 1, JSON.stringify(s.overall.prep));
const zRow = s.byZone.find((z) => z.zoneId === ZA);
ok("by zone, with the zone's name", zRow?.name && zRow.accept.orders === 6, JSON.stringify(zRow));
ok("by city, recomputed from the orders", s.byCity.length >= 1 && s.byCity[0].accept.orders === 6, JSON.stringify(s.byCity));
ok("by vendor (5 or more orders at accept): the shop", s.byVendor.length === 1 && s.byVendor[0].id === R1 && s.byVendor[0].accept.orders >= 5, JSON.stringify(s.byVendor));
ok("by rider (5 or more deliveries): the rider", s.byRider.length === 1 && s.byRider[0].id === D1 && s.byRider[0].deliver.orders === 5, JSON.stringify(s.byRider));
ok("daily rows carry a rate per stage", s.daily.length >= 1 && "accept" in s.daily[0] && "deliver" in s.daily[0], JSON.stringify(s.daily));
const sb = await sla([ZB], false);
ok("another zone's scope sees none of it", sb.overall.accept.orders === 0 && sb.byVendor.length === 0, JSON.stringify(sb.overall.accept));
ok("an empty scope sees nothing", (await sla([], false)).overall.accept.orders === 0);
ok("authenticated cannot run the SLA breakdown", fails(await as("authenticated", `select public.ops_sla_breaches(null, true, ${SF}, ${ST})`), /permission denied/i));

console.log("\n── setting a target ──");
const setT = (actor, zone, a, p, k, d, reason, cid) =>
  srv(`select public.ops_set_sla_target('${actor}', ${zone ? `'${zone}'` : "null"}, ${a}, ${p}, ${k}, ${d}, ${reason === null ? "null" : `'${reason}'`}, '${cid}') as j`);
const auditCount = async (action) => (await one(`select count(*)::int as n from public.ops_audit_log where action = '${action}'`)).n;
let r = await setT(M, ZA, 10, 20, 10, 45, "Vendors here are slower to accept", "sla-1");
ok("a zone-A manager sets zone A's target", r.ok, r.msg);
ok("...one audit row, with before/after and the reason", (await auditCount("sla_target.set")) === 1);
const row = await one(`select * from public.ops_audit_log where action = 'sla_target.set' order by id desc limit 1`);
ok("...the row carries actor, zone and reason", row.actor_id === M && row.zone_id === ZA && row.reason === "Vendors here are slower to accept" && row.before?.acceptMinutes === 5 && row.after?.acceptMinutes === 10, JSON.stringify(row));
s = await sla(null, true);
ok("the breach table now uses the zone's own target (6 minutes vs 10: no accept breach)", s.overall.accept.breaches === 0, JSON.stringify(s.overall.accept));
r = await setT(M, ZA, 10, 20, 10, 45, "Vendors here are slower to accept", "sla-1");
ok("the same client action id again is a replay: no second row", r.ok && r.rows[0].j.replayed === true && (await auditCount("sla_target.set")) === 1, JSON.stringify(r));
ok("another manager's zone is forbidden", fails(await setT(MB, ZA, 6, 20, 10, 45, "Because", "sla-2"), /forbidden/));
ok("the platform default is admin-only for a manager", fails(await setT(M, null, 6, 20, 10, 45, "Because", "sla-3"), /forbidden/));
ok("...and fine for an admin", (await setT(A, null, 6, 20, 10, 45, "Raise the default", "sla-4")).ok);
ok("a reason is required", fails(await setT(M, ZA, 10, 20, 10, 45, null, "sla-5"), /reason_required/));
ok("two characters is not a reason", fails(await setT(M, ZA, 10, 20, 10, 45, "ab", "sla-6"), /reason_required/));
for (const [label, args] of [["accept 0", [0, 20, 10, 45]], ["accept 61", [61, 20, 10, 45]], ["prep 181", [5, 181, 10, 45]], ["pickup 121", [5, 20, 121, 45]], ["deliver 9", [5, 20, 10, 9]], ["deliver 241", [5, 20, 10, 241]]]) {
  ok(`out-of-range ${label} is bad_threshold`, fails(await setT(M, ZA, ...args, "Because", `sla-b-${label}`), /bad_threshold/));
}
ok("the defaults fit the bounds: a minimum edge is accepted", (await setT(M, ZA, 1, 1, 1, 10, "Edge", "sla-7")).ok);
ok("...and a maximum edge", (await setT(M, ZA, 60, 180, 120, 240, "Edge", "sla-8")).ok);
r = await srv(`select public.ops_reset_sla_target('${M}', '${ZA}', 'Back to the default', 'sla-9') as j`);
ok("a zone target can be reset to the inherited default", r.ok, r.msg);
ok("...which removes the zone's row and writes sla_target.reset", !(await one(`select 1 as x from public.ops_sla_targets where zone_id = '${ZA}'`)) && (await auditCount("sla_target.reset")) === 1);
ok("the default itself cannot be reset", fails(await srv(`select public.ops_reset_sla_target('${A}', null, 'Why', 'sla-10')`), /forbidden/));
ok("authenticated cannot call the setter", fails(await as("authenticated", `select public.ops_set_sla_target('${M}','${ZA}',5,20,10,45,'x','y')`), /permission denied/i));

console.log("\n── re-apply ──");
const again = await db.exec(MIGRATION).then(() => ({ ok: true }), (e) => ({ ok: false, msg: e.message }));
ok("migration can be applied twice", again.ok, again.msg);
ok("...and the default row is still one row", (await one(`select count(*)::int as n from public.ops_sla_targets where zone_id is null`)).n === 1);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
