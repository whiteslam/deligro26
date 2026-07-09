/**
 * Import all legacy login-related data:
 *   1. Restaurant owner accounts + owner_id links
 *   2. Customer phone accounts for OTP login
 *
 *   npm run db:import-legacy-login
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const extra = dry ? ["--dry-run"] : [];

function run(script: string) {
  console.log(`\n========== ${script} ==========\n`);
  const r = spawnSync("npx", ["tsx", join("scripts", script), ...extra], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("import-legacy-vendor-owners.ts");
console.log(
  "\nFor customers: run `npm run db:generate-legacy-customers-sql` and paste",
  "supabase/seed/legacy_customers.sql in Supabase SQL Editor (fastest),",
  "or: npm run db:import-legacy-customers\n"
);
run("import-legacy-customers.ts");
console.log("\nAll legacy login imports finished.");
