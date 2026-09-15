# KRUMM Live Demo Script (2–3 minutes)

**Objetivo:** Presentar la plataforma KRUMM en vivo sobre `stage.krumm.cl` usando fixture seguro, sin grabar ni publicar video.
**Duración objetivo:** 2–3 minutos (120–180 segundos).
**Entorno:** `stage.krumm.cl` (modo real, `VITE_KRUMM_API_BASE` staging).
**Audiencia:** Inversores, partners, candidatos piloto, equipo interno.
**Principio rector:** *Human-review-only, descriptive-only, privacy-safe*. No claims de decisión automática, diagnóstico, personalidad, emoción, estrés, fatiga, sinceridad ni selección.

---

## 1. Preparación previa (antes de la llamada / reunión)

| Item | Verificación | Comando / Acción |
|------|--------------|------------------|
| **URL base** | `https://stage.krumm.cl` responde HTTP 200, TLS válido | `curl -I https://stage.krumm.cl` |
| **Fixture candidato** | `?fixture=1` carga reporte directo con banner "Datos sintéticos de demostración" | Abrir `https://stage.krumm.cl/postulaciones?fixture=1` |
| **Fixture empresa** | Login Cognito QA (`qa-recruiter@krumm.cl`) → workspace real con 11 sesiones | Credenciales en `/home/sarlock/.qa_creds/recruiter.txt` (chmod 600) |
| **Privacidad** | Banner de consentimiento PostHog visible solo si hay key; rutas `/postulaciones*` excluidas de autocapture | Verificado en `scripts/smoke-f1-posthog-2026-09-13.mjs` |
| **Fallback** | Si stage no responde → pantalla local `file:///.../demo-fallback.html` (ver §8) | Preparar archivo estático de respaldo |
| **Timing** | Cronómetro a mano (no grabar) | 120–180 s totales |

> **Nota:** No se graba video. El guion es para ejecución en vivo. Si se requiere registro, usar screen recording local con consentimiento explícito de todas las partes y borrar tras la reunión.

---

## 2. Guion cronometrado (120–180 s)

### 0:00–0:15 — Apertura y landing (15 s)
**Acción:** Abrir `https://stage.krumm.cl` en navegador (Chrome/Edge, 1280×720).
**Decir:**
> "Esta es KRUMM: evaluación de talento basada en evidencia, auditable y *human-first*. Lo que van a ver es el entorno de staging con datos reales de 11 sesiones de candidatos."
**Mostrar:** Hero con foto de marca, paleta v2 (beige/crema/arena/marrón/dorado), tipografía Archivo + Manrope. CTA "Iniciar sesión" (gold pill con flecha) en topbar. **No hacer click aún.**

### 0:15–0:35 — Flujo candidato con fixture seguro (20 s)
**Acción:** Nueva pestaña → `https://stage.krumm.cl/postulaciones?fixture=1`
**Decir:**
> "Aquí simulamos el final de una evaluación completa sin jugar. El fixture usa payload genuino del motor headless — 5 juegos en batería `stable_dg`, 8 constructos con señal provisional, reporte sin 'No medido'."
**Mostrar (scroll suave, 3–4 s por sección):**
1. Banner amarillo: "Datos sintéticos de demostración · Fixture local privacy-safe"
2. Resumen ejecutivo: 8 constructos, scores 0–100 provisionales, etiqueta "Score provisional"
3. Calidad de sesión: presencia facial, confianza, FPS, caveats si aplica
4. Perfil de capacidades: tarjetas por constructo (processingSpeed, visuomotorPrecision, inhibitoryControl, interferenceControl, visualSearchEfficiency, riskIntelligence, spatialPlanning, operationalPlanning)
5. Resultados por juego: métricas agregadas por juego (meanRT, hitAccuracy, dPrime, interferenceEffect, searchEfficiency, riskEfficiency, spatialPlanningComposite, operationalPlanningComposite)
6. Gobernanza: badges `humanReviewOnly` • `noAutomatedDecision` • `descriptive_only` • `privacySafe` + caveats explícitos
**No mostrar:** Descargas, bundle técnico, raw JSON (demasiado detalle para 2–3 min).

### 0:35–0:55 — Batería original (7 juegos) — mención verbal (20 s)
**Acción:** Volver a pestaña landing. **No navegar a `?battery=original&fixture=1`** (demora >30 s).
**Decir:**
> "La batería controlada `?battery=original` añade dos juegos novedosos: **BOMB** (memoria de trabajo procedimental, 9º constructo `proceduralWorkingMemory`) y **Sala de Control** (comunicación aplicada en coordinación, 10º constructo `appliedCommunication`). Total: 7 juegos, ~18–23 min, FeatureVector v2.3.0 con 60 features. Solo accesible vía flag controlado — no es la batería pública."
**Mencionar:** BOMB = 12 features `bomb.*` (retention_accuracy_rate, serial_position_accuracy, ...). Sala de Control = 7 features `comm.*` (critical_information_coverage, relevance_ratio, ...). Ambos `descriptive_only`, score null, sin baremos.

