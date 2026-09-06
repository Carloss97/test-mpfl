# Handoff — Lanzamiento KRUMM (M0–M6 + Fases G/T)

**Fecha:** 2026-08-25
**Propósito:** Arrancar sesión fresca con contexto mínimo y carga de skills/tools optimizada por token.
**Plan maestro:** `docs/plans/2026-08-25-launch-milestones-plan.md` (única fuente de verdad de fases, fechas y gates).
**Repo:** `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl` · Ruta producto `/postulaciones-demo` · Dashboard HR `/postulaciones-demo/hr`.
**Estado al crear handoff:** R-0→R-6d completadas (405 tests, build/audit limpios). Sin backend real; HR dashboard sintético. Cambios sin commit pendientes de consolidar en M0.

---

## 1. Regla de carga por tokens

Cargar SOLO lo que la fase activa pida en §3. Nada más.

- Skills base SIEMPRE: `krumm-talent-assessment-development`, `software-delivery-workflows`.
- Toolsets base SIEMPRE: `terminal,file,code_execution,skills,memory,todo`.
- Añadir según fase (§3): `web` para investigación T.1; `browser` solo si hay smoke visible; `session_search` solo si se retoma trabajo previo; `delegation` solo para fases grandes delegables.
- NO cargar: `academic-writing` salvo Fase T; `document-productivity-workflows` salvo export PDF/XLSX; `hermes-agent` salvo debugging de Hermes.

## 2. Contexto mínimo indispensable

- Baterías: `stable_dg` default/fallback intocable; original via `?battery=original`; fixtures `?fixture=1[&battery=original]`.
- Contratos inmutables: `game_event_v1`, `stimulus_shown/response/game_end`, `gameCorrelation.aggregate`, `assessment_feature_vector_v2`, allowlist agregados por juego, flags `humanReviewOnly/noAutomatedDecision/observationalOnly/privacySafe`.
- Privacidad: nunca persistir video/frames/landmarks/keypoints/pointer samples/rutas reconstructivas/raw events. Señal ausente = desconocida/caveated, nunca desempeño bajo. Leadership/comunicación = `not_measured`, `score: null`. Adaptabilidad = `insufficient`. Claims `descriptive_only` hasta R-7 validado.
- Entorno: shell puede traer `NODE_ENV=production`; fijar explícitamente. Vite dev siempre con `NODE_ENV=development`.

## 3. Carga por fase

| Fase | Skills extra | Toolsets extra | Archivos clave |
|---|---|---|---|
| M0 consolidación | — | — | `git status`; gates §5 |
| M1 infra AWS | — | terminal | `scripts/deploy-frontend.sh` (crear), CloudFront/S3 |
| M2 backend | krumm-talent-assessment-development (ya base) | terminal | reusar `src/assessment/finalAssessmentPayload.js` (validación server-side), `docs/plans/commercial-elevation-plan.md` B.1 |
| M3 invitaciones | — | terminal,browser | `src/postulation-demo/postulationDemoSessionBuilder.js` |
| M4 dashboard HR real | react-responsive-game-layouts | browser | `src/postulation-demo/hr-dashboard/`, reglas null≠0 |
| M5 seguridad | — | web,terminal | FORBIDDEN_KEYS, CI workflow nuevo |
| M6 beta | krumm-demo-readiness | browser | `docs/demo/postulation-demo-final-recording-qa.md` |
| G juegos/UX | react-responsive-game-layouts, assessment-game-productization | browser | `src/tasks/original-games/*`, `src/postulation-demo/originalGameBlueprints.js`, `PostulationGameStage.jsx` |
| T teoría señales | academic-writing, behavioral-assessment-validation, game-based-talent-assessment-mapping | web | `docs/research/krumm-talent-game-behavior-mapping-technical-study.md`, `src/telemetry/*`, `src/assessment/originalGame*` |

## 4. Orden de lectura en sesión fresca

1. Este handoff completo.
2. Plan maestro: `docs/plans/2026-08-25-launch-milestones-plan.md` (solo la fase activa).
3. `git status -sb` para estado real.
4. Solo si la fase toca juegos/reportes: handoff anterior `docs/plans/postulation-demo-original-games-new-agent-handoff.md` (§2 reglas y contratos).

