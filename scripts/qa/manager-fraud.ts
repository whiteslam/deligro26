/**
 * QA - fraud and SLA alert builders, their request bodies, the hashed device,
 * and the privacy of everything they carry (Insights sections 17.6 and 17.9).
 * Pure plus file scans; no I/O.
 *
 * Usage: npx tsx scripts/qa/manager-fraud.ts
 */
import fs from "node:fs";
import path from "node:path";
import { evaluateFraud, fraudAudiencePermission, istIsoWeek } from "../../src/lib/ops/alerts/fraud";
import { evaluateSla, istHourKey, type SlaLiveRow } from "../../src/lib/ops/alerts/sla";
import { FRAUD_RULES, fraudCasePayload, parseDismissBody, parseFraudRuleBody } from "../../src/lib/ops/insights/fraud-contract";
import { computeDeviceHash, cookieValue, resolveDeviceId } from "../../src/lib/orders/device-id";

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

const Z1 = "11111111-1111-4111-8111-111111111111";
const U1 = "9b2a8d3e-1111-4222-8333-444455556666";
/** Anything that looks like a phone, a street address, coordinates or a device value. */
const PRIVATE = /\b\d{10}\b|\+91|\blat(itude)?\b|\blng\b|\blongitude\b|\bdevice\b|\bhash\b|\b[0-9a-f]{40,}\b|\d+\.\d{4,}/i;
const DEVANAGARI = /[ऀ-ॿ]/;

console.log("IST week and hour keys");
{
  check("Wednesday 21 Oct 2026 is week 43", istIsoWeek(new Date("2026-10-21T06:00:00Z")) === "2026-W43");
  check("Sunday 23:30 IST and Monday 00:30 IST are different weeks", istIsoWeek(new Date("2026-10-25T18:00:00Z")) !== istIsoWeek(new Date("2026-10-25T19:00:00Z")), `${istIsoWeek(new Date("2026-10-25T18:00:00Z"))} ${istIsoWeek(new Date("2026-10-25T19:00:00Z"))}`);
  check("...Sunday 23:30 IST is still week 43", istIsoWeek(new Date("2026-10-25T18:00:00Z")) === "2026-W43");
  check("the year boundary uses the ISO year (1 Jan 2027 is in 2026-W53)", istIsoWeek(new Date("2027-01-01T06:00:00Z")) === "2026-W53");
  check("an IST hour key", istHourKey(new Date("2026-10-21T06:20:00Z")) === "2026-10-21T11", istHourKey(new Date("2026-10-21T06:20:00Z")));
  check("...which rolls over at :30 UTC", istHourKey(new Date("2026-10-21T06:29:59Z")) === "2026-10-21T11" && istHourKey(new Date("2026-10-21T06:30:00Z")) === "2026-10-21T12");
}

