# SECURITY.md — KRUMM /postulaciones-demo

## Políticas de Seguridad Aplicables

1. **Privacy-first.** Todo dado que sale del navegador del postulante debe pasar por el filtro `validateSessionPayload` server-side antes de persistir.
2. **Aggregate-only.** El backend nunca persiste datos crudos (`video`, `landmarks`, `rawFrames`, etc.). Todo es ventanas agregadas con flags de calidad.
3. **Human review only.** Los reports finales son para apoyo a entrevista estructurada; no toman decisiones automáticas.

## Forbidden Keys (Server-Side Enforcement)

`ASSESSMENT_FORBIDDEN_KEYS` se define en `src/assessment/assessmentSession.js` y se re-exporta en `backend/src/privacy/validatePayload.mjs`. Cualquier payload POST `/sessions` que contenga estas claves en cualquier nivel anidado será rechazado con 422.

```
'video', 'rawVideo', 'frames', 'rawFrames', 'imageData', 'screenshot',
'landmarks', 'keypoints', 'normalizedKeypoints', 'faceSamples',
'blendshapesRaw', 'pointerSamples', 'rawPointerPath', 'fullRoute',
'routeTrace', 'visitedCells', 'stepByStepPath', 'clickTrace', 'eventLog',
'pumpSequence', 'beamCells', 'rawGameEvents', 'choiceCategory',
'trials', 'trialResults', 'stimuli', 'items', 'windows', 'DOMEvent',
'domEvent', 'rawDOMEvents', 'MouseEvent', 'PointerEvent'
```

Validación: `backend/test/privacy.validatePayload.test.mjs` — 6 tests GREEN.

## Rate Limiting

- API Gateway HTTP: 10 solicitudes/minuto por IP (configurado en M1/M5).
- Header `X-RateLimit-Remaining` y `X-RateLimit-Reset` en todas las respuestas.
- 429 con `Retry-After` cuando se excede.

## CSP (CloudFront ResponseHeadersPolicy)

**CSP real en prod (verificada 2026-09-08, `curl -sI https://krumm.cl/`):**

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data:;
font-src 'self' data: https://fonts.gstatic.com;
connect-src 'self' https://storage.googleapis.com
  https://rwm08ik23m.execute-api.us-east-1.amazonaws.com;
worker-src 'self' blob:;
media-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none'
```

Notas: `style-src 'unsafe-inline'` + Google Fonts son la excepción de marca v2 (fuentes
Archivo/Manrope; RHP `krumm-staging-rhp-m3`, inmutable — se renombra en cada cambio).
`connect-src` incluye la API de staging (M2) y los modelos MediaPipe. `frame-ancestors
'none'` previene clickjacking. Template: `infra/m1-frontend-stack.yaml`.

## Headers de Respuesta (siempre)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (M1+)

**Evidencia 2026-09-08 (prod):** todos los headers presentes en `krumm.cl` (landing,
`/candidato`, `/empresa`) — ver `docs/plans/2026-09-08-kru50-kru51-ci-cd-plan.md` §P4.

## Dependencies

- `npm audit --audit-level=high --omit=dev` → 0 high/critical vulnerabilities (tras `npm audit fix`).
- `npx oxlint` → 0 errores funcionales (warnings de vars no usadas pre-existentes).
- `git diff --check` → limpio antes de commit.

## Infraestructura

- **M1:** S3 privado + CloudFront OAC + ResponseHeadersPolicy (CSP, HSTS, XFO, referrer, nosniff, XSS protection).
- **M2:** Lambda rol mínimo privilegio (solo 2 tablas DynamoDB); API Gateway HTTP + CORS limitado.
- **M3:** Cognito login (10k MAU free tier); SES sandbox (plantillas invitación; salida solicitud sep).
- **M5:** Rate limiting API GW 10 req/min/IP; WAF opcional si presupuesto; OWASP ZAP baseline.

## CI/CD (GitHub Actions, 2026-09-10 · matriz de entornos 2026-09-11)

**Workflows** (`.github/workflows/`):
- **CI** (push/PR a main): `npm ci` → vitest (suite completa) → oxlint → build prod → `npm audit --audit-level=high --omit=dev` → **gitleaks** (scan de secretos, historial completo con `fetch-depth: 0`). Sin secrets.
- **CD** (push a main → **stage**): build con `VITE_KRUMM_API_BASE` staging (modo real) → **OIDC** → deploy `krumm-stage-frontend-931932531447` + invalidación dist `E2OPPVGDO8R75S` (`scripts/deploy-frontend.sh`). **Main ya no muta krumm.cl** (KRU-95).
- **CD** (tag `v*` / `workflow_dispatch` → **prod**, gate humano): build sin API base (modo demo, decisión de producto) → OIDC → deploy `krumm-staging-frontend-931932531447` + invalidación dist `EDQ39PDNI931R` → **smoke de producción** con Playwright (`prod-verify-v5.mjs` + `check-dev-bomb-prod.mjs` contra CloudFront live).
- **PR Preview** (KRU-96): PR (rama del mismo repo) → build modo real → bucket efímero `krumm-dev-frontend-pr-<N>` (S3 website + policy pública solo `s3:GetObject`, ACLs bloqueadas) → URL `https://krumm-dev-frontend-pr-<N>.s3.us-east-1.amazonaws.com/index.html` en comentario del PR (se actualiza por push) → al cerrar el PR el bucket se borra completo. Público SOLO vía bucket policy (sin ACLs); contenido = build frontend sin secretos. PRs desde forks no pueden asumir el rol OIDC (limitación GitHub en repo público).

