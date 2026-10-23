// Runs migration 0173 in an in-process Postgres (PGlite) on top of finance-base.mjs + 0166:
// the five fraud rules, dismissals, the live SLA check, the hashed device meta and the case list.
// Needs: npm i --no-save @electric-sql/pglite@0.2.17     Usage: node scripts/qa/sql/migration-0173.mjs
import { financeBase } from "./finance-base.mjs";
import { readMigration, id, IDS } from "./manager-base.mjs";

const { db, ZA, ZB } = await financeBase();
const { A, M, MB, C, R1, R2, D1, D2, D3 } = IDS;
await db.exec(readMigration("0166_ops_alerts.sql"));
// 0171 supplies ops_sla_targets, which the live SLA check reads (and the shop columns its functions name).
await db.exec(`alter table public.restaurants add column if not exists lat double precision, add column if not exists lng double precision,
  add column if not exists rating numeric, add column if not exists rating_count integer default 0;`);
await db.exec(readMigration("0171_insight_analytics.sql"));
// Abridged coupon tables (0031 / 0041 in the real schema).
await db.exec(`
  create table if not exists public.coupons (code text primary key, max_per_customer integer default 1);
  create table if not exists public.coupon_redemptions (
    id uuid primary key default gen_random_uuid(), code text not null,
    order_id uuid not null unique references public.orders (id) on delete cascade,
    customer_id uuid not null references public.profiles (id) on delete cascade,
    discount integer not null default 0, created_at timestamptz not null default now());
  insert into public.coupons (code, max_per_customer) values ('DIWALI50', 1), ('SOLO', 1), ('DEV', 1), ('BIG10', 5) on conflict do nothing;
  alter table public.orders add column if not exists address jsonb;
`);
const MIGRATION = readMigration("0173_fraud_and_sla.sql");
await db.exec(MIGRATION);

let passed = 0, failed = 0;
const ok = (n, c, extra) => { if (c) passed++; else failed++; console.log(`  ${c ? "ok  " : "FAIL"} ${n}${!c && extra ? `\n         ${String(extra).slice(0, 400)}` : ""}`); };
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
const cust = async () => {
  const cid = id(5000 + ++n);
  await db.exec(`insert into public.profiles (id, role, full_name) values ('${cid}','customer','Customer ${n}')`);
  return cid;
};
const ago = (days, hours = 0) => `now() - interval '${days} days' - interval '${hours} hours'`;
const mk = async ({ cid, status = "delivered", by = "null", total = 200, created = ago(1), pos = null, rid = R1, method = "cod", payment = "pending" }) => {
  const oid = id(6000 + ++n);
  const address = pos ? `'${JSON.stringify(pos)}'::jsonb` : "null";
  await db.exec(`insert into public.orders (id, customer_id, restaurant_id, status, cancelled_by, total, payment_method, payment_status, created_at, address)
                 values ('${oid}','${cid}','${rid}','${status}',${by === "null" ? "null" : `'${by}'`},${total},'${method}','${payment}',${created},${address})`);
  return oid;
};
const candidates = async () => (await srv(`select public.ops_fraud_candidates(now()) as j`)).rows[0].j ?? [];
const find = (list, rule, subjectId) => list.find((c) => c.rule === rule && (subjectId === undefined || c.subjectId === subjectId));

console.log("── the rules are seeded ──");
{
  const rules = (await db.query(`select rule, zone_id, enabled, threshold::float8 as t, window_days from public.ops_fraud_rules order by rule`)).rows;
  const want = { customer_cancellations: [3, 7], code_sharing: [2, 30], refund_rate: [0.3, 30], rider_cash_gap: [2000, 2], unusual_order_value: [3, 30] };
  ok("five default rules, all on", rules.length === 5 && rules.every((r) => r.zone_id === null && r.enabled), JSON.stringify(rules));
  ok("...with the default thresholds and windows", Object.entries(want).every(([k, [t, w]]) => rules.find((r) => r.rule === k)?.t === t && rules.find((r) => r.rule === k)?.window_days === w), JSON.stringify(rules));
  const ar = await db.query(`select kind, enabled from public.ops_alert_rules where kind in ('fraud_suspected','sla_breach') and zone_id is null`);
  ok("fraud_suspected and sla_breach are switched on", ar.rows.length === 2 && ar.rows.every((r) => r.enabled), JSON.stringify(ar.rows));
}

