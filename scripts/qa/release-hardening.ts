/**
 * QA — migration 0053 carries every release-blocking fix, and none of the
 * mistakes 0051 reintroduced. Static: reads the SQL, no database.
 * Usage: npx tsx scripts/qa/release-hardening.ts
 */
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/0053_release_hardening.sql", "utf8");
const profileTs = readFileSync("src/lib/data-access/profile.ts", "utf8");

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean) {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const guard = sql.slice(sql.indexOf("function public.guard_order_update"), sql.indexOf("$$;", sql.indexOf("function public.guard_order_update")));
check("guard_order_update is security invoker", /security invoker/.test(guard));
check("guard_order_update keeps the current_user exemption", /current_user in \('postgres', 'supabase_admin'\)/.test(guard));
for (const col of ["channel", "placed_by", "coupon_code", "discount", "discount_funded_by", "cancelled_by", "total", "payment_status"]) {
  check(`guard_order_update locks '${col}'`, guard.includes(`'${col}'`));
}
check("order insert pins status to placed", /new\.status\s*:=\s*'placed'/.test(sql));
check("order_items insert trigger exists", /create trigger order_items_guard_insert/.test(sql));
check("order_items price is re-derived from menu_items", /new\.price\s*:=/.test(sql) && /from public\.menu_items/.test(sql));
check("order_items guard is security invoker (definer would void the exemption)", /function public\.guard_order_item_insert\(\)[\s\S]*?security invoker/.test(sql));
check("recompute_order_total checks ownership", /function public\.recompute_order_total[\s\S]*?customer_id = auth\.uid\(\)/.test(sql));
check("profiles.phone trigger exists", /create trigger profiles_guard_phone/.test(sql));
check("check_rate_limit revoked from anon + authenticated", /revoke execute on function public\.check_rate_limit\(text, int, bigint\) from public, anon, authenticated/.test(sql));
check("order_items name comes from menu_items, not the client", /new\.name\s*:=\s*m\.name/.test(sql));
check("unavailable menu items are refused", /available/.test(sql.slice(sql.indexOf("function public.guard_order_item_insert"))));
check("order total is recomputed after items are inserted", /after insert on public\.order_items/.test(sql) && /recompute_order_total\(/.test(sql.slice(sql.indexOf("after insert on public.order_items") - 800)));
check("profile.ts writes phone with the service client", /createAdminClient\(\)[\s\S]*?\.update\(\{\s*phone/.test(profileTs));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
