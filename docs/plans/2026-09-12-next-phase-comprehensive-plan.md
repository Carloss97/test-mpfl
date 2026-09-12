# Plan — Próxima Fase de Desarrollo: Funcionalidad Completa + Juegos Pre-Lanzamiento

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Each phase is sequential; no parallel workstreams without explicit approval.

**Goal:** Completar la funcionalidad pendiente de la plataforma (invitaciones, login real, bolsa de empleo, dashboard recruiter real) y llevar cada juego existente a versión pre-lanzamiento con telemetría, sincronización, inferencia, assets, responsividad y fluidez validadas.

**Architecture:** Frontend Vite/React (marca v2, tokens `--k-*`, i18n ES/EN) + Backend AWS serverless (API Gateway HTTP + Lambda Node 20 + DynamoDB + SES + Cognito). Modo demo (sin `VITE_KRUMM_API_BASE`) y modo real (con API staging/prod). Baterías: `stable_dg` (5 juegos, ~14–16 min, default pública) y `original` (7 juegos, ~26–32 min, controlada `?battery=original`).

**Tech Stack:** React 18, Vite 5, Vitest, Oxlint, Playwright, AWS SAM/CloudFormation, DynamoDB on-demand, SES, Cognito (10k MAU free), CloudFront OAC, GitHub Actions CI/CD (OIDC).

---

## Estado Actual (2026-09-12)

| Área | Estado |
|------|--------|
| **Fase v3 (V0–V5)** | ✅ Completada — portal, candidato, empresa, procesos, detalle+reporte, nueva-solicitud, cutover prod |
| **EXP-7 BOMB (B1–B6)** | ✅ Completada — 9º constructo `proceduralWorkingMemory`, FeatureVector 2.2.0, 6 juegos en `original` |
| **EXP-8 Sala de Control (C1–C6)** | ✅ Completada — 10º constructo `appliedCommunication`, FeatureVector 2.3.0, 7 juegos en `original` |
| **C7 (Capa biométrica)** | 📋 Bloqueada — epic separado POST-PILOTAJE (padres C6 + T.3b) |
| **T.3b (Sensibilidades biométricas)** | 🟡 `ready` en kanban (`t_c1892485`) — requiere cámara real |
| **Landing v2** | ✅ Desplegada en prod (krumm.cl) y stage (stage.krumm.cl) |
| **Entornos (KRU-94..98)** | ✅ Stage, CD bifurcado, PR preview, backend `/prod`, runbook |
| **CI/CD (KRU-51)** | ✅ Pipeline verde, OIDC, smoke Playwright prod |
| **Recruiter Dashboard v1 Real (KRU-50)** | ✅ Frontend B3 done; backend `/staging/sessions` LIVE (11 sesiones reales) |
| **Pendiente solo-usuario** | Invalidar key Lambda leakada en history git (dashboard AWS) |

---

## FASE A — Completar Funcionalidad Pendiente de Plataforma

### A.1 Invitaciones + Consentimiento (M3 del plan de hitos)

**Estado:** `[ ] Por implementar` | **Prioridad:** Alta | **Bloquea:** Flujo candidato real en prod

**Archivos esperados:**
- `backend/src/handlers/invitations.mjs` — ✅ YA EXISTE (handlers POST/GET/REVOKE)
- `backend/src/db/invitationsRepository.mjs` — ✅ YA EXISTE (DynamoDB)
- `backend/src/db/sessionsRepository.mjs` — ✅ YA EXISTE (ligar invitación a sesión)
- `infra/m3-invitations-stack.yaml` — SAM stack nuevo (tabla invitations + SES + Lambda)
- `src/postulation-demo/postulationDemoInvite.js` — ✅ YA EXISTE (extractInviteToken, buildInvitationUrl)
- `src/v3/CandidateAccessPage.jsx` — ✅ YA EXISTE (formulario link/token → `/postulaciones?invite=…`)
- `src/postulation-demo/PostulationConsentSetup.jsx` — ✅ YA EXISTE (pantalla consentimiento)

**Faltante crítico:** Deploy SAM + SES salida sandbox + Cognito admin + tests E2E.

**Tareas:**

#### Task A.1.1: Crear SAM stack para invitaciones + SES
**Archivos:** `infra/m3-invitations-stack.yaml` (crear)
- Tabla `krumm-invitations` (PK `invitationId`, TTL `expiresAt`, GSI `email-index` opcional)
- Lambda `invitationsHandler` (Node 20, rol mínimo: tabla invitations + SES `SendEmail`)
- HTTP API `/invitations` (POST collection, GET `{token}`, POST `{token}/revoke`)
- SES: Identity verificada (dominio krumm.cl), template `invitation_email` (ES/EN)
- CORS headers heredados de M1

```bash
# Verificar sintaxis
cfn-lint infra/m3-invitations-stack.yaml
# Deploy (requiere AWS SSO activo)
sam deploy --template-file infra/m3-invitations-stack.yaml --stack-name krumm-m3-invitations-staging --parameter-overrides Environment=staging --capabilities CAPABILITY_IAM
```

#### Task A.1.2: Solicitar salida de sandbox SES
**Acción manual:** AWS Console → SES → Account dashboard → Request production access
- Use case: "Transactional emails for candidate invitations in B2B assessment platform"
- Expected: 24–48h para aprobación

#### Task A.1.3: Configurar Cognito User Pool para admin/recruiter
**Archivos:** Añadir a `infra/m3-invitations-stack.yaml` o stack separado `m3-auth-stack.yaml`
- User Pool: `krumm-staging-recruiters` (email como username, MFA opcional, self-sign-up OFF)
- App Client: `krumm-recruiter-web` (secret generado, auth flows `USER_PASSWORD_AUTH` + `REFRESH_TOKEN_AUTH`)
- Groups: `admins`, `recruiters` (para autorización futura en `/invitations` POST/REVOKE)
- Hosted UI: deshabilitado (login custom en `/empresa/acceso`)

