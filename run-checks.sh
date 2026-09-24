#!/usr/bin/env bash
# ==========================================================================
# Runs the admin -> main-site integration check in all three storage modes.
# Usage:  bash scripts/run-checks.sh
# ==========================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="$(mktemp -t local-flow.XXXXXX.mjs)"
node_modules/.bin/esbuild scripts/local-flow.check.mts \
  --bundle --platform=node --format=esm --target=node20 \
  --outfile="$OUT" --log-level=warning

status=0
for scenario in idb localstorage memory; do
  echo
  SCENARIO="$scenario" node "$OUT" || status=1
done

# End-to-end check against the real chapter server (server/index.mjs)
API_OUT="$(mktemp -t api-flow.XXXXXX.mjs)"
node_modules/.bin/esbuild scripts/api-flow.check.mts \
  --bundle --platform=node --format=esm --target=node20 \
  --outfile="$API_OUT" --log-level=warning
echo
node "$API_OUT" || status=1

rm -f "$OUT" "$API_OUT"
exit $status
