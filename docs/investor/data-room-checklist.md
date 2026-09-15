# Data Room Checklist — KRUMM (Pre-Seed / Seed)

**Versión:** 1.1
**Fecha de auditoría:** 2026-09-15
**Estado:** Auditoría repo-only completada; pendientes externos separados explícitamente

---

## 1. Corporate & Legal

| # | Documento | Estado | Ubicación / URL | Owner | Sensibilidad |
|---|-----------|--------|-----------------|-------|--------------|
| 1.1 | Escritura de constitución sociedad (KRU-53) | ⏳ No disponible en repo | Documento societario en data room seguro; no archivado en este repo | Founder/CEO | 🔒 Confidencial |
| 1.2 | Estatutos / Bylaws | ⏳ No disponible en repo | Documento societario en data room seguro; no archivado en este repo | Founder/CEO | 🔒 Confidencial |
| 1.3 | Certificado de vigencia (Conservador de Bienes Raíces) | ⏳ No disponible en repo | Certificado externo; no archivado en este repo | Founder/CEO | 🔒 Confidencial |
| 1.4 | RUT y giro comercial | ⏳ No disponible en repo | Documento tributario externo; no archivado en este repo | Founder/CEO | 🔒 Confidencial |
| 1.5 | Directorio / Representación legal | ⏳ Por confirmar | Documento societario en data room seguro; nombres omitidos en este checklist | Founder/CEO | Público |
| 1.6 | Pacto de accionistas / Shareholders Agreement | ⏳ Pendiente | Pre-seed: SAFE simple; post-seed: SHA estándar | Founder/CEO | 🔒 Confidencial |
| 1.7 | Cap table actualizada | ⚠️ Draft no verificable | Borrador incluido en checklist; versión firmada no archivada en repo | Founder/CEO | 🔒 Confidencial |
| 1.8 | Trademark "KRUMM" (IMPI/INAPI) | ⏳ Por confirmar | No hay expediente de marca en el repo; validar estado con asesoría legal | Founder/CEO | Interno |
| 1.9 | Domain ownership (krumm.cl) | ⏳ Por confirmar | Dominio operativo; evidencia registral no archivada en este repo | Co-founder/Commercial | Público |
| 1.10 | Contratos de prestación de servicios (advisors, consultants) | ⏳ No disponible en repo | `docs/legal/` no contiene `advisor-agreements/`; solicitar copias en data room seguro | Founder/CEO | 🔒 Confidencial |
| 1.11 | Employee / contractor IP assignment agreements | ⏳ No disponible en repo | No hay contratos archivados en `docs/legal/`; solicitar copias firmadas en data room seguro | Founder/CEO | 🔒 Confidencial |
| 1.12 | Insurance (cyber, E&O, D&O) | ⏳ Por confirmar | No hay pólizas/cotizaciones archivadas en el repo | Co-founder/Commercial | Interno |

---

## 2. Intellectual Property & Technology

| # | Documento | Estado | Ubicación / URL | Owner | Sensibilidad |
|---|-----------|--------|-----------------|-------|--------------|
| 2.1 | Repo GitHub (privado) — acceso read-only para DD | ✅ Listo | URL/acceso por canal seguro de DD | Founder/CEO | 🔒 Confidencial |
| 2.2 | Architecture diagram + tech stack doc | ✅ Done | `docs/design/krumm-postulation-sdd.md` + `docs/plans/2026-09-12-next-phase-comprehensive-plan.md` | Founder/CEO | Interno |
| 2.3 | Game specifications (EXP-BOMB-001, EXP-COMM-001) | ✅ Done | `docs/spec/EXP-BOMB-001/`, `docs/spec/EXP-COMM-001/` | Founder/CEO | Interno |
| 2.4 | Feature vector versions (2.0 → 2.3.0) + changelog | ✅ Done | `src/telemetry/assessmentFeatureVector.js` + `docs/design/modulos/` | Founder/CEO | Interno |
| 2.5 | Telemetry schemas (game_event_v1, assessment_feature_vector_v2) | ✅ Done | `docs/product/krumm-data-signal-inference-contract.md` + `src/telemetry/` | Founder/CEO | Interno |
| 2.6 | Privacy validation logic (FORBIDDEN_KEYS, server+client) | ✅ Done | `backend/src/privacy/validatePayload.mjs`, `src/assessment/` | Founder/CEO | 🔒 Confidencial |
| 2.7 | Governance framework (`humanReviewOnly`, `descriptive_only`, etc.) | ✅ Done | `docs/product/krumm-data-signal-inference-contract.md` | Founder/CEO | Público |
| 2.8 | Pen test / security audit reports | ✅ Parcial | `docs/security/security-waf-zap.md` + `docs/security/g3-zap-baseline-2026-09-14/` (0 critical/high; WAF edge verification pendiente) | Founder/CEO | 🔒 Confidencial |
| 2.9 | Dependency licenses / security gates | ✅ CI | `.github/workflows/ci.yml` + `.github/workflows/lighthouse.yml` (gitleaks, audit, oxlint) | Founder/CEO | Público |
| 2.10 | Open source attributions | ⏳ No disponible en repo | No existe `THIRD_PARTY_LICENSES.md` versionado; generar antes de compartir | Founder/CEO | Público |

