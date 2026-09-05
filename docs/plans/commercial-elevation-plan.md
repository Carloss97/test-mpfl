<!--
================================================================================
KRUMM — PLAN DE ELEVACIÓN A PRODUCTO COMERCIAL (Fase B→F del roadmap)
================================================================================
Fuente: docs/product/krumm-productization-roadmap.md (Fase A completada = demo verde)
Objetivo: Convertir demo técnica en producto piloto B2B controlado, seguro, auditable, validable.
Formato: Plan por fases (scope-driven, PDD/SDD), cada tema con explicación + criterios de aceptación (gates).
Uso: Agent handoff — cada fase es un slice independiente con Scope (PDD) + SDD delta + Gates.
================================================================================
-->

# Plan de Elevación a Producto Comercial — KRUMM Postulación

> **Metodología:** Scope-Driven Development (PDD + SDD) — ver `docs/design/krumm-postulation-pdd.md` + `docs/design/krumm-postulation-sdd.md`.
> **Regla:** No iniciar fase sin Scope cerrado (PDD delta). Cada fase cierra con Gates §4 de SDD.
> **Entregable por fase:** Código + Tests + Docs actualizados + Handoff actualizado.

---

## FASE B — Hardening Producto Mínimo (Backend aggregate-only + Invitaciones + Dashboard Recruiter v1)

### B.1 Backend Aggregate-Only (API + Persistencia + Eliminación)

**Explicación:**
La demo actual es 100% client-side (bundle local). Para piloto B2B se necesita backend que:
- Reciba `finalAssessmentPayload` (ya privacy-safe: solo agregados, feature vectors, events `game_event_v1`)
- Persista en BD con *data minimization* (solo campos allowlist)
- Exponga endpoints: `POST /sessions`, `GET /sessions/:id`, `DELETE /sessions/:id` (GDPR Art. 17)
- Valide `privacyValidation.ok === true` antes de persistir (bloquea raw fields)
- Audite accesos (log inmutable: quién, cuándo, qué acción)

**Archivos a crear/modificar:**
```
src/backend/
  api/
    sessions.post.ts      # POST /sessions — valida payload + persiste
    sessions.get.ts       # GET /sessions/:id — devuelve payload + reportes
    sessions.delete.ts    # DELETE /sessions/:id — hard delete + log
  db/
    schema.sql            # Tabla sessions (id, payload_jsonb, created_at, deleted_at)
    migrations/
  privacy/
    validatePayload.ts    # Reusa validateFinalAssessmentPayload + FORBIDDEN_KEYS
  audit/
    accessLog.ts          # Append-only log (WAL SQLite o PostgreSQL)
```

**Criterios de aceptación (Gates):**
```bash
# 1. Tests RED→GREEN
NODE_ENV=test npx vitest run src/backend --pool=threads --reporter=default
#    - POST /sessions rechaza payload con raw fields (video, frames, landmarks, pointerSamples, etc.)
#    - POST /sessions acepta payload válido → devuelve 201 + sessionId
#    - GET /sessions/:id devuelve payload idéntico al enviado
#    - DELETE /sessions/:id hard-deleta + logea acceso
#    - GET /sessions/:id tras DELETE → 404

# 2. Lint + Build
npx oxlint src/backend
npm run build

# 3. Privacy guard CI
#    - Pipeline bloquea deploy si validatePayload.ok === false

# 4. Smoke real
#    - Deploy staging → POST payload real (fixture) → GET → DELETE → verificar log auditoría
```

**Evidencia de cierre:** `docs/handoff/phase-b1-backend-handoff.md` con endpoints, schemas, credenciales staging.

---

### B.2 Sistema de Invitaciones + Roles (Admin → Candidate)

**Explicación:**
Flujo: Admin crea invitación → email con token único → Candidate accede a `/postulaciones-demo?invite=<token>` → sesión ligada a invitación → Admin ve resultado en dashboard.

**Archivos:**
```
src/backend/api/
  invitations.post.ts     # POST /invitations { email, role, expiresAt } → { token, url }
  invitations.get.ts      # GET /invitations/:token — valida expiración, uso único
src/postulation-demo/
  PostulationInviteGuard.jsx  # Wrapper que valida token antes de Landing
  PostulationDemoApp.jsx      # Lee inviteId de URL → pasa a sessionBuilder
src/postulation-demo/hr-dashboard/
  InvitationsPanel.jsx    # CRUD invitaciones (list, create, revoke, resend)
```