#### Task A.1.4: Integrar authorizer Cognito en API Gateway
- Authorizer JWT en `/invitations` POST y `/{token}/revoke` (solo `admins` group)
- `GET /invitations/{token}` SIN authorizer (público, valida token candidato)
- Actualizar `invitations.mjs` `actorFrom(event)` para leer `cognito:groups`

#### Task A.1.5: Tests RED→GREEN backend invitaciones
**Archivos:** `backend/test/invitations.test.mjs` (crear)
- POST crea invitación → 201 + token + maskedEmail
- POST email inválido → 422
- POST sin auth Cognito → 401
- GET token válido → 200 + status `valid`
- GET token expirado/usado/revocado → 410 + status correcto
- POST revoke con auth admin → 200 + status `revoked`
- POST revoke sin auth → 401

```bash
cd backend && NODE_ENV=test npx vitest run invitations.test.mjs --pool=threads --reporter=default
```

#### Task A.1.6: Smoke E2E invitaciones staging
- Crear invitación via API (admin token Cognito) → email recibido en SES
- Candidato abre link → `/candidato/acceso` → pega token → navega a `/postulaciones?invite=…`
- Guard valida token → sesión creada en backend → reporte visible en `/empresa/proceso/:id/candidatos/:sessionId`

---

### A.2 Login Real Empresa + Cognito (Complementa M3/M4)

**Estado:** `[ ] Por implementar` | **Prioridad:** Alta | **Bloquea:** Dashboard recruiter modo real en prod

**Archivos esperados:**
- `src/v3/CompanyAccessPage.jsx` — ✅ YA EXISTE (demo simulada "Alex Morgan · Andes Industries")
- `src/v3/CompanyShell.jsx` — ✅ YA EXISTE (sidebar, user chip, banner demo)
- `src/v3/useCompanyData.js` — ✅ YA EXISTE (hook demo | checking | real vía `GET /sessions`)

**Faltante:** Auth real Cognito en `/empresa/acceso` → JWT → `VITE_KRUMM_API_BASE` con autorización → fetch `/sessions` autenticado.

**Tareas:**

#### Task A.2.1: Implementar login Cognito en CompanyAccessPage
**Archivos:** `src/v3/CompanyAccessPage.jsx` (modificar)
- Formulario email/password → `Auth.signIn` (AWS Amplify v6 o `@aws-sdk/client-cognito-identity-provider`)
- Manejo desafíos: `NEW_PASSWORD_REQUIRED`, `MFA_SETUP`, `SOFTWARE_TOKEN_MFA`
- On success: guardar `idToken`/`accessToken`/`refreshToken` en `sessionStorage` (no localStorage por seguridad)
- Redirigir a `/empresa` (CompanyShell detecta tokens y usa modo real)

#### Task A.2.2: Interceptor API con Authorization Bearer
**Archivos:** `src/v3/useCompanyData.js` (modificar) o nuevo `src/v3/apiClient.js`
- `fetchWithAuth(url, options)`: inyecta `Authorization: Bearer <accessToken>`
- Auto-refresh con `refreshToken` si 401 (llamar `Auth.currentSession()` → `refreshSession`)
- Fallback a modo demo si no hay tokens o refresh falla

#### Task A.2.3: Backend authorizer para `/staging/sessions` y `/prod/sessions`
- API Gateway authorizer JWT (Cognito User Pool `krumm-staging-recruiters`)
- Claims requeridos: `cognito:groups` contiene `recruiters` o `admins`
- `requestContext.authorizer.jwt.claims.sub` = `companyId` (para multi-tenancy futura)

#### Task A.2.4: Tests + Smoke login real
- Login credenciales válidas → access token → `/empresa` muestra KPIs reales (11 sesiones staging)
- Login inválido → error UI + no redirige
- Token expirado → auto-refresh → request reintentado transparente
- Logout → limpia sessionStorage → redirige a `/empresa/acceso`

---

### A.3 Job Board (Bolsa de Empleo) — `/empleos`

**Estado:** `[ ] Por implementar` | **Prioridad:** Media | **Nota:** Referencia v2 declara "next iteration" — implementar honesto placeholder + arquitectura para datos reales futura

**Archivos esperados:**
- `src/v3/JobsPage.jsx` (crear)
- `src/v3/JobDetailPage.jsx` (crear)
- `src/v3/jobsData.js` (crear — datos demo + contrato API futura)
- Rutas en `src/v3/v3Routes.js` (añadir `/empleos` y `/empleos/:id`)

**Tareas:**

#### Task A.3.1: JobsPage — lista honesta "próxima iteración"
**Archivos:** `src/v3/JobsPage.jsx` (crear)
- Hero: "Próximamente: Bolsa de empleo KRUMM"
- Copy: "Estamos construyendo la bolsa de empleo para que descubras oportunidades basadas en tu perfil de talento. Vuelve pronto."
- CTA: "Volver a inicio" → `/candidato`
- ES/EN via `t(es, en)`
- Responsive: 1280×720 + 390×844 sin overflow

#### Task A.3.2: JobDetailPage — placeholder individual
**Archivos:** `src/v3/JobDetailPage.jsx` (crear)
- Params: `:id` (slug)
- Muestra: "Esta vacante aún no está disponible" + datos demo mínimos (título, empresa, ubicación)
- Breadcrumbs: `/empleos` → título vacante

#### Task A.3.3: Contrato de datos + API futura
**Archivos:** `src/v3/jobsData.js` (crear)
```js
export const JOBS_DEMO = [
  { id: 'job-1', slug: 'ingeniero-datos', title: 'Ingeniero de Datos', company: 'TechCorp', location: 'Santiago/Remoto', type: 'full-time', salaryBand: 'CLP 2.500.000–3.500.000', postedAt: '2026-09-01', description: '...', requirements: [...], tags: ['python', 'sql', 'aws'] },
  // ... 2-3 más
];
export async function fetchJobs({ search, location, type, sort } = {}) { /* futuro: GET /jobs */ return JOBS_DEMO; }
export async function fetchJob(slug) { /* futuro: GET /jobs/:slug */ return JOBS_DEMO.find(j => j.slug === slug); }
```

#### Task A.3.4: Tests + Smoke
- Render JobsPage ES/EN desktop/móvil
- Navegar a JobDetail → breadcrumbs funcionan
- Sin errores consola, 0 overflow

