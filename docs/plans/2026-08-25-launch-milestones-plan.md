# KRUMM — Plan de Hitos hacia Lanzamiento (Piloto B2B controlado)

> **For Hermes:** Ejecutar por fases con scope-driven development (PDD delta → SDD → RED/GREEN → gates → smoke). No hacer commit/push sin instrucción explícita del usuario.

**Fecha:** 2026-08-25
**Goal:** Llevar la demo R-6d a un lanzamiento de piloto B2B controlado (~primera semana nov 2026), incluyendo dos fases nuevas solicitadas: mejora significativa de experiencias/juegos (Fase G) y revisión teórica de señales/métricas para inferencia (Fase T).
**Arquitectura:** Frontend Vite/React existente (aggregate-only) + backend AWS serverless (S3+CloudFront, API Gateway+Lambda, DynamoDB, SES, Cognito), free tier first.
**Estado de partida:** R-0 a R-6d completadas (405 tests, build/audit limpios). R-7 pendiente con participantes. `docs/plans/commercial-elevation-plan.md` es el antecedente B→F; este plan lo re-calibra con IA asistida y agrega G/T.

---

## Supuestos

- 1 desarrollador (fundador) + trabajo asistido por IA: hitos de ingeniería comprimidos ~40–60% vs plan comercial original.
- Los hitos externos (legal/DPO, comité ética, reclutamiento N=200) NO se comprimen: encargar temprano en paralelo.
- Lanzamiento = piloto controlado con claims `descriptive_only` / `humanReviewOnly`; no requiere R-7 terminado.
- AWS free tier como objetivo de costo; evitar RDS/ECS/K8s hasta Fase F.

## Resumen de fases

| Fase | Nombre | Duración | Fechas aprox. |
|---|---|---|---|
| M0 | Consolidación repo + baseline | 2–3 días | 31 ago – 2 sep |
| M1 | Infra base AWS | 3–4 días | 3 – 8 sep |
| M2 | Backend aggregate-only | 2 semanas | 9 – 22 sep |
| M3 | Invitaciones + consentimiento | 1 semana | 23 – 29 sep |
| M4 | Recruiter Dashboard v1 real | 1–1.5 semanas | 30 sep – 9 oct |
| M5 | Seguridad/privacidad/CI guards | 1.5–2 semanas | 12 – 23 oct |
| M6 | Hardening + beta cerrada → LANZAMIENTO | 1 semana | 26 – 30 oct (lanzamiento ~3–6 nov) |
| G | Mejora juegos/UI/UX/experiencia | paralelo, 4–5 semanas | sep – oct (antes de M5 si posible) |
| T | Revisión teórica señales↔métricas↔constructo | paralelo, 3–4 semanas | sep – oct |
| P1 | Observabilidad CloudWatch | 1 semana | oct, paralelo |
| P2 | Protocolo R-7 validación (externo) | arranca sep; 3–5 meses | sep 2026 – feb 2027 |

Regla de orden: **G y T deben cerrar antes de M5/M6** (congelar producto para hardening y beta). Si compiten por tiempo, G prioriza UX fricciones del flujo candidato; T prioriza sincronización/calidad de señal local.

---

## FASE M0 — Consolidación repo + baseline (31 ago – 2 sep)

**Estado:** [x] Completada (2026-08-26)
**Objetivo:** Partir de un estado limpio y verificable.

**Tareas:**
- [x] Revisar cambios sin commit — consolidados en `aef0806` (test BalloonRisk, `docs/design/`, plan comercial); binarios AWS removidos del tracking con `.gitignore` en `3382fae` (quedan en historial por decisión del usuario).
- [x] Correr gates completos y registrar evidencia:
  - `NODE_ENV=test npx vitest run --pool=threads --reporter=default` → 96 archivos, 405/405 tests verdes.
  - `npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js` → 0 errores, 6 warnings pre-existentes (unused vars, sin cambios funcionales).
  - `npm run build` → OK (7.4s). `npm audit --audit-level=high --omit=dev` → 0 vulnerabilidades tras `npm audit fix` (brace-expansion, nanoid vía dev-transitivas). `git diff --check` → limpio.
- [x] Smoke navegador stable + original + fixtures, desktop y móvil → Playwright headless (`scripts/m0-smoke.cjs`) sobre Vite dev: 5 casos OK (stable/original fixture desktop+móvil, landing móvil, HR dashboard) sin errores de consola/page errors/request failures ni overflow horizontal.

**Gates:** suite verde, build OK, audit 0 high, smokes sin fallos. Evidencia en este doc (§ Evidencia).

**Correcciones incluidas (regresión i18n del commit `c3989de` "en/es"):**
1. Fallback `useLanguage()` sin provider devolvía inglés (`(es,en)=>(en??es)`); ahora español-first con soporte de params (`format(es ?? en, params)`) — `src/i18n/LanguageContext.jsx`.
2. `<UnifiedGameBattery>` fue desmontado accidentalmente de `App.jsx`; restaurado (import + render).
3. TeamCoordinationPostulationTask mostraba texto EN incondicional (`titleEn ?? title`, etc. ×10); invertido a español-first.
4. Tests desactualizados vs copy/i18n actuales: SignalReadinessPanel ("Listo de señal"), PostulationQaFixes DG-0 (labels via `t(...)`), sessionBuilder privacy check (flags guard verificados como `false` en vez de banear substring `"stimuli"`, que es un flag seguro `rawStimuliStored:false`).

## FASE M1 — Infra base AWS (3 – 8 sep)

