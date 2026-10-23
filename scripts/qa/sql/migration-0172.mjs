// Runs migration 0172 in an in-process Postgres (PGlite) on top of manager-base.mjs + 0142 + 0151:
// per-zone automatic rider assignment, how each delivery was assigned, and the dispatch overview.
// Needs: npm i --no-save @electric-sql/pglite@0.2.17     Usage: node scripts/qa/sql/migration-0172.mjs
import { managerBase, readMigration, id, IDS } from "./manager-base.mjs";

const { db, ZA, ZB } = await managerBase();
const { A, M, MB, C, R1, D1, D2, D3, D4, D5 } = IDS;
await db.exec(readMigration("0142_manager_orders_live.sql"));
await db.exec(readMigration("0151_manager_riders.sql"));
const MIGRATION = readMigration("0172_auto_assign.sql");
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
const fails = (r, re) => !r.ok && re.test(r.msg);

let n = 0;
const newOrder = async (status = "ready", rid = R1) => {
  const oid = id(4000 + ++n);
  await db.exec(`insert into public.orders (id, customer_id, restaurant_id, status, total) values ('${oid}','${C}','${rid}','${status}',100)`);
  await db.exec(`insert into public.deliveries (order_id, status) values ('${oid}','unassigned')`);
  return oid;
};
const auto = async (order, rider, maxLoad = 0) =>
  (await srv(`select public.ops_auto_assign_delivery('${order}','${rider}',${maxLoad}) as r`)).rows?.[0]?.r;
const delivery = (order) => one(`select status::text as status, driver_id, assignment_source from public.deliveries where order_id = '${order}'`);
const setMode = (zone, mode, load = 0) => db.exec(`update public.delivery_zones set dispatch_mode = '${mode}', auto_assign_max_load = ${load} where id = '${zone}'`);

console.log("── the columns ──");
const z0 = await one(`select dispatch_mode, auto_assign_max_load from public.delivery_zones where id = '${ZA}'`);
ok("a zone starts on offers, max load 0", z0.dispatch_mode === "offer" && z0.auto_assign_max_load === 0, JSON.stringify(z0));

console.log("\n── ops_auto_assign_delivery ──");
let o1 = await newOrder();
ok("a zone on offers refuses: mode_off", (await auto(o1, D1)) === "mode_off");
await setMode(ZA, "auto_assign", 0);
ok("an eligible idle rider is assigned (null = success)", (await auto(o1, D1)) === null);
let d = await delivery(o1);
ok("...the delivery is assigned to them, source auto", d.status === "assigned" && d.driver_id === D1 && d.assignment_source === "auto", JSON.stringify(d));
ok("a second call for the same order loses: already_assigned", (await auto(o1, D2)) === "already_assigned");
ok("...and the first rider keeps it", (await delivery(o1)).driver_id === D1);

const o2 = await newOrder();
ok("an offline rider: offline", (await auto(o2, D3)) === "offline");
ok("a rider with a stale position: stale_fix", (await auto(o2, D4)) === "stale_fix");
ok("a rider from another zone: out_of_zone", (await auto(o2, D5)) === "out_of_zone");
ok("...and the order is still unassigned after all those refusals", (await delivery(o2)).status === "unassigned");

console.log("\n── load ──");
// D1 already carries o1. With max load 0 they are not idle.
ok("a rider with one active delivery and max load 0: over_load", (await auto(o2, D1, 0)) === "over_load");
ok("...with max load 1 they are assigned", (await auto(o2, D1, 1)) === null);
ok("...and now carry two, so a third is over_load at 1", (await auto(await newOrder(), D1, 1)) === "over_load");
ok("a negative max load is treated as 0", (await auto(await newOrder(), D1, -5)) === "over_load");

console.log("\n── terminal and missing orders ──");
const done = await newOrder("delivered");
ok("a delivered order: terminal", (await auto(done, D2)) === "terminal");
ok("an unknown order: not_found", (await auto(id(999999), D2)) === "not_found");
const cancelled = await newOrder("cancelled");
ok("a cancelled order: terminal", (await auto(cancelled, D2)) === "terminal");

