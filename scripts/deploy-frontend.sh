#!/usr/bin/env bash
# KRUMM — Deploy frontend estático a S3 + invalidación CloudFront (Fase M1).
# Requiere: AWS SSO autenticado (aws sso login --profile admin-carlos), dist/ construido.
# Uso: PROFILE=admin-carlos DIST_DIR=dist BUCKET=<bucket> DISTRIBUTION_ID=<id> bash scripts/deploy-frontend.sh
set -euo pipefail

PROFILE="${PROFILE:-default}"
DIST_DIR="${DIST_DIR:-dist}"
BUCKET="${BUCKET:?Falta BUCKET}"
DISTRIBUTION_ID="${DISTRIBUTION_ID:?Falta DISTRIBUTION_ID}"

command -v aws >/dev/null || { echo "AWS CLI no encontrado" >&2; exit 1; }
[ -d "$DIST_DIR" ] || { echo "No existe $DIST_DIR — corre 'npm run build' primero." >&2; exit 1; }

echo "==> Sync $DIST_DIR -> s3://$BUCKET"
aws s3 sync "$DIST_DIR" "s3://$BUCKET" \
  --profile "$PROFILE" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

echo "==> Subir index.html con cache corto"
aws s3 cp "$DIST_DIR/index.html" "s3://$BUCKET/index.html" \
  --profile "$PROFILE" \
  --cache-control "no-cache,max-age=0,must-revalidate" \
  --content-type "text/html; charset=utf-8"

echo "==> Invalidación CloudFront"
aws cloudfront create-invalidation \
  --profile "$PROFILE" \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/index.html" "/" >/dev/null

echo "OK: deploy completado."

# Notificación deploy a Discord canal general (2026-09-08)
notify_deploy() {
  local webhook="$DISCORD_ALERTS_WEBHOOK_URL"
  local commit
  commit=$(git -C "$PWD" log -1 --format='%h · %s' 2>/dev/null || echo "n/a")
  local ts; ts=$(date '+%Y-%m-%d %H:%M CL')
  local payload
  payload=$(python3 -c "
import json,sys
print(json.dumps({
  'embeds':[{
    'title':'🚀 Deploy frontend KRUMM',
    'color':3066993,
    'description':f'**{sys.argv[1]}**',
    'fields':[
      {'name':'URL','value':'https://krumm.cl','inline':True},
      {'name':'Commit','value':f'\`{sys.argv[2]}\`','inline':True},
      {'name':'Tags','value':'S3 + CloudFront','inline':True}
    ],
    'footer':{'text':f'{sys.argv[3]} · deploy-frontend.sh'}
  }]
})", "$BUCKET" "$commit" "$ts")
  if [ -n "$webhook" ]; then
    curl -s -o /dev/null -w "discord: %{http_code}\n" -H "Content-Type: application/json" \
      -X POST -d "$payload" "$webhook" || true
  fi
}
notify_deploy