console.log("\n── customer cancellations ──");
const K1 = await cust(), K2 = await cust(), K3 = await cust(), K4 = await cust();
for (let i = 0; i < 3; i++) await mk({ cid: K1, status: "cancelled", by: "customer", created: ago(1, i) });
for (let i = 0; i < 2; i++) await mk({ cid: K2, status: "cancelled", by: "customer", created: ago(1, i) });
for (let i = 0; i < 2; i++) await mk({ cid: K3, status: "cancelled", by: "customer", created: ago(1, i) });
await mk({ cid: K3, status: "cancelled", by: "customer", created: ago(8) });
for (let i = 0; i < 2; i++) await mk({ cid: K4, status: "cancelled", by: "customer", created: ago(1, i) });
{
  // A failed COD delivery whose approved exception was "customer unreachable".
  const oid = await mk({ cid: K4, status: "cancelled", by: "admin", created: ago(2) });
  await db.exec(`alter table public.deliveries disable trigger user;
    insert into public.deliveries (order_id, status, driver_id) values ('${oid}','cancelled','${D1}');
    insert into public.delivery_exceptions (delivery_id, order_id, driver_id, kind, reason, status, decided_by, decided_at)
      select id, '${oid}', '${D1}', 'customer_unreachable', 'No answer', 'approved', '${M}', now() from public.deliveries where order_id = '${oid}';
    alter table public.deliveries enable trigger user;`);
}
let list = await candidates();
const c1 = find(list, "customer_cancellations", K1);
ok("3 customer cancellations in 7 days is a candidate", !!c1 && c1.measure === 3 && c1.threshold === 3 && c1.windowDays === 7 && c1.subjectType === "customer", JSON.stringify(c1));
ok("...in the order's zone", c1?.zoneId === ZA);
ok("...with evidence that names no phone or address", c1.evidence.length === 3 && c1.evidence.every((e) => e.kind === "order" && /^Cancelled by customer · ₹\d+$/.test(e.text)), JSON.stringify(c1?.evidence));
ok("2 is not enough", !find(list, "customer_cancellations", K2));
ok("a cancellation 8 days old is outside the window", !find(list, "customer_cancellations", K3));
const c4 = find(list, "customer_cancellations", K4);
ok("a COD order failed as 'customer unreachable' counts toward the 3", !!c4 && c4.measure === 3, JSON.stringify(c4));

console.log("\n── code sharing ──");
const [S1, S2, S3, S4, S5, S6, S7, S8] = [await cust(), await cust(), await cust(), await cust(), await cust(), await cust(), await cust(), await cust()];
const redeem = async (cid, code, pos, device = null) => {
  const oid = await mk({ cid, pos });
  await db.exec(`insert into public.coupon_redemptions (code, order_id, customer_id, discount) values ('${code}','${oid}','${cid}',50)`);
  if (device) await srv(`select public.record_order_client_meta('${oid}', '${device}')`);
  return oid;
};
const P1 = { lat: 21.7, lng: 81.5 };
await redeem(S1, "DIWALI50", P1); await redeem(S2, "DIWALI50", P1);
await redeem(S3, "SOLO", { lat: 21.7101, lng: 81.5101 }); await redeem(S4, "SOLO", { lat: 21.7202, lng: 81.5202 });
await redeem(S5, "DEV", { lat: 21.7303, lng: 81.5303 }, "a".repeat(64)); await redeem(S6, "DEV", { lat: 21.7404, lng: 81.5404 }, "a".repeat(64));
await redeem(S7, "BIG10", P1); await redeem(S8, "BIG10", P1);
list = await candidates();
const cs = find(list, "code_sharing", "DIWALI50");
ok("one code redeemed by 2 accounts at one drop point (limit 1 each) is a candidate", !!cs && cs.measure === 2 && cs.subjectType === "code", JSON.stringify(cs));
ok("...evidence is redemptions with no address, phone or device", cs.evidence.length === 2 && cs.evidence.every((e) => e.kind === "redemption" && !/\d{5}|lat|lng|device|hash/i.test(e.text)), JSON.stringify(cs?.evidence));
ok("2 accounts at different drop points and no shared device is not", !find(list, "code_sharing", "SOLO"));
ok("a shared device hash is enough", !!find(list, "code_sharing", "DEV"), JSON.stringify(list.filter((c) => c.rule === "code_sharing")));
ok("a code allowing 5 uses each, redeemed twice, is not sharing", !find(list, "code_sharing", "BIG10"));
ok("the device hash itself is in no candidate", !JSON.stringify(list).includes("a".repeat(64)));

