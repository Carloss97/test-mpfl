# G.4 — Backup + DR (KRU-139) — 2026-09-14

## Estrategia de backup (estado verificado 2026-09-14)

| Dato | Protección | Retención | Verificado |
|---|---|---|---|
| `krumm-staging-sessions` (evaluaciones, aggregate-only) | **DynamoDB PITR** (continuous backups) | **35 días** (restorable desde 2026-09-06) | `describe-continuous-backups`: ENABLED |
| `krumm-staging-invitations` | **DynamoDB PITR** | **35 días** (desde 2026-09-06) | ENABLED |
| `krumm-staging-audit-log` | **DynamoDB PITR** | **35 días** (desde 2026-09-06) | ENABLED |
| `krumm-staging-rate-limit` | **Sin PITR (by design)** — contadores efímeros (TTL 3 min, sin valor de datos) | — | documentado |
| Frontend S3 (`krumm-stage-frontend-…`, `krumm-staging-frontend-…`) | **S3 Versioning** | versiones ilimitadas | `get-bucket-versioning`: **Enabled** (verificado 2026-09-14) |
| Bucket dev (`krumm-dev-frontend-…`) | sin versioning — out of scope pre-beta | — | notado |

- PITR está declarado en `infra/m2-backend-stack.yaml` (`PointInTimeRecoverySpecification`
  en las 3 tablas) — el estado live coincide (había estado activo desde la creación de
  las tablas; el "gap" aparente era de **API**: en 2026 el status de PITR ya no sale en
  `describe-table` — se consulta con `dynamodb describe-continuous-backups`, y se
  habilita con `update-continuous-backups` — ver lecciones de skill).
- **RPO**: ≈5 min en DDB (lag típico PITR: el `LatestRestorableDateTime` va ~5 min
  atrás del reloj) · 0 en S3 (versioning: cada PUT conserva la versión previa).
- **RTO objetivo: <1 h** · **medido: 223 s** (ejercicio de 2026-09-14, tabla <1 GB).

## Procedimiento de restore (incidente real)

1. **Determinar el punto** hasta el que restaurar (`aws dynamodb describe-continuous-backups`
   → `EarliestRestorableDateTime`/`LatestRestorableDateTime`).
2. **Restaurar a tabla NUEVA** (nunca sobre la rota):
   ```
   aws dynamodb restore-table-to-point-in-time \
     --source-table-name krumm-staging-sessions \
     --target-table-name krumm-staging-sessions-recovered \
     --restore-date-time <ISO-8601>   # ó --use-latest-restorable-time
   ```
   Esperar `TableStatus: ACTIVE` (segundos–minutos para tablas <1 GB).
3. **Verificar**: `scan --select COUNT` en origen vs recuperada; muestrear items
   (un `get-item` de la clave de la última evaluación conocida).
4. **Cortar la app a la recuperada**: actualizar el env de la Lambda
   (`SESSIONS_TABLE`/`INVITATIONS_TABLE`/`AUDIT_LOG_TABLE` → `!Ref` de la tabla nueva)
   vía SAM deploy (~2 min) — o, si la tabla original es descartable,
   `delete-table` + renombrar la recuperada.
5. **S3 (frontend)**: la recuperación de una versión es `aws s3api list-object-versions`
   + `restore`/copy de la versión deseada; el CD normal (git) ya es la "backup" del
   frontend (código versionado en GitHub).

## Ejercicios simulados (log)

| Fecha (UTC) | Tabla | Resultado | Items | RTO |
|---|---|---|---|---|
| 2026-09-14 03:36:47 | `krumm-staging-sessions` → `…-restore-1789357007` (temporal, eliminada) | **PASS** | 11/11 | **223 s** |

Runbook: **`scripts/dr-restore.sh [sessions|audit-log|invitations]`** — restaura a una
tabla temporal, compara counts, mide el RTO y limpia. Guardas: refusa nombres de tablas
reales; usa el CLI más reciente disponible (la API DDB 2026 cambió parámetros).
Frecuencia sugerida: 1 ejercicio/mes hasta beta (cron opcional, fuera de scope G.4).