console.log("\n── how a delivery was assigned ──");
const o3 = await newOrder();
const r = await srv(`select public.ops_assign_rider('${M}','${o3}','${D2}','Customer is waiting','src-1') as j`);
ok("a manager assignment works", r.ok, r.msg);
ok("...and is stamped ops", (await delivery(o3)).assignment_source === "ops", JSON.stringify(await delivery(o3)));
const rr = await srv(`select public.ops_reassign_delivery('${M}','${o3}','${D1}','Closer rider',false,'src-2',false) as j`);
ok("a manager reassignment works", rr.ok, rr.msg);
ok("...and is stamped ops", (await delivery(o3)).assignment_source === "ops");
const o4 = await newOrder();
await db.exec(`update public.deliveries set driver_id = '${D2}', status = 'assigned', assigned_at = now() where order_id = '${o4}'`);
ok("a rider taking an offer is stamped rider_accept (no acting manager, not automatic)", (await delivery(o4)).assignment_source === "rider_accept", JSON.stringify(await delivery(o4)));
await db.exec(`update public.deliveries set picked_up_at = now() where order_id = '${o4}'`);
ok("a later update to the same delivery does not re-stamp it", (await delivery(o4)).assignment_source === "rider_accept");
const o5 = await newOrder();
await db.exec(`insert into public.profiles (id, role, full_name) values ('${id(951)}','driver','Pending') on conflict do nothing`);
ok("a delivery never assigned has no source", (await delivery(o5)).assignment_source === null);

console.log("\n── rider_eligible_for_order agrees with the one rule ──");
for (const [name, rider] of [["idle", D2], ["offline", D3], ["stale", D4], ["other zone", D5]]) {
  const a = (await srv(`select public.rider_eligible_for_order('${rider}','${o5}') as r`)).rows?.[0]?.r ?? null;
  const b = (await one(`select public._ops_rider_ineligible('${rider}', (select zone_id from public.orders where id = '${o5}'), null) as r`)).r;
  ok(`${name}: the same answer (${b})`, a === b, `${a} vs ${b}`);
}
ok("an unknown order is not eligible for anyone", (await srv(`select public.rider_eligible_for_order('${D2}','${id(999998)}') as r`)).rows?.[0]?.r === "out_of_zone");

console.log("\n── falling back to offers is recorded ──");
const o6 = await newOrder();
ok("marking a fallback works", (await srv(`select public.ops_mark_auto_fallback('${o6}') as r`)).ok);
const t1 = (await one(`select auto_assign_fell_back_at as t from public.deliveries where order_id = '${o6}'`)).t;
ok("...and stamps the delivery", !!t1);
await srv(`select public.ops_mark_auto_fallback('${o6}')`);
ok("...only the first time", String((await one(`select auto_assign_fell_back_at as t from public.deliveries where order_id = '${o6}'`)).t) === String(t1));
ok("an order with no delivery row is a quiet no-op", (await srv(`select public.ops_mark_auto_fallback('${id(999997)}')`)).ok);

console.log("\n── changing a zone's mode ──");
await setMode(ZA, "offer", 0);
const setZ = (actor, zone, mode, load, reason, cid) =>
  srv(`select public.ops_set_zone_dispatch('${actor}', ${zone ? `'${zone}'` : "null"}, '${mode}', ${load}, ${reason === null ? "null" : `'${reason}'`}, '${cid}') as j`);