---

## 3. Product & Traction

| # | Documento | Estado | Ubicación / URL | Owner | Sensibilidad |
|---|-----------|--------|-----------------|-------|--------------|
| 3.1 | Product demo video (2–3 min) | ⏳ Pendiente | No hay video versionado; guion en `docs/demo/live-demo-script.md` | Co-founder/Commercial | Público |
| 3.2 | Live demo environment | ✅ Listo | `https://stage.krumm.cl` (acceso controlado; no incluir credenciales aquí) | Founder/CEO | Público |
| 3.3 | Pilot agreements (2 empresas) | ⏳ En negociación | `docs/legal/piloto-b2b-contrato-template.md` | Co-founder/Commercial | 🔒 Confidencial |
| 3.4 | Pilot feedback / testimonials (autorizados) | ⏳ Post-beta | No hay testimonios autorizados archivados en el repo | Co-founder/Commercial | 🔒 Confidencial |
| 3.5 | User metrics (PostHog dashboard) | ✅ Configurado | `docs/ops/metrics.md` + `https://us.posthog.com/project/607324` (acceso restringido) | Founder/CEO | Interno |
| 3.6 | Game completion rates, quality flags | ✅ Fixtures | `src/postulation-demo/postulationDemoFixture.js` | Founder/CEO | Interno |
| 3.7 | Battery comparison (stable_dg vs original) | ✅ Done | `docs/plans/2026-09-07-plan-exp7-bomb.md` §3 | Founder/CEO | Interno |
| 3.8 | Accessibility audit (WCAG 2.1 AA) | ⚠️ En verificación | `.github/workflows/lighthouse.yml` + `docs/qa/` (gate a11y 100; medición todavía fluctuante) | Founder/CEO | Público |
| 3.9 | Browser/device compatibility matrix | ⚠️ Parcial | `docs/qa/` smoke reports; no matrix canónica única versionada | Founder/CEO | Público |

---

## 4. Privacy, Compliance & Security