---

### A.4 Dashboard Recruiter Modo Real Completo (KRU-50 follow-up)

**Estado:** `[~] Frontend B3 done` | **Prioridad:** Alta | **Bloquea:** Modo real en krumm.cl

**Pendiente del follow-up §2 plan 09-08:** Inyectar `VITE_KRUMM_API_BASE=…/prod` en build prod para activar modo real en krumm.cl (decisión de producto; CSP ya permite el origen; fallback demo cubre 404).

**Tareas:**

#### Task A.4.1: Configurar build prod con API base real
**Archivos:** `.github/workflows/cd.yml` (modificar job `deploy-prod`)
- Añadir `VITE_KRUMM_API_BASE: https://<api-prod-domain>/prod` en env del step build
- Verificar que `infra/m1-frontend-stack.yaml` CSP `connect-src` incluye el dominio API prod (ya hecho en RHP m3)

#### Task A.4.2: Tag y deploy prod
```bash
git tag v1.1.0
git push origin v1.1.0
# CD tag → build modo real → deploy → smoke Playwright post-deploy
```

#### Task A.4.3: Verificación prod modo real
- `https://krumm.cl/empresa/acceso` → login Cognito real → `/empresa` muestra KPIs de 11 sesiones reales
- `/empresa/procesos` filtros Periodo (7d/30d) + Estado funcionan
- Export CSV + MD por candidato descargables y válidos
- Smoke Playwright 0 fallos, 0 console errors

---

## FASE B — Juegos: Llevar a Versión Pre-Lanzamiento

**Principio:** Cada juego pasa por **batería original** (`?battery=original`) primero; `stable_dg` intacta como fallback. Cambios visuales incluyen test layout responsivo (390×844 sin overflow) + smoke browser. Agregados allowlist inmutables; si métrica cambia → versionar feature vector.

### B.1 Auditoría Base de Calidad por Juego (Pre-requisito)

**Estado:** `[ ] Por iniciar` | **Prioridad:** Crítica | **Aplica a:** 7 juegos (5 stable_dg + BOMB + Control Room)

**Criterios pre-lanzamiento por juego:**
| Dimensión | Criterio | Verificación |
|-----------|----------|--------------|
| **Telemetría** | Eventos `game_event_v1` completos + métricas derivadas + integrity flags | Diff fixture payload vs spec |
| **Sincronización** | Reloj único `performance.now()`; ventanas game↔facial alineadas; sin deriva rAF | `localSignalSync.test.js` paths P1–P7 |
| **Gameplay** | Dificultad/progresión validada; pacing objetivo; sin niveles irresolubles | Authoring tests + observación real |
| **Inferencia** | Constructos `descriptive_only`, score null si no hay señal, caveats explícitos | Reporte muestra constructo + caveat |
| **Assets** | Mundo visual coherente (paleta, tipografía, iconografía); chrome shared tokens `--k-*` | Audit visual 1280×720 + 390×844 |
| **Responsividad** | Breakpoints ≥900 / <900 / <560; targets ≥44px; sin overflow horizontal | Playwright 1280×720 + 390×844 |
| **Fluidez** | Transiciones suaves (CSS `prefers-reduced-motion`); SFX toggle; sin jank >100ms | Lighthouse/Performance tab + smoke |
| **Accesibilidad** | `:hover/:focus-visible/:disabled`; color+icono+texto; reduced-motion; labels | axe-core + test manual |

**Tareas:**

#### Task B.1.1: Crear checklist maestro por juego
**Archivos:** `docs/qa/prelaunch-checklist-template.md` (crear)
- Tabla con 8 dimensiones × 7 juegos → 56 celdas de verificación
- Cada celda: ✅/❌/⚠️ + evidencia (test path, screenshot path, commit)

#### Task B.1.2: Ejecutar auditoría por juego (secuencial)
**Orden:** SimpleRT → PrecisionTargeting → GoNoGo → ColorInterference → VisualSearch → BalloonRisk → LaserPuzzle → PassengerRoute → Tangram → TeamCoordination → BOMB → ControlRoom

Para cada juego:
1. Correr tests focalizados (`NODE_ENV=test npx vitest run <game>.test.jsx`)
2. Smoke browser vivo (desktop + móvil) — capturar consola, network, overflow
3. Verificar fixture payload vs spec (telemetría + métricas + integrity)
4. Verificar sincronización (revisar `gameCorrelation.js` paths para ese juego)
5. Revisar constructos en reporte (score null + caveat si provisional)
6. Audit visual mundo (paleta, tipografía, estados interactivos)
7. Documentar hallazgos en checklist

---

### B.2 SimpleRT (Calentamiento de reacción) — Pre-lanzamiento

**Estado:** `[ ] Por auditar` | **Prioridad:** Alta (primer juego de batería)

**Archivos clave:** `src/tasks/SimpleRTTask.jsx`, `src/tasks/simpleRTTelemetry.js` (verificar), `src/postulation-demo/postulationDemoConfig.js` (bloque warmup)

**Tareas:**

#### Task B.2.1: Verificar telemetría completa
- Eventos: `stimulus_shown`, `response`, `game_end` con campos requeridos
- Métricas: `meanRT`, `sdRT`, `fastRTCount`, `slowRTCount`, `omissionCount`, `commissionCount`
- Integrity: `blurCount`, `fpsMean`, `driftMs`, `viewportChanges`

#### Task B.2.2: Sincronización
- `gameCorrelation.js` path para SimpleRT: timestamp `stimulus_shown` → `response` Δt correcto
- Sin deriva entre rAF loop y event timestamps

#### Task B.2.3: Gameplay + Pacing
- 4 trials, duración ~30s, warmup visible=false
- Instrucciones claras, micro-intro animada (G.2 done)

#### Task B.2.4: Assets + Responsividad + Fluidez
- Canvas 500px min fix (KRU-83 done) → verificar 390×844
- Estados hover/focus/disabled en botón inicio
- SFX toggle funcional

