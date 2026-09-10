# Evaluación: separación de entornos dev/test/stage/prod (frontend + backend)

**Fecha:** 2026-09-10 · **Repo:** `test-mpfl` · **Trigger:** instrucción de usuario (separar entorno de producción)
**Linear:** KRU-93 (parent) + KRU-94..98 (hijas) · **Kanban:** cards bloqueadas (ver §6)

## 1. Estado actual (evidencia)

| Entorno | Frontend | Backend | Datos | Deploy |
|---|---|---|---|---|
| **prod** (`krumm.cl`) | S3 `krumm-staging-frontend-931932531447` + CloudFront `EDQ39PDNI931R` (RHP m3) | — (build **sin** `VITE_KRUMM_API_BASE` → modo **demo**) | demo determinista | CD GitHub Actions: push `main` → build → S3+CF → smoke Playwright prod |
| **staging** (API) | — | `rwm08ik23m.execute-api.us-east-1.amazonaws.com/staging` (SAM `krumm-m2-backend-staging`, DynamoDB `krumm-staging-*`) | **LIVE** (11 sesiones contract v1, `/staging/sessions`) | SAM manual (SSO) |
| **dev/test** | local: `vite dev`/preview + mock API (`scripts/mock-sessions-api.mjs`) | mock o staging | sintético/real-según-escala | — |

**Problemas detectados:**

1. **El bucket "staging" sirve el dominio prod** (`krumm-staging-frontend-931932531447` → krumm.cl). El nombre y el dominio no coinciden; no existe un entorno `stage` real con datos.
2. **main → prod directo**: cada push a `main` muta krumm.cl. No hay entorno de validación con datos reales antes de prod, y no hay gate manual para el "último" entorno.
3. **Prod no usa datos reales**: el modo real (`/staging/sessions` LIVE) no está activado en krumm.cl porque el build no inyecta `VITE_KRUMM_API_BASE` (decisión de producto — hoy demo).
4. **Sin PR preview**: los cambios se validan solo con tests/CI + el smoke prod post-deploy.
5. Backend solo tiene stage; no existe ruta `/prod` de la API.

## 2. Estado objetivo propuesto

| Entorno | Dominio | API | Datos | Gate de deploy |
|---|---|---|---|---|
| **dev** | local (`127.0.0.1:5173/4173`) | mock (script) o staging | sintético | — (documentar en AGENTS.md/runbook) |
| **test** | `pr-<N>` efímero (preview GH Actions → CloudFront dev dist o S3 static site) | staging | real (pseudónimos) | cada PR (CI + preview) |
| **stage** | `stage.krumm.cl` | `/staging` (API actual) | **real** | push `main` → auto (hoy es lo que hace "prod") |
| **prod** | `krumm.cl` | `/prod` (futuro SAM) — intermedio: `/staging` flaggeado | real (cuando `VITE_KRUMM_API_BASE` se active) | **tag `v*` o dispatch manual** (gate humano) |

Principio: **lo que hoy deployea a prod por cada push deja de ser prod**: `main` alimenta **stage**; **prod** exige tag/accisión explícita. El bucket actual sigue sirviendo krumm.cl (migración de nombre opcional, ver KRU-98).

## 3. Cambios concretos por tarea

### KRU-94 — Stage frontend (`stage.krumm.cl`)
- S3: bucket nuevo `krumm-stage-frontend-931932531447` (o reutilizar el actual con prefix — decisión en runbook) + OAC.
- CloudFront: 2ª distribución `stage.krumm.cl` (cert ACM `*.krumm.cl` — revisar si el existente ya es wildcard; si no, solicitar ACM + approval).
- Build stage: `VITE_KRUMM_API_BASE=https://rwm08ik23m.execute-api.us-east-1.amazonaws.com/staging` → **modo real activo** (la CSP del RHP ya permite el origen).
- Smoke stage: reutilizar `prod-verify-v5.mjs` parametrizado por `BASE_URL`.
- Evidencia: URL stage pública con datos reales (aliases) + banner "Sesiones reales (staging)".

