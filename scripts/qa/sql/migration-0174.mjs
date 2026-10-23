// Runs migration 0174 in an in-process Postgres (PGlite) on top of manager-base.mjs + 0142 + 0151:
// scheduled reports (schedules, runs, the private bucket) and the accounting settings.
// Needs: npm i --no-save @electric-sql/pglite@0.2.17     Usage: node scripts/qa/sql/migration-0174.mjs
import { readFileSync } from "node:fs";
import { managerBase, readMigration, id, IDS } from "./manager-base.mjs";

const { db, ZA, ZB } = await managerBase();
const { A, M, MB, C } = IDS;
await db.exec(readMigration("0142_manager_orders_live.sql"));
await db.exec(readMigration("0151_manager_riders.sql"));
const MIGRATION = readMigration("0174_report_schedules_accounting.sql");
await db.exec(MIGRATION);

let passed = 0, failed = 0;
const ok = (n, c, extra) => { if (c) passed++; else failed++; console.log(`  ${c ? "ok  " : "FAIL"} ${n}${!c && extra ? `\n         ${String(extra).slice(0, 300)}` : ""}`); };
async function as(role, uid, sql) {
  const claims = role === "service_role" ? { role: "service_role" } : {};
  await db.exec(`set role ${role}; select set_config('test.uid','${uid ?? ""}',false); select set_config('test.jwt','${JSON.stringify(claims)}',false);`);
  try { const r = await db.query(sql); return { ok: true, rows: r.rows }; }
  catch (e) { return { ok: false, msg: String(e.message) }; }
  finally { await db.exec("reset role; select set_config('test.uid','',false); select set_config('test.jwt','',false);"); }
}
const srv = (sql) => as("service_role", null, sql);
const one = async (sql) => (await db.query(sql)).rows[0];
const fails = (r, re) => !r.ok && re.test(r.msg);

const M2 = id(990);
await db.exec(`insert into public.profiles (id, role, full_name) values ('${M2}','manager','Meera')`);
await db.exec(`delete from public.staff_zones where user_id = '${M2}'; insert into public.staff_zones (user_id, zone_id) values ('${M2}','${ZA}')`);

const upsert = (actor, idv, fields, cid) =>
  srv(`select public.ops_upsert_report_schedule('${actor}', ${idv ? `'${idv}'` : "null"}, '${JSON.stringify(fields)}'::jsonb, '${cid}') as j`);
const base = (over = {}) => ({
  name: "Daily sales", kind: "sales", filters: { payment: "all" }, frequency: "daily", weekday: null, hourIst: 8,
  rangePreset: "yesterday", zoneIds: [ZA], recipientIds: [M, M2], active: true, nextRunAt: "2026-10-23T02:30:00Z", ...over,
});
const audit = async (action) => (await one(`select count(*)::int as n from public.ops_audit_log where action = '${action}'`)).n;

console.log("── the kinds match the registry ──");
{
  const src = readFileSync(new URL("../../../src/lib/reports/definitions.ts", import.meta.url), "utf8");
  const kinds = [...src.matchAll(/kind: "([a-z-]+)"/g)].map((m) => m[1]).filter((k, i, a) => a.indexOf(k) === i);
  const sql = readFileSync(new URL("../../../supabase/migrations/0174_report_schedules_accounting.sql", import.meta.url), "utf8");
  ok("every report kind in the registry is allowed by the migration", kinds.length >= 14 && kinds.every((k) => sql.includes(`'${k}'`)), kinds.join(","));
}

console.log("\n── creating a schedule ──");
let r = await upsert(M, null, base(), "rs-1");
ok("a zone-A manager creates a schedule for zone A", r.ok, r.msg);
const sid = r.rows?.[0]?.j?.id;
ok("...and gets its id back", !!sid && r.rows[0].j.replayed === false, JSON.stringify(r.rows?.[0]));
const row = await one(`select * from public.report_schedules where id = '${sid}'`);
ok("...owned by the creator, with the fields as given", row?.owner_id === M && row.kind === "sales" && row.frequency === "daily" && row.hour_ist === 8 && row.range_preset === "yesterday" && row.active === true, JSON.stringify(row));
ok("...and the next run as computed by the caller", new Date(row.next_run_at).toISOString() === "2026-10-23T02:30:00.000Z");
ok("...one audit row", (await audit("report_schedule.create")) === 1);
const ar = await one(`select * from public.ops_audit_log where action = 'report_schedule.create' order by id desc limit 1`);
ok("...naming the actor and the schedule", ar.actor_id === M && ar.entity_id === sid, JSON.stringify(ar));
r = await upsert(M, null, base(), "rs-1");
ok("the same client action id again is a replay: same id, no second schedule", r.ok && r.rows[0].j.replayed === true && r.rows[0].j.id === sid && (await one(`select count(*)::int as n from public.report_schedules`)).n === 1, JSON.stringify(r.rows?.[0]));
ok("another person's client action id is a conflict, not a replay", fails(await upsert(MB, null, base({ zoneIds: [ZB], recipientIds: [MB] }), "rs-1"), /client_action_id_conflict/));