console.log("\n── refund rate ──");
const [F1, F2, F3] = [await cust(), await cust(), await cust()];
const refundOn = (oid) => db.exec(`insert into public.refunds (order_id, amount, status) values ('${oid}', 180, 'approved')`);
{
  const os = [await mk({ cid: F1 }), await mk({ cid: F1 }), await mk({ cid: F1 })];
  await refundOn(os[0]);
  const o2 = [await mk({ cid: F2 }), await mk({ cid: F2 })];
  await refundOn(o2[0]);
  await mk({ cid: F3 }); await mk({ cid: F3 }); await mk({ cid: F3 });
}
list = await candidates();
const rf = find(list, "refund_rate", F1);
ok("1 refund on 3 delivered orders (33%) is a candidate", !!rf && Math.abs(rf.measure - 1 / 3) < 1e-6 && rf.threshold === 0.3, JSON.stringify(rf));
ok("...with the refund as evidence", rf.evidence.length === 1 && rf.evidence[0].kind === "refund" && /₹180/.test(rf.evidence[0].text), JSON.stringify(rf?.evidence));
ok("1 refund on 2 delivered orders needs at least 3 delivered", !find(list, "refund_rate", F2));
ok("no refunds is not a candidate", !find(list, "refund_rate", F3));

console.log("\n── rider cash gap ──");
const collect = async (rider, days, amount) => {
  const oid = await mk({ cid: C, created: ago(days + 1) });
  await db.exec(`alter table public.deliveries disable trigger user;
    insert into public.deliveries (order_id, status, driver_id, cod_collected_amount, cod_collected_at)
    values ('${oid}','delivered','${rider}',${amount},${ago(days)});
    alter table public.deliveries enable trigger user;`);
};
const handover = (rider, days, amount) =>
  db.exec(`insert into public.cod_handovers (leg, from_user, to_user, recorded_by, handover_date, amount, zone_id)
           values ('rider_to_manager','${rider}','${M}','${M}',(${ago(days)})::date,${amount},'${ZA}')`);
await collect(D1, 3, 2500); await handover(D1, 3, 400);
await collect(D2, 1, 3000);
await collect(D3, 3, 3000);
await db.exec(`insert into public.cash_disputes (driver_id, day, message, status) values ('${D3}', (${ago(3)})::date, 'I paid it', 'open')`);
list = await candidates();
const cg = find(list, "rider_cash_gap", D1);
ok("₹2,500 collected 3 days ago, ₹400 handed over: a gap of ₹2,100 is a candidate", !!cg && cg.measure === 2100 && cg.threshold === 2000 && cg.subjectType === "rider", JSON.stringify(cg));
ok("...evidence is the day, not the cash on anyone's phone", cg.evidence.length >= 1 && cg.evidence[0].kind === "cash_day" && /₹2,500/.test(cg.evidence[0].text), JSON.stringify(cg?.evidence));
ok("cash collected yesterday is not yet 48 hours old", !find(list, "rider_cash_gap", D2));
ok("an open dispute silences it", !find(list, "rider_cash_gap", D3));
await handover(D1, 3, 200);
ok("a gap of ₹1,900 is under the threshold", !find(await candidates(), "rider_cash_gap", D1));

console.log("\n── unusual order value ──");
const U1 = await cust();
for (let i = 0; i < 60; i++) await mk({ cid: U1, total: 100 + i * 20, created: ago(5, i % 20) });
const big = await mk({ cid: U1, total: 5000, created: ago(0, 2) });
list = await candidates();
const uv = find(list, "unusual_order_value", big);
ok("₹5,000 against a zone p95 around ₹1,200 (60 orders) is a candidate", !!uv && uv.measure > 3 && uv.subjectType === "order", JSON.stringify(uv));
ok("...the measure is a multiple of p95", uv.measure < 6 && uv.threshold === 3, JSON.stringify(uv));
// Zone B has too few orders for a p95.
const UB = await cust();
for (let i = 0; i < 40; i++) await mk({ cid: UB, rid: R2, total: 100 + i * 20, created: ago(5, i % 20) });
const bigB = await mk({ cid: UB, rid: R2, total: 5000, created: ago(0, 2) });
ok("with only 40 orders in the zone there is no p95, so no candidate", !find(await candidates(), "unusual_order_value", bigB));