console.log("fraud alerts");
{
  const cand = (over: Record<string, unknown> = {}) => ({
    rule: "customer_cancellations", zoneId: Z1, subjectType: "customer", subjectId: U1, measure: 4, threshold: 3, windowDays: 7,
    evidence: [{ kind: "order", id: "o1", at: "2026-10-20T10:00:00Z", text: "Cancelled by customer · ₹420" }], ...over,
  });
  const now = new Date("2026-10-21T06:00:00Z");
  const a = evaluateFraud([cand()], now)[0];
  check("an alert per candidate, kind fraud_suspected, tied to the zone and subject", a.kind === "fraud_suspected" && a.zoneId === Z1 && a.entity.type === "customer" && a.entity.id === U1);
  check("the dedupe key is rule, subject and IST week", a.dedupeKey === `fraud_suspected:customer_cancellations:${U1}:2026-W43`, a.dedupeKey);
  check("the same candidate later the same week keeps the key", evaluateFraud([cand()], new Date("2026-10-23T06:00:00Z"))[0].dedupeKey === a.dedupeKey);
  check("...and a new week starts a new alert", evaluateFraud([cand()], new Date("2026-10-27T06:00:00Z"))[0].dedupeKey !== a.dedupeKey);
  check("warning below twice the threshold", a.severity === "warning");
  check("critical at exactly twice the threshold", evaluateFraud([cand({ measure: 6 })], now)[0].severity === "critical");
  check("a ratio rule is critical at twice its threshold too", evaluateFraud([cand({ rule: "refund_rate", measure: 0.6, threshold: 0.3 })], now)[0].severity === "critical");
  const titles = [
    evaluateFraud([cand()], now)[0].title,
    evaluateFraud([cand({ rule: "code_sharing", subjectType: "code", subjectId: "DIWALI50", measure: 4, threshold: 2 })], now)[0].title,
    evaluateFraud([cand({ rule: "refund_rate", measure: 0.33, threshold: 0.3 })], now)[0].title,
    evaluateFraud([cand({ rule: "rider_cash_gap", subjectType: "rider", measure: 2450, threshold: 2000, windowDays: 2 })], now)[0].title,
    evaluateFraud([cand({ rule: "unusual_order_value", subjectType: "order", measure: 4.2, threshold: 3 })], now)[0].title,
  ];
  check("titles are plain English, one per rule", titles.every((t) => t.length > 10 && !DEVANAGARI.test(t)), titles.join(" | "));
  check("the coupon title names the code and the accounts", /DIWALI50/.test(titles[1]) && /4 accounts/.test(titles[1]), titles[1]);
  check("the cash title shows rupees", /₹2,450/.test(titles[3]), titles[3]);
  check("no title or body carries a phone, address or device value", evaluateFraud([cand(), cand({ rule: "code_sharing", subjectType: "code", subjectId: "DIWALI50" })], now).every((x) => !PRIVATE.test(x.title) && !PRIVATE.test(x.body)));
  check("a candidate with no zone is skipped (an alert needs somewhere to go)", evaluateFraud([cand({ zoneId: null })], now).length === 0);
  check("the alert carries the rule in its data", a.data?.rule === "customer_cancellations");
  check("customer rules go to people who can see customers", fraudAudiencePermission("customer_cancellations") === "manager.customers.view" && fraudAudiencePermission("refund_rate") === "manager.customers.view" && fraudAudiencePermission("code_sharing") === "manager.customers.view");
  check("the cash rule goes to people who can see finance", fraudAudiencePermission("rider_cash_gap") === "manager.finance.view");
}

console.log("SLA alerts");
{
  const row = (over: Partial<SlaLiveRow> = {}): SlaLiveRow => ({ zoneId: Z1, stage: "pickup", orders: 8, breaches: 3, rate: 0.375, ...over });
  const names = new Map([[Z1, "Bemetara"]]);
  const now = new Date("2026-10-21T06:20:00Z");
  const r = { enabled: true, threshold: 25 };
  const [a] = evaluateSla([row()], r, names, now);
  check("37.5% over a 25% threshold with 8 orders alerts", !!a && a.kind === "sla_breach" && a.zoneId === Z1);
  check("the title says the stage, the rate, the zone and the hour", /Pickup SLA breached for 38% of orders in Bemetara in the last hour/.test(a.title), a.title);
  check("the dedupe key is zone, stage and IST hour", a.dedupeKey === `sla_breach:${Z1}:pickup:2026-10-21T11`, a.dedupeKey);
  check("warning under twice the threshold", a.severity === "warning");
  check("critical at twice the threshold (50% with a 25% threshold)", evaluateSla([row({ breaches: 4, rate: 0.5 })], r, names, now)[0].severity === "critical");
  check("exactly on the threshold alerts", evaluateSla([row({ orders: 8, breaches: 2, rate: 0.25 })], r, names, now).length === 1);
  check("just under does not", evaluateSla([row({ orders: 8, breaches: 1, rate: 0.125 })], r, names, now).length === 0);
  check("fewer than 5 orders never alerts", evaluateSla([row({ orders: 4, breaches: 4, rate: 1 })], r, names, now).length === 0);
  check("a switched-off rule alerts nothing", evaluateSla([row()], { enabled: false, threshold: 25 }, names, now).length === 0);
  check("no rule at all is the default 25%", evaluateSla([row()], null, names, now).length === 1);
  check("a threshold of 40% leaves 37.5% alone", evaluateSla([row()], { enabled: true, threshold: 40 }, names, now).length === 0);
  const all = evaluateSla(["accept", "prep", "pickup", "deliver"].map((stage) => row({ stage: stage as SlaLiveRow["stage"] })), r, names, now);
  check("each stage gets its own alert and its own label", all.length === 4 && new Set(all.map((x) => x.dedupeKey)).size === 4 && /Accept/.test(all[0].title) && /Delivery/.test(all[3].title), all.map((x) => x.title).join(" | "));
  check("an unknown zone name still produces a sentence", /in this zone/.test(evaluateSla([row({ zoneId: "zzz" })], r, names, now)[0].title));
  check("English only", all.every((x) => !DEVANAGARI.test(x.title) && !DEVANAGARI.test(x.body)));
}

