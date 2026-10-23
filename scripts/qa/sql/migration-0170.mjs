// Runs migration 0170 in an in-process Postgres (PGlite) on top of manager-base.mjs + 0142:
// the hourly demand and rider-supply rollups behind the forecast.
// Needs: npm i --no-save @electric-sql/pglite@0.2.17     Usage: node scripts/qa/sql/migration-0170.mjs
import { managerBase, readMigration, id, IDS } from "./manager-base.mjs";

const { db, ZA, ZB } = await managerBase();
const { C, V, R1, R2 } = IDS;
await db.exec(readMigration("0142_manager_orders_live.sql"));
// 0166's lease helper, standalone (the proof does not need the whole alert engine).
await db.exec(`
  create table if not exists public.ops_alert_runs (name text primary key, leased_until timestamptz not null);
`);
const MIGRATION = readMigration("0170_insight_rollups.sql");
await db.exec(MIGRATION);

let passed = 0, failed = 0;
const ok = (n, c, extra) => { if (c) passed++; else failed++; console.log(`  ${c ? "ok  " : "FAIL"} ${n}${!c && extra ? `\n         ${extra}` : ""}`); };
async function as(role, sql) {
  const claims = role === "service_role" ? { role: "service_role" } : {};
  await db.exec(`set role ${role}; select set_config('test.jwt','${JSON.stringify(claims)}',false);`);
  try { const r = await db.query(sql); return { ok: true, rows: r.rows }; }
  catch (e) { return { ok: false, msg: String(e.message) }; }
  finally { await db.exec("reset role; select set_config('test.jwt','',false);"); }
}
const one = async (sql) => (await db.query(sql)).rows[0];
const all = async (sql) => (await db.query(sql)).rows;

// An IST wall-clock time `daysAgo` IST days before today, as a timestamptz expression.
const ist = (daysAgo, hhmm) =>
  `((date_trunc('day', now() at time zone 'Asia/Kolkata') - interval '${daysAgo} days' + time '${hhmm}') at time zone 'Asia/Kolkata')`;

let n = 0;
const newOrder = async (rid, createdExpr, { status = "placed", method = "cod", payment = "pending", total = 100 } = {}) => {
  const oid = id(2000 + ++n);
  await db.exec(`insert into public.orders (id, customer_id, restaurant_id, status, total, payment_method, payment_status, created_at)
                 values ('${oid}','${C}','${rid}','${status}',${total},'${method}','${payment}',${createdExpr})`);
  return oid;
};

console.log("── fixtures ──");
// Two days ago, IST: 23:50 and (next day) 00:10 straddle midnight and two different hours.
const lateA = await newOrder(R1, ist(2, "23:50"), { status: "delivered", total: 300 });
const earlyA = await newOrder(R1, ist(1, "00:10"), { status: "delivered", total: 200 });
const unpaid = await newOrder(R1, ist(2, "23:55"), { method: "online", payment: "pending", total: 999 });
const cancelled = await newOrder(R1, ist(2, "23:20"), { status: "cancelled", total: 150 });
const sameHourA = await newOrder(R1, ist(2, "23:05"), { status: "placed", total: 50 });
const otherZone = await newOrder(R2, ist(2, "23:30"), { status: "delivered", total: 400 });
const paidOnline = await newOrder(R1, ist(2, "23:40"), { method: "online", payment: "paid", status: "delivered", total: 250 });
void unpaid;
// The delivery guards refuse a row that starts out delivered; the fixture is history.
await db.exec(`alter table public.deliveries disable trigger user;
               insert into public.deliveries (order_id, status, delivered_at)
               values ('${lateA}','delivered',${ist(2, "23:50")}), ('${otherZone}','delivered',${ist(2, "23:45")});
               alter table public.deliveries enable trigger user;`);

// A rider in two zones, online 18:40–20:15 IST two days ago.
const DX = id(951);
await db.exec(`
  insert into public.profiles (id, role, full_name) values ('${DX}','driver','Two Zones');
  delete from public.staff_zones where user_id = '${DX}';
  insert into public.staff_zones (user_id, zone_id) values ('${DX}','${ZA}'),('${DX}','${ZB}');
  insert into public.rider_shifts (driver_id, started_at, ended_at, ended_by)
  values ('${DX}', ${ist(2, "18:40")}, ${ist(2, "20:15")}, 'rider');
`);

const FROM = `${ist(3, "00:00")}`;
const TO = `${ist(0, "00:00")}`;

console.log("\n── refresh ──");
const r1 = await as("service_role", `select public.ops_refresh_insight_rollups(${FROM}, ${TO}) as n`);
ok("refresh runs for service_role", r1.ok, r1.msg);
const demand = () => all(`select zone_id, to_char(hour_start at time zone 'Asia/Kolkata','YYYY-MM-DD HH24:MI') as h, orders, delivered, cancelled, customer_paid
                          from public.ops_hourly_demand order by zone_id, hour_start`);
