# Cierre de sesión 2026-09-06 — B1: Backend KRUMM en AWS + frontend wireado

**Fecha:** 2026-09-06 (noche) · **Repo:** `/home/sarlock/krumm/test-mpfl` (main `6bb347b` + este commit)
**Sesión:** Ejecución de B1+B2 (autorizados por el usuario), cierre de T.3, R-7B a espera.
**Regla para la próxima sesión:** leer este doc + `docs/plans/2026-09-06-plan-corto-plazo-flujos-y-documentacion.md` + `AGENTS.md` antes de actuar.

## 1. Qué quedó entregado

### Backend en AWS (stack `krumm-m2-backend-staging`, us-east-1)
- **API base:** `https://rwm08ik23m.execute-api.us-east-1.amazonaws.com/staging`
- Rutas: `POST/GET /sessions`, `GET/DELETE /sessions/{id}`, `POST /invitations`, `GET /invitations/{token}`, `POST /invitations/{token}/revoke`
- **Tablas DynamoDB:** `krumm-staging-sessions` (PK sessionId), `krumm-staging-audit-log` (PK auditId, GSI `sessionId-index`, TTL 30d), `krumm-staging-invitations` (PK invitationId, TTL en `expiresAt`)
- Lambda `krumm-staging-sessions` (nodejs20, ESM, 256 MB), IAM mínimo (Get/Put/Delete/Query/Scan solo sobre las 3 tablas), CORS `*` con `x-invitation-id`
- **Privacy:** `POST /sessions` valida aggregate-only (422 `payload_privacy_violation` si trae `pointerSamples` u otras keys prohibidas); audit inmutable en cada cambio
- **Single-use:** `POST /sessions` con header `x-invitation-id` consume la invitación (re-GET → 410 `invitation_already_used`)

### Frontend wireado (deployado en krumm.cl, bundle `index-lLiyJyHC.js`)
- Endpoint embebido en build: `VITE_KRUMM_API_BASE` (ver `src/postulation-demo/postulationDemoConfig.js` → `KRUMM_API_BASE`; sin valor = modo demo local, todo funciona igual)
- **Guard de invitaciones** en `/postulaciones?invite=<token>`: valida contra backend (o validador local determinístico sin API) → `setup` si válida, `invite-invalid` con mensaje específico (expirada/usada/revocada/inválida) si no
- **Al completar la evaluación:** `POST /sessions` con el payload final (agregado) + `x-invitation-id` si hay invitación → nota en el reporte ("Evaluación registrada para revisión humana" / error de registro)
- **`/reclutador` con sesiones reales:** `HrDashboardRoot` hace `GET /sessions?limit=50`; si hay datos → "Workspace HR · Sesiones reales (staging)"; si no (o API caída) → fallback sintético etiquetado "Datos sintéticos"

### CloudFront (distribución EDQ39PDNI931R)
- **CSP:** nueva policy `krumm-staging-rhp-m2` (ID `23b296b7-42e4-4171-88fa-1dc8de907846`) — `connect-src` incluye el host de la API. Las policies RHP son **inmutables**: cada cambio de CSP = crear policy nueva + `update-distribution` (no editar).
- **Template sync:** `infra/m1-frontend-stack.yaml` ahora incluye los aliases `krumm.cl`/`www.krumm.cl` + cert ACM `d201648d-...` (antes el template los traía ausentes → un deploy CFN habría revertido el dominio). NO desplegar el stack m1 sin comparar primero con `aws cloudfront get-distribution-config`.

## 2. Evidencia de verificación (todo contra sistemas reales)

| Check | Resultado |
|---|---|
| E2E API (`/tmp/e2e_krumm_api.py`, 2 corridas) | **7/7**: invitación 201+mask, valid 200, POST session 201, single-use 410, lista HR con alias/scores, GET por id, privacy 422 |
| `GET /sessions` (post-fix) | candidatos con `completion`, `constructs[8]`, `interviewPrompts`, caveats en texto |
| Browser krumm.cl `/reclutador` | 8 constructos visibles, alias reales, label "Sesiones reales (staging)", sin página en blanco |
| Browser `/postulaciones?invite=<válida>` | pasa el guard → "Preparación de la sesión" |
| Browser `/postulaciones?invite=<consumida>` | "Invitación no válida — Esta invitación ya fue utilizada. No se puede completar dos veces." |
| Tests | **613/613 frontend** (117 archivos), **25/25 backend** |
| Commits | `b648deb` (deploy+wiring), `6bb347b` (fix dashboard datos reales) — ambos push a main |

## 3. Bugs de producción hallados y fijados (lecciones)