**Criterios de aceptación:**
```bash
# Tests
NODE_ENV=test npx vitest run src/backend/api/invitations --pool=threads
#    - Token único, expirable, uso único
#    - Invitación revocada → 403 en guard
#    - Email simulado (mock SMTP) contiene URL correcta

# Build + Lint
npm run build && npx oxlint src/postulation-demo/PostulationInviteGuard.jsx

# Smoke manual
#    - Admin crea invitación → email → Candidate abre URL → completa batería → Admin ve reporte en dashboard
```

---

### B.3 Dashboard Recruiter v1 (Read-Only + Export)

**Explicación:**
Superficie separada (`/postulaciones-demo/hr`) para revisor humano:
- Lista sesiones completadas (paginación, filtros: fecha, battery, status)
- Vista detalle: reporte Markdown/HTML/JSON + `talentProfile` + `qualitySummary` + `governance` badges
- Botón "Descargar bundle" (JSON + reportes) — reusa `buildLocalReportBundle`
- **NO** edición, **NO** decisión automática, **NO** ranking

**Archivos:**
```
src/postulation-demo/hr-dashboard/
  PostulationHrDashboard.jsx      # Shell principal (ya existe)
  SessionsListPanel.jsx           # Tabla + filtros + paginación
  SessionDetailPanel.jsx          # Vista reporte + badges governance
  hrDashboardData.ts              # fetch /sessions, /sessions/:id
```

**Criterios de aceptación:**
```bash
# Tests
NODE_ENV=test npx vitest run src/postulation-demo/hr-dashboard --pool=threads
#    - Lista muestra solo sesiones completed
#    - Detalle renderiza reporte Markdown sin XSS
#    - Badges governance visibles: humanReviewOnly, noAutomatedDecision, privacySafe
#    - Descarga bundle → JSON válido + privacyValidation.ok === true

# Smoke real (staging)
#    - Admin ve 3 sesiones fixture → abre detalle → descarga bundle → valida JSON
```

---

## FASE C — Privacidad / Seguridad / Operación (Política + DPIA + Threat Model + CI Guards)

### C.1 Política de Datos + DPIA (Data Protection Impact Assessment)

**Explicación:**
Documento legal-técnico requerido para procesar datos biométricos (Art. 35 GDPR). Debe cubrir:
- Finalidad: *support complementario a revisión humana* (no decisión)
- Base legal: *Consentimiento explícito* (Art. 9.2.a GDPR) + *Interés legítimo* (Art. 6.1.f)
- Categorías datos: agregados conductuales + resumen biométrico (calidad) — **NO** raw
- Retención: 30 días default, configurable por cliente, eliminación automática
- Derechos titular: acceso, rectificación, supresión, portabilidad, oposición
- Transferencias: none (self-hosted on-premise o EU cloud)
- Medidas técnicas: aggregate-only, zero raw, encryption at rest/in transit, audit log

**Entregable:** `docs/legal/DPIA-krumm-postulacion-v1.md` + `docs/legal/privacy-policy.md`

**Criterios de aceptación:**
- [ ] DPIA firmada por DPO / asesor legal
- [ ] Privacy policy publicada en `/postulaciones-demo` (link en Landing)
- [ ] Retención configurable verificada en backend (job cron elimina > 30d)

---

### C.2 Threat Model (STRIDE/LINDDUN) + Security Hardening

**Explicación:**
Modelado de amenazas sobre arquitectura completa (frontend + backend + BD + CDN).
Enfoque LINDDUN para privacidad + STRIDE para seguridad.

**Entregable:** `docs/security/threat-model-v1.md` + `SECURITY.md`

**Criterios de aceptación:**
- [ ] Threat model documentado con mitigaciones por componente
- [ ] CSP headers estrictos (`script-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`)
- [ ] HSTS, X-Frame-Options, Referrer-Policy configurados
- [ ] Rate limiting en `/sessions` y `/invitations` (10 req/min/IP)
- [ ] Dependency scanning: `npm audit --audit-level=high` en CI (ya gate)
- [ ] Pen test básico (OWASP ZAP) en staging — 0 critical/high

---

### C.3 CI Privacy Guards Automatizados

**Explicación:**
Bloquear en PR/CI cualquier código que introduzca raw fields en payloads.

**Implementación:**
```yaml
# .github/workflows/privacy-guard.yml
jobs:
  privacy-guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx vitest run src/**/privacyValidation.test.ts  # tests específicos
      - run: node scripts/scan-forbidden-keys.js  # grep FORBIDDEN_KEYS en código nuevo
```

