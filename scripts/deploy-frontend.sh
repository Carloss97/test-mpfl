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