| # | Documento | Estado | Ubicación / URL | Owner | Sensibilidad |
|---|-----------|--------|-----------------|-------|--------------|
| 4.1 | Política de Privacidad (GDPR + Ley 19.628) | ✅ Done | `docs/legal/politica-privacidad.md` | Founder/CEO | Público |
| 4.2 | Términos de Servicio | ✅ Done | `docs/legal/terminos-de-servicio.md` | Founder/CEO | Público |
| 4.3 | DPIA (Data Protection Impact Assessment) | ⏳ Borrador | `docs/legal/dpia-draft.md` (requiere revisión/firma legal) | Founder/CEO | 🔒 Confidencial |
| 4.4 | SECURITY.md (CSP, headers, threat model) | ✅ Done | `docs/security/SECURITY.md` + `docs/security/threat-model-v1.md` | Founder/CEO | Público |
| 4.5 | Data Processing Agreement (DPA) template | ✅ Done | Anexo en `docs/legal/piloto-b2b-contrato-template.md` | Founder/CEO | 🔒 Confidencial |
| 4.6 | SCC 2021/914 con AWS (transferencias internacionales) | ⏳ Por confirmar | Aceptación/evidencia contractual en consola AWS; no archivada en repo | Founder/CEO | 🔒 Confidencial |
| 4.7 | Cookie policy + consent management | ✅ Implementado | `src/analytics/` + `docs/ops/metrics.md` | Founder/CEO | Público |
| 4.8 | Incident response runbook | ⏳ No disponible en repo | No existe `docs/ops/incident-response.md`; definir y revisar antes de DD | Founder/CEO | Interno |
| 4.9 | Data deletion request runbook (<24 h) | ⏳ No disponible en repo | No existe `scripts/data-deletion-request.sh`; definir procedimiento controlado | Founder/CEO | Interno |
| 4.10 | Backup / DR test report (PITR DynamoDB) | ✅ Done | `docs/ops/dr-backup.md` (ejercicio PASS, RTO 223 s) | Founder/CEO | 🔒 Confidencial |
| 4.11 | Sub-processor list (AWS, PostHog) | ⏳ Por confirmar | Referenciado en `docs/legal/piloto-b2b-contrato-template.md`; anexo formal no separado | Founder/CEO | Interno |
| 4.12 | Records of processing activities (ROPA) | ⏳ Pendiente | Art. 30 GDPR — generar desde DPIA | Founder/CEO | 🔒 Confidencial |

---

## 5. Financial

| # | Documento | Estado | Ubicación / URL | Owner | Sensibilidad |
|---|-----------|--------|-----------------|-------|--------------|
| 5.1 | Proyección financiera 3 años (P&L, Cash flow, BS) | ⏳ No disponible en repo | No existe `docs/investor/financial-model.xlsx`; preparar fuera del repo seguro | Co-founder/Commercial | 🔒 Confidencial |
| 5.2 | Unit economics (COGS, CAC, LTV, payback, margin) | ⚠️ Parcial | `docs/investor/pitch-deck.md` (hipótesis; validar con contabilidad y ventas) | Co-founder/Commercial | 🔒 Confidencial |
| 5.3 | Cap table detallada + historial | ⏳ No disponible en repo | La fila 1.7 es un borrador no verificable en repo; mantener versión firmada en data room seguro | Founder/CEO | 🔒 Confidencial |
| 5.4 | Quemado mensual actual (burn rate) | ⏳ Por confirmar | No hay ledger financiero versionado en repo; preparar evidencia contable | Co-founder/Commercial | Interno |
| 5.5 | Runway actual | ⏳ Por confirmar | No calculable desde archivos canónicos del repo; requiere caja, burn y supuestos aprobados | Co-founder/Commercial | Interno |
| 5.6 | Cuentas bancarias / Stripe / facturación | ⏳ No disponible en repo | Evidencia financiera externa; no archivar números de cuenta aquí | Co-founder/Commercial | 🔒 Confidencial |
| 5.7 | Historical financials (desde constitución) | ⏳ No disponible en repo | Preparar extractos/resumen contable en data room seguro | Co-founder/Commercial | 🔒 Confidencial |
| 5.8 | Tax compliance (IVA, PPM, declaraciones) | ⏳ Por confirmar | Evidencia tributaria externa; validar con contador | Co-founder/Commercial | 🔒 Confidencial |

---

## 6. Commercial & GTM