console.log("request bodies");
{
  const ok = parseDismissBody({ reason: "Known family", days: 30, clientActionId: "c-1" });
  check("a dismissal parses", ok.ok && ok.value.days === 30 && ok.value.reason === "Known family");
  check("days default to 30", (() => { const r = parseDismissBody({ reason: "Known family", clientActionId: "c-1" }); return r.ok && r.value.days === 30; })());
  check("6 and 91 days are bad_request", ![6, 91].some((d) => { const r = parseDismissBody({ reason: "Known family", days: d, clientActionId: "c-1" }); return r.ok || r.error !== "bad_request" || r.field !== "days"; }));
  check("a missing reason is reason_required (422)", (() => { const r = parseDismissBody({ days: 30, clientActionId: "c-1" }); return !r.ok && r.error === "reason_required" && r.status === 422; })());
  check("a missing client action id is bad_request", (() => { const r = parseDismissBody({ reason: "Known family", clientActionId: "" }); return !r.ok && r.field === "clientActionId"; })());

  const rule = (o: Record<string, unknown>) => parseFraudRuleBody({ rule: "customer_cancellations", zoneId: Z1, enabled: true, threshold: 4, windowDays: 14, clientActionId: "c-1", ...o });
  check("a rule edit parses and needs no reason", (() => { const r = rule({}); return r.ok && r.value.threshold === 4 && !("reason" in r.value); })());
  check("a null zone is the default", (() => { const r = rule({ zoneId: null }); return r.ok && r.value.zoneId === null; })());
  check("an unknown rule is bad_request on rule", (() => { const r = rule({ rule: "mind_reading" }); return !r.ok && r.field === "rule"; })());
  for (const [label, o] of [["count 0", { threshold: 0 }], ["count 51", { threshold: 51 }], ["window 0", { windowDays: 0 }], ["window 91", { windowDays: 91 }], ["a fractional window", { windowDays: 7.5 }]] as const) {
    check(`${label} is bad_request`, (() => { const r = rule(o); return !r.ok && r.error === "bad_request"; })());
  }
  check("ratio 0.04 and 1.1 are out of range", ![0.04, 1.1].some((t) => { const r = rule({ rule: "refund_rate", threshold: t }); return r.ok; }));
  check("ratio 1 is in range", rule({ rule: "refund_rate", threshold: 1, windowDays: 30 }).ok);
  check("rupees 99 and 100001 are out of range", ![99, 100001].some((t) => rule({ rule: "rider_cash_gap", threshold: t, windowDays: 2 }).ok));
  check("multiple 1.4 and 21 are out of range", ![1.4, 21].some((t) => rule({ rule: "unusual_order_value", threshold: t }).ok));
  check("code sharing needs at least 2 accounts", !rule({ rule: "code_sharing", threshold: 1 }).ok && rule({ rule: "code_sharing", threshold: 2 }).ok);
  check("every rule has a label, a description and a unit", Object.values(FRAUD_RULES).every((r) => r.label && r.description && r.unit));
}

