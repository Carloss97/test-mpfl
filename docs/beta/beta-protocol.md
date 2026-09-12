# Protocolo de Beta Cerrada — KRUMM

**Versión:** 1.0
**Fecha:** 2026-09-12
**Objetivo:** Validar usabilidad, completitud, calidad de señal y valor percibido antes de lanzamiento comercial.

---

## 1. Alcance y Criterios de Entrada

| Criterio | Estado Requerido |
|----------|------------------|
| Funcionalidad plataforma (Fase A) | ✅ Invitaciones + Login real + Job board + Dashboard modo real |
| Juegos pre-lanzamiento (Fase B) | ✅ 12 juegos auditados (8 dimensiones c/u) |
| Legal/Soporte (Fase E) | ✅ Términos + Privacidad + Contrato firmado + FAQ + Widget feedback |
| Analytics (Fase F) | ✅ PostHog funnel operativo |
| Hardening (Fase G.1–G.4) | ✅ Lighthouse CI + Sentry + WAF + PITR |
| Multi-tenancy (Fase G.5) | ✅ 2 tenants aislados en staging |
| Contrato piloto firmado | ✅ Al menos 1 empresa (Anexo DPA) |

**Go/No-Go:** Todos los criterios ✅ + 0 bugs severity 1/2 abiertos + smoke matriz 6/6 verde.

---

## 2. Participantes

| Perfil | Cantidad | Reclutamiento |
|--------|----------|---------------|
| **Internos (KRUMM)** | 2–3 | Fundadores + equipo técnico |
| **Empresa Piloto 1** | 10–20 candidatos | Firma contrato + DPA |
| **Empresa Piloto 2** | 10–20 candidatos | Firma contrato + DPA (diferente sector/tamaño) |
| **Total candidatos** | **20–40** | |

**Inclusión:** Diversidad de roles (tech, ops, comercial, junior/senior), edades, dispositivos (desktop principal, móvil opcional).

---

## 3. Flujo de la Beta

### 3.1 Onboarding Empresa (Semana 0)
1. Firma contrato + DPA (docs/legal/piloto-b2b-contrato-template.md).
2. KRUMM crea tenant en staging + credenciales Cognito.
3. Sesión de onboarding 30 min (screen share): crear proceso, invitar candidatos, ver reportes, exports.
4. Empresa configura 1–2 procesos reales.

### 3.2 Invitación Candidatos (Semana 1–2)
1. Empresa envía invitaciones desde dashboard (email real via SES).
2. Candidato recibe email → click link → `/candidato/acceso` → pega token → consentimiento → evaluación.
3. **Métrica clave:** Tasa de conversión `invite_sent → invite_opened → consent_accepted → game_1_completed`.

### 3.3 Evaluación (Semana 1–6)
- Candidatos completan a su ritmo (link válido 72 h, re-envío si expira).
- Empresa monitorea dashboard en tiempo real.
- KRUMM soporte: `soporte@krumm.cl` (SLA 24 h) + Discord `#krumm-auto` alertas.

### 3.4 Cierre y Feedback (Semana 7–8)

#### 3.4.1 Encuesta Candidato (post-evaluación, opcional, anónima)
| Pregunta | Tipo |
|----------|------|
| ¿Qué tan clara fue la invitación y el acceso? | 1–5 Likert |
| ¿Qué tan claras fueron las instrucciones de los juegos? | 1–5 |
| ¿Sentiste que los juegos medían algo relevante para el puesto? | 1–5 |
| ¿Te sentiste cómodo/a con la duración total? | 1–5 |
| ¿Activaste la cámara? Si no, ¿por qué? | Abierta |
| ¿Qué mejorarías? | Abierta |
| NPS: ¿Recomendarías esta evaluación a un colega? | 0–10 |

#### 3.4.2 Entrevista Estructurada Empresa (30 min, grabada con consentimiento)
**Guion:**
1. **Usabilidad dashboard:** Crear proceso, invitar, filtrar, exportar — ¿fricciones?
2. **Calidad reporte:** ¿Entendiste los constructos? ¿Los caveats fueron claros? ¿Qué faltó?
3. **Decisión:** ¿El reporte influyó en tu criterio? ¿Cómo lo integraste con entrevista/CV?
4. **Confianza:** ¿Percibes que la evaluación es justa / sesgada? ¿Por qué?
4. **Valor:** ¿Pagarías por esto? ¿Cuánto? ¿Qué features faltan para pagar?
5. **Bugs / Issues:** ¿Algo falló? ¿Candidatos reportaron problemas?

#### 3.4.3 Métricas Cuantitativas (PostHog + Backend)
| Métrica | Target Beta |
|---------|-------------|
| Invite → Consent conversion | ≥70% |
| Consent → Game 1 completion | ≥85% |
| Game N completion (drop-off por juego) | <10% por juego |
| Full battery completion | ≥60% |
| Reporte visto por Empresa | 100% (por candidato evaluado) |
| Export descargado | ≥50% |
| Recruiter logins/semana | ≥2 |
| NPS Candidato | ≥30 |
| NPS Empresa | ≥40 |
| Bugs severity 1/2 reportados | 0 al cierre |
| Bugs severity 3/4 | <10 total |

---

## 4. Instrumentación y Observabilidad