**Matriz de entornos** completa (dominio↔bucket↔dist↔API↔gate, DNS, cert ACM, pitfalls CFN): **`docs/ops/environments.md`**.

**Federación GitHub→AWS (sin keys estáticas):**
- Provider OIDC `token.actions.githubusercontent.com` (thumbprints desde JWKS; script idempotente `scripts/setup-gh-oidc.py`).
- **Client ID: `sts.amazonaws.com`** (el aud del JWT de GitHub; si el provider solo tenía el issuer, AWS rechaza: "web identity token could not be validated" — lección del run 34431522513).
- Rol `krumm-gh-actions-deploy`: trust OIDC `oidc:sub` ∈ {`ref:refs/heads/main`, `ref:refs/tags/v*`, `pull_request`} (repo público: los sub de PR solo firman ramas del mismo repo, nunca forks). **Policy v4** (2026-09-11): `s3:Get/Put/DeleteObject` + `s3:ListBucket` (buckets prod/stage/dev + `krumm-dev-frontend-pr-*`) + `cloudfront:CreateInvalidation`/`GetDistribution` (dists `EDQ39PDNI931R` + `E2OPPVGDO8R75S`) + config de buckets per-PR (`CreateBucket`, `PutBucketWebsite/Policy`, `PutPublicAccessBlock`, `DeleteBucket`…) para el preview. Mínimo privilegio por SID.
- Runner: las credenciales OIDC se escriben en `~/.aws/credentials` ([default]) — los runners 2026 no aplican las job env-var credentials con `--profile` explícito (run 34431969106).

**Secret scanning:**
- CI: gitleaks con ruleset default extendido (`.gitleaks.toml`, `[extend] useDefault = true` — sin eso el config custom **anula** las reglas default y el scan queda vacío, gap silencioso).
- Allowlist documentado (única entrada): key Lambda vieja leakada en el historial público (commit `f44a7e4`, archivo `gpu_manager.py`, eliminado del tree en `c722ce8`) — **pendiente de invalidación en el dashboard de Lambda** (ver §Parches).
- Local: pre-commit `scripts/pre-commit.sh` (patrones AWS/GitHub/Lambda/Slack/Google/keys privadas; excluye `.gitleaks.toml` y lockfiles). Instalado en `.git/hooks/`.

**Evidencia:** runs CI+CD verdes del 2026-09-10 (CI 34433388970 · CD 34433388943 — primer deploy 100% automático + smoke prod `failures: []`). Auditoría 2026-09-10: 0 archivos tracked con patrones de secretos; 0 `.env`/credentials tracked.

## Privacidad

- Flujo de datos completo (inventario, doble barrera forbidden-keys, payload, retención, exports): **`docs/security/privacy-data-flow.md`**.
- Regla de oro: los exports y el reporte solo agregados (`alias` hash, scores 0–100 descriptivos con `null` = señal ausente, caveats). Nada crudo (video/landmarks/rutas/eventos) existe ni viaja — por construcción y por validación server-side (422).
- Contracto científico: `AGENTS.md` §Contrato científico R-6 (`descriptive_only`, `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe`).

## Parches de Seguridad Recientes

- 2026-09-03: `ASSESSMENT_FORBIDDEN_KEYS` server-side validación activa en `POST /sessions` (validateSessionPayload).
- 2026-09-03: CSP actualizada en `infra/m1-frontend-stack.yaml` con `frame-ancestors 'none'` y `connect-src` restringido a storage.googleapis.com solo.
- 2026-09-03: Rate limiting 10 req/min/IP deployado en API Gateway (M1).
- 2026-09-08: Headers de seguridad verificados en prod (CSP marca v2 + HSTS/XFO/nosniff/referrer/XSS) — `krumm.cl` landing/candidato/empresa.
- 2026-09-10: **CI/CD con OIDC** (sin keys estáticas), gitleaks en CI + pre-commit local, auditoría de secretos del tree (0 hallazgos).
- ⚠️ **PENDIENTE (acción del usuario):** key Lambda API vieja `secret_hx100_…` (32 hex + suffix) quedó en el **historial público** del repo (commit `f44a7e4`, 2026-09-05; fuera del tree desde `c722ce8`, 2026-09-06). **Invalidar/rotar en el dashboard de Lambda** (no expuesto por API). Mientras tanto gitleaks la allowlista con documentación (`.gitleaks.toml`).