**Script `scripts/scan-forbidden-keys.js`:**
- Escanea diff de PR (`git diff --name-only`)
- Busca patrones: `video|frames|landmarks|keypoints|pointerSamples|rawPointerPath|clickTrace|rawGameEvents|trials|fullRoute|routeTrace|visitedCells|stepByStepPath|domEvent|freeText|typedResponse|messageText|optionText|scenarioText|choiceSequence|rawChoices|pumpSequence|beamCells`
- Falla si aparece en archivos modificados fuera de `FORBIDDEN_KEYS` declarados

**Criterios de aceptación:**
```bash
# PR que añade raw field → CI falla
# PR legítimo → CI pasa
# Documentado en CONTRIBUTING.md
```

---

### C.4 Observabilidad + Operación (Logs + Metrics + Alertas)

**Explicación:**
Visibilidad en producción sin comprometer privacidad.

**Stack:** OpenTelemetry (traces) + Prometheus (metrics) + Grafana (dashboards) + Alertmanager

**Métricas clave (privacy-safe):**
| Métrica | Tipo | Descripción |
|---|---|---|
| `krumm_sessions_started_total` | Counter | Por battery_mode |
| `krumm_sessions_completed_total` | Counter | Por battery_mode |
| `krumm_session_duration_seconds` | Histogram | P50, P95, P99 |
| `krumm_privacy_validation_failures_total` | Counter | Payload rechazados |
| `krumm_signal_quality_low_total` | Counter | `low_face_presence`, `low_face_confidence` |
| `krumm_bundle_downloads_total` | Counter | Por formato (md/html/json) |

**Criterios de aceptación:**
- [ ] Dashboards Grafana operativos en staging
- [ ] Alertas: `privacy_validation_failures > 0` → PagerDuty/Slack
- [ ] Logs estructurados JSON (no PII) → Loki/Elastic
- [ ] Runbook incidentes: `docs/runbooks/incident-response.md`

---

## FASE D — Validación R-7 (Normativa + Evidencia Científica)

### D.1 Diseño Estudio Validez (Protocolo + Ética)

**Explicación:**
Estudio de validez convergente/discriminante + fiabilidad test-retest.
Mínimo: N=200, 2 sesiones (2 semanas), instrumentos de referencia (BART, IPIP-NEO, Cognitive Reflection Test).

**Entregable:** `docs/research/r7-validation-protocol-v1.md` + aprobación comité ética.

**Criterios de aceptación:**
- [ ] Protocolo registrado (OSF / ClinicalTrials.gov)
- [ ] Consentimiento informado específico validación
- [ ] Muestra reclutada + calendarizada

---

### D.2 Instrumentación + Recolección Datos

**Explicación:**
Extender backend para armar dataset de validación:
- `krumm_research_export_v1` (ya existe en `telemetry/researchExport.js`)
- Variables: feature vectors + instrumentos referencia + metadatos sesión
- Export JSONL/CSV anonimizado (hash sessionId)

**Criterios de aceptación:**
```bash
# Export válido
NODE_ENV=test npx vitest run src/telemetry/researchExport.test.js
#    - JSONL: 1 registro por trial + feature.*
#    - CSV: columnas feature.* + reference_instrument_scores
#    - Anonimización: sessionId hasheado, sin PII
```

---

### D.3 Análisis Estadístico + Reporte Validación

**Explicación:**
Análisis pre-registrado:
- Fiabilidad: ICC test-retest, consistencia interna (omega)
- Validez convergente: correlaciones Pearson/Spearman con BART (riesgo), CRT (decisión), IPIP (rasgos)
- Validez discriminante: bajas correlaciones con constructos no relacionados
- Análisis de invarianza (sexo, edad, dispositivo)
- Intervalos de credibilidad bayesianos (no p-values)

**Entregable:** `docs/research/r7-validation-report-v1.md` + preprint.

**Criterios de aceptación:**
- [ ] Reporte completado + revisado por experto externo
- [ ] Hallazgos: qué constructos pasan a `sufficient*`, cuáles quedan `insufficient`
- [ ] Actualizar `talentProfile.js` + `originalGameTalentMapping.js` con evidencia validada
- [ ] Marcar constructos validados: `availability: 'validated'` + `confidenceCeiling: 0.8`

---

## FASE E — Piloto B2B Controlado (Onboarding + SLA + Soporte)

### E.1 Onboarding Empresa (Self-Service + Configuración)

**Explicación:**
Flujo: Empresa se registra → configura batería (stable_dg / original_games) + branding + retención → invita candidatos → ve dashboard.