1. **SDK v3 es command-based**: `DynamoDBDocumentClient` NO tiene `put/get/scan/delete` (eso era SDK v2). Adaptador en `backend/src/index.mjs` (puente único); SDK **pinned exacto** a `3.600.0` en `backend/package.json` (sin caret).
2. **IAM** faltaba `dynamodb:Scan` (list → 500 AccessDenied).
3. **DynamoDB rechaza `NULL` explícito en clave de GSI**: audit log con `sessionId: null` → ValidationException. Fix: omitir el atributo (semántica sparse) en `appendAuditLog`.
4. **Header `x-invitation-id`**: lookup case-insensitive (clientes/gateway normalizan distinto).
5. **Mock divergence single-use (el más insidioso)**: el mock de test **fusionaba** items en `put`; DynamoDB `PutItem` **reemplaza** el item completo. `markInvitationUsed` perdía `singleUse` → invitación consumida leía como "valid" para siempre. Fix: read-merge-write en `markInvitationUsed`/`revokeInvitation` + **test de regresión con semántica replace** (`invitations.handlers.test.mjs`).
6. **CSP** bloqueaba el fetch a la API (`connect-src` sin el host) → "Failed to fetch" y /reclutador caía a sintético. Fix: RHP m2.
7. **Dashboard crash con datos reales**: el mapping de `GET /sessions` no traía `completion`/`constructs`/`interviewPrompts` → `undefined.map`/`undefined.completed` → React crash → **página en blanco** en /reclutador. Fix: backend devuelve los campos (+ gameIds reales `laser_puzzle`... y score en `gr.result.score`) + frontend defensivo (`?? []` / `?.`) + test de regresión con candidato real sin campos.
8. **Drift template CFN**: m1-frontend-stack sin aliases/cert ACM (existían en live) → riesgo de revert de dominio en cualquier deploy CFN. Fix: template sync (sin redeploy).

## 4. Estado de tickets/cards

- **Kanban:** B1 `t_1c9f8695` DONE · T.3 `t_cb36be49` DONE (realizado en equipo externo con webcam, usuario) · T.3b `t_c1892485` READY (sensibilidades MoveNet/FaceMesh) · C1 `t_19e75e78` / C2 `t_df1a1065` / J2 `t_a556170e` READY
- **Linear:** KRU-75 (B1) DONE · KRU-48 (backend aggregate-only) DONE · KRU-68 (T.3) DONE · KRU-76 (T.3b) creado (Backlog, prio 3) · KRU-50 comentado (queda scope B3) · KRU-65 (R-7C entrevistas) en curso
- **Cron:** dispatcher `3979d2085fb9` actualizado (B1 done; prioridades C1→C2→J2→T.3b; R-7B y Exp 7/8 sin trabajo; GPU manual no apagar)

## 5. Próximos pasos (orden del plan)

1. **C1** — Re-audit G.1 post-cambios (recorrido vivo 5 juegos, desktop 1280×720 + móvil 390×844, console/overflow)
2. **C2** — Práctica completatable en los 5 juegos (G.2, tests de componente)
3. **J2** — Backfill docs de módulos `laser_puzzle` + `team_coordination` (plantilla v2, meta 5/5)
4. **T.3b** — Ajuste de sensibilidades biométricas
5. **B3** — Vista HR: brief de entrevista + export Markdown/CSV (KRU-50)
6. **R-7B** — en espera hasta nuevo aviso (usuario)
7. **Exp 7/8** — fuera de scope (requiere spec)

## 6. Ops rápido (comandos probados)

```bash
# Backend: rebuild + redeploy (SAM en venv)
cd ~/krumm/test-mpfl
rm -rf infra/dist/backend/src && cp -r backend/src/. infra/dist/backend/src/
cd infra && SAM_CLI_TELEMETRY=0 ~/.sam-cli/bin/sam deploy \
  --template-file m2-backend-stack.yaml --stack-name krumm-m2-backend-staging \
  --region us-east-1 --parameter-overrides Environment=staging \
  --capabilities CAPABILITY_IAM --no-confirm-changeset --resolve-s3

# Frontend: build (embebido endpoint) + deploy
cd ~/krumm/test-mpfl
VITE_KRUMM_API_BASE="https://rwm08ik23m.execute-api.us-east-1.amazonaws.com/staging" npm run build
BUCKET=krumm-staging-frontend-931932531447 DISTRIBUTION_ID=EDQ39PDNI931R bash scripts/deploy-frontend.sh

# Tests
NODE_ENV=test npx vitest run --pool=threads          # frontend (613)
cd backend && NODE_ENV=test npx vitest run --pool=threads   # backend (25)
```

- **SSO AWS:** `aws sso login --use-device-code` (requiere aprobación del usuario; ~11 h de vigencia). Vigente al cierre: sí.
- **GPU Lambda:** subida manual por el usuario "hasta nuevo aviso" — NO apagar (regla en cron dispatcher). Túnel 18000; costo ~$8.38/h.
- **Invitación viva para probar el flujo candidato** (creada en esta sesión, 24 h, single-use): `https://krumm.cl/postulaciones?invite=2c19391a-8b9a-4102-a563-1effda8aab91` (email `carlos@krumm.cl`, enmascarada `ca***@krumm.cl`). Si se usa, desaparece (single-use).
- **Dato QA en staging:** ~10 sesiones de E2E en `krumm-staging-sessions` (aliases `h-e2e-qa-*`, `h-full-*`, `direct-invoke-*`, `full-handler-*`) — visibles en /reclutador; se pueden borrar con `DELETE /sessions/{id}` si se quiere tabula limpia antes de una demo.
- **Key Lambda vieja** (leak histórico en `gpu_manager.py`, ya eliminada del repo): pendiente de confirmación de rotación en la consola (plan §5.5).