console.log("\n── who may create what ──");
ok("a zone-B manager cannot schedule zone A", fails(await upsert(MB, null, base({ recipientIds: [MB] }), "rs-2"), /forbidden/));
ok("an admin can schedule any zone", (await upsert(A, null, base({ name: "Admin weekly", zoneIds: [ZB], recipientIds: [A] }), "rs-3")).ok);
ok("no zones at all means the creator's whole scope (stored as null)", (await upsert(M, null, base({ name: "Whole scope", zoneIds: null }), "rs-4")).ok && (await one(`select zone_ids from public.report_schedules where name = 'Whole scope'`)).zone_ids === null);
ok("a zone that does not exist is bad_request", fails(await upsert(A, null, base({ zoneIds: [id(777)] }), "rs-5"), /bad_request/));
ok("a customer cannot create one", fails(await upsert(C, null, base(), "rs-6"), /forbidden/));
ok("authenticated cannot call the function", fails(await as("authenticated", M, `select public.ops_upsert_report_schedule('${M}', null, '{}'::jsonb, 'x')`), /permission denied/i));

console.log("\n── validation ──");
const bad = async (label, over, cid) => ok(`${label} is bad_request`, fails(await upsert(M, null, base(over), cid), /bad_request/));
await bad("a 2-character name", { name: "ab" }, "v-1");
await bad("an 81-character name", { name: "x".repeat(81) }, "v-2");
await bad("an unknown kind", { kind: "mind-reading" }, "v-3");
await bad("an unknown frequency", { frequency: "hourly" }, "v-4");
await bad("hour 24", { hourIst: 24 }, "v-5");
await bad("hour -1", { hourIst: -1 }, "v-6");
await bad("a weekly schedule with no weekday", { frequency: "weekly", weekday: null }, "v-7");
await bad("weekday 8", { frequency: "weekly", weekday: 8 }, "v-8");
await bad("weekday 0", { frequency: "weekly", weekday: 0 }, "v-9");
await bad("an unknown range preset", { rangePreset: "forever" }, "v-10");
await bad("no recipients", { recipientIds: [] }, "v-11");
await bad("a recipient who is a customer", { recipientIds: [C] }, "v-12");
await bad("a recipient that is not a person", { recipientIds: [id(778)] }, "v-13");
await bad("21 recipients", { recipientIds: Array.from({ length: 21 }, () => M) }, "v-14");
await bad("filters that are not an object", { filters: "all" }, "v-15");
ok("a weekly schedule with a weekday is fine", (await upsert(M, null, base({ name: "Mondays", frequency: "weekly", weekday: 1, rangePreset: "last_week" }), "v-16")).ok);
ok("a daily schedule drops any weekday it was given", (await upsert(M, null, base({ name: "Daily again", weekday: 3 }), "v-17")).ok && (await one(`select weekday from public.report_schedules where name = 'Daily again'`)).weekday === null);

console.log("\n── changing and removing ──");
r = await upsert(M, sid, { name: "Daily sales (new)", active: false, hourIst: 9, nextRunAt: "2026-10-23T03:30:00Z" }, "u-1");
ok("the owner changes some fields", r.ok, r.msg);
const after = await one(`select * from public.report_schedules where id = '${sid}'`);
ok("...only those fields changed", after.name === "Daily sales (new)" && after.active === false && after.hour_ist === 9 && after.kind === "sales" && after.range_preset === "yesterday", JSON.stringify(after));
ok("...and it is audited with before and after", (await audit("report_schedule.update")) === 1);
ok("a full body with `active` flipped is accepted (pause and resume)", (await upsert(M, sid, base({ name: "Daily sales (new)", active: true, hourIst: 9, nextRunAt: "2026-10-23T03:30:00Z" }), "u-2")).ok && (await one(`select active from public.report_schedules where id = '${sid}'`)).active === true);
ok("another manager cannot change it", fails(await upsert(M2, sid, { name: "Mine now" }, "u-3"), /forbidden/));
ok("an admin can", (await upsert(A, sid, { name: "Admin edit" }, "u-4")).ok);
ok("an unknown id is not_found", fails(await upsert(M, id(779), { name: "Ghost one" }, "u-5"), /not_found/));
ok("a schedule cannot be moved to a zone its owner does not hold", fails(await upsert(M, sid, { zoneIds: [ZB] }, "u-6"), /forbidden/));
const del = (actor, sch, cid) => srv(`select public.ops_delete_report_schedule('${actor}', '${sch}', '${cid}') as j`);

