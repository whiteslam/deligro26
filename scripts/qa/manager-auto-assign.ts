/**
 * QA - automatic rider assignment (Insights section 17.4): the try-three-riders
 * loop with a stubbed database call, the zone setting parser, the dispatch
 * route's body, and structural checks that the auto path writes only through
 * the database function.
 *
 * Usage: npx tsx scripts/qa/manager-auto-assign.ts
 */
import fs from "node:fs";
import path from "node:path";
import { AUTO_ASSIGN_TRIES, runAutoAssign, zoneDispatchConfig } from "../../src/lib/dispatch/auto-assign";
import { parseDispatchBody } from "../../src/lib/ops/insights/dispatch-contract";

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

type R = { id: string; activeJobs: number };
const riders = (...jobs: number[]): R[] => jobs.map((j, i) => ({ id: `r${i + 1}`, activeJobs: j }));
/** A stubbed database: the answer for each rider id, and the calls made. */
function stub(answers: Record<string, string | null | "error">) {
  const calls: string[] = [];
  return {
    calls,
    call: async (r: R) => {
      calls.push(r.id);
      const a = r.id in answers ? answers[r.id] : "offline";
      return a === "error" ? { error: true, result: null } : { error: false, result: a };
    },
  };
}

(async () => {
console.log("the loop");
{
  const s = stub({ r1: "stale_fix", r2: null });
  const out = await runAutoAssign(riders(0, 0, 0), 0, s.call);
  check("the first rider refused (stale_fix), the second accepted: that rider, 2 calls", out.kind === "assigned" && out.rider.id === "r2" && s.calls.length === 2, JSON.stringify({ out, calls: s.calls }));

  const s2 = stub({ r1: "stale_fix", r2: "offline", r3: "out_of_zone", r4: null });
  const out2 = await runAutoAssign(riders(0, 0, 0, 0), 0, s2.call);
  check("all of the first three refused: fallback after exactly 3 calls (the fourth is never tried)", out2.kind === "fallback" && s2.calls.length === AUTO_ASSIGN_TRIES && AUTO_ASSIGN_TRIES === 3, JSON.stringify({ out2, calls: s2.calls }));
  check("...and the refusals are reported", out2.kind === "fallback" && out2.refusals.join() === "stale_fix,offline,out_of_zone");

  const s3 = stub({});
  const out3 = await runAutoAssign([], 0, s3.call);
  check("nobody to try: fallback with no calls", out3.kind === "fallback" && s3.calls.length === 0);

  const s4 = stub({ r1: "already_assigned" });
  const out4 = await runAutoAssign(riders(0, 0), 0, s4.call);
  check("already assigned stops at once: taken, 1 call, no fallback", out4.kind === "taken" && s4.calls.length === 1);
  for (const gone of ["terminal", "not_found"]) {
    const s5 = stub({ r1: gone });
    const out5 = await runAutoAssign(riders(0), 0, s5.call);
    check(`${gone} is taken, not a fallback`, out5.kind === "taken");
  }

  const s6 = stub({ r1: "mode_off", r2: null });
  const out6 = await runAutoAssign(riders(0, 0), 0, s6.call);
  check("the zone being switched off mid-run stops the loop (fallback, 1 call)", out6.kind === "fallback" && s6.calls.length === 1);

  const s7 = stub({ r1: "error", r2: null });
  const out7 = await runAutoAssign(riders(0, 0), 0, s7.call);
  check("a database error stands down to offers rather than guessing (fallback, 1 call)", out7.kind === "fallback" && s7.calls.length === 1);

  const s8 = stub({ r1: "over_load", r2: null });
  const out8 = await runAutoAssign(riders(0, 0), 0, s8.call);
  check("over_load moves on to the next rider", out8.kind === "assigned" && out8.rider.id === "r2");
}

console.log("max load");
{
  const s = stub({ r1: null, r2: null, r3: null });
  const out = await runAutoAssign(riders(2, 1, 0), 1, s.call);
  check("riders carrying more than the max are never tried (max 1: the rider with 2 is skipped)", out.kind === "assigned" && out.rider.id === "r2" && !s.calls.includes("r1"), JSON.stringify(s.calls));
  const s2 = stub({});
  const out2 = await runAutoAssign(riders(3, 2), 1, s2.call);
  check("everyone over the max: fallback with no calls", out2.kind === "fallback" && s2.calls.length === 0);
  const s3 = stub({ r1: null });
  const out3 = await runAutoAssign(riders(0), -4, s3.call);
  check("a negative max is treated as 0", out3.kind === "assigned");
}

console.log("zone setting");
{
  check("auto_assign with a max load", JSON.stringify(zoneDispatchConfig({ dispatch_mode: "auto_assign", auto_assign_max_load: 2 })) === JSON.stringify({ mode: "auto_assign", maxLoad: 2 }));
  check("the offer mode is the default", zoneDispatchConfig({ dispatch_mode: "offer", auto_assign_max_load: 0 }).mode === "offer");
  check("a missing row (zone without the columns yet) is offers, as before", zoneDispatchConfig(null).mode === "offer");
  check("an unknown mode is offers", zoneDispatchConfig({ dispatch_mode: "robots", auto_assign_max_load: 1 }).mode === "offer");
  check("a max load outside 0 to 3 is clamped", zoneDispatchConfig({ dispatch_mode: "auto_assign", auto_assign_max_load: 9 }).maxLoad === 3 && zoneDispatchConfig({ dispatch_mode: "auto_assign", auto_assign_max_load: -1 }).maxLoad === 0);
  check("a zone with no id is offers", zoneDispatchConfig(undefined).mode === "offer");
}

console.log("dispatch body");
{
  const ok = { zoneId: "11111111-1111-4111-8111-111111111111", mode: "auto_assign", autoAssignMaxLoad: 1, reason: "Evening rush", clientActionId: "c-1" };
  const good = parseDispatchBody(ok);
  check("a good body parses", good.ok && good.value.mode === "auto_assign" && good.value.autoAssignMaxLoad === 1, JSON.stringify(good));
  const bad = (o: Record<string, unknown>) => parseDispatchBody({ ...ok, ...o });
  check("an unknown mode is bad_request on mode", (() => { const r = bad({ mode: "robots" }); return !r.ok && r.error === "bad_request" && r.field === "mode"; })());
  check("max load 4 is bad_request on autoAssignMaxLoad", (() => { const r = bad({ autoAssignMaxLoad: 4 }); return !r.ok && r.error === "bad_request" && r.field === "autoAssignMaxLoad"; })());
  check("a fractional max load is bad_request", (() => { const r = bad({ autoAssignMaxLoad: 0.5 }); return !r.ok && r.field === "autoAssignMaxLoad"; })());
  check("a missing reason is reason_required (422)", (() => { const r = bad({ reason: "" }); return !r.ok && r.error === "reason_required" && r.status === 422; })());
  check("a non-uuid zone is bad_request on zoneId", (() => { const r = bad({ zoneId: "nope" }); return !r.ok && r.field === "zoneId"; })());
  check("a null zone is bad_request (a mode belongs to a zone)", (() => { const r = bad({ zoneId: null }); return !r.ok && r.field === "zoneId"; })());
  check("a missing client action id is bad_request", (() => { const r = bad({ clientActionId: "" }); return !r.ok && r.field === "clientActionId"; })());
}

console.log("structure");
{
  const root = path.resolve(__dirname, "../..");
  const read = (p: string) => (fs.existsSync(path.join(root, p)) ? fs.readFileSync(path.join(root, p), "utf8") : "");
  const dispatch = read("src/lib/dispatch/rider-dispatch.ts");
  check("dispatchOrder assigns only through ops_auto_assign_delivery", /ops_auto_assign_delivery/.test(dispatch));
  const autoFn = dispatch.slice(dispatch.indexOf("async function tryAutoAssign"), dispatch.indexOf("export async function dispatchOrder"));
  check("...the auto-assign function never writes deliveries itself", autoFn.length > 100 && !/\.from\("deliveries"\)\s*\.(insert|update|upsert|delete)/.test(autoFn));
  check("dispatchOrder reads the zone's mode before choosing", /readZoneDispatch\(/.test(dispatch));
  check("the offer path is unchanged: chooseRider is still called", /await chooseRider\(from/.test(dispatch));
  check("chooseRider is the first of the ranked list (one ordering)", /rankDispatchCandidates\(from, opts\)\)\[0\]/.test(dispatch));
  check("a fallback is recorded", /ops_mark_auto_fallback/.test(dispatch));
  const route = read("src/app/api/manager/insights/dispatch/route.ts");
  check("the dispatch route reads with insights.view and writes with dispatch.configure", /insightsGate\(request/.test(route) && /managerApiContext\("manager\.dispatch\.configure", request\)/.test(route));
  check("...writes through the audited function only", /ops_set_zone_dispatch/.test(route) && !/\.from\("delivery_zones"\)\s*\.(insert|update|upsert)/.test(route));
  check("no Devanagari in the auto-assign modules", !/[ऀ-ॿ]/.test(read("src/lib/dispatch/auto-assign.ts") + read("src/lib/ops/insights/dispatch-contract.ts") + route));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
})();