**Archivos:**
```
src/backend/api/
  tenants.post.ts         # Multi-tenancy (aislamiento datos por empresa)
  tenants.get.ts
  config.put.ts           # Config por tenant: battery, retentionDays, branding
src/postulation-demo/
  TenantBrandingProvider.jsx  # CSS vars + logo + colores por tenant
```

**Criterios de aceptación:**
- [ ] Aislamiento datos: tenant A no ve sesiones tenant B (RLS PostgreSQL)
- [ ] Config batería respeta fallback stable_dg
- [ ] Branding aplicado en Landing + GameStage + Reportes

---

### E.2 SLA + Soporte + Runbooks

**Explicación:**
Compromisos operativos para piloto pagado.

**Entregables:**
- `docs/operations/SLA.md` (uptime 99.5%, RTO 4h, RPO 1h)
- `docs/runbooks/` (deploy, rollback, incident response, data deletion request)
- Soporte: email + Slack connect (horario business)

**Criterios de aceptación:**
- [ ] Fire drill mensual documentado
- [ ] Backup/restore probado (RPO 1h verificado)
- [ ] Data deletion request procesado < 24h (GDPR Art. 12)

---

## FASE F — Producto Comercial v1 (Escalabilidad + Enterprise + Marketplace)

### F.1 Arquitectura Escalable (K8s + Queue + Workers)

**Explicación:**
Migrar de single-instance a:
- Frontend: CDN + Edge (Cloudflare Pages / Vercel)
- API: K8s Deployment (HPA por CPU + custom metric `sessions_pending`)
- Workers: BullMQ/Redis para export research, bundle generation, email
- BD: PostgreSQL managed (RDS/Cloud SQL) + read replicas
- Object storage: S3-compatible para bundles (presigned URLs, TTL 7d)

**Criterios de aceptación:**
- [ ] Load test: 100 sesiones concurrentes sin degradación
- [ ] Auto-scaling verificado (HPA scale-up < 60s)
- [ ] Multi-AZ deployment (RTO 15min)

---

### F.2 Enterprise Features (SSO + Audit Trail + API Keys)

| Feature | Descripción |
|---|---|
| SAML/OIDC SSO | Integración IdP empresa (Azure AD, Okta, Google Workspace) |
| Audit Trail API | `GET /audit/logs?tenant=:id&from=:date` (immutable, tamper-evident) |
| API Keys | Rotables, scoped (read:sessions, write:invitations, admin:config) |
| Webhooks | `session.completed`, `invitation.expired`, `bundle.ready` |

---

### F.3 Marketplace + Partner Program

**Explicación:**
Listado en marketplaces (Azure Marketplace, AWS Marketplace, GCP Marketplace) + programa partners (consultoras HR, integradores ATS).

**Criterios de aceptación:**
- [ ] Listing publicado con pricing transparente
- [ ] Partner onboarding kit (docs técnicos, sandbox, co-marketing)
- [ ] Integración ATS demo (Greenhouse / Lever / Workday webhook)

---

## MATRIZ RESUMEN — FASES + GATES + RESPONSABLES

| Fase | Tema | Gates Críticos | Estimación | Handoff Doc |
|---|---|---|---|---|
| **B.1** | Backend Aggregate-Only | Tests + Privacy Validation + Smoke Staging | 2-3 semanas | `phase-b1-backend-handoff.md` |
| **B.2** | Invitaciones + Roles | Token único + uso único + email mock | 1-2 semanas | `phase-b2-invitations-handoff.md` |
| **B.3** | Dashboard Recruiter v1 | Lista + Detalle + Descarga bundle + Badges | 2 semanas | `phase-b3-dashboard-handoff.md` |
| **C.1** | DPIA + Privacy Policy | Firmada DPO + Publicada | 1 semana (legal) | `DPIA-krumm-postulacion-v1.md` |
| **C.2** | Threat Model + Hardening | STRIDE/LINDDUN + CSP + Rate Limit + Pen Test | 2 semanas | `threat-model-v1.md` + `SECURITY.md` |
| **C.3** | CI Privacy Guards | Workflow bloquea raw fields en PR | 3 días | `privacy-guard-workflow.yml` |
| **C.4** | Observabilidad | Dashboards + Alertas + Runbooks | 1 semana | `observability-handoff.md` |
| **D.1** | Protocolo Validación R-7 | Aprobado comité ética + Registrado | 4-6 semanas (externo) | `r7-validation-protocol-v1.md` |
| **D.2** | Instrumentación Datos | Export JSONL/CSV anonimizado válido | 1 semana | `research-export-handoff.md` |
| **D.3** | Análisis + Reporte R-7 | Validado experto + Constructos actualizados | 8-12 semanas | `r7-validation-report-v1.md` |
| **E.1** | Onboarding Empresa | Multi-tenancy + Config + Branding | 3-4 semanas | `phase-e1-onboarding-handoff.md` |
| **E.2** | SLA + Soporte | Fire drill + Backup test + Deletion < 24h | 2 semanas | `SLA.md` + `runbooks/` |
| **F.1** | Arquitectura Escalable | Load test 100 concurrentes + HPA + Multi-AZ | 4-6 semanas | `phase-f1-k8s-handoff.md` |
| **F.2** | Enterprise Features | SSO + Audit API + API Keys + Webhooks | 3-4 semanas | `enterprise-features-handoff.md` |
| **F.3** | Marketplace | Listing + Partner Kit + ATS Integration | 2-3 semanas | `marketplace-handoff.md` |