### 4.1 PostHog Events (Funnel)
```javascript
// Enviados desde frontend (autocapture OFF en /postulaciones/*)
posthog.capture('invite_received', { companyId, processId, battery });
posthog.capture('invite_opened', { companyId, processId, tokenValid: true });
posthog.capture('consent_accepted', { companyId, processId, cameraOptIn: boolean });
posthog.capture('game_started', { companyId, processId, sessionId, gameId, battery });
posthog.capture('game_completed', { companyId, processId, sessionId, gameId, durationMs });
posthog.capture('report_viewed', { companyId, processId, sessionId, by: 'candidate'|'recruiter' });
posthog.capture('export_downloaded', { companyId, processId, format: 'csv'|'md', by: 'recruiter' });
posthog.capture('recruiter_login', { companyId, tenant: 'real'|'demo' });
```

### 4.2 Backend Metrics (CloudWatch + DynamoDB)
- Sesiones iniciadas/completadas por battery/tenant.
- Duración p50/p95 por juego y total.
- `privacy_validation_failures` counter.
- Quality flags agregados (`low_signal`, `high_blur`, `camera_off`).

### 4.3 Error Tracking (Sentry)
- Solo rutas, códigos de error, stack traces **sin payloads de sesión**.
- Alertas: >5 errores/hora en `/postulaciones/*` o `/empresa/*`.

---

## 5. Cadencia y Rituales

| Ritual | Frecuencia | Participantes | Output |
|--------|------------|---------------|--------|
| **Daily standup interno** | Diario (15 min) | Equipo KRUMM | Bugs críticos, bloqueos, PRs |
| **Sync Empresa (piloto 1)** | Quincenal (30 min) | KRUMM + Empresa 1 | Feedback cualitativo, ajustes |
| **Sync Empresa (piloto 2)** | Quincenal (30 min) | KRUMM + Empresa 2 | Feedback cualitativo, ajustes |
| **Beta Review Semanal** | Viernes (45 min) | Equipo KRUMM | Métricas PostHog, bugs, decisiones |
| **Go/No-Go Launch** | Semana 8 | Fundadores + Advisors | Decisión documentada + acción |

---

## 6. Gestión de Issues y Feedback

### 6.1 Widget Feedback (en-app)
- Botón flotante (FeedbackWidget.jsx) en todas las shells (CandidateShell, CompanyShell, Landing).
- Tipos: **Bug** (reproducción, severidad), **Sugerencia**, **General**.
- Contexto auto: `url`, `battery`, `gameId`, `UA`, `viewport`, `locale`, `tenant` (sin PII de sesión).
- Envío: webhook `DISCORD_ALERTS_WEBHOOK_URL` (infra existente) + opcional Linear API (crea issue en KRU).

### 6.2 Triage Semanal (Viernes)
1. Revisar feedback widget + emails soporte + Discord alerts.
2. Clasificar: **P0** (bloquea evaluación), **P1** (degrada experiencia), **P2** (mejora), **P3** (nice-to-have).
3. Asignar a kanban (hermes kanban create) con parent `t_0aeb2bbe` (Fase B) o nueva card.
4. Comunicar a Empresas: "Fix en PR #X, deploy stage [fecha], prod [tag]".

---

## 7. Criterios de Salida (Definition of Done Beta)

| Criterio | Evidencia |
|----------|-----------|
| **0 bugs P0/P1** abiertos | Kanban filtrado severity 1/2 = 0 |
| **Funnel conversion** ≥ targets | PostHog dashboard screenshot + CSV export |
| **NPS Candidato** ≥30 | Encuesta resultados (anónimos) |
| **NPS Empresa** ≥40 | Entrevista notas + puntuación |
| **2 contratos piloto** firmados | PDFs firmados en docs/legal/ |
| **Multi-tenancy verificado** | 2 tenants staging aislamiento 403 probado |
| **Hardening gates** verdes | Lighthouse CI + ZAP 0 crit/high + PITR test |
| **Documentación final** | AGENTS.md sync, 12 módulos juegos, 4 runbooks, pitch deck v1 |
| **Decisión Go/No-Go** | Acta firmada por fundadores |

---

## 8. Riesgos y Mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|------------|
| Baja conversión invite→consent | Media | Alto | Onboarding empresa mejorado; email template optimizado; recordatorio 24h |
| Candidatos abandonan en juego 3/4 | Media | Medio | Micro-intro G.2 done; práctica sin puntaje; feedback visual inmediato |
| Empresa no usa dashboard | Baja | Alto | Onboarding hands-on; sync quincenal obligatorio; métricas de uso trackeadas |
| Bug crítico en prod durante beta | Baja | Crítico | Stage.krumm.cl idéntico a prod; PR preview por cambio; rollback <5 min |
| Privacidad: captura accidental biométrica | Muy baja | Crítico | Tests privacidad obligatorios en CI; FORBIDDEN_KEYS scan server+client; DPIA |
| Fatiga candidatos (batería 7 juegos) | Media | Medio | Medir drop-off por juego; si >15% en juego 6/7 → discutir `original_extended` |
| SES no sale de sandbox | Baja | Bloquea | Iniciar request Semana 0; fallback: invitaciones manuales email propio |

---

## 9. Entregables Post-Beta

1. **Informe Beta Final** (`docs/beta/beta-final-report.md`): métricas, feedback, bugs, decisiones.
2. **Dataset anonimizado** para validación R-7 (N=20–40, base para power analysis).
3. **Testimonios** (autorizados) para pitch deck H.3.
4. **Roadmap ajustado** (H.4) basado en learnings.
5. **Contratos comerciales** negociados (si Go).

---

## 10. Aprobación

**Fundador/CEO:** _________________________ **Fecha:** _______________

**Asesor/Board (si aplica):** _________________________ **Fecha:** _______________