console.log("\n── dismissals ──");
const alertFor = async (c, key) => {
  const rs = await srv(`select public.ops_raise_alert('fraud_suspected','warning','Possible fraud','body','${c.zoneId}','${c.subjectType}','${c.subjectId}','${key}')`);
  if (!rs.ok) throw new Error(`raise failed: ${rs.msg}`);
  const a = await one(`select id from public.ops_alerts where dedupe_key = '${key}'`);
  const att = await srv(`select public.ops_attach_fraud_evidence('${key}', '${c.rule}', '${c.zoneId}', '${c.subjectType}', '${c.subjectId}', 'Customer', ${c.measure}, ${c.threshold}, ${c.windowDays}, '${JSON.stringify(c.evidence)}'::jsonb)`);
  if (!att.ok) throw new Error(`attach failed: ${att.msg}`);
  return a.id;
};
const alertK1 = await alertFor(c1, `fraud_suspected:customer_cancellations:${K1}:2026-W43`);
const dis = (actor, alert, reason, days, cid) =>
  srv(`select public.ops_dismiss_fraud('${actor}', '${alert}', ${reason === null ? "null" : `'${reason}'`}, ${days}, '${cid}') as j`);
ok("a reason is required", fails(await dis(M, alertK1, null, 30, "fd-0"), /reason_required/));
ok("7 to 90 days: 6 is refused", fails(await dis(M, alertK1, "Known family", 6, "fd-1"), /bad_request/));
ok("...and 91", fails(await dis(M, alertK1, "Known family", 91, "fd-2"), /bad_request/));
ok("a manager of another zone cannot dismiss", fails(await dis(MB, alertK1, "Known family", 30, "fd-3"), /forbidden/));
let r = await dis(M, alertK1, "Known family, orders by mistake", 30, "fd-4");
ok("a zone-A manager dismisses it", r.ok, r.msg);
const al = await one(`select status, resolution from public.ops_alerts where id = '${alertK1}'`);
ok("...the alert is resolved with the false-positive note", al.status === "resolved" && al.resolution === "false positive: Known family, orders by mistake", JSON.stringify(al));
const ad = await one(`select * from public.ops_audit_log where action = 'fraud.dismiss' order by id desc limit 1`);
ok("...one audit row with actor, zone and reason", ad?.actor_id === M && ad?.zone_id === ZA && /Known family/.test(ad?.reason ?? ""), JSON.stringify(ad));
r = await dis(M, alertK1, "Known family, orders by mistake", 30, "fd-4");
ok("the same client action id is a replay", r.ok && r.rows[0].j.replayed === true);
ok("dismissing twice is already_resolved", fails(await dis(M, alertK1, "Again", 30, "fd-5"), /already_resolved/));
ok("the dismissed subject is no longer a candidate", !find(await candidates(), "customer_cancellations", K1));
for (let i = 0; i < 3; i++) await mk({ cid: K1, status: "cancelled", by: "customer", created: ago(0, i) });
ok("...until its measure doubles (3 → 6)", find(await candidates(), "customer_cancellations", K1)?.measure === 6);
await db.exec(`update public.ops_fraud_dismissals set until = now() - interval '1 minute'`);
ok("an expired dismissal no longer suppresses", !!find(await candidates(), "customer_cancellations", K1));

console.log("\n── the case list ──");
const alertK4 = await alertFor(c4, `fraud_suspected:customer_cancellations:${K4}:2026-W43`);
const cases = async (zones, allFlag, status = null, rule = null, alert = null, exclude = "{}") =>
  (await srv(`select public.ops_fraud_cases(${zones === null ? "null" : `array[${zones.map((z) => `'${z}'`).join(",")}]::uuid[]`}, ${allFlag}, ${status ? `'${status}'` : "null"}, ${rule ? `'${rule}'` : "null"}, ${alert ? `'${alert}'` : "null"}, null, null, 20, '${exclude}'::text[]) as j`)).rows[0].j;
