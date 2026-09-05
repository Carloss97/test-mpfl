#!/usr/bin/env bash
set -uo pipefail
set -a; source "${HOME}/.hermes/.env"; set +a
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
BASE="https://cloud.lambdalabs.com/api/v1"
ID="${1:-199a86f9d3e444fea8af4cb857858613}"

echo "== Terminando instancia $ID =="
code=$(curl -sf --max-time 30 -A "$UA" -H "Authorization: Bearer ${LAMBDA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"instance_ids\":[\"${ID}\"]}" \
  -o "${HOME}/krumm/test-mpfl/docs/research/_term_resp.json" -w "%{http_code}" \
  "${BASE}/instance-operations/terminate")
echo "HTTP $code"
echo "-- resp --"; cat "${HOME}/krumm/test-mpfl/docs/research/_term_resp.json"; echo

echo "== Limpiando state =="
rm -f "${HOME}/.hermes/gpu_state.json" && echo "gpu_state.json eliminado"
echo "== Matando túneles ssh heredados =="
pkill -f "ubuntu@" 2>/dev/null && echo "túneles ssh terminados" || echo "(sin túneles)"
echo "== Restaurando config.yaml a modelo NVIDIA =="
python3 "${HOME}/bin/switch_model.py" nvidia 2>&1 || echo "switch_model falló (no crítico)"