const audit = async () => (await one(`select count(*)::int as n from public.ops_audit_log where action = 'zone.dispatch_mode'`)).n;
let s = await setZ(M, ZA, "auto_assign", 1, "Riders are plentiful in the evening", "zd-1");
ok("a zone-A manager switches zone A to automatic", s.ok, s.msg);
const row = await one(`select * from public.ops_audit_log where action = 'zone.dispatch_mode' order by id desc limit 1`);
ok("...one audit row with actor, zone, reason and before/after", (await audit()) === 1 && row.actor_id === M && row.zone_id === ZA && row.reason === "Riders are plentiful in the evening" && row.before?.mode === "offer" && row.after?.mode === "auto_assign" && row.after?.maxLoad === 1, JSON.stringify(row));
const zz = await one(`select dispatch_mode, auto_assign_max_load, dispatch_updated_by from public.delivery_zones where id = '${ZA}'`);
ok("...and the zone carries the setting and who set it", zz.dispatch_mode === "auto_assign" && zz.auto_assign_max_load === 1 && zz.dispatch_updated_by === M);
s = await setZ(M, ZA, "auto_assign", 1, "Riders are plentiful in the evening", "zd-1");
ok("the same client action id again is a replay: no second row", s.ok && s.rows[0].j.replayed === true && (await audit()) === 1);
ok("another zone's manager is forbidden", fails(await setZ(MB, ZA, "offer", 0, "Because", "zd-2"), /forbidden/));
ok("a missing zone is refused", fails(await setZ(M, null, "offer", 0, "Because", "zd-3"), /forbidden|not_found/));
ok("an admin can switch any zone", (await setZ(A, ZB, "auto_assign", 0, "Pilot", "zd-4")).ok);
ok("a reason is required", fails(await setZ(M, ZA, "offer", 0, null, "zd-5"), /reason_required/));
ok("two characters is not a reason", fails(await setZ(M, ZA, "offer", 0, "ab", "zd-6"), /reason_required/));
ok("an unknown mode is bad_request", fails(await setZ(M, ZA, "robots", 0, "Because", "zd-7"), /bad_request/));
ok("max load 4 is bad_request", fails(await setZ(M, ZA, "auto_assign", 4, "Because", "zd-8"), /bad_request/));
ok("max load -1 is bad_request", fails(await setZ(M, ZA, "auto_assign", -1, "Because", "zd-9"), /bad_request/));
ok("max load 3 is the top of the range", (await setZ(M, ZA, "auto_assign", 3, "Because", "zd-10")).ok);

console.log("\n── the overview ──");
await db.exec(`update public.deliveries set assigned_at = now() where order_id = '${o1}'`);
const ov = (await srv(`select public.ops_dispatch_overview(null, true) as j`)).rows?.[0]?.j;
const za = ov?.find((z) => z.zoneId === ZA);
ok("the overview lists every zone for an admin scope", ov?.length >= 2 && !!za, JSON.stringify(ov));
ok("...with the mode and max load", za.mode === "auto_assign" && za.autoAssignMaxLoad === 3, JSON.stringify(za));
ok("...and who set it", za.updatedBy === M && !!za.updatedAt, JSON.stringify(za));
ok("last 24 hours: automatic, rider-accepted, manager-assigned and fell-back counts", za.last24h.auto >= 1 && za.last24h.offerAccepted >= 1 && za.last24h.ops >= 1 && za.last24h.fellBackToOffer >= 1, JSON.stringify(za.last24h));
const only = (await srv(`select public.ops_dispatch_overview(array['${ZB}']::uuid[], false) as j`)).rows?.[0]?.j;
ok("a zone-B scope sees only zone B", only.length === 1 && only[0].zoneId === ZB);
ok("an empty scope sees nothing", (await srv(`select public.ops_dispatch_overview(array[]::uuid[], false) as j`)).rows?.[0]?.j.length === 0);

console.log("\n── who may call ──");
for (const [what, sql] of [
  ["the auto-assign", `select public.ops_auto_assign_delivery('${o1}','${D1}',0)`],
  ["the mode setter", `select public.ops_set_zone_dispatch('${M}','${ZA}','offer',0,'x','y')`],
  ["the eligibility check", `select public.rider_eligible_for_order('${D1}','${o1}')`],
  ["the fallback marker", `select public.ops_mark_auto_fallback('${o1}')`],
  ["the overview", `select public.ops_dispatch_overview(null, true)`],
]) {
  ok(`authenticated cannot call ${what}`, fails(await as("authenticated", sql), /permission denied/i));
}

console.log("\n── re-apply ──");
const again = await db.exec(MIGRATION).then(() => ({ ok: true }), (e) => ({ ok: false, msg: e.message }));
ok("migration can be applied twice", again.ok, again.msg);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