### KRU-95 — CD bifurcado (main→stage auto; tag/dispatch→prod)
- `cd.yml` actual: deploy a **stage** (bucket/dist de KRU-94).
- Nuevo job `deploy-prod` (o workflow `cd-prod.yml`): trigger `push: tags: ['v*']` + `workflow_dispatch`; mismo OIDC role (extender policy a bucket/dist prod); smoke prod final.
- `deploy-frontend.sh`: parámetros `BUCKET`/`DISTRIBUTION_ID` ya existen → solo orquestación.
- Documentar en SECURITY.md (§CI/CD) la matriz por entorno.

### KRU-96 — PR preview (entorno test efímero)
- `preview.yml`: PR → CI (ya existe) + build con API staging + deploy a prefix `preview/pr-<N>/` en un bucket dev (o sitio estático efímero) + comentario en PR con la URL + expiración (Lifecycle policy 7 días).
- Alternativa mínima (si CloudFront preview es complejo): bucket dev + URL S3 website (sin dominio propio) — suficiente para QA de PRs.

### KRU-97 — Backend: ruta `/prod` (SAM m2)
- Stage `/prod` en la API GW (mismo Lambda o alias de versión) + tablas `krumm-prod-*` (o reutilizar staging con flag — decisión de datos).
- Frontend prod: `VITE_KRUMM_API_BASE=.../prod` en el build de prod (KRU-95).
- Migración de datos staging→prod: NO en esta tarea (scoping aparte si se aprueba).

### KRU-98 — Runbook + docs + reconciliación de nombres
- `docs/ops/environments.md` (o §en SECURITY.md): matriz dominio↔bucket↔dist↔API↔gate, certificados ACM, procedimiento de migración bucket "staging"→"prod" (copy + cambio de origen CFN + DNS, o renombre documental si se acepta el estado).
- Pitfall CFN: `infra/m1-frontend-stack.yaml` vs live (RHP m3 creada vía API — el skill lo documenta; reconciliar antes de cualquier deploy CFN del stack m1).
- Actualizar AGENTS.md §Credenciales/Infra con la matriz.

## 4. Riesgos

- **Cert ACM `*.krumm.cl`**: si el cert actual es solo `krumm.cl` + `www.krumm.cl`, `stage.krumm.cl` requiere nuevo cert (approval AWS, ~1-24h).
- **Costo CloudFront/S3**: una distribución más ≈ costo marginal (data transfer por uso; hoy tráfico bajo).
- **CSP/RHP**: cada distribución lleva su RHP; si el origen API cambia por entorno, validar `connect-src` (hoy ya incluye el origen staging — suficiente para stage/test/prod-intermedio).
- **Bucket "staging" sirviendo prod**: mientras no se migre, cualquier cambio del bucket actual afecta a krumm.cl — el gate de KRU-95 (tag→prod) mitiga, pero el bucket prod debe ser explícito en la policy OIDC.
- **OIDC role**: `krumm-gh-actions-deploy` tiene policy solo para bucket/dist actuales → extender (mínimo privilegio) por KRU-94/95.

## 5. Secuenciación sugerida

1. **KRU-94** (stage) — desbloquea "main no muta prod".
2. **KRU-95** (CD bifurcado) — gate prod.
3. **KRU-96** (preview) — calidad de PRs (independiente, paralelizable tras 94).
4. **KRU-97** (backend prod) — requiere decisión de datos (migrar o compartir staging).
5. **KRU-98** (runbook) — tras cada hito, actualizar.

## 6. Kanban (cards creadas 2026-09-10, `initial-status: blocked`)

Bloqueadas a propósito: implican AWS (SSO + decisiones de dominio/cert/bucket) y no deben lanzar workers autónomos hasta que el usuario apruebe la secuencia. Al aprobar: `hermes kanban unblock <id>` (+ `set-model qwen-model` si se fija heavy).
