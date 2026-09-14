#!/usr/bin/env bash
# G.4 (KRU-139): runbook DR — ejercicio de restore PITR de DynamoDB.
#
# Restaura una tabla de datos a una tabla TEMPORAL (PITR, punto más reciente),
# verifica los items, mide el RTO real y elimina la temporal.
#
# Uso:  scripts/dr-restore.sh [sessions|audit-log|invitations]
# RTO objetivo: <1 h. Tablas actuales (<1 GB): segundos–minutos.
# Seguridad: NUNCA restaura sobre el nombre de una tabla real (guarda explícito).
set -euo pipefail

PREFIX=${PREFIX:-krumm-staging}
TABLE=${1:-sessions}
TS=$(date +%s)
DEST="${PREFIX}-${TABLE}-restore-${TS}"

# CLI: prefiere la versión más reciente disponible (la API DDB 2026 cambió
# parámetros; 2.36.38 no conoce todos).
AWSCMD=${AWSCMD:-$( [ -x "$HOME/bin/aws" ] && echo "$HOME/bin/aws" || echo aws )}

case "$DEST" in
  "${PREFIX}-sessions"|"${PREFIX}-audit-log"|"${PREFIX}-invitations"|"${PREFIX}-rate-limit")
    echo "FATAL: DEST coincide con una tabla real — abortando." >&2; exit 1 ;;
esac

SRC="${PREFIX}-${TABLE}"
echo "=== DR: restore PITR ${SRC} → ${DEST} (punto más reciente) ==="
START=$(date +%s)

"$AWSCMD" dynamodb restore-table-to-point-in-time \
  --source-table-name "$SRC" \
  --target-table-name "$DEST" \
  --use-latest-restorable-time >/dev/null
echo "Restore solicitado — esperando ACTIVE (máx 5 min)…"

ST=CREATING
for i in $(seq 1 60); do
  ST=$("$AWSCMD" dynamodb describe-table --table-name "$DEST" --query 'Table.TableStatus' --output text 2>/dev/null || echo CREATING)
  [ "$ST" = "ACTIVE" ] && break
  sleep 5
done
[ "$ST" = "ACTIVE" ] || { echo "FATAL: la tabla no pasó a ACTIVE en 5 min (estado: $ST)" >&2; exit 1; }

# scan es eventually consistent → pequeño wait de consistencia
sleep 10
SRC_COUNT=$("$AWSCMD" dynamodb scan --table-name "$SRC" --select COUNT --query 'Count' --output text)
DST_COUNT=$("$AWSCMD" dynamodb scan --table-name "$DEST" --select COUNT --query 'Count' --output text)
ELAPSED=$(( $(date +%s) - START ))
echo "Items origen: $SRC_COUNT | restaurados: $DST_COUNT | RTO ejercicio: ${ELAPSED}s"

"$AWSCMD" dynamodb delete-table --table-name "$DEST" >/dev/null
echo "Tabla temporal ${DEST} eliminada."
if [ "$DST_COUNT" -ge "$SRC_COUNT" ] || [ "$SRC_COUNT" = "0" ]; then
  echo "RESULTADO: PASS (restore completo; las escrituras nuevas en origen durante el ejercicio explican DST ≤ SRC en caso de writes concurrentes)"
else
  echo "RESULTADO: REVIEW (DST < SRC — verificar escrituras concurrentes en origen durante el restore)"
fi