| # | Documento | Estado | Ubicación / URL | Owner | Sensibilidad |
|---|-----------|--------|-----------------|-------|--------------|
| 6.1 | Pitch deck v1 | ✅ Draft | `docs/investor/pitch-deck.md` | Founder/CEO | 🔒 Confidencial |
| 6.2 | One-pager / Executive summary | ⏳ Derivado | No existe one-pager separado; derivar de `docs/investor/pitch-deck.md` | Co-founder/Commercial | 🔒 Confidencial |
| 6.3 | Pricing page / rate card | ⚠️ Hipótesis | `docs/investor/pitch-deck.md`; validar antes de compartir como tarifa | Co-founder/Commercial | Interno |
| 6.4 | Ideal Customer Profile (ICP) | ✅ Definido | `docs/investor/pitch-deck.md` (confirmar alcance comercial) | Co-founder/Commercial | Público |
| 6.5 | Competitive battlecards | ⏳ No disponible en repo | No existe `docs/commercial/battlecards.md`; preparar evidencia separada | Co-founder/Commercial | 🔒 Confidencial |
| 6.6 | Sales pipeline (HubSpot / Notion / Linear) | ⏳ Por confirmar | Sistema comercial externo; no hay export canónico en repo | Co-founder/Commercial | Interno |
| 6.7 | Partnership agreements (ATS, consultoras) | ⏳ Post-seed | No hay acuerdos archivados; registrar solo después de firma | Co-founder/Commercial | 🔒 Confidencial |
| 6.8 | Marketing assets (website, blog, LinkedIn) | ⚠️ Parcial | `https://krumm.cl`; blog/LinkedIn no tienen evidencia canónica en repo | Co-founder/Commercial | Público |

---

## 7. Science & Validation (R-7)

| # | Documento | Estado | Ubicación / URL | Owner | Sensibilidad |
|---|-----------|--------|-----------------|-------|--------------|
| 7.1 | R-6 technical study (construct→telemetry mapping) | ✅ Done | `docs/research/krumm-talent-game-behavior-mapping-technical-study.md` | Founder/CEO | Interno |
| 7.2 | T.1–T.6 outputs (trazabilidad, veredictos, posiciones) | ✅ Done | `docs/research/krumm-t4-metric-verdicts-2026-09-01.md`, `docs/research/krumm-t6-theoretical-positions-2026-09-03.md` | Founder/CEO | Interno |
| 7.3 | Local signal sync audit (T.2) | ✅ Done | `docs/research/local-signal-sync-audit.md` | Founder/CEO | Interno |
| 7.4 | R-7 validation protocol design | ⏳ Draft | `docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md` (no preregistro/ética verificable en repo) | Founder/CEO | Interno |
| 7.5 | Research export instrumentation | ✅ Done | `src/telemetry/researchExport.js` | Founder/CEO | Interno |
| 7.6 | Academic advisor / psychometrician LOI | ⏳ Buscando | No hay LOI archivada; coordinar externamente | Founder/CEO | 🔒 Confidencial |

---

## 8. Operations & Team

| # | Documento | Estado | Ubicación / URL | Owner | Sensibilidad |
|---|-----------|--------|-----------------|-------|--------------|
| 8.1 | Org chart actual + hiring plan | ⏳ No disponible en repo | No hay organigrama/plan de contratación canónico versionado | Founder/CEO | Interno |
| 8.2 | Key personnel bios + LinkedIn | ⏳ No disponible en repo | No hay bios verificables archivadas en el repo | Founder/CEO | 🔒 Confidencial |
| 8.3 | Advisor agreements + bios | ⏳ No disponible en repo | `docs/legal/` no contiene `advisor-agreements/` | Founder/CEO | 🔒 Confidencial |
| 8.4 | Employment / contractor agreements (Chile) | ⏳ No disponible en repo | Solicitar contratos firmados en data room seguro | Founder/CEO | 🔒 Confidencial |
| 8.5 | ESOP plan | ⏳ Legal review | No hay plan firmado archivado; validar con asesoría legal | Founder/CEO | 🔒 Confidencial |
| 8.6 | Compensation philosophy | ⏳ No disponible en repo | No hay política canónica versionada | Co-founder/Commercial | Interno |
| 8.7 | Offboarding / knowledge transfer process | ⏳ No disponible en repo | No existe runbook específico en `docs/ops/` | Founder/CEO | Interno |

---

## 9. Infrastructure & DevOps