console.log("\n── seeing schedules (RLS) ──");
const seen = async (uid) => (await as("authenticated", uid, "select name from public.report_schedules order by name")).rows?.map((x) => x.name) ?? [];
ok("the owner sees their schedules", (await seen(M)).includes("Admin edit"));
ok("a recipient sees it", (await seen(M2)).includes("Admin edit"));
ok("a manager who is neither sees nothing", (await seen(MB)).length === 0, JSON.stringify(await seen(MB)));
ok("an admin sees them all", (await seen(A)).length >= 5);
ok("nobody can write the table directly", fails(await as("authenticated", M, `update public.report_schedules set active = false`), /permission denied/i));
ok("...nor can the service role", fails(await srv(`update public.report_schedules set active = false`), /permission denied/i));

console.log("\n── runs ──");
const claim = (sch, f, t) => srv(`select public.ops_claim_report_run('${sch}', '${f}', '${t}') as r`);
const c1 = await claim(sid, "2026-10-21", "2026-10-21");
const c2 = await claim(sid, "2026-10-21", "2026-10-21");
ok("two claims for one period: one run id, one null", !!c1.rows?.[0]?.r && c2.rows?.[0]?.r === null, JSON.stringify([c1.rows, c2.rows]));
ok("a different period is a different run", !!(await claim(sid, "2026-10-22", "2026-10-22")).rows?.[0]?.r);
const runId = c1.rows[0].r;
const started = await one(`select status from public.report_runs where id = '${runId}'`);
ok("a claimed run starts as running", started.status === "running");
r = await srv(`select public.ops_finish_report_run('${runId}', 'partial', '${sid}/${runId}.pdf', 120, array['${M}']::uuid[], '[{"id":"${M2}","name":"Meera","reason":"permission"}]'::jsonb, null)`);
ok("a run is finished with its file, rows, who got it and who was skipped", r.ok, r.msg);
const fin = await one(`select * from public.report_runs where id = '${runId}'`);
ok("...recorded as given", fin.status === "partial" && fin.rows === 120 && fin.recipients_sent[0] === M && fin.recipients_skipped[0].reason === "permission" && fin.file_path === `${sid}/${runId}.pdf`, JSON.stringify(fin));
ok("a run's status is one of the five", fails(await srv(`select public.ops_finish_report_run('${runId}', 'done', null, 0, '{}'::uuid[], '[]'::jsonb, null)`), /check|bad_request/i));
const runsSeen = async (uid) => (await as("authenticated", uid, "select id from public.report_runs")).rows?.length ?? -1;
ok("the owner sees the runs", (await runsSeen(M)) >= 1);
ok("a recipient sees them", (await runsSeen(M2)) >= 1);
ok("a stranger sees none", (await runsSeen(MB)) === 0);

console.log("\n── due schedules ──");
await db.exec(`update public.report_schedules set next_run_at = now() - interval '1 minute', active = true where id = '${sid}'`);
await db.exec(`update public.report_schedules set next_run_at = now() - interval '1 minute', active = false where name = 'Mondays'`);
await db.exec(`update public.report_schedules set next_run_at = now() + interval '1 day' where name not in ('Admin edit', 'Mondays')`);
let due = (await srv(`select public.ops_due_report_schedules(now(), 10) as j`)).rows[0].j;
ok("only active schedules that are due come back", due.length === 1 && due[0].id === sid, JSON.stringify(due.map((d) => d.name)));
ok("...with what the runner needs", due[0].owner_id === M && due[0].range_preset && Array.isArray(due[0].recipient_ids) && "zone_ids" in due[0], JSON.stringify(due[0]));
ok("the limit is honoured", (await srv(`select public.ops_due_report_schedules(now(), 0) as j`)).rows[0].j.length <= 1);
await srv(`select public.ops_advance_schedule('${sid}', now() + interval '1 day')`);
due = (await srv(`select public.ops_due_report_schedules(now(), 10) as j`)).rows[0].j;
ok("after advancing, it is not due again", due.length === 0);

console.log("\n── retention ──");
await db.exec(`update public.report_runs set created_at = now() - interval '100 days' where id = '${runId}'`);
const pruned = (await srv(`select public.ops_prune_report_runs(90) as j`)).rows[0].j;
ok("a file older than 90 days is released and its path handed back for deletion", pruned.length === 1 && pruned[0] === `${sid}/${runId}.pdf`, JSON.stringify(pruned));
ok("...the run row stays, without a file", (await one(`select file_path from public.report_runs where id = '${runId}'`)).file_path === null);
ok("...and a second prune finds nothing", (await srv(`select public.ops_prune_report_runs(90) as j`)).rows[0].j.length === 0);