### 0:55–1:20 — Dashboard empresa (modo real) (25 s)
**Acción:** Pestaña landing → click "Iniciar sesión" (gold pill topbar) → Cognito hosted UI → login `qa-recruiter@krumm.cl` (password ya fijada) → redirect a `/empresa`
**Decir:**
> "Login real con Cognito (code flow + PKCE, JWT authorizer en Lambda, gate de grupo `recruiters`/`admins` enforceado en backend). El dashboard muestra KPIs de las 11 sesiones reales de staging."
**Mostrar (rápido, 5 s c/u):**
1. KPIs header: Sesiones totales, Completadas, En progreso, Promedio duración
2. Tabla `/empresa/procesos` con filtros **Periodo (7d/30d)** + **Estado (derivado)** — solo visibles en modo real
3. Click una fila → detalle candidato → brief de entrevista (`companyBrief.js`): descriptivo R-6, `score null` = sin señal, watermark `humanReviewOnly` en exports
4. Export: `.csv` BOM UTF-8 del proceso + `.md` por candidato
**Fallback si login falla:** "El modo demo público (`Explorar demo` en landing) muestra el mismo UI con datos sintéticos — sin autenticación."

### 1:20–1:40 — Privacidad, gobernanza y compliance (20 s)
**Acción:** En dashboard o reporte, señalar badges y copy.
**Decir:**
> "Tres capas de garantía: (1) **Privacidad por construcción** — solo agregados allowlist-only, 30-day TTL en DynamoDB, PITR 35d verificado, S3 versioning, DR runbook con RTO 223s. (2) **Governance** — `humanReviewOnly`, `noAutomatedDecision`, `descriptive_only`, `privacySafe` en cada reporte y export. (3) **Compliance** — NYC LL144 (no decisión automática), EU AI Act ready (low-risk, human-in-loop), Chile Ley 19.628. DPIA done, SECURITY.md con CSP m7, WAF CloudFront (CRS+KnownBadInputs), ZAP 0 critical/high, gitleaks PR-blocking."
**Mencionar:** PostHog opt-in (banner solo con key), `autocapture` OFF en `/postulaciones*`, NUNCA telemetría biométrica.

### 1:40–2:00 — Infra, costos y roadmap (20 s)
**Acción:** Volver a landing o mantener dashboard.
**Decir:**
> "Stack serverless AWS: S3+CloudFront, API Gateway HTTP + Lambda Node 20, DynamoDB on-demand, SES, Cognito. CI/CD GitHub Actions OIDC (zero static keys). **COGS/eval = $0.00078** (verificado en finops.md: Lambda 154 inv, DDB 92W/262R, CF 0.35 GB, APIGW 153 req, SES ok). Infra staging ≈$0.034/mes. Budget $25/mes → forecast $0.27. Lighthouse CI budgets: perf≥90, a11y=100, BP=100, SEO≥90; latest verified run: perf 80, a11y 100, BP 100, SEO 92 (`RootCauses/frame_sequence` remediation open). Sentry cloud free (5k errores/mes). Rate limit 10 req/min/IP en Lambda. Multi-tenancy `companyId` desplegado en staging; el aislamiento A/B real de Cognito sigue siendo un gate pendiente."
**Roadmap 18m (slide 12 pitch-deck):** Q4'26 beta 2 pilotos + multi-tenancy + ATS webhook → Q1'27 ATS Greenhouse/Lever + SSO + R-7 N=200 start → Q2'27 custom battery + LATAM expansion → Q3'27 Mobile PWA + EU/GDPR entry + Series A prep.

### 2:00–2:15 — Cierre y next steps (15 s)
**Acción:** Cerrar pestañas o dejar landing visible.
**Decir:**
> "KRUMM está preparado para el gate de piloto externo; todavía faltan la firma de 2 empresas y la verificación Cognito A/B antes del onboarding. R-7 (N=200) y Seed $500k–1.5M son objetivos posteriores. El data room checklist está en preparación en `docs/investor/data-room-checklist.md`. Demo live en `stage.krumm.cl`; prod en `krumm.cl` (v1.2.2 modo real). Próximos pasos: completar gates, cerrar pilotos, iniciar R-7, escalar equipo. ¿Preguntas?"

---

## 3. Límites y reglas de la demo

| Límite | Regla | Justificación |
|--------|-------|---------------|
| **Tiempo** | 120–180 s estricto | Respeto agenda; evita fatiga |
| **Fixtures** | Solo `?fixture=1` (5 juegos) y mención verbal de `original` | Fixture original 7 juegos tarda >30 s en cargar |
| **Login empresa** | Solo cuenta QA `qa-recruiter@krumm.cl` | Credenciales controladas, no exponer usuarios reales |
| **Cámara/biometría** | **No activar** en demo | Señal ausente = caveat, no desempeño bajo; evita dependencia de hardware/permiso |
| **PostHog** | No consentir banner (o consentir y explicar opt-in) | Demostrar que es opt-in, no obligatorio |
| **Descargas** | No descargar archivos en vivo | Evita abrir archivos, rompe fluidez |
| **Navegación** | Máx 3 pestañas abiertas simultáneas | Claridad visual |
| **Claims** | **Prohibido:** "detecta estrés", "mide personalidad", "recomienda contratar", "ranking", "puntuación definitiva" | Solo `descriptive_only`, `humanReviewOnly`, caveats |