console.log("a case, as the app sees it");
{
  const row = {
    alertId: U1, rule: "customer_cancellations", severity: "warning", status: "dismissed", zoneId: Z1, openedAt: "2026-10-20T10:00:00Z",
    subject: { type: "customer", id: U1, label: "Customer 3f2a9c10 · Ravi K." },
    measure: { value: 4, threshold: 3, unit: "count", windowDays: 7 },
    evidence: [{ kind: "order", id: "o1", at: "2026-10-20T10:00:00Z", text: "Cancelled by customer · ₹420" }],
    dismissal: { by: "u2", reason: "Known family", until: "2026-11-20T10:00:00Z" },
  };
  const c = fraudCasePayload(row, new Map([["u2", "Mona"]]));
  check("the dismissal names the person", c.dismissal?.by.name === "Mona" && c.dismissal?.by.id === "u2", JSON.stringify(c.dismissal));
  check("a case keeps its rule, status, subject and measure", c.rule === "customer_cancellations" && c.status === "dismissed" && c.subject.label.startsWith("Customer") && c.measure.unit === "count");
  check("an open case has no dismissal", fraudCasePayload({ ...row, status: "open", dismissal: null }, new Map()).dismissal === null);
  check("a person we cannot name is shown as Staff", fraudCasePayload(row, new Map()).dismissal?.by.name === "Staff");
  const long = fraudCasePayload({ ...row, evidence: Array.from({ length: 30 }, (_, i) => ({ kind: "order", id: `o${i}`, at: "2026-10-20T10:00:00Z", text: "x" })) }, new Map());
  check("evidence is capped at 20 rows", long.evidence.length === 20);
  const dirty = fraudCasePayload({ ...row, evidence: [{ kind: "order", id: "o1", at: "2026-10-20T10:00:00Z", text: "Delivered to 9876543210", phone: "9876543210", lat: 21.7, deviceHash: "a".repeat(64) } as never] }, new Map());
  check("only kind, id, at and text of an evidence row ever leave", JSON.stringify(Object.keys(dirty.evidence[0]).sort()) === JSON.stringify(["at", "id", "kind", "text"]));
  check("...and text that looks like a phone number is blanked", !PRIVATE.test(JSON.stringify(dirty)), JSON.stringify(dirty.evidence));
  check("no Devanagari", !DEVANAGARI.test(JSON.stringify(c)));
}

console.log("device hash");
{
  const PEPPER = "a-long-enough-server-secret";
  const h = computeDeviceHash(U1, PEPPER);
  check("a uuid and a pepper give a 64-character hex hash", !!h && /^[0-9a-f]{64}$/.test(h));
  check("...the same input gives the same hash", computeDeviceHash(U1, PEPPER) === h);
  check("...a different pepper gives a different one", computeDeviceHash(U1, PEPPER + "x") !== h);
  check("no pepper stores nothing (fail closed)", computeDeviceHash(U1, undefined) === null && computeDeviceHash(U1, "") === null);
  check("a short pepper stores nothing", computeDeviceHash(U1, "short") === null);
  check("a non-uuid id has no hash", computeDeviceHash("my phone", PEPPER) === null);
  check("the hash does not contain the id", !h!.includes(U1.replace(/-/g, "")));
  check("a header id wins", resolveDeviceId(U1, "bbbbbbbb-1111-4222-8333-444455556666").id === U1 && !resolveDeviceId(U1, null).fresh);
  check("a non-uuid header is ignored silently: no id, no new cookie", (() => { const r = resolveDeviceId("junk", null); return r.id === null && !r.fresh; })());
  check("the cookie is used when there is no header", resolveDeviceId(null, U1).id === U1);
  check("with neither, a fresh id is made for the cookie", (() => { const r = resolveDeviceId(null, null, () => U1); return r.id === U1 && r.fresh; })());
  check("a bad cookie is replaced", (() => { const r = resolveDeviceId(null, "garbage", () => U1); return r.id === U1 && r.fresh; })());
  check("cookieValue reads one cookie from a header", cookieValue("a=1; dlg_did=abc; b=2", "dlg_did") === "abc" && cookieValue("a=1", "dlg_did") === null && cookieValue(null, "x") === null);
}