let cl = await cases(null, true);
ok("the list has both cases and a count per status", cl.items.length === 2 && cl.counts.open === 1 && cl.counts.dismissed === 1 && cl.counts.resolved === 0, JSON.stringify(cl.counts));
const dismissed = cl.items.find((i) => i.alertId === alertK1);
ok("a dismissed case says by whom, why and until when", dismissed.status === "dismissed" && dismissed.dismissal?.reason === "Known family, orders by mistake" && !!dismissed.dismissal?.until && dismissed.dismissal?.by === M, JSON.stringify(dismissed));
ok("a case carries its measure, threshold and evidence", dismissed.measure.value === 3 && dismissed.measure.threshold === 3 && dismissed.evidence.length === 3, JSON.stringify(dismissed.measure));
ok("filter by status", (await cases(null, true, "open")).items.length === 1 && (await cases(null, true, "dismissed")).items.length === 1);
ok("filter by rule", (await cases(null, true, null, "refund_rate")).items.length === 0);
ok("the other zone's scope sees none", (await cases([ZB], false)).items.length === 0);
ok("an empty scope sees none", (await cases([], false)).items.length === 0);
ok("one case by alert id", (await cases(null, true, null, null, alertK4)).items.length === 1 && (await cases(null, true, null, null, alertK4)).items[0].alertId === alertK4);
ok("...and not outside the scope", (await cases([ZB], false, null, null, alertK4)).items.length === 0);
ok("rules can be excluded (a manager without finance access never sees cash gaps)", (await cases(null, true, null, null, null, "{customer_cancellations}")).items.length === 0);

console.log("\n── editing a rule ──");
const setR = (actor, rule, zone, enabled, threshold, days, cid) =>
  srv(`select public.ops_set_fraud_rule('${actor}', '${rule}', ${zone ? `'${zone}'` : "null"}, ${enabled}, ${threshold}, ${days}, '${cid}') as j`);
r = await setR(M, "customer_cancellations", ZA, true, 4, 14, "fr-1");
ok("a zone-A manager sets zone A's threshold", r.ok, r.msg);
const fa = await one(`select * from public.ops_audit_log where action = 'fraud_rule.set' order by id desc limit 1`);
ok("...audited with the generic reason, before and after", fa?.reason === "Rule changed" && fa?.before?.threshold === 3 && fa?.after?.threshold === 4 && fa?.zone_id === ZA, JSON.stringify(fa));
ok("...and the zone's rule overrides the default", find(await candidates(), "customer_cancellations", K1) === undefined || find(await candidates(), "customer_cancellations", K1).threshold === 4);
ok("a replay is a no-op", (await setR(M, "customer_cancellations", ZA, true, 4, 14, "fr-1")).rows[0].j.replayed === true);
ok("another zone's manager is forbidden", fails(await setR(MB, "customer_cancellations", ZA, true, 4, 14, "fr-2"), /forbidden/));
ok("the default (no zone) is admin-only", fails(await setR(M, "customer_cancellations", null, true, 4, 14, "fr-3"), /forbidden/));
ok("...and fine for an admin", (await setR(A, "customer_cancellations", null, true, 3, 7, "fr-4")).ok);
ok("an unknown rule is refused", fails(await setR(M, "mind_reading", ZA, true, 4, 14, "fr-5"), /bad_request/));
for (const [label, rule, t, w] of [["count 0", "customer_cancellations", 0, 7], ["count 51", "customer_cancellations", 51, 7], ["ratio 0.04", "refund_rate", 0.04, 30], ["ratio 1.1", "refund_rate", 1.1, 30], ["rupees 99", "rider_cash_gap", 99, 2], ["rupees 100001", "rider_cash_gap", 100001, 2], ["multiple 1.4", "unusual_order_value", 1.4, 30], ["multiple 21", "unusual_order_value", 21, 30], ["window 0", "customer_cancellations", 3, 0], ["window 91", "customer_cancellations", 3, 91]]) {
  ok(`out of range ${label} is bad_request`, fails(await setR(M, rule, ZA, true, t, w, `fr-b-${label}`), /bad_request/));
}
ok("the edges are accepted (ratio 1, window 90)", (await setR(M, "refund_rate", ZA, true, 1, 90, "fr-e1")).ok);
ok("switching a rule off is allowed", (await setR(M, "refund_rate", ZA, false, 0.3, 30, "fr-e2")).ok);
ok("...and a switched-off rule produces no candidates", !find(await candidates(), "refund_rate", F1));