#### Task B.2.5: Inferencia en reporte
- Constructo `processingSpeed` → `meanRT` invertido + z-score provisional
- Caveat: "Sin baremos poblacionales; solo comparativo interno"

---

### B.3 PrecisionTargeting (Ruta de precisión adaptativa) — Pre-lanzamiento

**Estado:** `[ ] Por auditar` | **Archivos:** `src/tasks/PrecisionTargetingTask.jsx`, `precisionTargetingTelemetry.js`

**Tareas:** (mismo patrón B.2.1–B.2.5)
- Telemetría: `hitAccuracy`, `pathDeviation`, `correctionCount`, `timeToTarget`, `endpointError`
- Sincronización: pointer samples @ 60Hz → kinematics → métricas derivadas
- Gameplay: 4 trials, dificultad adaptativa, ~1 min
- Assets: mundo "Órbita" (cian/ámbar/neon sobre oscuro) — tokens chrome shared
- Inferencia: `visuomotorPrecision` composite

---

### B.4 GoNoGo (Control inhibitorio) — Pre-lanzamiento

**Estado:** `[ ] Por auditar` | **Archivos:** `src/tasks/GoNoGoTask.jsx`, `goNoGoTelemetry.js`

**Tareas:**
- Telemetría: `goAccuracy`, `nogoAccuracy`, `falseAlarmRate`, `omissionRate`, `meanRTgo`, `RTvariability`
- Métricas derivadas: `dPrime`, `criterionC` (SDT básico)
- Sincronización: stimulus onset → response window estricto
- Gameplay: 8 trials (50% GO), ~1 min
- Inferencia: `inhibitoryControl` = `dPrime` provisional

---

### B.5 ColorInterference (Interferencia cognitiva / Stroop) — Pre-lanzamiento

**Estado:** `[ ] Por auditar` | **Archivos:** `src/tasks/ColorInterferenceTask.jsx`, `colorInterferenceTelemetry.js`

**Tareas:**
- Telemetría: `congruentRT`, `incongruentRT`, `interferenceEffect`, `accuracyCongruent`, `accuracyIncongruent`, `errorTypes`
- Sincronización: color-word onset → response; congruency factor
- Gameplay: 8 trials, ~1 min
- Inferencia: `interferenceControl` = `interferenceEffect` invertido

---

### B.6 VisualSearch (Búsqueda visual) — Pre-lanzamiento

**Estado:** `[ ] Por auditar` | **Archivos:** `src/tasks/VisualSearchTask.jsx`, `visualSearchTelemetry.js`

**Tareas:**
- Telemetría: `targetFound`, `timeToFind`, `fixationCount`, `saccadeAmplitude`, `searchEfficiency`
- Sincronización: gaze/pointer + stimulus grid
- Gameplay: 4 trials, ~1 min
- Inferencia: `visualSearchEfficiency` composite

---

### B.7 BalloonRisk (Globo / BART) — Pre-lanzamiento

**Estado:** `[ ] Por auditar` | **Archivos:** `src/tasks/original-games/BalloonRiskPostulationTask.jsx`, `balloonRiskTelemetry.js`, `balloonRiskFeedback.js`

**Tareas:**
- Telemetría: `pumpsPerBalloon`, `popCount`, `totalEarnings`, `riskEfficiency`, `postPopAdjustment`, `balloonByBalloon[]`
- Sincronización: pump timestamp → balloon state → pop/collect decision
- Gameplay: 8–12 balloons, ~2–3 min
- Assets: mundo "Cielo" (arena celeste, botones azul/teal)
- Inferencia: `riskIntelligence` = `riskEfficiency` + `postPopAdjustment`

---

### B.8 LaserPuzzle (Láser / Órbita) — Pre-lanzamiento

**Estado:** `[ ] Por auditar` | **Archivos:** `src/tasks/original-games/LaserPuzzlePostulationTask.jsx`, `laserPuzzleTelemetry.js`, `laserPuzzleFeedback.js`

**Tareas:**
- Telemetría: `levelCount`, `solvedLevels`, `moveCount`, `reconfigurationCount`, `hintCount`, `timePerLevel`
- Sincronización: move timestamps → path reconstruction → métricas
- Gameplay: 3 niveles + intersticios narrativos (G.3 done), ~2–3 min
- Assets: mundo "Órbita" (consola espacial oscura, cian/ámbar/neon)
- Inferencia: `spatialPlanning` composite

---

### B.9 PassengerRoute (Rutas / Urbano) — Pre-lanzamiento

**Estado:** `[ ] Por auditar` | **Archivos:** `src/tasks/original-games/PassengerRouteOptimizationTask.jsx`, `passengerRouteTelemetry.js`, `passengerRouteFeedback.js`

**Tareas:**
- Telemetría: `actualCost`, `minimumCost`, `replanCount`, `constraintViolationCount`, `satisfactionScore`, `timeMs`
- Sincronización: replan events → route optimization → delivery confirmation
- Gameplay: 3 circuitos, ~2–3 min
- Assets: mundo "Urbano" (accent cian, board profundidad)
- Inferencia: `operationalPlanning` composite

---

### B.10 Tangram (Faro) — Pre-lanzamiento

**Estado:** `[ ] Por auditar` | **Archivos:** `src/tasks/original-games/TangramPostulationTask.jsx`, `tangramTelemetry.js`, `tangramFeedback.js`, `tangramStages.js`

**Nota:** P0 fix completado (KRU-81: niveles irresolubles + skip L1 + hang timeout). Verificar fix en auditoría.

**Tareas:**
- Telemetría: `piecesPlaced`, `rotationCount`, `flipCount`, `timePerPiece`, `completionRate`, `spawnIssues` (obs. F5 pendiente)
- Sincronización: piece manipulate → placement validation → stage progress
- Gameplay: 4 niveles, ~2–3 min
- Assets: mundo "Faro" (diálogos, opciones, meter 320ms)
- Inferencia: `spatialReasoning` + `adaptability` (insufficient)

---

### B.11 TeamCoordination (Coordinación equipo) — Pre-lanzamiento

**Estado:** `[ ] Por auditar` | **Archivos:** `src/tasks/original-games/TeamCoordinationPostulationTask.jsx`, `teamCoordinationTelemetry.js`, `teamCoordinationFeedback.js`