## 5. Comandos de gates (fijos)

```bash
NODE_ENV=test npx vitest run <focales> --pool=threads --reporter=default
NODE_ENV=test npx vitest run --pool=threads --reporter=default   # suite completa
npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
# Smoke dev (nunca NODE_ENV=production con Vite):
NODE_ENV=development npx vite --host 127.0.0.1 --port 5173
```

## 6. Reglas de trabajo

- Español, hands-on, evidencia real. Plan → lectura/trazado → RED → implementación mínima → GREEN → gates → smoke si cambia superficie visible.
- No commit/push/reset/rebase sin instrucción explícita. No tocar `.env` ni secretos.
- No inventar archivos/APIs/referencias; citas verificadas contra título/autores/año/DOI.
- Actualizar plan maestro + este handoff al cerrar cada fase (estado `[x]`, evidencia de comandos).
- Privacidad y contratos del §2 no negociables en cualquier fase.

## 7. Estado actual por fase (actualizar aquí)

- M0 [x] completada 2026-08-26 — consolidación en `aef0806`; binarios AWS fuera del tracking (`3382fae`). Gates: 405/405 tests, build OK, audit 0 vuln, smoke Playwright 5/5 (evidencia en plan maestro § M0). Corregida regresión i18n de `c3989de` (fallback `useLanguage`, UnifiedGameBattery restaurado, EN-first → ES-first en TeamCoordination) + tests desactualizados.
- M1 [x] **completada 2026-08-27** — stack `krumm-m1-frontend-staging` CREATE_COMPLETE (2026-08-26 20:54) y `dist/` deployado; **re-verificado 2026-08-26 22:04 con curl**: `/postulaciones-demo` 200 (index no-cache), asset JS 200 `max-age=31536000,immutable`, SPA fallback ruta inexistente 200 con `#root`; distribution `EDQ39PDNI931R` (d3citl7gomy2ql.cloudfront.net) Status **Deployed**; auth SSO `admin-carlos` activo. **Headers seguridad completados 2026-08-27 02:49 UTC**: `ResponseHeadersPolicy` `krumm-staging-rhp-m1` (modelo v2 `SecurityHeadersConfig`) cableada al `DefaultCacheBehavior` en `infra/m1-frontend-stack.yaml`; `cfn-lint` 0 errores; CFN `UPDATE_COMPLETE` (OperationId `d8409ff0-a1c1-11f1-8fa8-0afff850ce9b`); verificado con `curl -I` en SPA y assets: CSP (`script-src 'self'`; `connect-src 'self' https://storage.googleapis.com`; worker/wasm local; `object-src 'none'`; `frame-ancestors 'none'`), HSTS `max-age=31536000; includeSubDomains`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`. (El update inicial 02:33 falló con 9 errores de validación: la plantilla usaba el modelo v1.0 viejo `Version`/`CSPDirectives`/`HSTS`; corregido al modelo v2 actual de la spec CFN.) **Gates de navegador PASADOS 2026-08-27** (Chrome host vía CDP 9222 + shim `~/.config/google-chrome/DevToolsActivePort`): landing + fixture stable + fixture original, desktop y móvil 390×844 — consola limpia, 0 page errors, 0 request failures, 0 overflow horizontal; S3 re-verificado byte-ídem con `dist/` (`s3 sync --dryrun --delete` = 0 ops). **M1 infra core cerrada**. **Oleada 2 (2026-08-27): IAM + Billing DEPLOYADOS y verificados end-to-end 21:30 UTC**: stack `krumm-m1-iam-billing-staging` CREATE_COMPLETE (plantilla `infra/m1-iam-billing-stack.yaml`, cfn-lint 1.55.1 0 errores): rol `krumm-staging-frontend-deploy` scoped al bucket/distribution de staging (trust: condición `ArnLike aws:PrincipalArn` sobre `role/aws-reserved/sso.amazonaws.com/*AWSReservedSSO_krumm-staging-frontend-deploy_*` — el path real del rol reservado **no lleva región**), permission set + account assignment **SUCCEEDED**, presupuesto `krumm-staging-monthly-billing` **$25/mes ACTUAL** con alarmas 80%/100% vía SNS `krumm-staging-billing-alerts` → carlos.saldivia@sansano.usm.cl (**pendiente único: confirmar el email SNS una vez**). E2E verificado: perfil temporal `krumm-deploy` (config mktemp; no toca `~/.aws/config`) → rol reservado → assume-role OK → S3 `list-objects-v2` ✓ + CloudFront `get-distribution --id` ✓ (Deployed) + `list-buckets` AccessDenied ✓ (scoped). Runbook idempotente: `bash scripts/m1-iam-billing-deploy.sh` (quirks de la API/CLI 2.36 documentados en su header y en plan maestro § Evidencia). Route53/ACM diferido (dominio propio — único item abierto de M1). **Nota WSL NAT (2026-08-27):** Chrome 151 del host ignora `--remote-debugging-address` (CDP loopback-only); cadena que funciona: relay host `0.0.0.0:9223→127.0.0.1:9222` (`C:\Users\sarlo\AppData\Local\Temp\cdp_relay.py`) + forwarder WSL `127.0.0.1:9222→<gateway>:9223` (`/tmp/cdp_forwarder.py`) + shim `DevToolsActivePort` con 9222. Pitfall: Vite sobre `/mnt/c` puede servir transform stale → reiniciar `npx vite` si no se reflejan cambios.
- M2 [ ] pendiente — **checklist de entrada listo (2026-08-27):** reutilizar `src/assessment/finalAssessmentPayload.js` server-side (verificado: `FINAL_ASSESSMENT_PAYLOAD_SCHEMA = 'krumm_final_assessment_payload_v1'` + `validateFinalAssessmentPayload` + `validateAssessmentSessionPrivacy` de `assessmentSession.js`); **M1 cerrada: rol deploy scoped + presupuesto/alarma YA DEPLOYADOS** (los deploys frontend futuros pueden usar el perfil `krumm-deploy` que genera `scripts/m1-iam-billing-deploy.sh`); todo lo demás (DynamoDB, Lambdas, SAM/CDK) sin empezar.
- M3–M6, P1, P2 [ ] pendientes.
- G [~] en progreso — **G.1 [x]**, **G.3 [x]**, **G.6 [x]** (oleada W1–W5, 2026-08-27). **G.2 [~]**: copy L01/L04 (ayer) + micro-instrucciones animadas ≤15s `GameMicroIntro` en los 4 juegos (W3, 0 telemetría antes del dismiss — stimulus/reloj del trial arrancan al cerrar) + `GamePips` (W1); **pendiente: práctica previa sin puntaje** (backlog). **G.4 [~]**: pacing percibido de Láser con overlay de completado (1500ms, stats vs par) + intersticio narrativo (1400ms); mecánicas/dificultad intactas; ~13 min estimados, re-medir en beta. **G.5 [~]**: touch targets cerrados; **pendiente: G1-P01 teclado (keys de juego), G1-P05 breakpoints 760/768, pérdida de foco/pestaña** (depende de semántica T). W2: animaciones CSS con `prefers-reduced-motion` (haz/tensión-pop/token/entradas Faro), SFX WebAudio `originalGameSfx.js` default-OFF con toggle 🔇 en stage, copy G1-L02 (decisión usuario: solo copy). Decisiones de producto 2026-08-27: **L02** = copy-only (botón "Comprobar ruta" conserva enabled), **L06** = 2 pasos en Faro, **P08** = BehindPanel se mantiene (transparencia; wording → T.4). Gates de la oleada: **436/436 tests, oxlint 0 errores, build OK, audit 0 vuln, `git diff --check` OK**; smoke vivo desktop + móvil 390×844: 0 errores consola, 0 overflow (capturas `/tmp/krumm-g27-before/` 21–36: temas W1, overlay láser, tensión globo, reporte W5, intro móvil).
- T [~] en progreso — **T.1 [x] 2026-08-27 (2.º intento, subagente)**: §10 "Matriz de trazabilidad v2" en `docs/research/krumm-talent-game-behavior-mapping-technical-study.md` (285→581 líneas) — 66 métricas clasificadas (3 directa / 22 adyacente / 14 ambigua-no resuelta / 27 interna), 7 citas "verificación pendiente" explícitas, ninguna métrica facial "directa"; verificado en disco con conteo estricto (tabla §10.7 consistente: 8+8+9+11+17+13=66). Lección: el 1.º re-dispatch murió por max_iterations sin escribir (0 en disco) — el 2.º mandató **escritura incremental** (skeleton primero) y reutilizó las ~15 citas ya contrastadas del transcript del 1.º. **T.2 [x] 2026-08-27**: `docs/research/local-signal-sync-audit.md` (7 paths P1–P7, sin bugs activos) + `src/telemetry/localSignalSync.test.js` (6/6 GREEN). **T.4 [x] 2026-09-01** (verdicts 14, `krumm-t4-metric-verdicts-2026-09-01.md`). **T.5 [x] 2026-09-03** (mappings versionados + verdicts aplicados + canales edgeAi renombrados con alias; 279 tests verdes). **T.6 [x] 2026-09-03** (`krumm-t6-theoretical-positions-2026-09-03.md`). **T.3 pendiente** (sanity con cámara real — requiere ejecución con hardware o script `/dev/*`).

## 8. Sesión siguiente: M2 + G/T residuales en paralelo (punto de entrada)

**Snapshot (2026-08-28, cierre de sesión oleada G/T + Discord):** M0 ✓ · M1 ✓ (frontend staging + IAM mín. privilegio + presupuesto $25/mes con alarmas) · G.1 ✓ · G.3 ✓ (oleada W1–W3/W5: temas por juego, animaciones, SFX default-off, micro-intros, jerarquía reporte) · G.2/G.4 parciales (pendiente: práctica sin puntaje, re-medición pacing en beta) · G.5 parcial (pendiente: teclado, breakpoints, pérdida de foco) · T.1 ✓ (matriz v2, 66 métricas) · T.2 ✓ · **M2 = próximo hito** · T.3–T.6 pendientes. **Baseline git: `0cc385e`** (oleada G + T.1 + docs, tree limpio). **Discord:** gateway systemd activo con `krumm-bot#0623` (plugin `discord-platform` enabled, `discord.py 2.7.1` en el venv); DM del usuario autorizado (`DISCORD_ALLOWED_USERS`); **configuración de canales COMPLETA 2026-08-28**: bot invitado a los servidores `Krumm` (1384264454631587860) y `Sarlock's server` (1313113243581026305); home = `Krumm/general` (1384264455432572940); allowlist = generales de ambos + `Krumm/transcripciones` (1498405279052857435); verificado: channel directory 6 targets + startup notification enviada al home channel (log 01:34). Ojo: los IDs iniciales que dio el usuario eran de SERVIDOR no de canal (causa del 404 inicial) — los canales reales se listaron vía API.

### M2 (backend aggregate-only) — punto de partida

- Plan: `docs/plans/2026-08-25-launch-milestones-plan.md` § FASE M2 (tareas + gates).
- Reuso verificado: `src/assessment/finalAssessmentPayload.js` → validación server-side (`FINAL_ASSESSMENT_PAYLOAD_SCHEMA = 'krumm_final_assessment_payload_v1'`, `validateFinalAssessmentPayload`, `validateAssessmentSessionPrivacy` de `assessmentSession.js`). Lambda `POST /sessions`: rechazar 422 si `privacyValidation.ok !== true` o hay FORBIDDEN_KEYS (reutilizar la lógica, no reescribirla).
- AWS listo: cuenta staging `931932531447`, perfil `admin-carlos` (AdministratorAccess). El rol deploy `krumm-staging-frontend-deploy` cubre solo frontend staging (S3+CloudFront); para desarrollo M2 usar `admin-carlos` y, cuando exista CI de deploys backend, crear rol dedicado con el mismo patrón (ver runbook M1). Presupuesto $25/mes activo con alarmas 80/100% (SNS→carlos.saldivia@sansano.usm.cl; **confirmar el email SNS una vez**).
- SSO: token ~1h. Si expiró: `aws sso login --profile admin-carlos --no-browser` → abrir la URL en el navegador del host (el callback `127.0.0.1:<port>` llega a WSL vía localhost-forwarding — verificado 2026-08-27).
- Entregables M2: `backend/` (Lambdas Node 20) + `infra/m2-*` (SAM o CDK): DynamoDB `sessions` (PK sessionId, tenantId, createdAt, TTL 30d) + `audit_log`; `POST/GET/DELETE /sessions` (hard delete + entrada audit); cron retención 30d (EventBridge Scheduler) + job eliminación bajo solicitud <24h; tests RED→GREEN (rechazo raw fields, fixture válido, GET idéntico, DELETE→404, log inmutable); smoke staging POST→GET→DELETE→audit.
- Gate duro de M2: validación de privacidad SERVER-SIDE (FORBIDDEN_KEYS) — el backend es la última frontera; ningún raw field persiste.

### G (juegos/UX) — continuación en paralelo

- **Estado post-oleada (2026-08-27):** G.1 [x] · G.3 [x] · G.6 [x] · G.2 [~] (micro-intros W3 + GamePips W1; **pendiente práctica sin puntaje**) · G.4 [~] (overlays/intersticios W2; **pendiente re-medición de pacing en beta M6**) · G.5 [~] (**pendiente: G1-P01 keys de teclado, G1-P05 breakpoints 760/768, pérdida de foco/pestaña** — depende de la semántica T de trial invalidado).
- Decisiones de producto tomadas (2026-08-27, usuario): **G1-L02** = aclarar solo en copy (implementado en W2: hint bajo "Comprobar ruta"; botón conserva enabled; `reconfigurationCount` intacta) · **G1-L06** = mantener 2 pasos en Faro (sin cambio) · **G1-P08** = BehindPanel se mantiene con constructos en vivo (transparencia; el wording "insufficient/adaptabilidad" lo resuelve T.4, no UX).
- Resto de la cola: `docs/design/game-experience-audit.md` §5 (hallazgos P02/P03 aria-labels menores, P05 breakpoints, P07 riskBand i18n — revisar si sigue abierto post-oleada).
- Regla dura (principios de G): probar primero en `?battery=original`; `stable_dg` intacto; agregados allowlist NO cambian (si una mecánica cambia una métrica → versionar feature vector + fixtures); todo cambio visual: test de layout (estímulo largo tipo `AMARILLO`, 390×844 sin overflow) + smoke browser + **diff de fixture payload sin cambios**.
- Gate por sub-trabajo: tests focales RED→GREEN + oxlint + build + smoke + payload diff.
- Quirk de entorno para smoke (verificado 2026-08-27): Chrome host colapsa el WS tras la primera `Page.captureScreenshot` de cada carga de página — 1 captura por navegación; recuperación = `about:blank` → URL. Vite sobre `/mnt/c`: reiniciar el dev server si el transform queda stale (ocurró en esta sesión; verificar con `curl http://127.0.0.1:5173/src/... | grep <string-nuevo>`).

### T (señales) — siguientes items (paralelo a M2)

- **T.4 (siguiente, no requiere hardware):** decisiones por métrica — veredicto `mantener` / `ajustar` (fórmula versionada) / `degradar a contextual` / `desactivar` para cada métrica. **Entrada:** las 14 filas "ambigua/no resuelta" de §10 de `docs/research/krumm-talent-game-behavior-mapping-technical-study.md` (matriz T.1), en especial: tensión leadership/communication en Faro vs `not_measured` R-6 (G1-L08), adaptabilidad `insufficient`, y canales faciales sin fuente directa. **Salida:** tabla de veredictos que alimenta T.5 y resuelve el wording G1-P08/L08 (decisión de producto P08 = BehindPanel se mantiene; solo cambia redacción si T.4 lo exige).
- **T.3 (requiere cámara real):** sanity empírico ligero (monotonicidad: cabeza→postureScore, parpadeo→PERCLOS, error→post-error adjustment). Dos rutas: (a) protocolo manual con el usuario, o (b) script de diagnóstico en `/dev/*` gated (feature flag + host allowlist + hash login, patrón documentado en el skill `krumm-talent-assessment-development`). Nota §10.7.3: PERCLOS está citado en encabezados pero NO implementado en `insightMetrics.js` — T.3 debe verificar qué canal real responde a parpadeo.
- **T.5:** actualizar mappings (`originalGameFeatureVector.js` / `originalGameTalentMapping.js` / `talentProfile.js`) con versión bump + tests RED→GREEN, manteniendo `assessment_feature_vector_v2` compatible. Depende de T.4.
- **T.6:** documento de posiciones teóricas (público vs interno; lenguaje observacional, confidence-aware). Depende de T.4/T.5. **Completado 2026-09-03:** `docs/research/krumm-t6-theoretical-positions-2026-09-03.md`.
- **Fuente de verdad de anclajes:** §10.7.3 del study (corregió el contexto del 1er intento: Edge AI v9.1 = 6 canales bayesianos por AUs + `taskPerformance` no-bayesiano + 6 canales game-aware; telemetry files en `src/tasks/original-games/`).

### Discord (notificaciones de cierre) — estado y operación

- Config viva en `~/.hermes/.env`: `DISCORD_BOT_TOKEN`, `DISCORD_ALLOWED_USERS` (user del propietario), `DISCORD_ALLOWED_CHANNELS=1384264455432572940,1313113244373614654,1498405279052857435` (Krumm/general, Sarlock's general, Krumm/transcripciones), `DISCORD_HOME_CHANNEL=1384264455432572940` (Krumm/general). Gateway systemd user service (linger activo) corre el adapter (`discord-platform` plugin enabled; `discord.py 2.7.1` en el venv). **Completado 2026-08-28:** bot invitado a ambos servidores; channel directory 6 targets; startup notification al home canal verificada en log. Si se agregan/quitan canales: editar `DISCORD_ALLOWED_CHANNELS` (IDs de CANAL, no de servidor) y `hermes gateway restart`.
- **Cómo enviar la notificación de cierre desde una sesión TUI** (la tool `messaging` puede no estar en el toolset): `cronjob` one-shot (ISO timestamp ~1 min) con `deliver='discord:1384264455432572940'` (Krumm/general, home) — el output del job se entrega como mensaje unidireccional al canal. Si el toolset `messaging` está disponible, enviar directo y omitir el cron.
- En sesiones de gateway (DM/canal Discord), la notificación sale por el chat activo sin cron.

### Estructura de trabajo en paralelo (recomendada)

- Superficie de conflicto mínima: **M2 = `backend/` + `infra/m2-*`** (nuevo) · **G = `src/tasks` + `src/postulation-demo` + CSS** (frontend). Solapamiento solo en docs (plan maestro + este handoff: actualizar al cerrar cada sub-fase).
- Si una sola sesión: oleadas cortas de G entre bloques de M2 (cambios G = copy/UX acotados; M2 = bloque largo de 2 semanas).
- Pitfalls de entorno de esta sesión (verificados):
  - WSL en **NAT**: browser tool → cadena CDP (Chrome host 9222 loopback-only + relay host `0.0.0.0:9223→127.0.0.1:9222` + forwarder WSL `127.0.0.1:9222→<gateway>:9223` + shim `~/.config/google-chrome/DevToolsActivePort`); detalle completo en plan maestro § M1 "Siguiente".
  - Vite sobre `/mnt/c`: transform stale → reiniciar `npx vite` si no se refleja un cambio.
  - `hermes verify` siempre con `NODE_ENV=test` (su bootstrap `npm install` con `NODE_ENV=production` poda dev deps y rompe la fase test).
  - Quirks de la API/CLI AWS 2.36 (sso-admin/identitystore/SSO lowercase, `get-distribution --id`, `list-objects-v2`) → documentados en el header de `scripts/m1-iam-billing-deploy.sh`.
- Verificación (siempre al cerrar un bloque): `NODE_ENV=test hermes verify --json` + gates focales (§5) + `git diff --check`.
- Sin commit/push salvo instrucción explícita; `.env`/credenciales intocados.

