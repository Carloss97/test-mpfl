# Plan maestro — KRUMM demo completa montada desde AWS (hosting público)

**Fecha:** 2026-09-05
**Autor:** orquestador autónomo (Pi)
**Objetivo del usuario:** "levantar el servidor, trabajar y actualizar las tareas. No veo los cambios reflejados en la página web. Está levantada en Amazon? Qué necesitas para hacerlo así?" — Responder: sí está en AWS CloudFront (`d3citl7gomy2ql.cloudfront.net`, bucket `krumm-staging-frontend-931932531447`), pero el deploy actual data del 27/08. Se necesita SSO refresh (hecho por usuario 05/09). Ahora se ejecuta deploy + gates.
**Autorización extendida:** avances en M2, G2, G5, T, Infra, experiencias ya autorizados. Deploy AWS autorizado. Commit/push NO autorizado aún. GPU GH200: NO lanzar.

## Estado actual (verificado 2026-09-05)
- AWS SSO reautenticado (admin-carlos, cuenta 931932531447, role AdministratorAccess). Link/code devuelto al usuario y autorizado.
- Build limpio: `npm run build` OK (5.25s, dist/ generado).
- Baseline de tests: suite completa 112 archivos/577 tests. Antes había 1 fallo flake temporalFeatures; se revisa.
- Repo sin commits (master sin commit) → todo staged, no hay history.
- Kanban: M2-M6 DONE; G.2 y G.5 pendientes; Exp 6/7/8 pendientes; T.3 bloqueado por hardware cámara.

## Rutas objetivo (accesibles tras deploy)

- Frontpage candidato: `/postulaciones-demo`
- Prueba real (batería): `/postulaciones-demo` con fixture apagado (flujo real) y con `?battery=original`
- Resultados / informe: `/postulaciones-demo/resultado` (PostulationReportScreen)
- Portal HR: `/postulaciones-demo/hr`

## Fases (orden de valor)

### F1 — Verificación de estado (completado 2026-09-05)
- [x] Diagnóstico GH200 (no viable: sin HF_TOKEN, sin ruta modelo, coste real >$2/semana).
- [x] Regresión backend sessions 405 + mock scan → GREEN (7/7).
- [x] Suite completa Vitest pass: **113 archivos / 587 tests, 425s** (el más lento es `laserPuzzleTelemetry` "no throwaway one-/two-move levels" — BFS 52s, pasa; no es fallo).
- [x] `npm run build` limpio (5.25s) + `npm audit` + `npx oxlint` = baseline desplegable.

### F2 — Frontpage: reflejar cambios (completado 2026-09-05)
- [x] Revisado `PostulationLanding.jsx` y `postulationDemoCopy.js` — ya alineados con el estado actual (8 constructos con señal de demo, reporte sin `No medido`, human-review-only, cámara opcional). No requerían cambios.
- [x] Tests de la landing GREEN (incluidos en la suite completa).

### F3 — Despliegue a AWS (completado 2026-09-05)
- [x] AWS SSO autenticado (link + code autorizado por el usuario).
- [x] `npm run build` → `dist/`.
- [x] `bash scripts/deploy-frontend.sh` con `BUCKET=krumm-staging-frontend-931932531447 DISTRIBUTION_ID=EDQ39PDNI931R` (corregido PROFILE por defecto a `default` en `scripts/deploy-frontend.sh`). Sync S3 + invalidación CloudFront OK.
- [x] Verificado por curl: frontpage 200 sirviendo bundle nuevo `index-mYPzkjKg.js`, `/postulaciones-demo/hr` 200, `/postulaciones-demo/resultado` 200.

### F4 — Avances pendientes (G2/G5/Exp/T) — para siguiente sesión
- [ ] G.2: práctica previa sin puntaje (t_9f1e2735 ready; t_3b6b256d blocked)
- [ ] G.5: teclado + breakpoints + pérdida de foco (t_0c9d3bd6 ready; t_94368e05 blocked dup)
- [ ] Exp 6/7/8: experiencias gamificadas (t_8c2c98c2 ready; 6/7/8 blocked)
- [ ] T.3: sanity empírico con cámara (hardware físico — pide usuario, t_cb36be49 blocked)
- [x] Infra: AWS SSO refresh (t_f3c8634e) — completado 2026-09-05; verificar perfil `default` (no `admin-carlos`) en credenciales.
- [ ] Kanban: siguiente sesión mover tarjetas y crear para F4.

## Reglas duras
- Solo agregados allowlist; `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`.
- No persistir biometría cruda. No `dkms remove`. No tocar `.env`/secretos.
- Commit/push/pr/PR y GPU-toggle: NO salvo instrucción explícita (el user aprobó deploy hosting S3 y avances, no commit/push aún).
- Tests: `NODE_ENV=test npx vitest run`; build con `npm run build`; NODE_ENV no production para Vite dev (pantalla blanca).