---

## CONVENCIONES PARA AGENT HANDOFF (cada fase)

### 1. Estructura de Handoff Doc (`docs/handoff/phase-<X>-<tema>-handoff.md`)
```markdown
# Handoff: Fase <X> — <Tema>

## Scope (PDD Delta)
- Qué entra / qué queda fuera
- Restricciones privacidad/HR/fallback
- Criterio de éxito medible

## SDD Delta (Archivos tocados)
- src/... (rutas exactas)
- Contratos respetados (refs a reference-guide.md)
- Riesgo técnico + mitigación

## Gates Ejecutados (Evidencia)
- Comando exacto + output (tests, lint, build, smoke)
- Links a artifacts (coverage, bundle size, dashboards)

## Próximos Pasos (Scope Siguiente Fase)
- Dependencias
- Riesgos abiertos
- Decisiones pendientes (requieren humano)
```

### 2. Checklist Pre-Handoff (obligatorio antes de pasar a siguiente agente)
```bash
# Ejecutar y pegar output en handoff doc
NODE_ENV=test npx vitest run <focales> --pool=threads --reporter=default
npx oxlint <paths>
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
# Smoke real: staging URL + pasos manuales documentados
```

### 3. Actualización Docs Sincronizada
- `docs/design/krumm-postulation-pdd.md` — añadir/actualizar §5 Alcance + §7 Requisitos
- `docs/design/krumm-postulation-sdd.md` — añadir SDD delta en §7 Anatomía del delta
- `docs/product/krumm-productization-roadmap.md` — marcar fase completada
- `docs/handoff/` — nuevo doc + actualizar `README.md` índice

---

## PRINCIPIOS NO NEGOCIABLES (persisten en TODAS las fases)

1. **Privacidad por diseño** — Zero raw fields en cualquier payload (CI lo bloquea)
2. **Descriptive-only** — Sin percentiles/cortes/ranking/apto-no-apto hasta R-7 validado
3. **Human-review-only** — Ninguna superficie muestra "recomendación de contratación"
4. **Aggregate-only** — Backend solo recibe/guarda escalares allowlist + feature vectors
5. **Fallback robusto** — `stable_dg` siempre disponible; `original_games` solo con disclaimer
6. **Trazabilidad** — Cada métrica visible → feature vector → agregado → conducta observable → constructo
7. **Caveats explícitos** — `score: null` para ausente, `not_measured` para no medido, `insufficient` para evidencia parcial

---

## COMANDOS DE REFERENCIA RÁPIDA (para agents)

```bash
# Tests focalizados (patrón)
NODE_ENV=test npx vitest run src/<path> --pool=threads --reporter=default

# Lint scope
npx oxlint src/<path>

# Build + Audit
npm run build && npm audit --audit-level=high --omit=dev

# Smoke staging (manual)
# 1. Abrir https://staging.krumm.app/postulaciones-demo
# 2. Completar batería (fixture o real)
# 3. Verificar: consola limpia, 0 overflow 390x844/1280x720, reporte sin claims HR
# 4. Dashboard HR: https://staging.krumm.app/postulaciones-demo/hr
# 5. Descargar bundle → validar JSON + privacyValidation.ok === true

# Privacy guard local (pre-commit)
node scripts/scan-forbidden-keys.js
```

---

**Última actualización:** 2026-07-30
**Versión:** `commercial-elevation-plan_v1`
**Estado:** Borrador — revisar con stakeholder antes de iniciar Fase B.1