**Tareas:**
- Telemetría: `teamComposite`, `alignmentScore`, `communicationEvents`, `roleAdherence`, `conflictResolution`
- Sincronización: multi-agent events → correlation → team metrics
- Gameplay: ~3–4 min
- Assets: mundo propio (RPG stage)
- Inferencia: `teamwork` = `teamComposite` provisional; `leadership` = `not_measured`

---

### B.12 BOMB (Desactivación de Secuencias) — Validación Pre-lanzamiento

**Estado:** `[x] B1–B6 completados` | **Prioridad:** Validar que todo está pre-lanzamiento | **Nota:** Revisar checklist B.1 completo

**Tareas:**

#### Task B.12.1: Verificar FeatureVector 2.2.0 + constructo 9º
- `originalGameFeatureVector.js` incluye 12 features `bomb.*` (retention_accuracy_rate, serial_position_accuracy, first_action_latency_ms, inter_step_latency_median_ms, interference_error_count, switch_cost_ms, hold_duration_error_ms, memory_decay_slope, timeout_rate, error_recovery_latency_ms, levelSuccessRate, modelBAdaptation)
- `proceduralWorkingMemory` en reporte: score null, caveats, nextStep fases A–G

#### Task B.12.2: Smoke batería 6 juegos (stable_dg + BOMB)
- `?fixture=1&battery=original` → reporte completo 6 juegos sin errores
- Práctica G.2 completable en BOMB
- Blueprints `bomb_defusal` controlled_active

#### Task B.12.3: Audit visual mundo BOMB
- Paleta acero/ámbar/rojo/LED, MODEL A/B indicator (color+icono+texto)
- HUD ASCII, SFX 6–8, a11y §14
- 1280×720 + 390×844 (aviso <1024)

---

### B.13 Control Room (Sala de Control) — Validación Pre-lanzamiento

**Estado:** `[x] C1–C6 completados` | **Prioridad:** Validar que todo está pre-lanzamiento

**Tareas:**

#### Task B.13.1: Verificar FeatureVector 2.3.0 + constructo 10º
- 7 features `comm.*` aditivas: `critical_information_coverage`, `relevance_ratio`, `clarification_precision`, `premature_commitment_rate`, `verification_rate`, `repair_success_rate`, `audience_adaptation_fit` (total 60 keys + observedMask)
- `appliedCommunication` en reporte: 7 sub-dimensiones, score null, sin compuesto

#### Task B.13.2: Smoke batería 7 juegos completa
- `?fixture=1&battery=original` → 7 juegos, reporte 10 constructos
- Práctica (tutorial + 2 escenarios sin score) completable
- Blueprint `control_room` controlled_active

#### Task B.13.3: Audit visual mundo Control Room
- 3 tiers layout, compositor bloques, NPC avatares, consequence strip
- 320px sin scroll horizontal, targets ≥44px

---

### B.14 Consolidación Transversal: Fixtures, Telemetría, Sincronización

**Estado:** `[ ] Por hacer` | **Prioridad:** Crítica (base para todos los juegos)

**Tareas:**

#### Task B.14.1: Unificar fixtures de sesión genuinas
- Cada juego `original` tiene fixture con payload REAL del motor headless (patrón BOMB B5 / ControlRoom C5)
- `postulationDemoFixture.js` genera sesiones reconstruibles desde raw events
- Verificar: `NODE_ENV=test npx vitest run postulationDemoFixture.test.js`

#### Task B.14.2: Validar sincronización end-to-end (T.2 done → verificar en cada juego)
- `docs/research/local-signal-sync-audit.md` paths P1–P7 aplicados a cada juego
- `src/telemetry/localSignalSync.test.js` 6 tests deterministas GREEN
- Reloj inyectado en tests de telemetría por juego

#### Task B.14.3: Privacy validation suite (server + client)
- `backend/src/privacy/validatePayload.mjs` escanea FORBIDDEN_KEYS recursivamente
- Client-side `privacyValidation.ok === true` antes de POST `/sessions`
- Tests: raw fields rechazados 422, fixture válido aceptado 201

---

## FASE C — Integración, Hardening y Preparación Piloto

### C.1 E2E Real Completo (M6 beta)

**Estado:** `[ ] Por implementar` | **Prioridad:** Alta | **Requiere:** Fases A + B completas

**Tareas:**

#### Task C.1.1: Runbook beta cerrado
**Archivos:** `docs/ops/beta-runbook.md` (crear)
- Invitación manual (hasta SES production access) → 2–3 usuarios internos
- Flujo: email → link → consentimiento → cámara (opcional) → 7 juegos → backend → dashboard recruiter → export
- Checklist: 0 consola errors, 0 overflow, reporte 10 constructos, export válido, privacyValidation ok

#### Task C.1.2: Smoke matriz final
| Battery | Fixture | Device | Browser | Esperado |
|---------|---------|--------|---------|----------|
| stable_dg | sí | desktop | Chrome | 5 juegos, reporte 8 constructos |
| stable_dg | sí | móvil | Chrome | 5 juegos, sin overflow |
| stable_dg | no | desktop | Firefox | 5 juegos, cámara opcional |
| original | sí | desktop | Chrome | 7 juegos, reporte 10 constructos |
| original | sí | móvil | Chrome | 7 juegos, aviso <1024 BOMB/ControlRoom |
| original | no | desktop | Safari móvil | 7 juegos, cámara opcional |

#### Task C.1.3: Verificar ausencia de claims HR no soportados
- Barrido texto: "No medido" solo donde corresponde, "Solo descriptivo" en constructos provisionales
- Sin ranking, sin recomendación, missing = null/Pendiente
- `humanReviewOnly`, `noAutomatedDecision` visibles en exports

---

### C.2 Observabilidad CloudWatch (P1)

**Estado:** `[ ] Por implementar` | **Prioridad:** Media

**Tareas:**

#### Task C.2.1: Dashboards privacy-safe
- Sesiones iniciadas/completadas por battery (stable_dg/original)
- Duración p50/p95 por juego y total
- `privacy_validation_failures` counter
- Calidad señal baja (aggregated, sin PII)