**Estado:** [x] **Completada (2026-08-27 21:30 UTC)** — **infra core completa**: stack **UPDATE_COMPLETE** (headers 2026-08-27); `dist/` deployado y **byte-ídem en S3** (2026-08-27: `aws s3 sync --dryrun --delete` = 0 ops) y verificado con curl: `/postulaciones-demo` 200 (index no-cache), assets 200, SPA fallback 404→index.html 200. **Headers seguridad verificados 2026-08-27 02:49 UTC** (CSP/HSTS/XFO/Referrer/nosniff/XSS en SPA y assets vía `curl -I`; `cfn-lint` 0 errores; evidencia en tarea de headers abajo). **Gates de navegador PASADOS 2026-08-27** (Chrome host vía CDP 9222): landing + fixture `?fixture=1` (stable) + `?fixture=1&battery=original`, desktop 780px y móvil 390×844 — consola limpia, 0 page errors, 0 request failures, 0 overflow horizontal; reportes fixture completos sin copias «No medido»/«Solo descriptivo»; copy de gobernanza correcto (no implica validez psicométrica; no ranking ni decisión automática; cámara = calidad/contexto). **IAM mínimo privilegio + alarmas Billing DEPLOYADOS y verificados end-to-end 2026-08-27 21:30 UTC** (stack `krumm-m1-iam-billing-staging` CREATE_COMPLETE; e2e SSO→rol reservado→assume-role con controles +/−; presupuesto $25/mes ACTUAL; runbook idempotente `scripts/m1-iam-billing-deploy.sh`). **Único item abierto:** Route53 + ACM subdominio (diferido hasta dominio propio — dependiente externo) + confirmación del email SNS por el usuario.
**Objetivo:** Hosting estático productivo con dominio y HTTPS.

