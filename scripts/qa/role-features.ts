/**
 * QA — role feature switches resolve the way the admin panel says they do.
 *
 * Precedence: this shop's / this person's override → the role-wide switch →
 * ON. "No row" must never read as "off", or applying migration 0052 (or an
 * empty table) would silently take features away from everybody.
 *
 * Pure, no I/O. Usage: npm run test:role-features
 */
import { FEATURES, allOn, featuresFor } from "../../src/lib/features/catalog";
import { resolveFeatures, type FlagRow } from "../../src/lib/features/resolve";

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

const SHOP_A = "11111111-1111-1111-1111-111111111111";
const SHOP_B = "22222222-2222-2222-2222-222222222222";
const RIDER = "33333333-3333-3333-3333-333333333333";

console.log("\nRole feature switches\n");

// Catalogue sanity
check("every feature key is 'role.name'", FEATURES.every((f) => /^[a-z_]+\.[a-z_]+$/.test(f.key)));
check("every feature key starts with its role", FEATURES.every((f) => f.key.startsWith(f.role + ".")));
check("feature keys are unique", new Set(FEATURES.map((f) => f.key)).size === FEATURES.length);
check("each role has switchable features", ["vendor", "manager", "driver"].every((r) => featuresFor(r as never).length > 0));

// No rows → everything on
const none = resolveFeatures("vendor", [], SHOP_A);
check("no rows: every vendor feature on", Object.values(none).every(Boolean));

// Role-wide off
const roleOff: FlagRow[] = [{ feature: "vendor.promotions", subject_kind: "role", subject_id: null, enabled: false }];
check("role-wide off applies to shop A", resolveFeatures("vendor", roleOff, SHOP_A)["vendor.promotions"] === false);
check("role-wide off applies to a shop with no id", resolveFeatures("vendor", roleOff, null)["vendor.promotions"] === false);
check("role-wide off leaves other features on", resolveFeatures("vendor", roleOff, SHOP_A)["vendor.menu_edit"] === true);

// Shop override beats role-wide
const override: FlagRow[] = [
  ...roleOff,
  { feature: "vendor.promotions", subject_kind: "restaurant", subject_id: SHOP_A, enabled: true },
];
check("shop A's override ON beats role-wide OFF", resolveFeatures("vendor", override, SHOP_A)["vendor.promotions"] === true);
check("shop B still follows role-wide OFF", resolveFeatures("vendor", override, SHOP_B)["vendor.promotions"] === false);

// Override off with role on
const shopOff: FlagRow[] = [{ feature: "vendor.menu_edit", subject_kind: "restaurant", subject_id: SHOP_B, enabled: false }];
check("per-shop OFF only affects that shop", resolveFeatures("vendor", shopOff, SHOP_B)["vendor.menu_edit"] === false && resolveFeatures("vendor", shopOff, SHOP_A)["vendor.menu_edit"] === true);

// Kind isolation: a profile row must not act as a shop override, and vice versa
const wrongKind: FlagRow[] = [{ feature: "vendor.menu_edit", subject_kind: "profile", subject_id: SHOP_A, enabled: false }];
check("a 'profile' row does not override a vendor shop", resolveFeatures("vendor", wrongKind, SHOP_A)["vendor.menu_edit"] === true);

// Riders
const riderRows: FlagRow[] = [
  { feature: "driver.history", subject_kind: "role", subject_id: null, enabled: false },
  { feature: "driver.history", subject_kind: "profile", subject_id: RIDER, enabled: true },
];
check("rider override ON beats role-wide OFF", resolveFeatures("driver", riderRows, RIDER)["driver.history"] === true);
check("other riders follow role-wide OFF", resolveFeatures("driver", riderRows, "x")["driver.history"] === false);

// Other roles untouched
check("vendor rows never change a rider's map", resolveFeatures("driver", roleOff, RIDER)["vendor.promotions"] === allOn()["vendor.promotions"]);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