| # | Documento | Estado | Ubicación / URL | Owner | Sensibilidad |
|---|-----------|--------|-----------------|-------|--------------|
| 9.1 | AWS account structure (org, OUs, SCPs) | ⚠️ Parcial | `infra/m1-iam-billing-stack.yaml`; no hay inventario completo de org/OUs/SCPs en repo | Founder/CEO | 🔒 Confidencial |
| 9.2 | SAM/CloudFormation templates (M1, M2, M3) | ✅ Done | `infra/m1-frontend-stack.yaml`, `infra/m1-iam-billing-stack.yaml`, `infra/m2-backend-stack.yaml` | Founder/CEO | Interno |
| 9.3 | CI/CD pipelines (GitHub Actions OIDC) | ✅ Done | `.github/workflows/ci.yml`, `cd.yml`, `preview.yml` | Founder/CEO | Interno |
| 9.4 | Environments matrix (dev, stage, prod, preview) | ✅ Done | `docs/ops/environments.md` | Founder/CEO | Interno |
| 9.5 | Monitoring / alerting | ⚠️ Parcial | `docs/security/error-tracking.md` + `docs/ops/metrics.md`; canales/webhooks se gestionan fuera del repo | Founder/CEO | Interno |
| 9.6 | GPU Lambda orchestration | ✅ Implementado | `scripts/launch_lambda.py`; automatización adicional fuera de este repo (costos deben validarse en cuenta) | Founder/CEO | Interno |
| 9.7 | Cost projection script + monthly FinOps | ✅ Done | `scripts/cost-projection.sh` + `docs/ops/finops.md` | Founder/CEO | Interno |
| 9.8 | Runbooks (deploy, rollback, DR, incident, data deletion) | ⚠️ Parcial | `docs/ops/environments.md`, `docs/ops/dr-backup.md`; incident/data deletion pendientes | Founder/CEO | Interno |

---

## 10. Appendix — Request on Demand

| # | Documento | Estado | Disponibilidad / URL | Owner | Sensibilidad |
|---|-----------|--------|----------------------|-------|--------------|
| 10.1 | Full DPIA (versión completa, no resumen) | ⏳ Pendiente | `docs/legal/dpia-draft.md` es solo borrador; versión final bajo NDA tras revisión legal | Founder/CEO | 🔒 Confidencial |
| 10.2 | Pen test report completo | ⏳ Pendiente | `docs/security/g3-zap-baseline-2026-09-14/` contiene baseline; informe completo no archivado | Founder/CEO | 🔒 Confidencial |
| 10.3 | Source code access (read-only, time-boxed) | ⏳ Bajo solicitud | Repo GitHub privado; otorgar acceso temporal y revocable | Founder/CEO | 🔒 Confidencial |
| 10.4 | Customer references (piloto) | ⏳ Post-beta | Requiere autorización de clientes; no hay referencias archivadas | Co-founder/Commercial | 🔒 Confidencial |
| 10.5 | Detailed financial model (Excel, assumptions) | ⏳ Pendiente | No existe workbook en repo; entregar solo en data room seguro | Co-founder/Commercial | 🔒 Confidencial |
| 10.6 | Cap table fully diluted + waterfall | ⏳ Pendiente | Versión firmada no archivada en repo; entregar solo bajo NDA | Founder/CEO | 🔒 Confidencial |
| 10.7 | Reference calls (advisors, pilot customers) | ⏳ Por coordinar | Solo después de consentimiento y term sheet | Co-founder/Commercial | 🔒 Confidencial |

---

## Cómo usar este checklist

1. **Columnas:** Estado distingue evidencia presente, parcial, pendiente y elementos que requieren confirmación externa.
2. **Compartir:** Data room virtual con permisos granulares por carpeta; nunca poner credenciales, secretos, PII o biometría en este checklist.
3. **Actualizar:** Antes de cada DD y después de cada cambio material; versionar con fecha.
4. **Q&A:** Cada item tiene dueño (Founder/CEO = legal/tech/science; Co-founder/Commercial = commercial/finance).
5. **Alcance de esta versión:** las rutas locales fueron comprobadas contra el árbol actual del repo; una ruta ausente no se presenta como entregable. Las evidencias de AWS, Cloudflare, PostHog, cuentas bancarias, contratos firmados y referencias de clientes deben verificarse en sus sistemas autorizados.

---

**Contacto Data Room:** owner corporativo, por canal seguro