**Tareas:**
- [x] Cuenta org + IAM usuarios/roles mínimo privilegio; presupuesto con alarmas Billing. **DEPLOYADO Y VERIFICADO 2026-08-27 21:30 UTC** (stack `krumm-m1-iam-billing-staging` CREATE_COMPLETE, OperationId `03089840-a259-11f1-8239-0ed65bfe6ead`): rol `arn:aws:iam::931932531447:role/krumm-staging-frontend-deploy` (trust: root + condición `ArnLike aws:PrincipalArn` sobre `role/aws-reserved/sso.amazonaws.com/*AWSReservedSSO_krumm-staging-frontend-deploy_*` — el path del rol reservado **no lleva región**; policy scoped: s3 List/Get/Put/Delete/Multipart solo sobre `krumm-staging-frontend-931932531447(/*)` + cloudfront GetDistribution/CreateInvalidation solo sobre `EDQ39PDNI931R`), permission set `krumm-staging-frontend-deploy` (`arn:aws:sso:::permissionSet/ssoins-72233ea12cb3ef38/ps-7223df7ae8fc1a2b`, inline policy `sts:AssumeRole` al rol) con account assignment SUCCEEDED al usuario admin-carlos, y presupuesto `krumm-staging-monthly-billing` ($25/mes, ACTUAL, alarmas 80%/100% vía SNS `krumm-staging-billing-alerts` → carlos.saldivia@sansano.usm.cl; **pendiente: confirmar el email SNS**). E2E verificado: perfil temporal `krumm-deploy` (config mktemp, no toca `~/.aws/config`) → rol reservado `AWSReservedSSO_krumm-staging-frontend-deploy_b3a579142cf5733f` → assume-role OK → `s3api list-objects-v2` ✓ + `cloudfront get-distribution --id` ✓ (Deployed) + `s3api list-buckets` → AccessDenied ✓ (scoped). Runbook idempotente y reproducible: `bash scripts/m1-iam-billing-deploy.sh` (evidencia completa en § Evidencia).
- [x] Plantilla S3 bucket (privado) + CloudFront OAC para el bundle `dist/` → `infra/m1-frontend-stack.yaml` (S3 privado con SSE+versioning, OAC sigv4, HTTPS redirect, Managed-CachingOptimized, SPA rewrite 403/404→/index.html). **Deployado 2026-08-26:** stack `krumm-m1-frontend-staging` CREATE_COMPLETE; bucket `krumm-staging-frontend-931932531447`; distribution `EDQ39PDNI931R` → `d3citl7gomy2ql.cloudfront.net`.
- [ ] Route53 zona + ACM certificado; subdominio staging/prod (ej. `staging.krumm…`). (Después del primer deploy funcional con certificado default.)
- [x] Script deploy (`scripts/deploy-frontend.sh`: sync s3 con cache-control immutable para assets, index.html no-cache, invalidación CloudFront). Verificado `bash -n`.
- [x] SPA routing: cubierto en la plantilla vía CustomErrorResponses 403/404→/index.html.
- [x] Headers seguridad base en la distribución (CSP inicial, HSTS, X-Frame-Options). **Completado 2026-08-27 02:49 UTC**: `ResponseHeadersPolicy` `krumm-staging-rhp-m1` (modelo v2 `SecurityHeadersConfig`) en `infra/m1-frontend-stack.yaml`, cableada al `DefaultCacheBehavior`; `cfn-lint` 0 errores; CFN `UPDATE_COMPLETE` (OperationId `d8409ff0-a1c1-11f1-8fa8-0afff850ce9b`); verificado con `curl -I` en SPA y assets: CSP (`script-src 'self'`; `connect-src 'self' https://storage.googleapis.com` para los modelos MediaPipe; worker/wasm local; `style-src 'unsafe-inline'` pendiente de auditoría posterior; `object-src 'none'`; `frame-ancestors 'none'`), HSTS `max-age=31536000; includeSubDomains`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`. **Pitfall:** el primer intento (02:33) usó el modelo v1.0 (`Version`/`CSPDirectives`/`HSTS` a nivel top del config) → 9 errores de validación + rollback automático; la spec CFN actual solo acepta `SecurityHeadersConfig` dentro de `ResponseHeadersPolicyConfig` (CSP como string único).

**Siguiente:** (1) ~~Gates de navegador reales (consola limpia, fixture end-to-end)~~ **completados 2026-08-27** (evidencia en Estado arriba). **Nota tool browser WSL (actualizado 2026-08-27, NAT mode):** WSL está en **NAT** (no mirrored): 127.0.0.1 de WSL ≠ 127.0.0.1 del host, y Chrome 151 del host ignora `--remote-debugging-address` (CDP loopback-only por hardening). Cadena que funciona: (1) Chrome host con `--remote-debugging-port=9222 --user-data-dir=...Temp\chrome-krumm-cdp`; (2) relay Python en el host `0.0.0.0:9223 → 127.0.0.1:9222` (`C:\Users\sarlo\AppData\Local\Temp\cdp_relay.py`, vía `Start-Process python`); (3) forwarder en WSL `127.0.0.1:9222 → <gateway NAT>:9223` (`/tmp/cdp_forwarder.py`); (4) shim `~/.config/google-chrome/DevToolsActivePort` con `9222` en línea 1. El firewall del host SÍ permite WSL→host en puertos 0.0.0.0 (verificado). Adicional: Vite dev en WSL visible desde el host en `127.0.0.1:5173` (localhost forwarding WSL→host funciona en NAT), pero el reverse no: usar `<WSL_IP>:5173` o el forwarder. **Pitfall:** el transform cache de Vite en `/mnt/c` no siempre detecta cambios de fuente — ante copy stale, reiniciar `npx vite`. (2) ~~IAM usuarios/roles mínimo privilegio + presupuesto con alarmas Billing~~ **completado 2026-08-27 21:30 UTC** (evidencia en la tarea correspondiente + § Evidencia; runbook `scripts/m1-iam-billing-deploy.sh`). (3) Route53 + ACM cuando se tenga dominio propio (subdominio staging). (4) ~~ResponseHeadersPolicy~~ completado 2026-08-27. (5) Redeploy S3 solo si cambia el bundle (headers son propiedad del edge): `PROFILE=admin-carlos BUCKET=krumm-staging-frontend-931932531447 DISTRIBUTION_ID=EDQ39PDNI931R bash scripts/deploy-frontend.sh`.

**Gates:** [x] URL staging sirve `/postulaciones-demo` (200; re-verificado 2026-08-27); [x] consola limpia (landing + fixtures stable/original, desktop+móvil); [x] fixture corre end-to-end (reportes completos 4/4 juegos); [x] headers verificados con curl (2026-08-27 02:49 UTC).

## FASE M2 — Backend aggregate-only (9 – 22 sep)

**Estado:** [~] Arrancada 2026-09-03 — **scaffolding backend + validación server-side + tests RED→GREEN completados (13/13 verdes)**. Pendiente: deploy SAM/CloudFormation + smoke real POST→GET→DELETE→audit.

**Entregado 2026-09-03 (local):**
- `backend/` — paquete Node 20 ESM independiente (package.json + vitest). No contamina el bundle Vite.
- `backend/src/privacy/validatePayload.mjs` — última frontera server-side: reutiliza `validateFinalAssessmentPayload` + `ASSESSMENT_FORBIDDEN_KEYS` + `validateAssessmentSessionPrivacy` de `src/assessment/`. Escanea FORBIDDEN_KEYS recursivamente + valida gobernanza.
- `backend/src/db/sessionsRepository.mjs` — repositorio DynamoDB (sessions + audit_log), clientes inyectables para tests; TTL 30d; data minimization (límite 1MB defensivo).
- `backend/src/handlers/sessions.mjs` — `routeSessions` con POST/GET/DELETE `/sessions[/{id}]` (API GW HTTP v2): POST valida→persiste→201; GET devuelve payload idéntico→200/404; DELETE hard-delete→204 + audit log (create/read/delete).
- `backend/src/index.mjs` — handler Lambda entrypoint (crea DocumentClient real fuera del handler).
- `infra/m2-backend-stack.yaml` — SAM: DynamoDB `SessionsTable` (PK sessionId, TTL expiresAt, PITR+SSE) + `AuditLogTable` (GSI sessionId-index, append-only) + Lambda Node 20 rol mínimo privilegio (solo estas 2 tablas) + HTTP API + CORS.
- `backend/test/` — 13 tests (privacidad 6 + handlers 7), todos GREEN.

**Próximo (pendiente):**
- Desplegar con SAM/CloudFormation (instalar SAM CLI o usar `sam deploy`), smoke real POST fixture → GET → DELETE → verificación del audit log.
- Revisar `npm audit` backend (5 vuln reportadas por el install: 3 moderate/1 high/1 critical, transitivas de @aws-sdk/esbuild/vitest — requiere análisis de impacto).
- Cron de retención 30d (EventBridge Scheduler) + job de eliminación bajo solicitud <24h.

**Objetivo:** API serverless que recibe/persiste/borra payloads aggregate-only con validación de privacidad server-side.

**Stack:** API Gateway HTTP API + Lambda (Node 20) + DynamoDB on-demand + S3 Object Lock para audit log append-only.

**Tareas:**
- [ ] Esquema DynamoDB: tabla `sessions` (PK sessionId, payload aggregate-only, tenantId, createdAt, expiresAt TTL), tabla `audit_log`.
- [ ] Lambda `POST /sessions`: valida `privacyValidation.ok === true` + FORBIDDEN_KEYS server-side (reusar lógica de `finalAssessmentPayload.js`); rechaza raw fields con 422.
- [ ] Lambda `GET /sessions/:id`, `DELETE /sessions/:id` (hard delete + entrada audit log).
- [ ] Lambda cron retención 30 días (EventBridge Scheduler) + job eliminación bajo solicitud <24h.
- [ ] Tests Vitest para handlers (RED→GREEN): rechazo de raw fields, aceptación fixture válido, GET idéntico, DELETE→404, log inmutable.
- [ ] IaC ligero (SAM o CDK) + despliegue staging.
- [ ] Smoke real: POST fixture real → GET → DELETE → verificar audit log.

**Gates:** tests backend verdes; smoke staging completo; audit log verifica quién/cuándo/qué.

## FASE M3 — Invitaciones + consentimiento (23 – 29 sep)

**Estado:** [ ] Por implementar
**Objetivo:** Flujo admin→candidato con token único y consentimiento explícito.

**Tareas:**
- [ ] Lambda `POST /invitations` (email, expiración, uso único) + `GET /invitations/:token`.
- [ ] SES: templates email invitación; solicitar salida de sandbox AWS esta semana.
- [ ] Guard frontend `?invite=<token>` en `/postulaciones-demo`: valida token antes de landing; sesión ligada a invitación.
- [ ] Pantalla consentimiento explícito (base legal, datos agregados, retención, derechos) antes de cámara.
- [ ] Login admin/recruiter con Cognito (10k MAU free).
- [ ] Tests RED→GREEN: token único/expirable/revocable, guard bloquea token inválido.

**Gates:** flujo completo manual: crear invitación → email → candidato completa → sesión visible en backend.

## FASE M4 — Recruiter Dashboard v1 real (30 sep – 9 oct)

**Estado:** [ ] Por implementar
**Objetivo:** Conectar el HR dashboard (hoy sintético) a sesiones reales del backend, read-only.

**Tareas:**
- [ ] `hrDashboardData`: fetch `/sessions` paginado + filtros fecha/battery/status; cola cronológica no-ranking.
- [ ] Detalle sesión: reporte + talentProfile + qualitySummary + badges governance; descarga bundle JSON válido con `privacyValidation.ok === true`.
- [ ] Mantener reglas existentes: datos alias/sintéticos fuera, sin ranking, sin recomendación, missing = `null`/`Pendiente` (guard contra `Number(null)===0`).
- [ ] Tests + Playwright smoke desktop/móvil sobre staging.

**Gates:** recruiter ve 3 sesiones reales fixture → abre detalle → descarga bundle → valida JSON y privacidad.

## FASE M5 — Seguridad / privacidad / CI guards (12 – 23 oct)

**Estado:** [ ] Por implementar
**Objetivo:** Cerrar superficie de riesgo antes de beta.

**Tareas:**
- [ ] Política de privacidad publicada en landing + DPIA borrador (`docs/legal/`) — **firma DPO/legal humano en paralelo**.
- [ ] Threat model STRIDE/LINDDUN (`docs/security/threat-model-v1.md`) + SECURITY.md.
- [ ] Hardening: CSP estricta final, rate limiting API Gateway (10 req/min/IP), WAF opcional si presupuesto.
- [ ] CI privacy guard: workflow GitHub Actions que corre tests de privacidad + `scripts/scan-forbidden-keys.js` sobre diff; bloquea PR con raw fields.
- [ ] Pen test básico OWASP ZAP en staging; 0 critical/high.
- [ ] Revisión de dependencias + secretos; rotar claves.

**Gates:** workflow bloquea raw fields en PR de prueba; ZAP sin hallazgos críticos; DPIA lista para firma.

## FASE M6 — Hardening + beta cerrada → LANZAMIENTO (26 – 30 oct, lanzamiento ~3–6 nov)

**Estado:** [ ] Por implementar
**Objetivo:** Beta cerrada operativa y lanzamiento piloto controlado.

**Tareas:**
- [ ] Runbooks: deploy, rollback, incident response, data deletion request (<24h).
- [ ] Backup/restore probado; alarmas CloudWatch básicas (errores Lambda, throttling, privacy_validation_failures).
- [ ] E2E real completo con 2–3 usuarios internos: invitación → consentimiento → batería (cámara) → backend → dashboard → export.
- [ ] Smoke matriz final: stable/original × fixture/no-fixture × desktop/móvil × Chrome/Firefox/Safari móvil.
- [ ] Verificar ausencia de claims HR no soportados y frases prohibidas ("No medido" solo donde corresponde).
- [ ] Congelar código; lanzamiento piloto 1–2 empresas con claims descriptive_only/humanReviewOnly.

**Gates:** E2E sin fallos en matriz completa; runbooks probados; go/no-go con checklist firmado.

---

## FASE G — Mejora significativa de experiencias/juegos/UI-UX (paralelo sep–oct, cerrar antes de M5)

**Estado:** [~] En progreso — **G.1 [x] 2026-08-27** (18 hallazgos P01–P08 + L01–L08). **Oleada de calidad W1–W3/W5 completada 2026-08-27:** G.3 [x] (temas por juego + GamePips + botones unificados KRUMM + animaciones CSS con `prefers-reduced-motion` + SFX WebAudio default-off), G.2 [~] (micro-instrucciones animadas ≤15s en 4 juegos sin telemetría previa; pendiente práctica sin puntaje), G.4 [~] (pacing percibido de Láser con overlays/intersticios; mecánicas intactas), G.6 [x] (jerarquía score-vs-caveat en reporte). Gates: 436/436, oxlint 0 errores, build OK, audit 0 vuln, `git diff --check` OK, smoke browser desktop + móvil 390×844 (0 errores consola, 0 overflow; capturas `/tmp/krumm-g27-before/` 21–36). Pendiente: G.5 teclado (G1-P01) + pérdida de foco. Cola: `docs/design/game-experience-audit.md` §5.
**Objetivo:** Elevar calidad percibida y fluidez de la experiencia candidato: gráficos, UI/UX y mecánicas de juego, sin romper contratos de telemetría ni la batería estable.

**Principios:**
1. Toda mejora pasa primero por la batería original (`?battery=original`); `stable_dg` queda intacto como fallback.
2. Los agregados permitidos por juego NO cambian de nombre ni semántica (si cambia una métrica, se versiona el feature vector).
3. Cada cambio visual incluye test de layout responsivo (estímulo largo tipo `AMARILLO`, 390×844 sin overflow) y smoke browser.

**Sub-trabajos (priorizar por impacto/fricción):**
- [x] **G.1 Auditoría UX end-to-end del flujo candidato**: grabar/recorrer las 4 tareas originales + onboarding + calibración + reporte; listar fricciones (instrucciones poco claras, esperas muertas, feedback insuficiente, carga cognitiva extra). Output: `docs/design/game-experience-audit.md`. **Completado 2026-08-27** (oleada 2: recorrido vivo — landing→consent→Láser 3 niveles par→Globo 8 rondas→Rutas 3 circuitos→Faro 4 turnos→reporte, sin cámara; móvil 390×844; fixture; HR. 18 hallazgos: P01–P08 pre-audit + L01–L08 vivo; cola G.2–G.6 en §5 del audit).
- [~] **G.2 Onboarding y calibración**: micro-instrucciones animadas por juego (≤15s), práctica previa sin puntaje, barra de progreso consistente, mensajes de estado de cámara más claros y menos técnicos. **2026-08-27:** copy de estado de HUD (G1-L04) y label de Passenger (G1-L01) — TDD RED→GREEN (15/15) y verificado en vivo. **2026-08-27 (oleada W3):** micro-instrucciones animadas completas — `GameMicroIntro.jsx` (3 pasos bilingües por juego, skippable, overlay sobre el tablero/arena/RPG stage) integrado en los 4 juegos; `stimulus_shown` y el reloj del trial se inician SOLO al cerrar el intro (tests de orden de eventos por juego); verificado en vivo desktop + móvil 390×844 (0 overflow). **2026-08-27 (oleada W1):** barra de progreso consistente — `GamePips` en los 4 headers (aria-hidden, texto accesible intacto; estados de resultado en Globo). **Pendiente: práctica previa sin puntaje** (backlog; el intro cubre el onboarding mínimo; si se implementa debe emitir 0 eventos y no alterar fixtures).
- [x] **G.3 Pulido visual por juego**: paleta/tipografía coherente KRUMM, estados hover/press/focus, transiciones entre niveles, feedback inmediato de acción correcta/incorrecta (Laser, Balloon, Passenger, Operación Faro). **Completado 2026-08-27 (oleadas W1+W2):** W1 — temas por juego: Láser "Órbita" (consola espacial oscura, cian/ámbar/neon), Globo "Cielo" (arena celeste, botones azul/teal), Rutas "Urbano" (accent cian en tarjeta de misión, board con profundidad), Faro (hover/focus/active en opciones, meter 320ms); `GamePips` compartido; botones `.primary/.secondary` unificados a paleta KRUMM (elimina el teal legacy global de `styles.css` que heredaban los juegos). W2 — animaciones CSS con guarda `prefers-reduced-motion`: haz pulsante + piece-pop + overlay "✓ Enlace restablecido" (1500 ms, stats movimientos/par) + intersticio narrativo (1400 ms, nombre+objetivo del siguiente nivel) en Láser; tensión (amplitud derivada SOLO de pumps visibles — no revela threshold) + burst 💥 + arena-shake + pip rojo por pop en Globo; token del vehículo con transición 150 ms + bandera ✓ de entrega + toast "Circuito N completado" en Rutas; fade-in de diálogo + opciones con stagger 90 ms + slide-in de consecuencia en Faro; SFX WebAudio sin assets (`originalGameSfx.js`: 9 defs, default OFF, toggle 🔇 en stage con 0 telemetría, jsdom-safe); copy G1-L02 (decisión de usuario 2026-08-27: aclarar SOLO en copy — botón "Comprobar ruta" conserva enabled, hint "el resultado definitivo se registra al completar el nivel"). Evidencia: 97/97 tests focales (19 nuevos), suite 436/436, oxlint 0, build OK; smoke en vivo: overlay/intersticio (captura 31), tensión `--shake-amp: 2.1px` (32), reporte (35), móvil (36); 0 errores consola, 0 overflow.
- [~] **G.4 Mecánicas**: revisar dificultad/progresión (¿nivel 1 demasiado trivial?, ¿nivel 3 frustrante?), tiempo total batería objetivo 10–12 min, ajustes de pacing basados en observación real. **Parcial 2026-08-27 (oleada W2 — sin tocar mecánicas, regla dura de agregados inmutables):** pacing percibido de Láser mejorado (el nivel 1 deja de sentirse "plano" con intersticio narrativo + overlay de completado con stats movimientos-vs-par); transiciones entre juegos intactas; tiempo total estimado ~13 min en juego (12,5 min observado + ~4,5 s por los 2 intersticios de Láser). Dificultad: sin cambios (par/solvencia siguen verificadas por los authoring tests). Pendiente: re-medir pacing con participantes reales (M6 beta); cualquier ajuste de trialCount/duración requeriría versionar fixtures.
- [~] **G.5 Accesibilidad y robustez**: teclado donde aplique, contraste AA, textos responsive es/en, manejo de pérdida de foco/pestaña durante juego (pausa o invalidación explícita del trial). **Arrancado 2026-08-27 (targets táctiles):** auditado en vivo 390×844 + 1366 — los flags CSS del pre-audit (G1-P04) resultaron ser elementos de display (los interactivos ya ≥44 px); único target interactivo <44: Passenger "Registrar replanteo" 40→44 px (`postulationDemo.css` L1379, verificado en browser); grid Láser 38 px documentado AA-conforme (WCAG 2.5.8 ≥24 px; AAA 44 px inviable en 8×8@390 px). Suite 411/411 + oxlint 0 + build OK. Pendiente: G1-P01 teclado, G1-P05 breakpoints, pérdida de foco (depende T).
- [x] **G.6 Reporte final al candidato**: mejorar legibilidad del reporte provisional, visualización de 8 constructos, caveats comprensibles para no-técnicos. **Completado 2026-08-27 (oleada W5, G1-L07):** jerarquía score-vs-caveat corregida — chip "DEMO PROVISIONAL" sólido (índigo/white) ahora DENTRO de la caja del score (antes iba en la columna derecha, separado del número) + caveat adyacente bajo el número "Sin baremos · no comparable"; número atenuado (0.95rem) para que el caveat compita visualmente. TDD: 8/8 cajas del fixture original verificadas (assert extendido en `PostulationReportScreen.test.jsx`); 0 "No medido"/"Solo descriptivo" (regla pitfall #72 intacta); verificado en vivo (captura 35). La visualización de 8 constructos y el resto del reporte ya eran correctos (G.1 §4.1 fila 8) y no cambiaron.

**Gates por sub-trabajo:** tests focalizados verdes + oxlint + build + smoke desktop/móvil + verificación de que los payloads aggregate-only no cambiaron (diff de fixture payload).

## FASE T — Revisión teórica señales ↔ métricas ↔ constructo (paralelo sep–oct)

**Estado:** [~] En progreso — **T.1 [x] completado 2026-08-27 (2.º intento, subagente):** §10 "Matriz de trazabilidad v2 (T.1, 2026-08-27)" en `docs/research/krumm-talent-game-behavior-mapping-technical-study.md` (doc 285→581 líneas): 66 métricas clasificadas en 6 tablas (Laser 8, Balloon 8, Passenger 9, Team 11, canales faciales 17, composite/feature vector 13); distribución 3 directa / 22 adyacente / 14 ambigua-no resuelta / 27 interna (§10.7, verificado en disco con conteo estricto); 104 menciones de cita "verificada" + 7 "verificación pendiente" explícitas; cadena constructo→demanda→conducta→telemetría→feature→regla→disponibilidad→narrativa completa por fila. Intentos previos: 1.º (2026-08-26) murió por bug de contexto 256K con 0 entregables; 1.º re-dispatch (2026-08-27, ~51 min) murió por max_iterations con 0 en disco pero ~15 citas ya contrastadas vía web (reutilizadas en el 2.º intento); lección aplicada en el 2.º: **escritura incremental** (skeleton en disco antes de rellenar). **T.2 [x] 2026-08-27.** **T.4 [x] 2026-09-01** (`docs/research/krumm-t4-metric-verdicts-2026-09-01.md`: 14 veredictos por métrica con evidencia; alimentó T.5). **T.5 [x] 2026-09-03** (mappings versionados + 14 veredictos aplicados + canales edgeAi renombrados con alias; ver t_910c0a2d). **T.6 [x] 2026-09-03** (este cierre: `docs/research/krumm-t6-theoretical-positions-2026-09-03.md` — posiciones público vs interno + lenguaje observacional/confidence-aware). **T.3 pendiente** (requiere cámara real o script `/dev/*`).
**Objetivo:** Verificar que cada señal local de browser está midiendo lo que dice medir, sincronizadamente y funcionando bien a nivel local: cadena constructo→demanda→conducta→telemetría→métrica auditada contra literatura y contra comportamiento real del código.

**Reanudar (nota 2026-08-26):** transcripts en `/home/sarlo/.hermes/cache/delegation/live/deleg_6808dd44/task-0.log` (T.1) y `task-1.log` (T.2). Baseline: tests de telemetry existentes GREEN con `NODE_ENV=test npx vitest run` (gameCorrelation.test.js 4 tests + edgeAiEngine.test.js + edgeAiEngine.game.test.js, 29.2s). Anclajes ya verificados en el 1er intento (reutilizar; cualquier línea dudosa → re-verificar contra transcript/código):
- `originalGameTalentMapping.js`: L102-142 `baseConstruct`/`CONSTRUCT_DEFINITIONS` (incluye `workbookRow`); L220 `(0.50*L)+(0.50*P)`; L234-320 `buildDecisionMaking` (evidencia: `balloon.riskEfficiency` + `passengerComposite` + `teamComposite`); L241 `(0.60*T.decision)+(0.25*P)+(0.15*T.alignment)`; L255 `availability: 'descriptive_only'`; L378-425 `buildOriginalGameTalentFramework` (composites L/P/T; aparece fragmento `(0.65*L)+(0.35*P)`).
- Agregados por juego: laser L341-355 (levelCount, solvedLevels, moveCount, reconfigurationCount, hintCount — sanitizados); passenger L330-350 `buildPassengerRouteResponseAggregate` (actualCost/minimumCost, replanCount, constraintViolationCount, satisfactionScore, timeMs); balloon L80-90 (postPopAdjustment mean/count, `riskEfficiency`, `aggregateOnly: true`, `sanitizeBalloonAggregateFields`).
- Eventos de juego: `normalizeGameEvent` L107-111 → `timestamp = finiteOrNull(event.timestamp) ?? now()`.
- `edgeAiEngine.js`: L19 `MODEL_VERSION = 'krumm-edge-ai-v9.1.0-game-aware'` (header "Edge AI Engine v9.1 — Pipeline lineal multimodal + game-aware").
- `gameCorrelation.js`: 271 líneas, "Game-Signal Correlation v3", header privacy-safe; importa `computeAUs` de gestureInsights.js y `buildPointerKinematics` de kinematics.js.

**Sub-trabajos:**
- [x] **T.1 Matriz de trazabilidad actualizada**: para cada métrica de cada juego/canal facial: constructo pretendido, conducta observable, fórmula exacta en código (archivo:línea), fuente bibliográfica, clasificación evidencia (directa/adyacente/ambigua/interna). Extender `docs/research/krumm-talent-game-behavior-mapping-technical-study.md`. Regla académica: verificar cada cita contra título/autores/año/DOI/abstract antes de usarla. **Completado 2026-08-27 (2.º intento, subagente deleg_5c08416d):** §10 con 7 subsecciones (10.1–10.7); 66 filas clasificadas (0 celdas vacías; "ambigua/no resuelta" usado para las tensiones R-6 de Faro y los canales faciales sin fuente validada); lectura clave de §10.7: 33% adyacente, 21% ambiguo (pendiente T.4), 41% interna (procedencia ≠ validación), 5% directa (ECD/BART como ancla metodológico-conductual); **ninguna métrica facial clasifica "directa"** (cámara = contexto/quality-only, coherente con el contrato). Cita verificación: 30 verificadas (28 de §7/transcript + Dinges & Grace 1998 y Palinko et al. 2010 vía web el 27/08); 2 "verificación pendiente" declaradas (D'Mello & Graesser 2012; Cohn et al. 2007 — ninguna clasificación depende exclusivamente de ellas, nota §10.7.2). Discrepancias de anclajes documentadas en §10.7.3: Edge AI actual = 6 canales bayesianos por AUs + `taskPerformance` (no bayesiano, telemetría de juego) + 6 canales game-aware (v9.1); `insightMetrics.js` calcula VAD pero NO implementa PERCLOS (solo citado en encabezado).
- [x] **T.2 Auditoría técnica de sincronización local**: reloj único (`performance.now()`) en toda la cadena; ventanas de correlación game↔facial correctamente alineadas; verificar deriva rAF, pestañas en background, throttle de timers; medir latencia evento→ventana. Tests deterministas para cada path de desincronización conocido (pitfalls #18/#23/#28). **Completado 2026-08-27:** `docs/research/local-signal-sync-audit.md` (trazado completo archivo:línea; 7 paths P1–P7 clasificados; sin bugs activos — cadena page-relative consistente, ts de captura viaja intacto worker→main) + `src/telemetry/localSignalSync.test.js` (6 tests deterministas con relojes inyectados, GREEN 2026-08-27). P7 (contrato `quality` asimétrico correlación vs calibración) = único fix de contrato propuesto, para iteración futura (sin cambio hoy).
- [ ] **T.3 Validación empírica ligera de señales (sanity, no validez psicométrica)**: con cámara real y fixtures, verificar monotonicidad esperada (ej.: mover cabeza → postureScore responde; parpadear → PERCLOS responde; responder mal → post-error adjustment aparece). Script de diagnóstico en `/dev/*` gated. **Pendiente (requiere hardware o script gated).**
- [x] **T.4 Decisiones por métrica**: tabla final con veredicto por métrica: `mantener`, `ajustar` (con nueva fórmula versionada), `degradar a contextual` o `desactivar`. Ninguna métrica dudosa alimenta un constructo; como mucho queda como caveat/contexto. **Completado 2026-09-01:** `docs/research/krumm-t4-metric-verdicts-2026-09-01.md` (14 filas "ambigua/no resuelta" de §10 veredictadas con evidencia; ver t_9d0c7e7f).
- [x] **T.5 Actualización de mappings**: aplicar veredictos a `originalGameFeatureVector.js` / `originalGameTalentMapping.js` / `talentProfile.js` con versión bump y tests RED→GREEN; mantener `assessment_feature_vector_v2` compatible. **Completado 2026-09-03:** mappings versionados + 14 veredictos aplicados + canales edgeAi renombrados con alias (`tensionSignal`/`recoveryContext`), `team.score` deprecado; suite 279 tests verdes + oxlint + build + audit + diffcheck (ver t_910c0a2d).
- [x] **T.6 Documento de posiciones teóricas**: qué se afirma públicamente vs qué queda interno; lenguaje reporte ajustado (observacional, confidence-aware). **Completado 2026-09-03:** `docs/research/krumm-t6-theoretical-positions-2026-09-03.md` (superficies público vs interno, posiciones por constructo, glosario alineado post-T.5, 10 reglas de lenguaje reviewables, evidencia verificada).

**Gates:** matriz completa sin celdas "sin clasificar"; tests de sincronización verdes; sanity script muestra respuestas esperadas en cámara real; suite completa + build OK; ningún claim nuevo sin fuente verificada.

## Trabajos paralelos (no bloquean lanzamiento)

### P1 — Observabilidad CloudWatch (oct, 1 semana)
- Dashboards privacy-safe: sesiones iniciadas/completadas por battery, duración p50/p95, `privacy_validation_failures`, calidad de señal baja.
- Alarma: cualquier fallo de validación de privacidad → alerta.
- Logs estructurados JSON sin PII.

### P2 — Protocolo R-7 validación (externo, sep 2026 – feb 2027)
- Encargar en septiembre: protocolo validez convergente/discriminante + test-retest, comité de ética, registro OSF, reclutamiento N=200.
- Instrumentación de export ya existe (`telemetry/researchExport.js`); análisis tras recolección (mar–abr 2027) habilita claims normativos.

## AWS free tier — mapeo por fase

| Servicio | Fase | Free tier |
|---|---|---|
| S3 + CloudFront | M1 | Hosting estático ~gratis a volumen piloto |
| API Gateway HTTP + Lambda | M2 | 1M req/mes |
| DynamoDB on-demand | M2 | 25 GB permanente |
| SES | M3 | 62k emails/mes (salir de sandbox en sep) |
| Cognito | M3 | 10k MAU |
| EventBridge Scheduler + CloudWatch | M2/P1 | Dentro de free tier |

Evitar hasta Fase F: RDS, ECS/K8s, WAF (opcional), ELB.

## Riesgos y mitigaciones

- **G/T se extienden más allá de oct** → congelar con lo que esté; lo no cerrado pasa a backlog post-lanzamiento. M5/M6 no esperan.
- **Legal/DPO demora firma DPIA** → lanzar piloto bajo consentimiento explícito reforzado y retención corta; DPIA firmada antes de escalar.
- **SES sigue en sandbox** → usar invitaciones manuales por email propio durante beta; SES solo acelera escala.
- **Desincronización de señales detectada tarde (T.2)** → T.2 corre temprano (septiembre) justamente para descubrirlo antes de congelar.
- **Cambios G alteran métricas de juego** → regla dura: agregados allowlist inmutables; si una mecánica cambia una métrica, versionar feature vector y actualizar fixtures.

## Evidencia de ejecución

### M1 — cierre IAM + Billing (2026-08-27 21:30 UTC)

```bash
# Plantilla validada
cfn-lint infra/m1-iam-billing-stack.yaml            # → 0 errores (cfn-lint 1.55.1)

# Deploy (runbook idempotente; salida completa en /tmp/m1-deploy-output6.log y re-run final)
bash scripts/m1-iam-billing-deploy.sh               # → OK: deploy M1 IAM+Billing completado
```

Salida verificada del run final (re-run idempotente):

- `STACK EXISTE (CREATE_COMPLETE)` — `ROLE_ARN=arn:aws:iam::931932531447:role/krumm-staging-frontend-deploy`, `TOPIC_ARN=arn:aws:sns:us-east-1:931932531447:krumm-staging-billing-alerts`.
- `INSTANCE_ARN=arn:aws:sso:::instance/ssoins-72233ea12cb3ef38`; `PS_ARN=arn:aws:sso:::permissionSet/ssoins-72233ea12cb3ef38/ps-7223df7ae8fc1a2b`; `INLINE POLICY OK`; `ASIGNACION YA EXISTE` (SUCCEEDED, request `f4f31cfd-3837-43ba-8093-06eb35869b1e`).
- E2E: `caller via krumm-deploy` → `arn:aws:sts::931932531447:assumed-role/AWSReservedSSO_krumm-staging-frontend-deploy_b3a579142cf5733f/admin-carlos`; `ASSUME-ROLE DEPLOY OK`; `s3api list-objects-v2` → 3 keys del bucket; `cloudfront get-distribution --id EDQ39PDNI931R` → `Deployed`; `s3api list-buckets` → `DENY ESPERADO (AccessDenied) ✓`.
- Presupuesto: `{"name": "krumm-staging-monthly-billing", "limit": "25.0", "unit": "USD", "time": "MONTHLY"}`.

Pendiente de acción humana: confirmar la suscripción SNS en el email carlos.saldivia@sansano.usm.cl (llega una vez).

Errores corregidos durante el deploy (quedados documentados en el header del script):
1. CFN `AWS::Budgets::Budget`: `GetAtt Id` no soportado por el servicio → Output con nombre literal.
2. Enum del Budget: `NotificationType: ACTUAL` (no `budget_actual_notification`) y `TimeUnit: MONTHLY` (no `MONTH`).
3. Trust del rol: el formato `Federated: federated-directory/...` es inválido en IAM; patrón correcto = `Principal.AWS: root` + `Condition ArnLike aws:PrincipalArn` sobre el rol reservado `AWSReservedSSO_<ps>_*`. El path real del rol reservado NO lleva segmento de región.
4. APIs sso-admin de la CLI 2.36: `list-instances` (no `sso describe-instance`), `create-permission-set --name`, `put-inline-policy-to-permission-set --inline-policy`, `create-account-assignment --principal-id <userId>` (≤47 chars; la respuesta es `AccountAssignmentCreationStatus`), polling por `--account-assignment-creation-request-id` (status `SUCCEEDED`).
5. `get-role-credentials` manual rechaza el token de forma intermitente bajo ráfaga → el e2e usa el perfil SSO de la CLI (config temporal en mktemp).
6. CLI: `cloudfront get-distribution --id` (no `--distribution-id`) y `s3api list-objects-v2` (no `list-bucket-objects-v2`).