#### Task C.2.2: Alarmas
- Cualquier `privacy_validation_failure` → alerta Discord hermes-alerts
- Lambda errors >5%/5min → alerta
- Throttling API Gateway → alerta

#### Task C.2.3: Logs estructurados JSON
- Lambda logs: `sessionId`, `battery`, `eventType`, `durationMs`, `privacyOk` (no PII)
- CloudWatch Logs Insights queries documentadas en runbook

---

### C.3 Documentación Final y Handoff

**Estado:** `[ ] Por implementar` | **Prioridad:** Media

**Tareas:**

#### Task C.3.1: AGENTS.md actualizado (sync obligatorio en cada cierre)
- Estado actualizado: Fases A, B, C completadas
- Kanban + Linear sincronizados
- Próximos pasos claros (piloto B2B, R-7 protocolo)

#### Task C.3.2: Docs de módulos juegos (patrón J2 v2)
- `docs/design/modulos/` — un .md por juego (simple_rt, precision_targeting, go_nogo, color_interference, visual_search, balloon_risk, laser_puzzle, passenger_route, tangram, team_coordination, bomb_defusal, control_room)
- Template: `docs/design/modulos/plantilla-modulo-original-game.md` v2

#### Task C.3.3: Runbooks deploy/rollback/incident
- `docs/ops/deploy-runbook.md`
- `docs/ops/rollback-runbook.md`
- `docs/ops/incident-response.md`
- `docs/ops/data-deletion-request.md` (<24h)

---

## FASE D — Post-Lanzamiento (Backlog Priorizado)

| Item | Descripción | Dependencia |
|------|-------------|-------------|
| **D.1** | Job Board con datos reales + API `/jobs` | Backend procesos + auth empresa |
| **D.2** | API de procesos (CRUD) + persistencia DynamoDB | Fuera de fase v3 (decidido) |
| **D.3** | C7 Capa biométrica modo investigación | T.3b done + coorte consentida + decisión usuario |
| **D.4** | T.3b Ajuste sensibilidades MoveNet/FaceMesh | Cámara real / script `/dev/*` gated |
| **D.5** | Validación psicométrica R-7 (N=200, comité ética, OSF) | Externo, sep 2026–feb 2027 |
| **D.6** | Batería `original_extended` (si se decide no alargar `original`) | Decisión C6 |
| **D.7** | Multi-tenancy real (companyId en sesiones, aislamiento datos) | Auth Cognito groups + backend |
| **D.8** | Internacionalización completa (más idiomas, RTL) | i18n actual ES/EN base |

---

## Dependencias y Orden de Ejecución

```
FASE A (Plataforma)
├── A.1 Invitaciones + Consentimiento (M3) ──┐
├── A.2 Login Real Empresa + Cognito ────────┼──► A.4 Dashboard Recruiter Modo Real
├── A.3 Job Board (honesto placeholder) ─────┘
│
├── B.1 Auditoría Base Calidad (pre-req para B.2–B.13)
├── B.2 SimpleRT
├── B.3 PrecisionTargeting
├── B.4 GoNoGo
├── B.5 ColorInterference
├── B.6 VisualSearch
├── B.7 BalloonRisk
├── B.8 LaserPuzzle
├── B.9 PassengerRoute
├── B.10 Tangram
├── B.11 TeamCoordination
├── B.12 BOMB (validación)
├── B.13 Control Room (validación)
├── B.14 Consolidación Transversal
│
├── C.1 E2E Real + Beta (requiere A + B)
├── C.2 Observabilidad CloudWatch
├── C.3 Documentación + Handoff
│
└── FASE D (Backlog post-lanzamiento)
```

---

## Gates de Calidad por Fase

| Fase | Gates Obligatorios |
|------|-------------------|
| **A.1** | SAM deploy OK, SES production access, Cognito User Pool activo, tests backend 100% verdes, smoke E2E invitación→sesión→reporte |
| **A.2** | Login Cognito real → tokens → `/empresa` modo real con 11 sesiones staging, auto-refresh, logout limpio |
| **A.3** | JobsPage + JobDetailPage render ES/EN desktop/móvil 0 errores/overflow |
| **A.4** | Tag `v1.1.0` deploy prod → krumm.cl modo real verificado (KPIs, filtros, exports, smoke Playwright) |
| **B.1–B.13** | Por juego: tests focales verdes + oxlint 0 + build OK + smoke 1280×720 + 390×844 0 fallos + fixture payload válido + constructo en reporte con caveat |
| **B.14** | Fixtures genuinas todos los juegos, sync tests GREEN, privacy validation suite 100% |
| **C.1** | Beta 2–3 usuarios sin fallos, matriz smoke 6/6 verde, 0 claims HR no soportados |
| **C.2** | Dashboards + alarmas operativas, logs JSON estructurados |
| **C.3** | AGENTS.md sync, 12 docs módulos, 4 runbooks, kanban/Linear/docs sincronizados |

---

## Estimación de Esfuerzo (1 dev + IA asistida)

