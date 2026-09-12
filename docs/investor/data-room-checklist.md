# Data Room Checklist — KRUMM (Pre-Seed / Seed)

**Versión:** 1.0
**Fecha:** 2026-09-12
**Estado:** En preparación (objetivo: completa para primera reunión con fondo)

---

## 1. Corporate & Legal

| # | Documento | Estado | Ubicación / Notas |
|---|-----------|--------|-------------------|
| 1.1 | Escritura de constitución sociedad (KRU-53) | ✅ Done | `docs/legal/constitucion.pdf` (archivar) |
| 1.2 | Estatutos / Bylaws | ✅ Done | `docs/legal/estatutos.pdf` |
| 1.3 | Certificado de vigencia (Conservador de Bienes Raíces) | ✅ Done | `docs/legal/vigencia.pdf` |
| 1.4 | RUT y giro comercial | ✅ Done | `docs/legal/rut.pdf` |
| 1.5 | Directorio / Representación legal | ✅ Done | Carlos Saldivia (Founder/CEO), Nicolás Cowley (Co-founder) |
| 1.6 | Pacto de accionistas / Shareholders Agreement | ⏳ Pendiente | Pre-seed: SAFE simple; post-seed: SHA estándar |
| 1.7 | Cap table actualizada | ✅ Draft | Founder 85% / Advisors 5% / ESOP 10% / Seed 15–20% |
| 1.8 | Trademark "KRUMM" (IMPI/INAPI) | ⏳ En trámite | Clase 9, 42 — solicitud presentada |
| 1.9 | Domain ownership (krumm.cl, krumm.com) | ✅ Done | Cloudflare registrar |
| 1.10 | Contratos de prestación de servicios (advisors, consultants) | ✅ Done | `docs/legal/advisor-agreements/` |
| 1.11 | Employee / contractor IP assignment agreements | ✅ Done | Todos los devs firman IP assignment |
| 1.12 | Insurance (cyber, E&O, D&O) | ⏳ Cotizando | Cyber $1M, E&O $1M, D&O $1M |

---

## 2. Intellectual Property & Technology

| # | Documento | Estado | Ubicación / Notas |
|---|-----------|--------|-------------------|
| 2.1 | Repo GitHub (privado) — acceso read-only para DD | ✅ Listo | `github.com/Carloss97/krumm` (invite on request) |
| 2.2 | Architecture diagram + tech stack doc | ✅ Done | `docs/architecture.md` + `docs/plans/2026-09-12-next-phase-comprehensive-plan.md` |
| 2.3 | Game specifications (EXP-BOMB-001, EXP-COMM-001) | ✅ Done | `docs/spec/EXP-BOMB-001/`, `docs/spec/EXP-COMM-001/` |
| 2.4 | Feature vector versions (2.0 → 2.3.0) + changelog | ✅ Done | `src/telemetry/assessmentFeatureVector.js` + `docs/design/modulos/` |
| 2.5 | Telemetry schemas (game_event_v1, assessment_feature_vector_v2) | ✅ Done | `docs/telemetry/schemas.md` |
| 2.6 | Privacy validation logic (FORBIDDEN_KEYS, server+client) | ✅ Done | `backend/src/privacy/validatePayload.mjs`, `src/assessment/` |
| 2.7 | Governance framework (`humanReviewOnly`, `descriptive_only`, etc.) | ✅ Done | `docs/design/governance-framework.md` |
| 2.8 | Pen test / security audit reports | ⏳ Programado | OWASP ZAP baseline + Sentry + WAF logs |
| 2.9 | Dependency licenses (npm audit, ossf scorecard) | ✅ CI | GitHub Actions: gitleaks, npm audit, oxlint |
| 2.10 | Open source attributions | ✅ Done | `THIRD_PARTY_LICENSES.md` (generado en build) |

---

## 3. Product & Traction

| # | Documento | Estado | Ubicación / Notas |
|---|-----------|--------|-------------------|
| 3.1 | Product demo video (2–3 min) | ⏳ Pendiente | Grabar en stage.krumm.cl |
| 3.2 | Live demo environment | ✅ Listo | `stage.krumm.cl` (credenciales on request) |
| 3.3 | Pilot agreements (2 empresas) | ⏳ En negociación | Template: `docs/legal/piloto-b2b-contrato-template.md` |
| 3.4 | Pilot feedback / testimonials (autorizados) | ⏳ Post-beta | Target: 2 logos + quotes |
| 3.5 | User metrics (PostHog dashboard) | ⏳ Week 2 beta | Funnel, completion, NPS |
| 3.6 | Game completion rates, quality flags | ✅ Fixtures | `src/postulation-demo/postulationDemoFixture.js` |
| 3.7 | Battery comparison (stable_dg vs original) | ✅ Done | `docs/plans/2026-09-07-plan-exp7-bomb.md` §3 |
| 3.8 | Accessibility audit (WCAG 2.1 AA) | ⏳ G.1 | Lighthouse CI a11y=100 target |
| 3.9 | Browser/device compatibility matrix | ✅ Smoke | Chrome/Firefox/Safari, desktop/mobile, 1280×720 + 390×844 |