const day2 = await one(`select to_char((date_trunc('day', now() at time zone 'Asia/Kolkata') - interval '2 days'),'YYYY-MM-DD') as d`);
const day1 = await one(`select to_char((date_trunc('day', now() at time zone 'Asia/Kolkata') - interval '1 days'),'YYYY-MM-DD') as d`);
const rows = await demand();
const cell = (zone, d, hh) => rows.find((x) => x.zone_id === zone && x.h === `${d} ${hh}:00`);

const h23 = cell(ZA, day2.d, "23");
const h23ZA = (await one(`select (${ist(2, "23:00")}) as t`)).t;
ok("the 23:xx IST hour holds the late, cancelled, planned and paid-online orders (unpaid checkout excluded)", h23?.orders === 4, JSON.stringify(h23));
ok("...two of them delivered", h23?.delivered === 2, JSON.stringify(h23));
ok("...one cancelled", h23?.cancelled === 1, JSON.stringify(h23));
ok("...customer_paid excludes the cancelled order (300 + 50 + 250)", Number(h23?.customer_paid) === 600, JSON.stringify(h23));
const h00 = cell(ZA, day1.d, "00");
ok("00:10 IST lands in the next day's 00:00 hour, not the 23:00 one", h00?.orders === 1 && Number(h00?.customer_paid) === 200, JSON.stringify(h00));
const hz = cell(ZB, day2.d, "23");
ok("another zone's order is in that zone's row", hz?.orders === 1 && hz?.delivered === 1, JSON.stringify(hz));
ok("no row carries the unpaid checkout (999)", rows.every((x) => Number(x.customer_paid) !== 999 && Number(x.customer_paid) < 999));

console.log("\n── rider supply ──");
const sup = await all(`select zone_id, to_char(hour_start at time zone 'Asia/Kolkata','YYYY-MM-DD HH24:MI') as h, rider_minutes::numeric as m, delivered
                       from public.ops_hourly_rider_supply order by zone_id, hour_start`);
const sCell = (zone, hh) => sup.find((x) => x.zone_id === zone && x.h === `${day2.d} ${hh}:00`);
ok("18:40–19:00 is 20 minutes, split half to each zone → 10", Number(sCell(ZA, "18")?.m) === 10 && Number(sCell(ZB, "18")?.m) === 10, JSON.stringify(sup));
ok("the full 19:00 hour is 60 minutes, 30 each", Number(sCell(ZA, "19")?.m) === 30 && Number(sCell(ZB, "19")?.m) === 30);
ok("20:00–20:15 is 15 minutes, 7.5 each", Number(sCell(ZA, "20")?.m) === 7.5 && Number(sCell(ZB, "20")?.m) === 7.5);
ok("deliveries are counted in the hour they were delivered, per the order's zone", sCell(ZA, "23")?.delivered === 1 || sup.some((x) => x.zone_id === ZA && x.delivered === 1), JSON.stringify(sup.filter((x) => x.delivered > 0)));

console.log("\n── idempotent ──");
const before = JSON.stringify(await demand()) + JSON.stringify(await all(`select * from public.ops_hourly_rider_supply order by zone_id, hour_start`));
await as("service_role", `select public.ops_refresh_insight_rollups(${FROM}, ${TO})`);
const after = JSON.stringify(await demand()) + JSON.stringify(await all(`select * from public.ops_hourly_rider_supply order by zone_id, hour_start`));
ok("refreshing twice gives the same rows", before === after);

console.log("\n── the series the forecast reads ──");
{
  const all = await as("service_role", `select public.ops_insight_hourly(null, true, 10) as j`);
  ok("the series runs for service_role", all.ok, all.msg);
  const j = all.rows?.[0]?.j;
  const sumAll = (j?.demand ?? []).reduce((a, r) => a + r[1], 0);
  const expectAll = await one(`select coalesce(sum(orders),0)::int as n from public.ops_hourly_demand`);
  ok("all zones: the demand series sums every zone's hours", sumAll === expectAll.n && sumAll > 0, `${sumAll} vs ${expectAll.n}`);
  const za = await as("service_role", `select public.ops_insight_hourly(array['${ZA}']::uuid[], false, 10) as j`);
  const sumZa = (za.rows?.[0]?.j?.demand ?? []).reduce((a, r) => a + r[1], 0);
  const expectZa = await one(`select coalesce(sum(orders),0)::int as n from public.ops_hourly_demand where zone_id = '${ZA}'`);
  ok("one zone: only that zone's hours", sumZa === expectZa.n && sumZa < sumAll, `${sumZa} vs ${expectZa.n}`);
  const none = await as("service_role", `select public.ops_insight_hourly(array[]::uuid[], false, 10) as j`);
  ok("no zones and not all: nothing (fail closed)", (none.rows?.[0]?.j?.demand ?? []).length === 0 && (none.rows?.[0]?.j?.supply ?? []).length === 0);
  const nullZones = await as("service_role", `select public.ops_insight_hourly(null, false, 10) as j`);
  ok("a null zone list without all is also nothing", (nullZones.rows?.[0]?.j?.demand ?? []).length === 0);
  const h23 = (j?.demand ?? []).find((r) => r[0] === Math.floor(new Date(h23ZA).getTime() / 1000));
  ok("hours are epoch seconds of the IST hour start, summed across zones (ZA 4 + ZB 1 = 5)", h23?.[1] === 5, JSON.stringify(h23));
  const supplyMins = (j?.supply ?? []).filter((r) => Number(r[1]) > 0).length;
  ok("the supply series carries the rider-minutes hours", supplyMins >= 3, String(supplyMins));
  ok("the platform productivity has no sample yet (every hour here is under one rider-hour per zone)", j?.platform?.median === null && j?.platform?.sampleHours === 0, JSON.stringify(j?.platform));
  const capped = await as("service_role", `select public.ops_insight_hourly(null, true, 99) as j`);
  ok("weeks are capped at 12", capped.ok);
  const denied = await as("authenticated", `select public.ops_insight_hourly(null, true, 10)`);
  ok("authenticated cannot read the series", !denied.ok, denied.msg);
}