---

## 4. Checklist de privacidad en vivo (verificar mentalmente antes de empezar)

- [ ] Rutas `/postulaciones*` excluidas de PostHog autocapture (verificado CSP m6 + analytics.js)
- [ ] Fixture `?fixture=1` banner "Datos sintéticos" visible
- [ ] Reporte muestra `humanReviewOnly` + `noAutomatedDecision` + `descriptive_only` + `privacySafe`
- [ ] Constructos provisionales con etiqueta "Score provisional" + caveat "Sin baremos poblacionales"
- [ ] `score: null` donde no hay señal (ej. `appliedCommunication`, `leadership`, `communication`)
- [ ] No raw biometrics, video, frames, landmarks, keypoints, action sequences en payload
- [ ] Email test E2E ya verificado (2 invitaciones SES reales entregadas 2026-09-14)

---

## 5. Fallback si stage.krumm.cl no responde

**Síntomas:** HTTP 5xx, timeout >10 s, TLS error, CloudFront error page.
**Acción inmediata (≤10 s):**
1. Cerrar pestaña stage.
2. Abrir archivo local: `file:///home/sarlock/krumm/test-mpfl/docs/demo/demo-fallback.html`
3. Decir: *"Tenemos un problema de red momentáneo con staging. Les muestro la versión estática de respaldo con los mismos datos."*

**Contenido `demo-fallback.html` (generar una vez):**
- Capturas de pantalla estáticas (PNG/WebP) de: landing, reporte fixture (5 secciones), dashboard empresa (KPIs, tabla, brief), badges gobernanza.
- Texto alternativo accesible.
- Enlace a pitch-deck.md y data-room-checklist.md en repo.
- Nota: "Demo estática de respaldo — staging en `stage.krumm.cl` cuando recupere."

**Generación rápida (una vez):**
```bash
# Desde stage.krumm.cl funcionando, capturar screenshots con Playwright
npx playwright install chromium
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('https://stage.krumm.cl', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'docs/demo/fallback-landing.png', fullPage: true });
  await page.goto('https://stage.krumm.cl/postulaciones?fixture=1', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'docs/demo/fallback-report.png', fullPage: true });
  await page.goto('https://stage.krumm.cl/empresa', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'docs/demo/fallback-dashboard.png', fullPage: true });
  await browser.close();
})();
"
```
Luego crear `demo-fallback.html` simple con `<img>` tags y copy del guion.

---

## 6. Contactos y escalación durante la demo

| Rol | Contacto | Cuándo usar |
|-----|----------|-------------|
| **Founder (Carlos)** | Discord DM `.sarlock` / carlos@krumm.cl | Decisiones de producto, claims, roadmap |
| **Infra (AWS/Cognito/SES)** | `aws_sso_login` + `aws_v4only.py` | Stage caído, Cognito down, SES bounce |
| **Frontend (build/deploy)** | GitHub Actions `cd.yml` run | Deploy fallido, CSP bloquea, bundle budget |
| **Privacidad/Legal** | privacy@krumm.cl | Preguntas GDPR, DPIA, DPA, data deletion |

---

## 7. Post-demo (inmediato)

1. **No dejar credenciales abiertas** — cerrar sesión Cognito (`logout` en CompanyShell).
2. **No compartir URLs de fixture** fuera de la reunión — son datos sintéticos pero exponen estructura de reporte.
3. **Registrar feedback** en Linear issue hijo de KRU-120 (H3) o kanban comment en `t_26fb484a`.
4. **Actualizar AGENTS.md** si hubo cambio de estado verificado (ej. "demo live stage verificada 2026-09-15").

---

## 8. Referencias cruzadas

- **Plan maestro:** `docs/plans/2026-09-12-next-phase-comprehensive-plan.md` (Fase H, KRU-120)
- **Pitch deck v1.1:** `docs/investor/pitch-deck.md` (slides 5, 12, 13)
- **Data room:** `docs/investor/data-room-checklist.md` (item 3.1 demo video pendiente → este script la sustituye)
- **QA smoke template:** `docs/demo/postulation-demo-qa-smoke-template.md` (matriz resoluciones, fallback cámara)
- **Fixtures:** `src/postulation-demo/postulationDemoFixture.js` (genuino headless payload)
- **Privacidad:** `docs/security/privacy-data-flow.md`, `backend/src/privacy/validatePayload.mjs`
- **FinOps:** `docs/ops/finops.md`, `scripts/cost-projection.sh`
- **Runbooks:** `docs/ops/environments.md`, `docs/ops/dr-backup.md`, `docs/ops/incident-response.md`

---

**Versión:** 1.0 (2026-09-15)
**Autor:** Hermes Agent (kanban task `t_26fb484a` — H3 ejecución)
**Estado:** Listo para uso en vivo. No versionar como código; actualizar solo si cambia staging o pitch.