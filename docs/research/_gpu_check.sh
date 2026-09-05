#!/usr/bin/env bash
set -uo pipefail
SAFE_BASE="/home/sarlock/krumm/test-mpfl/docs/research"
set -a; source "${HOME}/.hermes/.env"; set +a
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
if curl -sf --max-time 25 -A "$UA" -H "Authorization: Bearer ${LAMBDA_API_KEY}" \
    https://cloud.lambdalabs.com/api/v1/instances -o "${SAFE_BASE}/_instances.json"; then
  echo "OK bytes=$(wc -c < "${SAFE_BASE}/_instances.json")"
else
  echo "CURL FAIL"
fi