| Fase | Días aprox. | Notas |
|------|-------------|-------|
| A.1 Invitaciones + SES + Cognito | 5–7 | Incluye espera SES sandbox (24–48h) |
| A.2 Login Real Empresa | 3–4 | Amplify v6 / AWS SDK v3 |
| A.3 Job Board | 2 | Placeholder honesto + arquitectura |
| A.4 Dashboard Modo Real | 1 | Tag + deploy + verificación |
| **Subtotal A** | **11–14** | |
| B.1 Auditoría Base | 2 | Checklist + herramienta |
| B.2–B.11 (10 juegos stable_dg) | 15–20 | ~1.5–2 días/juego (audit + fixes + smoke) |
| B.12 BOMB Validación | 1 | Ya done, solo checklist |
| B.13 Control Room Validación | 1 | Ya done, solo checklist |
| B.14 Consolidación Transversal | 3–4 | Fixtures, sync, privacy |
| **Subtotal B** | **22–29** | |
| C.1 E2E Beta | 3–5 | Usuarios internos, matriz 6 configs |
| C.2 Observabilidad | 2 | CloudWatch dashboards + alarmas |
| C.3 Documentación | 3 | 12 módulos + 4 runbooks + AGENTS.md |
| **Subtotal C** | **8–10** | |
| **TOTAL** | **41–53 días** | ~6–8 semanas (sep–oct, antes de M5/M6 noviembre) |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| SES sandbox no sale a tiempo | Media | Bloquea A.1 E2E | Invitaciones manuales email propio durante beta |
| Cognito auth complexities | Media | Retrasa A.2 | Amplify v6 abstrae flujos; fallback demo siempre funcional |
| Juegos revelan bugs de sincronización tardíos | Alta | Re-trabajo B | T.2 done temprano (sept); auditoría B.1 sistemática |
| Duración `original` 7 juegos >30 min fatiga candidato | Media | Decisión producto C6 | Medir en beta; opción `original_extended` |
| Claims HR no soportados en texto | Baja | Legal/reputación | Barrido automático + revisión manual pre-lanzamiento |
| GPU Lambda costos inesperados | Baja | Presupuesto | Budget $25/mes + alarmas 80%/100%; GPU solo heavy tasks |
| Key Lambda leakada en git history | Cierta | Seguridad | **Solo-usuario**: invalidar en dashboard AWS (pendiente desde 2026-09-10) |

---

## Decisiones Fijadas (2026-09-12 — autorizadas por el usuario)

| # | Decisión | Resultado |
|---|----------|-----------|
| 1 | Añadir Fases E/F/G/H al plan | **SÍ** — integradas abajo |
| 2 | Objetivo beta externa | **2 empresas** piloto (firma contrato antes de lanzar) |
| 3 | Multi-tenancy real | **AHORA** (G.5 — obligatorio para la 2ª empresa; `companyId` en sesiones + GSI) |
| 4 | PWA | **POST-beta** (backlog I) |
| 5 | Analytics | **PostHog** (free tier cloud o self-host; funnels nativos, autocapture, privacy controls) |
| 6 | Términos + Privacidad | **Template + revisión abogada 1–2h** (presupuestado en pitch "uso de fondos"; publicar antes de la primera invitación real) |

**Prerequisito operativo vigente (solo-usuario):** AWS SSO expira ~11 h. Antes de cualquier tarea AWS (deploy M3, SES, DynamoDB): `aws sso login --sso-session aws_sso --use-device-code`. **Key Lambda leakada en history git: pendiente invalidar** en dashboard Lambda (repo público; allowlist `.gitleaks.toml` ya documenta). Card kanban + Linear creadas en esta fase para anclarlo.

---

## FASE E — Legal, Compliance y Soporte (Semana 1–2, paralela a A)

**Estado:** `[ ] Por implementar` | **Prioridad:** Alta (bloquea primera invitación real)

### E.1 Documentos legales publicados
- `docs/legal/terminos-de-servicio.md` + `docs/legal/politica-privacidad.md` (template base + revisión abogada 1–2 h)
- Página `/legal/terminos` y `/legal/privacidad` en frontend (rutas V3 footer ya enlazan `Privacy/Terms` — hoy muertas)
- Cookie notice mínimo (solo esenciales + analytics opt-in PostHog)
- **Gate:** abogado revisó, URLs en prod, footer enlaza.

### E.2 Contratos B2B piloto
- `docs/legal/piloto-b2b-contrato-template.md` (Service Agreement + DPA anexo, ES)
- Versión bilingüe ES/EN para la 2ª empresa si es extranjera
- **Gate:** al menos 1 contrato firmado antes de lanzar beta externa.

### E.3 Knowledge base / FAQ
- `docs/support/faq-candidatos.md` y `docs/support/faq-empresas.md`
- Página `/ayuda` enlazada desde el Help dialog (CandidateShell/CompanyShell ya tienen el dialog — conectar contenido)
- mailto `soporte@krumm.cl` con SLA 24 h documentado (hasta Intercom/Zendesk)

### E.4 Widget feedback + protocolo beta
- `src/v3/FeedbackWidget.jsx` (botón flotante; tipos: Bug / Sugerencia / General; contexto automático: ruta, battery, UA, sin PII de sesión)
- Envío: webhook Discord `hermes-alerts` (infra ya existe) + Linear opcional
- `docs/beta/beta-protocol.md`: screencast (consentido), guion de entrevista post-sesión, métricas de abandono por juego, cadencia semanal de iteración
- **Gate:** widget funcional en todas las shells (círculo AA en 390×844), protocolo aprobado por el usuario.

---

## FASE F — Métricas de Producto y FinOps (Semana 2, paralela)

**Estado:** `[ ] Por implementar` | **Prioridad:** Alta (los inversores preguntan por funnel y retención)

### F.1 Instrumentación PostHog
- `posthog-js` en main.jsx: `VITE_POSTHOG_KEY` + `VITE_POSTHOG_HOST` (opt-out respetado vía cookie consent E.1; **nunca** capturar datos biométricos ni contenido de respuestas — `autocapture` desactivado en `/postulaciones/*`, solo pageviews + eventos de navegación)
- Funnel explícito: `invite_received` → `invite_opened` → `consent_accepted` → `game_N_completed` (×7) → `report_viewed` → `recruiter_login` → `export_downloaded`
- Tests: con PostHog disabled en jsdom (mock no-op); smoke verifica que NO se captura en modo fixture
- **Gate:** dashboard PostHog con funnel visible; eventos verificados en live test self-host/cloud.

### F.2 Dashboard de métricas producto
- Distinto del dashboard científico: conversión, tiempo por juego (p50/p95), abandono por paso, NPS post-reporte (encuesta 1-10 opcional), retención recruiter (logins/sem)
- Publicación interna: enlace en `docs/ops/metrics.md` + captura semanal al kanban (`t_88701e67` heartbeat)

### F.3 FinOps mensual
- `scripts/cost-projection.sh`: Cost Explorer por tag/ARN + proyección por evaluación (Lambda ms, DynamoDB writes, CloudFront GB)
- Documento `docs/ops/finops.md`: "costo por evaluación completa $X.usd" + top-5 costos del mes
- Presupuesto existente ($25/mes, alarmas 80/100 %) referenciado