---

## 4. Privacy, Compliance & Security

| # | Documento | Estado | Ubicación / Notas |
|---|-----------|--------|-------------------|
| 4.1 | Política de Privacidad (GDPR + Ley 19.628) | ✅ Done | `docs/legal/politica-privacidad.md` |
| 4.2 | Términos de Servicio | ✅ Done | `docs/legal/terminos-de-servicio.md` |
| 4.3 | DPIA (Data Protection Impact Assessment) | ✅ Done | `docs/security/dpia.md` (resumen ejecutivo) |
| 4.4 | SECURITY.md (CSP, headers, threat model) | ✅ Done | `SECURITY.md` root + `docs/security/threat-model-v1.md` |
| 4.5 | Data Processing Agreement (DPA) template | ✅ Done | Anexo en `docs/legal/piloto-b2b-contrato-template.md` |
| 4.6 | SCC 2021/914 con AWS (transferencias internacionales) | ✅ Referenciado | DPA AWS aceptado en consola |
| 4.7 | Cookie policy + consent management | ✅ Done | Banner implementado, `cookie_consent` cookie |
| 4.8 | Incident response runbook | ✅ Done | `docs/ops/incident-response.md` |
| 4.9 | Data deletion request runbook (<24 h) | ✅ Done | `scripts/data-deletion-request.sh` |
| 4.10 | Backup / DR test report (PITR DynamoDB) | ⏳ G.4 | Ejercicio simulado Semana 7 |
| 4.11 | Sub-processor list (AWS, PostHog) | ✅ Done | DPA §A.9 |
| 4.12 | Records of processing activities (ROPA) | ⏳ Pendiente | Art. 30 GDPR — generar desde DPIA |

---

## 5. Financial

| # | Documento | Estado | Ubicación / Notas |
|---|-----------|--------|-------------------|
| 5.1 | Proyección financiera 3 años (P&L, Cash flow, BS) | ✅ Draft | `docs/investor/financial-model.xlsx` (crear) |
| 5.2 | Unit economics (COGS, CAC, LTV, payback, margin) | ✅ En pitch | Slide 8 pitch-deck.md |
| 5.3 | Cap table detallada + historial | ✅ Draft | Ver 1.7 |
| 5.4 | Quemado mensual actual (burn rate) | ✅ Track | ~$2K/mes (AWS + tools + founder living) |
| 5.5 | Runway actual | ✅ >24 meses | Sin sueldo founder; AWS $25 budget |
| 5.6 | Cuentas bancarias / Stripe / facturación | ✅ Done | Banco Estado + Stripe (pendiente activación) |
| 5.7 | Historical financials (desde constitución) | ✅ Simple | Gasto infra + legal + contractor |
| 5.8 | Tax compliance (IVA, PPM, declaraciones) | ✅ Al día | Contador externo mensual |

---

## 6. Commercial & GTM

| # | Documento | Estado | Ubicación / Notas |
|---|-----------|--------|-------------------|
| 6.1 | Pitch deck v1 | ✅ Draft | `docs/investor/pitch-deck.md` |
| 6.2 | One-pager / Executive summary | ⏳ Derivado | 1 pág desde pitch deck |
| 6.3 | Pricing page / rate card | ✅ En pitch | Slide 8 |
| 6.4 | Ideal Customer Profile (ICP) | ✅ Definido | Mid-market LATAM (200–5000 emp), Tech/Industrial/Services |
| 6.5 | Competitive battlecards | ✅ Draft | `docs/commercial/battlecards.md` |
| 6.6 | Sales pipeline (HubSpot / Notion / Linear) | ✅ Linear | Issues KRU-111 children + custom view |
| 6.7 | Partnership agreements (ATS, consultoras) | ⏳ Post-seed | Greenhouse, Lever, BambooHR targets |
| 6.8 | Marketing assets (website, blog, LinkedIn) | ✅ Live | krumm.cl, blog posts, LinkedIn page |

---

## 7. Science & Validation (R-7)

