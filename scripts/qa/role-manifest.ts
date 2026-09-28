/**
 * QA — each portal installs as its own home-screen app.
 * Usage: npx tsx scripts/qa/role-manifest.ts
 */
import { buildRoleManifest, isPortalRole, ROLE_APP_TITLE } from "../../src/lib/pwa/role-manifest";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? " — " + detail : ""}`); }
}

const v = buildRoleManifest("vendor");
const r = buildRoleManifest("rider");
const m = buildRoleManifest("manager");

check("vendor opens the kitchen board", v.start_url === "/vendor");
check("rider opens the jobs board", r.start_url === "/driver");
check("manager opens the ops board", m.start_url === "/manager");
check("ids are unique and differ from the customer app's '/'", new Set([v.id, r.id, m.id, "/"]).size === 4);
check("scope is '/' so login redirects stay inside the app", [v, r, m].every((x) => x.scope === "/"));
check("names match the Android app names", v.name === ROLE_APP_TITLE.vendor && r.name === ROLE_APP_TITLE.rider && m.name === ROLE_APP_TITLE.manager);
check("standalone display", [v, r, m].every((x) => x.display === "standalone"));
check("has a 512 maskable icon", [v, r, m].every((x) => x.icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable")));
check("isPortalRole accepts rider", isPortalRole("rider"));
check("isPortalRole rejects admin (website only)", !isPortalRole("admin"));
check("isPortalRole rejects customer (root manifest.ts already covers it)", !isPortalRole("customer"));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