---

## FASE G — Hardening+ SRE/Seguridad/Continuous Quality (Semana 7–8)

**Estado:** `[ ] Por implementar` | **Prioridad:** Alta antes de beta externa

### G.1 Lighthouse CI en PRs
- `.github/workflows/lighthouse.yml`: budget performance ≥90, accessibility 100, best-practices 100, SEO ≥90 sobre `/`, `/portal`, `/candidato`
- Bundle budget: `main.*.js` < 500 KB gzip en CI (falla si excede)

### G.2 Error tracking (Sentry)
- Sentry cloud free (o self-hosted GlitchTip en la Pi — decisión operativa): `VITE_SENTRY_DSN` opcional; `ErrorBoundary` + `window.onerror` + `unhandledrejection`
- Regla: SIN breadcrumbs que contengan payloads de sesión (solo rutas/códigos de error); sanitización estricta documentada en `docs/security/error-tracking.md`

### G.3 Seguridad avanzada
- Rate limiting API Gateway: usage plan 10 req/min/IP en `/invitations` y `/sessions` (SAM)
- AWS WAF básico (managed rules: Common + KnownBadInputs; ~$6/mes) en distributions CloudFront
- OWASP ZAP baseline contra stage; hallazgos 0 critical/high antes de beta
- `.gitleaks.toml` → PR-blocking (ya en CI KRU-51; verificar `--redact` activo)

### G.4 Backup + DR
- DynamoDB PITR en todas las tablas (sessions, invitations, audit_log) — SAM update
- Runbook `scripts/dr-restore.sh` + ejercicio simulado con fecha documentada (<1 h RTO)
- S3 versioning ya activo (M1); documentar

### G.5 Multi-tenancy real
- Backend: `companyId` obligatorio en invitations + sesiones nuevas; GSI `companyId-index` en tabla sessions; migración/alias para las 11 sesiones staging existentes (todas → `companyId: 'krumm-demo'`)
- Authorizer inyecta `tenant` desde Cognito custom attribute `custom:companyId`
- Frontend: modo demo = tenant `krumm-demo`; CompanyShell acepta logo por tenant (config estático por ahora, CMS fuera de scope)
- Tests: aislamiento (recruiter A no lee sesiones de B → 403)
- **Gate:** 2 tenants de prueba en staging con datos aislados verificados.

---

## FASE H — Pitch Deck + Data Room (Semana 1, entregable temprano)

**Estado:** `[ ] Por implementar` | **Prioridad:** Alta (bloquea reuniones con inversión)

### H.1 Pitch deck v1
- `docs/investor/pitch-deck.md` (estructura: problema → solución → demo → mercado TAM/SAM/SOM LATAM HR-tech → competencia (Pymetrics, Arctic Shores, HireVue) → moat (cadena constructo→telemetría agregada + contrato R-6 + compliance) → tracción → modelo (por evaluación / suscripción anual) → unit economics (G.3/F.3) → equipo → uso de fondos → ask $500k–1.5M Seed)
- Narrativa `descriptive_only`/`humanReviewOnly` vendida como *diferenciador de compliance*, no como carencia

### H.2 Data room checklist
- `docs/investor/data-room-checklist.md`: corporate docs (sociedad — KRU-53 done), IP/código (repo), contratos (E.2), privacidad/DPIA (KRU-51, E.1), métricas (F.2), financiero (quemado/runway), roadmap (este plan)
- Carpeta física/virtual lista para compartir

### H.3 Demo video + material demo
- Video 2–3 min (screen recording: landing → invitación → 2 juegos → reporte → dashboard empresa) con locación ES
- Entorno demo estable: stage.krumm.cl con datos demo perfectos (fixture company) + guion de live demo (`docs/demo/live-demo-script.md`)

### H.4 Roadmap post-inversión (18 meses)
- `docs/investor/roadmap-18m.md`: R-7 validación normativa (N=200), multi-idioma, ATS integrations (Greenhouse/Lever), mobile PWA, entry EU/GDPR, equipo 3–5 hires

---

### Orden revisado de ejecución (reemplaza diagrama anterior)

```
Semana 1:  A.1.1–A.1.3 (stack invitaciones + SES) · E.1 · E.2 (iniciar) · H.1 (draft)
Semana 2:  A.1.4–A.1.6 · A.2 (login Cognito) · F.1 · H.2
Semana 3:  A.3 (job board) · A.4 (modo real prod) · G.1 (Lighthouse)
Semanas 4–6: Fase B (B.1 → B.14, juegos pre-lanzamiento)
Semana 7:  E.3 · E.4 · F.2 · G.2 · G.3 · beta interna 2–3 usuarios
Semana 8:  G.4 · G.5 (multi-tenancy) · C.1 beta externa 2 empresas · C.2 · C.3 · H.3 · H.4
```

**Nota:** las secciones FASE A–FASE D de arriba quedan vigentes en contenido; esta sección solo añade E–H y reordena el calendario.

1. **A.1.1** Crear `infra/m3-invitations-stack.yaml` + `cfn-lint`
2. **A.1.2** Solicitar SES production access (acción manual, iniciar YA)
3. **A.1.3** Añadir Cognito User Pool al stack o stack separado
4. **B.1.1** Crear `docs/qa/prelaunch-checklist-template.md`
5. **Paralelo:** Usuario invalida key Lambda leakada en AWS Console

---

## Sincronización Kanban + Linear (Obligatoria en cada cierre)

- Cada task completada → actualizar kanban card (status, comentario con evidencia)
- Linear issues correspondientes → transición estado (Done/In Progress)
- AGENTS.md actualizado con nuevo estado
- Commit + push solo con instrucción explícita del usuario
- Notificación Discord DM `.sarlock` al cerrar fase completa

---

**Documento creado:** 2026-09-12
**Autor:** Hermes Agent (plan mode)
**Basado en:** AGENTS.md estado 2026-09-11, linear_issues.json, kanban live, specs EXP-BOMB-001/EXP-COMM-001, planes M0–M6/G/T