console.log("\n── device hash ──");
const hashOrder = await mk({ cid: C });
ok("recording a hash works", (await srv(`select public.record_order_client_meta('${hashOrder}', '${"b".repeat(64)}')`)).ok);
ok("...a second time for the same order is a no-op", (await srv(`select public.record_order_client_meta('${hashOrder}', '${"c".repeat(64)}')`)).ok && (await one(`select device_hash from public.order_client_meta where order_id = '${hashOrder}'`)).device_hash === "b".repeat(64));
ok("a value that is not a 64-character hex hash is refused", fails(await srv(`select public.record_order_client_meta('${hashOrder}', 'my phone')`), /bad_request/));
for (const role of ["authenticated", "anon", "service_role"]) {
  ok(`${role} cannot read the table directly`, fails(await as(role, "select * from public.order_client_meta"), /permission denied/i));
}
await db.exec(`update public.order_client_meta set created_at = now() - interval '200 days' where order_id = '${hashOrder}'`);
ok("rows older than 180 days are pruned", (await srv(`select public.ops_prune_order_client_meta() as n`)).rows[0].n >= 1 && !(await one(`select 1 as x from public.order_client_meta where order_id = '${hashOrder}'`)));

console.log("\n── live SLA ──");
{
  const base = await cust();
  const mkLive = async (readyAgoMin, pickedAfterMin) => {
    const oid = await mk({ cid: base, status: "ready", created: `now() - interval '${readyAgoMin + 20} minutes'` });
    await db.exec(`update public.orders set accepted_at = created_at + interval '2 minutes', ready_at = now() - interval '${readyAgoMin} minutes' where id = '${oid}'`);
    await db.exec(`alter table public.deliveries disable trigger user;
      insert into public.deliveries (order_id, status, driver_id, picked_up_at)
      values ('${oid}', '${pickedAfterMin === null ? "assigned" : "picked_up"}', '${D1}', ${pickedAfterMin === null ? "null" : `now() - interval '${readyAgoMin}' minute + interval '${pickedAfterMin} minutes'`});
      alter table public.deliveries enable trigger user;`);
  };
  await mkLive(30, 5); await mkLive(30, 6); await mkLive(30, 4);   // picked up within the 10-minute target
  await mkLive(30, 12);                                              // picked up late (12 > 10)
  await mkLive(30, null);                                            // 30 minutes and still not picked up
  await mkLive(3, null);                                             // 3 minutes: not over the target yet, not counted
  const live = (await srv(`select public.ops_sla_live(now()) as j`)).rows[0].j;
  const pick = live.find((x) => x.zoneId === ZA && x.stage === "pickup");
  ok("pickup: 5 orders reached the stage, 2 past the target (one late, one still waiting) → 0.4", pick?.orders === 5 && pick?.breaches === 2 && Math.abs(pick.rate - 0.4) < 1e-9, JSON.stringify(pick));
  ok("an unfinished stage not yet past its target is not counted", pick.orders === 5);
  ok("every stage can appear, per zone", live.every((x) => ["accept", "prep", "pickup", "deliver"].includes(x.stage) && x.zoneId));
  ok("authenticated cannot run it", fails(await as("authenticated", "select public.ops_sla_live(now())"), /permission denied/i));
}

console.log("\n── who may call ──");
for (const [what, sql] of [
  ["the candidates", "select public.ops_fraud_candidates(now())"],
  ["the dismissal", `select public.ops_dismiss_fraud('${M}','${alertK4}','x',30,'y')`],
  ["the rule setter", `select public.ops_set_fraud_rule('${M}','refund_rate','${ZA}',true,0.3,30,'z')`],
  ["the case list", "select public.ops_fraud_cases(null, true, null, null, null, null, null, 20, '{}'::text[])"],
  ["the evidence writer", `select public.ops_attach_fraud_evidence('k','refund_rate','${ZA}','customer','x','x',1,1,1,'[]'::jsonb)`],
  ["the hash writer", `select public.record_order_client_meta('${hashOrder}', '${"d".repeat(64)}')`],
]) {
  ok(`authenticated cannot call ${what}`, fails(await as("authenticated", sql), /permission denied/i));
}
ok("authenticated cannot write the rules table", fails(await as("authenticated", "update public.ops_fraud_rules set enabled = false"), /permission denied|row-level/i));

console.log("\n── re-apply ──");
const again = await db.exec(MIGRATION).then(() => ({ ok: true }), (e) => ({ ok: false, msg: e.message }));
ok("migration can be applied twice", again.ok, again.msg);
ok("...and the default rules are still five", (await one(`select count(*)::int as n from public.ops_fraud_rules where zone_id is null`)).n === 5);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