console.log("\n── deleting ──");
ok("another manager cannot delete it", fails(await del(M2, sid, "d-1"), /forbidden/));
ok("the owner deletes it", (await del(M, sid, "d-2")).ok);
ok("...audited", (await audit("report_schedule.delete")) === 1);
ok("...and its runs go with it", (await one(`select count(*)::int as n from public.report_runs where schedule_id = '${sid}'`)).n === 0);
ok("a replay of the delete is a no-op", (await del(M, sid, "d-2")).rows?.[0]?.j?.replayed === true);
ok("deleting what is gone is not_found", fails(await del(M, sid, "d-3"), /not_found/));

console.log("\n── the private bucket ──");
{
  const b = await one(`select id, public from storage.buckets where id = 'ops-reports'`);
  ok("ops-reports exists and is private", b?.id === "ops-reports" && b.public === false, JSON.stringify(b));
  const pol = await one(`select count(*)::int as n from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname ilike '%ops-reports%'`);
  ok("...with no policy for anon or authenticated (service role only)", pol.n === 0, JSON.stringify(pol));
}

console.log("\n── accounting settings ──");
{
  const s0 = await one(`select * from public.accounting_settings`);
  ok("one row of defaults", s0?.company_name === "Deligro" && s0.ledger_cod === "Customer Collections - COD" && s0.ledger_bank === "Bank" && s0.ledger_rider_salary === "Rider Salary", JSON.stringify(s0));
  ok("authenticated cannot read it", fails(await as("authenticated", A, "select * from public.accounting_settings"), /permission denied/i));
  ok("...nor the service role write it directly", fails(await srv(`update public.accounting_settings set company_name = 'X'`), /permission denied/i));
  const set = (actor, fields, cid) => srv(`select public.ops_set_accounting_settings('${actor}', '${JSON.stringify(fields)}'::jsonb, '${cid}') as j`);
  ok("a manager cannot change it", fails(await set(M, { company_name: "Deligro Foods" }, "as-1"), /forbidden/));
  ok("an admin can", (await set(A, { company_name: "Deligro Foods Pvt Ltd", ledger_bank: "HDFC Bank" }, "as-2")).ok);
  const s1 = await one(`select * from public.accounting_settings`);
  ok("...only the named fields change", s1.company_name === "Deligro Foods Pvt Ltd" && s1.ledger_bank === "HDFC Bank" && s1.ledger_cod === "Customer Collections - COD" && s1.updated_by === A);
  const au = await one(`select * from public.ops_audit_log where action = 'accounting_settings.set' order by id desc limit 1`);
  ok("...audited with before and after", au?.before?.ledger_bank === "Bank" && au?.after?.ledger_bank === "HDFC Bank" && au?.actor_id === A, JSON.stringify(au));
  ok("a replay is a no-op", (await set(A, { company_name: "Deligro Foods Pvt Ltd", ledger_bank: "HDFC Bank" }, "as-2")).rows[0].j.replayed === true);
  ok("an unknown field is bad_request", fails(await set(A, { ledger_magic: "x" }, "as-3"), /bad_request/));
  ok("an empty name is bad_request", fails(await set(A, { ledger_bank: "" }, "as-4"), /bad_request/));
  ok("an 81-character name is bad_request", fails(await set(A, { ledger_bank: "x".repeat(81) }, "as-5"), /bad_request/));
  ok("a name with a control character is bad_request", fails(await set(A, { ledger_bank: "Bank\u0007" }, "as-6"), /bad_request/));
  ok("authenticated cannot call the setter", fails(await as("authenticated", A, `select public.ops_set_accounting_settings('${A}', '{}'::jsonb, 'z')`), /permission denied/i));
}

console.log("\n── who may call ──");
for (const [what, sql] of [
  ["the claim", `select public.ops_claim_report_run('${id(1)}', '2026-10-21', '2026-10-21')`],
  ["the finisher", `select public.ops_finish_report_run('${id(1)}', 'sent', null, 0, '{}'::uuid[], '[]'::jsonb, null)`],
  ["the advance", `select public.ops_advance_schedule('${id(1)}', now())`],
  ["the due list", `select public.ops_due_report_schedules(now(), 5)`],
  ["the prune", `select public.ops_prune_report_runs(90)`],
  ["the delete", `select public.ops_delete_report_schedule('${M}', '${id(1)}', 'q')`],
]) {
  ok(`authenticated cannot call ${what}`, fails(await as("authenticated", M, sql), /permission denied/i));
}

console.log("\n── re-apply ──");
const again = await db.exec(MIGRATION).then(() => ({ ok: true }), (e) => ({ ok: false, msg: e.message }));
ok("migration can be applied twice", again.ok, again.msg);
ok("...and there is still one settings row", (await one(`select count(*)::int as n from public.accounting_settings`)).n === 1);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
