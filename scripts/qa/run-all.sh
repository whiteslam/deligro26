#!/usr/bin/env bash
# Full QA pack: payment signatures → app version gate → IDOR suite → E2E smoke
# → (optional) ZAP when ZAP_TARGET_URL is set.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# First because they are the cheapest: pure functions, no network, no database.
echo "═══ 1/5 Payment signature verification ═══"
npx tsx scripts/qa/payments-signature.ts

echo ""
echo "═══ 2/5 App update gate ═══"
npx tsx scripts/qa/app-version.ts

echo ""
echo "═══ 3/5 IDOR + cross-account ═══"
npx tsx scripts/qa/idor-suite.ts

echo ""
echo "═══ 4/5 E2E smoke ═══"
npx tsx scripts/qa/e2e-smoke.ts

if [[ -n "${ZAP_TARGET_URL:-${STAGING_URL:-}}" ]]; then
  echo ""
  echo "═══ 5/5 OWASP ZAP baseline ═══"
  bash scripts/qa/zap-baseline.sh
else
  echo ""
  echo "═══ 5/5 OWASP ZAP skipped (set ZAP_TARGET_URL to run) ═══"
fi

echo ""
echo "All requested QA steps finished."
