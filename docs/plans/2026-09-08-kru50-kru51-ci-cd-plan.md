# Plan KRU-50 + KRU-51 — Recruiter Dashboard v1 Real + Seguridad/Privacidad/CI-CD

**Fecha:** 2026-09-08 · **Repo:** `/home/sarlock/krumm/test-mpfl` (main `c068de8`)
**Lineal:** KRU-50 (Recruiter Dashboard v1 Real = B3 del plan 09-06) · KRU-51 (Seguridad, Privacidad y CI)
**Contexto:** repo **público** (Carloss97/test-mpfl) · sin CI hoy · backend staging live (`/sessions` devuelve constructs/caveats/completion + `interviewPrompts: []` reservado como scope B3) · GPU apagada (trabajo interactivo, sin workers)

## 0. Alcance (evidencia base)

| Ítem | Estado actual | Gap |
|---|---|---|
| CI | **0 workflows** en `.github/` | tests/lint/build/audit corren solo manual en Pi |
| CD | `scripts/deploy-frontend.sh` (SSO manual, ~11 h) | sin automatización; deploys dependen de token vivo |
| Secretos | key Lambda vieja leak en historia git (`secret_hx100…`, plan 09-06 §5.5) — **repo público** | sin scanning; key pendiente de invalidación |
| Headers | RHP M1-m3 en template (CSP+HSTS+XFO+nosniff+referrer) | falta evidencia prod verificada |
| Brief entrevista | backend `interviewPrompts: []` (comentario "scope B3") | generación + UI pendiente |
| Filtros HR | búsqueda + sort + depto/ubicación (solo demo) | fecha/estado en modo real pendiente |
| Export | none | Markdown/CSV de agregados (humanReviewOnly) |

## 1. Orden de ejecución

### P1 — CI (KRU-51): `.github/workflows/ci.yml`
- Trigger: push a main + pull_request. Runner ubuntu, **Node 24** (vite 8 `^20.19||>=22.12`; vitest 4 `>=24` ✓).
- Jobs: `npm ci` → `NODE_ENV=test npx vitest run --pool=threads` → `npx oxlint` (src) → `npm run build` → `npm audit --audit-level=high --omit=dev` → **gitleaks** (`gitleaks/gitleaks-action@v2`, `.gitleaks.toml` con allowlist documentado de la key leak histórica — ver P4).
- Evidencia: run verde en GitHub.

### P2 — OIDC GitHub→AWS (KRU-51) — **EJECUTADO 2026-09-08**
- Provider OIDC **ya existía** en la cuenta (`token.actions.githubusercontent.com`, creado en sesión previa) → reutilizado; thumbprints verificados contra el JWKS actual (RSA RS256 — GitHub rotó de EC a RSA; el script soporta ambos).
- Rol `krumm-gh-actions-deploy` CREADO: trust OIDC, `oidc:sub` **solo** `repo:Carloss97/test-mpfl:ref:refs/heads/main` + `aud: sts.amazonaws.com` (repo público: nunca PRs).
- Policy `krumm-gh-actions-deploy-policy` CREADA + attached: mínimos exactos de `deploy-frontend.sh` (revisión post-plantilla: `s3 sync --delete` necesita **ListBucket + DeleteObject** — omitidos en la versión inicial) + `cloudfront:CreateInvalidation`/`GetDistribution`.
- Nota: el rol SSO `krumm-staging-frontend-deploy` (2026-08-27) es de Identity Center (deploy manual) — no se toca.
- Evidencia: salida de `scripts/setup-gh-oidc.py` (idempotente, commiteado).

### P3 — CD (KRU-51): `.github/workflows/cd.yml`
- Solo push a main, `needs` implícito (el push dispara ci+cd; cd corre en paralelo pero el deploy es la puerta final).
- Job: node 24 → `npm ci` → `npm run build` → `aws-actions/configure-aws-credentials@v4` (OIDC, role ARN) → `BUCKET=… DISTRIBUTION_ID=… bash scripts/deploy-frontend.sh` → smoke prod: `npx playwright install chromium` + `node scripts/prod-verify-v5.mjs` + `node scripts/check-dev-bomb-prod.mjs` (ambos contra CloudFront live).
- Evidencia: deploy automático del push + smoke verde en el run.

### P4 — Seguridad (KRU-51)
- **gitleaks**: `.gitleaks.toml` (allowlist con regex de la key Lambda leak + comentario "invalidar en Lambda; ver SECURITY.md §Parches").
- **pre-commit local**: `scripts/pre-commit.sh` (grep patrones: `AKIA[0-9A-Z]{16}`, `gh[pousr]_`, `LAMBDA…`/`secret_hx`, BEGIN PRIVATE KEY) + instalador en `.git/hooks/` (Pi) + doc en SECURITY.md.
- **Auditoría**: `git ls-files | grep -iE "env|secret|credential|key"` (0 tracked) + `curl -sI https://krumm.cl/` (evidencia headers: CSP, HSTS, XFO, nosniff, referrer) → tabla en SECURITY.md.
- **Key Lambda leak**: confirmar cadena en historia (`git log -S`), marcar en SECURITY.md §Parches + **accionar al usuario** (invalidar en dashboard Lambda — no expuesto por API).

