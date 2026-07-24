#!/usr/bin/env bash
# Full QA pack: IDOR suite → E2E smoke → (optional) ZAP when ZAP_TARGET_URL is set.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "═══ 1/3 IDOR + cross-account ═══"
npx tsx scripts/qa/idor-suite.ts

echo ""
echo "═══ 2/3 E2E smoke ═══"
npx tsx scripts/qa/e2e-smoke.ts

if [[ -n "${ZAP_TARGET_URL:-${STAGING_URL:-}}" ]]; then
  echo ""
  echo "═══ 3/3 OWASP ZAP baseline ═══"
  bash scripts/qa/zap-baseline.sh
else
  echo ""
  echo "═══ 3/3 OWASP ZAP skipped (set ZAP_TARGET_URL to run) ═══"
fi

echo ""
echo "All requested QA steps finished."
