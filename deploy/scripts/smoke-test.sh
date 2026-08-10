#!/usr/bin/env bash
set -euo pipefail

: "${BASE_URL:?Set BASE_URL to the deployed HTTPS origin, for example https://sufe-ai.example.edu.cn}"

health="$(curl --fail --silent --show-error --max-time 10 "$BASE_URL/healthz")"
if [[ "$health" != *'"status":"UP"'* ]]; then
  echo "Readiness check did not return UP" >&2
  exit 1
fi

curl --fail --silent --show-error --max-time 10 "$BASE_URL/" >/dev/null
echo "Smoke test passed: $BASE_URL"