### P5 — KRU-50 (B3): Recruiter Dashboard v1 Real
- **P5.1 Brief de entrevista** (frontend, descriptivo — sin inference nueva, R-6): `src/v3/companyBrief.js` (nuevo, puro):
  - `buildInterviewBrief(candidate, language)` → prompts ES/EN derivados de: constructs con score (revisión descriptiva + demanda de tarea), constructs null (exploración de experiencia, "sin señal en batería"), caveats de calidad (verificar en entrevista), completion < total (contexto), prompt de apertura estándar + framing humanReviewOnly/noAutomatedDecision.
  - `buildBriefMarkdown(process, candidates, language, meta)` → .md (header proceso, sección por candidato: alias, estado, fecha, overall descriptivo, constructs con caveats, prompts brief; footer: humanReviewOnly, featureDefinitionsVersion, "no es decisión automática").
  - `buildCsv(process, candidates)` → rows `process,role,candidate_alias,status,completed_at,overall,construct_id,construct_score,construct_availability` (señal ausente = `no_signal`, nunca 0).
  - Tests: `companyBrief.test.js` (RED→GREEN): brief con/without score, caveats, completion parcial, MD contiene footer privacy, CSV no escribe 0 para null, acentos en CSV (UTF-8 BOM), alias ausente.
- **P5.2 Filtros fecha/estado** (modo real): `companyData.js`:
  - `deriveProcessStatus(sessions)` → `in_progress` (alguna sesión in_progress) | `completed` | `none`.
  - `filterRealProcesses(processes, { dateRange: '7d'|'30d'|'all', status })` → filtro por `completedAt` (range) y estado derivado.
  - UI `CompanyProcessesPage`: selects "Periodo" (7/30/todos) + "Estado" (todos/en curso/completados) **solo en modo real** (como department/location hoy en demo); test componente (V2CompanyReal pattern).
- **P5.3 Brief en detalle + export**: `CompanyProcessDetailPage` (modo real):
  - Sección "Brief de entrevista" por candidato (collapsible, a11y: `aria-expanded`, foco) con prompts + caveat "descriptivo_only".
  - Botones "Exportar .md" / "Exportar .csv" (client-side `URL.createObjectURL` download; nombre `krumm-brief-<processId>-<date>.md`).
  - Copy ES/EN (`v3Copy.js`) · tokens `--k-*` (sin hex) · estados :hover/:focus-visible/:disabled · reduced-motion.
  - Tests componente: brief renderiza prompts (real fixture), export dispara download (mock), modo demo NO muestra filtros/brief (sin inventar datos).
- **Gates:** suite full · oxlint · build · npm audit · `git diff --check` · smoke Playwright desktop 1280×720 + móvil 390×844 en `vite preview` (modo real con fixture local de `/sessions` mock).

### P6 — Privacidad (KRU-51): doc + verificación
- `docs/security/privacy-data-flow.md` (nuevo): inventario — qué recolecta el cliente (telemetría agregada allowlist), qué viaja al backend (payload §19 aggregate-only + FORBIDDEN_KEYS 422), qué **nunca** viaja (biometría cruda, raw events — threat model T8), almacenamiento (DynamoDB 30d TTL + PITR), uso (humanReviewOnly, descriptive_only), exports (agregados solo, sin PII — alias hash).
- En SECURITY.md: sección "Privacidad" link + regla "los exports B3 no incluyen datos crudos".
- Evidencia: tests de privacy ya en suite (backend `privacy.validatePayload` + frontend FORBIDDEN_KEYS) → CI los cubre.

### P7 — Sincronización de cierre
- SECURITY.md: §CI/CD (OIDC, sin keys estáticas), §Secret scanning, §Parches 2026-09-08, evidencia de headers.
- Plan de cierre (este doc): evidencia de runs + commits + Linear.
- **Linear:** KRU-50 → Done (evidencia B3) · KRU-51 → Done (CI/CD+seguridad+privacidad) · KRU-88 → Done (duplicado stale de Tangram → KRU-60, comment con evidencia de deploy).
- **AGENTS.md:** línea de estado (requiere approval del usuario).
- **Deploy:** el push de P5 dispara CD automático → krumm.cl con brief+filtros+export (primer deploy 100% automático del pipeline).

## 2. Fuera de scope (se documenta, no se toca)
- Backend/Lambda: sin cambios (el brief es derivación descriptiva del frontend sobre datos ya devueltos; evita re-deploy SAM).
- Cognito (M3), WAF, OWASP ZAP: ya documentados en SECURITY.md como fases futuras.
- Rotación de la key Lambda: acción del usuario en dashboard (no expuesta por API).

## 3. Riesgos
| Riesgo | Mitigación |
|---|---|
| gitleaks falla por la key leak histórica | allowlist documentado + flag de rotación (P4) |
| OIDC thumbprint stale | JWKS de GitHub estable; si rota, recrear provider (doc en SECURITY.md) |
| CD deploya sin CI verde | el push dispara ambos; cd es idempotente (mismo contenido → mismo bundle hash) y el smoke prod es la puerta final |
| Brief se lee como inferencia | copy explícito `descriptive_only` + footer privacy en MD/CSV + test que asercia |