console.log("structure");
{
  const root = path.resolve(__dirname, "../..");
  const read = (p: string) => (fs.existsSync(path.join(root, p)) ? fs.readFileSync(path.join(root, p), "utf8") : "");
  function walk(dir: string, out: string[] = []): string[] {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) return out;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else out.push(p);
    }
    return out;
  }
  const offenders = [...walk("src/app"), ...walk("src/lib")].filter((f) => /\.(ts|tsx)$/.test(f) && /order_client_meta/.test(read(f)) && !/device-id|order-client-meta|record_order_client_meta/.test(read(f)));
  check("no route or module reads the order_client_meta table", offenders.length === 0, offenders.join(", "));
  const direct = [...walk("src/app/api/manager"), ...walk("src/lib/data-access")].filter((f) => /\.from\("order_client_meta"\)/.test(read(f)));
  check("...nothing selects it with .from(...)", direct.length === 0, direct.join(", "));

  const list = read("src/app/api/manager/insights/fraud/route.ts");
  check("the fraud list needs insights.view and customers.view", /insightsGate\(request/.test(list) && /manager\.customers\.view/.test(list));
  check("...and hides cash-gap cases from people without finance.view", /rider_cash_gap/.test(list) && /manager\.finance\.view/.test(list));
  const one = read("src/app/api/manager/insights/fraud/[alertId]/route.ts");
  check("one case can be fetched by alert id", /loadFraudCases/.test(one) && /alert: alertId/.test(one) && /insightsGate\(request/.test(one));
  const dismiss = read("src/app/api/manager/insights/fraud/[alertId]/dismiss/route.ts");
  check("a dismissal goes through the audited function with a rate limit", /ops_dismiss_fraud/.test(dismiss) && /managerWriteLimit\(/.test(dismiss) && /manager\.customers\.view/.test(dismiss));
  const rules = read("src/app/api/manager/insights/fraud-rules/route.ts");
  check("rule edits need manager.alerts.configure and go through the audited function", /managerApiContext\("manager\.alerts\.configure", request\)/.test(rules) && /ops_set_fraud_rule/.test(rules) && !/\.from\("ops_fraud_rules"\)\s*\.(insert|update|upsert|delete)/.test(rules));

  const orders = read("src/app/api/orders/route.ts");
  check("the order route records the hashed device after the order exists", /recordOrderClientMeta\(/.test(orders) && orders.indexOf("createOrder(") < orders.indexOf("recordOrderClientMeta("));
  check("...and sets the web cookie only when it made a fresh id", /fresh/.test(orders) && /DEVICE_COOKIE/.test(orders));
  const api = read("apps/customer/lib/core/api.dart");
  check("the customer app sends x-device-id", /x-device-id/.test(api) && /deviceId/.test(api));
  check("...from an id made once per install", /installId\(/.test(read("apps/customer/lib/state/providers.dart")) && fs.existsSync(path.join(root, "apps/customer/lib/core/device_id.dart")));
  const mine = [...walk("src/lib/ops/alerts"), ...walk("src/lib/ops/insights"), ...walk("src/app/api/manager/insights")].filter((f) => /\.(ts|tsx)$/.test(f) && /[ऀ-ॿ]/.test(read(f)));
  check("no Devanagari in the fraud or SLA code", mine.length === 0, mine.join(", "));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