| # | Documento | Estado | Ubicación / Notas |
|---|-----------|--------|-------------------|
| 7.1 | R-6 technical study (construct→telemetry mapping) | ✅ Done | `docs/research/krumm-talent-game-behavior-mapping-technical-study.md` |
| 7.2 | T.1–T.6 outputs (trazabilidad, veredictos, posiciones) | ✅ Done | `docs/research/krumm-t4-metric-verdicts-2026-09-01.md`, `krumm-t6-theoretical-positions-2026-09-03.md` |
| 7.3 | Local signal sync audit (T.2) | ✅ Done | `docs/research/local-signal-sync-audit.md` |
| 7.4 | R-7 validation protocol design | ⏳ Draft | OSF pre-reg, ethics committee, N=200, power analysis |
| 7.5 | Research export instrumentation | ✅ Done | `src/telemetry/researchExport.js` |
| 7.6 | Academic advisor / psychometrician LOI | ⏳ Buscando | Target: PhD I/O Psych + publication record |

---

## 8. Operations & Team

| # | Documento | Estado | Ubicación / Notas |
|---|-----------|--------|-------------------|
| 8.1 | Org chart actual + hiring plan | ✅ Draft | Founder + 3 hires (eng, ML, DevOps) |
| 8.2 | Key personnel bios + LinkedIn | ✅ Listo | Carlos (PhD-c, IEEE), Nicolás (Biz), Benjamin (Ops) |
| 8.3 | Advisor agreements + bios | ✅ Done | `docs/legal/advisor-agreements/` |
| 8.4 | Employment / contractor agreements (Chile) | ✅ Standard | Contrato prestación servicios + IP assignment |
| 8.5 | ESOP plan (10% pre-seed) | ⏳ Legal review | Vesting 4 años, cliff 1 año, aceleración change of control |
| 8.6 | Compensation philosophy | ✅ Definida | Market 50th percentile + equity; remote-first |
| 8.7 | Offboarding / knowledge transfer process | ⏳ Doc | Runbook en `docs/ops/` |

---

## 9. Infrastructure & DevOps

| # | Documento | Estado | Ubicación / Notas |
|---|-----------|--------|-------------------|
| 9.1 | AWS account structure (org, OUs, SCPs) | ✅ Done | `infra/m1-iam-billing-stack.yaml` |
| 9.2 | SAM/CloudFormation templates (M1, M2, M3) | ✅ Done | `infra/*.yaml` |
| 9.3 | CI/CD pipelines (GitHub Actions OIDC) | ✅ Done | `.github/workflows/ci.yml`, `cd.yml`, `preview.yml` |
| 9.4 | Environments matrix (dev, stage, prod, preview) | ✅ Done | `docs/ops/environments.md` |
| 9.5 | Monitoring / alerting (CloudWatch, Discord webhooks) | ✅ Done | `hermes-alerts`, `krumm-auto`, `kanban` channels |
| 9.6 | GPU Lambda orchestration (Tier-1, cost $8.38/h) | ✅ Done | `scripts/launch_lambda.py`, `model_orchestrate.py` |
| 9.7 | Cost projection script + monthly FinOps | ⏳ F.3 | `scripts/cost-projection.sh` |
| 9.8 | Runbooks (deploy, rollback, DR, incident, data deletion) | ✅ Done | `docs/ops/*.md` |

---

## 10. Appendix — Request on Demand

| # | Documento | Disponibilidad |
|---|-----------|----------------|
| 10.1 | Full DPIA (versión completa, no resumen) | Bajo NDA |
| 10.2 | Pen test report completo | Bajo NDA |
| 10.3 | Source code access (read-only, time-boxed) | Bajo NDA + data room virtual |
| 10.4 | Customer references (piloto) | Post-beta, con autorización |
| 10.5 | Detailed financial model (Excel, assumptions) | Bajo NDA |
| 10.6 | Cap table fully diluted + waterfall | Bajo NDA |
| 10.7 | Reference calls (advisors, pilot customers) | Coordinado tras term sheet |

---

## Cómo usar este checklist

1. **Columnas:** Estado = ✅ Done / ⏳ En progreso / ❌ No iniciado / 🔒 Bajo NDA
2. **Compartir:** Data room virtual (Notion / Google Drive / Dropbox) con permisos granulares por carpeta
3. **Actualizar:** Semanalmente durante fundraising; versionar con fecha
4. **Q&A:** Cada item tiene dueño (Carlos = legal/tech/science; Nicolás = commercial/finance)

---

**Contacto Data Room:** carlos@krumm.cl | privacy@krumm.cl