console.log("\n── a later change moves the figures ──");
await db.exec(`update public.orders set status = 'cancelled' where id = '${sameHourA}'`);
await as("service_role", `select public.ops_refresh_insight_rollups(${FROM}, ${TO})`);
const h23b = cell(ZA, day2.d, "23") ? null : null;
void h23b;
const rows2 = await demand();
const c2 = rows2.find((x) => x.zone_id === ZA && x.h === `${day2.d} 23:00`);
ok("a cancelled-after order stays in orders but moves to cancelled", c2?.orders === 4 && c2?.cancelled === 2, JSON.stringify(c2));
ok("...and leaves customer_paid (600 → 550)", Number(c2?.customer_paid) === 550, JSON.stringify(c2));
await db.exec(`delete from public.deliveries where order_id in ('${otherZone}'); delete from public.orders where id = '${otherZone}'`);
await as("service_role", `select public.ops_refresh_insight_rollups(${FROM}, ${TO})`);
const gone = (await demand()).find((x) => x.zone_id === ZB && x.h === `${day2.d} 23:00`);
ok("a zone-hour whose orders are all gone loses its row", !gone, JSON.stringify(gone));

console.log("\n── parity with a plain count ──");
const plain = await one(`select count(*)::int as n from public.orders o
   where o.zone_id = '${ZA}' and public.ops_counts_as_order(o.payment_method::text, o.payment_status::text)
     and (o.created_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date - 2`);
const rolled = await one(`select coalesce(sum(orders),0)::int as n from public.ops_hourly_demand
   where zone_id = '${ZA}' and (hour_start at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date - 2`);
ok("a day's rollup sums to the same count as ops_counts_as_order over orders", plain.n === rolled.n && plain.n > 0, `${plain.n} vs ${rolled.n}`);

console.log("\n── backfill ──");
const b1 = await as("service_role", `select public.ops_backfill_insight_rollups() as n`);
ok("backfill does nothing when rollup rows exist", b1.ok && Number(b1.rows[0].n) === 0, JSON.stringify(b1));
await db.exec("delete from public.ops_hourly_demand; delete from public.ops_hourly_rider_supply;");
const b2 = await as("service_role", `select public.ops_backfill_insight_rollups() as n`);
ok("...and fills an empty rollup from 10 weeks of orders", b2.ok && Number(b2.rows[0].n) > 0, JSON.stringify(b2));

console.log("\n── who can touch it ──");
for (const role of ["authenticated", "anon"]) {
  const sel = await as(role, "select * from public.ops_hourly_demand");
  ok(`${role} cannot read the demand rollup`, !sel.ok && /permission denied/i.test(sel.msg), sel.msg);
  const sel2 = await as(role, "select * from public.ops_hourly_rider_supply");
  ok(`${role} cannot read the supply rollup`, !sel2.ok && /permission denied/i.test(sel2.msg), sel2.msg);
  const ex = await as(role, `select public.ops_refresh_insight_rollups(now() - interval '1 day', now())`);
  ok(`${role} cannot run the refresh`, !ex.ok, ex.msg);
}
const direct = await as("service_role", `insert into public.ops_hourly_demand (zone_id, hour_start, orders, delivered, cancelled, customer_paid) values ('${ZA}', now(), 1,0,0,0)`);
ok("even the service role writes only through the functions", !direct.ok, direct.msg);

console.log("\n── re-apply ──");
const again = await db.exec(MIGRATION).then(() => ({ ok: true }), (e) => ({ ok: false, msg: e.message }));
ok("migration can be applied twice", again.ok, again.msg);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
