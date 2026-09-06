# Postulation Demo R-5 + Backtrack Implementation Plan

> **For Hermes:** Ejecutar este plan con TDD RED → GREEN → refactor y revisión de integración. No hacer commit ni push sin instrucción explícita.

**Goal:** Activar de forma controlada la batería original de Laser Puzzle, Balloon Risk y Passenger Routes, conservar la batería DG como fallback predeterminado y corregir inconsistencias comprobables del pipeline local Edge AI → payload privacy-safe → seam de servidor.

**Architecture:** `postulationDemoConfig.js` será la única fuente de verdad para modos, IDs y bloques. `/postulaciones-demo` seguirá usando DG; `?battery=original` habilitará la batería original y `?fixture=1&battery=original` su fixture sintético. La selección quedará bloqueada al inicio de la sesión y viajará como metadata hasta assessment session, final payload y bundle. El backtrack no hará interpretación psicométrica R-6 de los juegos originales: agregará caveat explícito y preservará métricas por juego para que R-6/servidor puedan mapearlas sin pérdida.

**Tech Stack:** React 19, Vite 8, Vitest 4, Testing Library, `game_event_v1`, `game_signal_correlation_v3`, `assessment_feature_vector_v2`, `krumm_final_assessment_payload_v1`.

---

## Task 1 — Contrato de modos y fallback

**Files:**
- Modify: `src/postulation-demo/postulationDemoConfig.js`
- Modify: `src/postulation-demo/postulationDemoConfig.test.js`

**RED tests:**
1. Exigir `stable_dg` y `original_games` con IDs de batería distintos.
2. Exigir que el default siga siendo `stable_dg` con los cuatro juegos DG visibles.
3. Exigir que `original_games` contenga exactamente `laser_puzzle`, `balloon_risk`, `passenger_routes`, todos visibles solo en esa configuración.
4. Exigir resolución segura de `?battery=original`, `?battery=stable` y fallback estable para valores desconocidos.

**GREEN:** Implementar constantes congeladas, resolver query/config y conservar `POSTULATION_DEMO_BATTERY` como alias compatible al fallback estable.

## Task 2 — Integración app y fixture por modo

**Files:**
- Modify: `src/postulation-demo/PostulationDemoApp.jsx`
- Modify: `src/postulation-demo/PostulationDemoApp.test.jsx`
- Modify: `src/postulation-demo/PostulationLanding.jsx`
- Modify: `src/postulation-demo/postulationDemoFixture.js`
- Modify: `src/postulation-demo/postulationDemoFixture.test.js`

**RED tests:**
1. Default entra a Ruta de precisión y muestra `Juego 1 de 4`.
2. `?battery=original` entra a Puzzle láser y muestra `Juego 1 de 3`.
3. Completar mocks originales genera reporte con tres bloques y metadata de batería original.
4. `?fixture=1` conserva fixture DG; `?fixture=1&battery=original` genera fixture original determinista y privacy-safe.
5. La UI marca de forma clara el modo interno original sin exponer controles técnicos al candidato normal.

**GREEN/refactor:** Bloquear el modo al crear la sesión, pasar bloques explícitos al stage, incluir `data-battery-mode`, agregar metadata al resumen y reemplazar la copia O(n) del buffer de eventos por un buffer ref acotado in-place que ignore eventos nulos.

## Task 3 — Lifecycle y correlación temporal correctos

**Files:**
- Modify: `src/postulation-demo/PostulationGameStage.jsx`
- Modify: `src/postulation-demo/PostulationGameStage.test.jsx`
- Modify: `src/telemetry/gameCorrelation.js`
- Modify: `src/telemetry/gameCorrelation.test.js`

**RED tests:**
1. Un juego que ya emite `game_start`/`game_end` no recibe duplicados desde el stage.
2. Estímulos y respuestas con el mismo `trialId` en juegos distintos solo se correlacionan por `gameId + trialId` (y target cuando existe).

**GREEN/refactor:** Dejar lifecycle en `GameRuntime`/juego, hacer que el stage solo coordine bloques y reemplazar búsqueda ambigua de respuestas por índice por juego+trial.

## Task 4 — Escala de score, privacidad y fallback científico

**Files:**
- Modify: `src/tasks/original-games/balloonRiskTelemetry.js`
- Modify: `src/tasks/original-games/balloonRiskTelemetry.test.js`
- Modify: `src/tasks/original-games/passengerRouteTelemetry.js`
- Modify: `src/tasks/original-games/passengerRouteTelemetry.test.js`
- Modify: `src/postulation-demo/PostulationReportSummary.js`
- Modify: `src/assessment/assessmentSession.js`
- Modify: `src/assessment/assessmentSession.test.js`
- Modify: `src/postulation-demo/postulationDemoSessionBuilder.js`
- Modify: `src/postulation-demo/postulationDemoSessionBuilder.test.js`

**RED tests:**
1. Scores originales usados por Stage/reporte quedan normalizados en `[0,1]`; puntos/satisfacción siguen siendo agregados separados cuando corresponde.
2. Reporte no muestra porcentajes absurdos para scores históricos mayores que uno.
3. Guard final rechaza `fullRoute`, `routeTrace`, `visitedCells`, `stepByStepPath`, `keypoints`, `normalizedKeypoints`, `clickTrace` y `eventLog`.
4. Sin señales biométricas, el fallback no fabrica estrés/fatiga/atención a partir de mala calidad: deja canales biométricos neutrales y agrega caveat.
5. Modo original agrega caveat de mapeo R-6 pendiente, para evitar sobreinterpretación HR.

## Task 5 — Payload estructurado listo para seam servidor

**Files:**
- Modify: `src/assessment/finalAssessmentPayload.js`
- Modify: `src/assessment/finalAssessmentPayload.test.js`
- Modify: `src/assessment/reportSubmissionClient.js`
- Modify: `src/assessment/reportSubmissionClient.test.js`
- Modify: `src/postulation-demo/postulationDemoSessionBuilder.test.js`

**RED tests:**
1. `behavioral.gameResults` conserva únicamente resúmenes agregados por juego, incluido cada juego original.
2. El bundle contiene el payload estructurado validado además de archivos de reporte.
3. La entrega HTTP usa `deliveryMode: http`, no pierde `batteryId`, y nunca envía campos prohibidos.

**GREEN:** Añadir campo compatible en payload v1 y payload validado en bundle; no subir CV ni PII desde el browser. El servidor deberá asociar el assessment al CV mediante contexto autenticado/alias seguro fuera de este alcance.

## Task 6 — Documentación, revisión y gates

**Files:**
- Modify: `docs/plans/postulation-demo-original-games-integration-plan.md`
- Modify: `docs/plans/postulation-demo-original-games-new-agent-handoff.md`
- Modify: `docs/demo/postulation-demo-qa-smoke-template.md` si el smoke descubre incidencias.

**Verification:**
1. Tests focales de config/app/stage/fixture/session/payload/delivery/correlation/original games.
2. `NODE_ENV=test npx vitest run --pool=threads`.
3. `npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js`.
4. `npm run build`.
5. `npm audit --audit-level=high --omit=dev`.
6. `git diff --check` + scans de prefijos, conflictos, secretos y artefactos trackeados.
7. Browser/Playwright real en:
   - `/postulaciones-demo` (fallback DG),
   - `/postulaciones-demo?battery=original`,
   - `/postulaciones-demo?fixture=1`,
   - `/postulaciones-demo?fixture=1&battery=original`.
8. Confirmar sin overflow horizontal, page errors, fallos de assets ni labels raw visibles.

## Resultado de ejecución

**Estado:** completado el 2026-07-15.

```text
RED inicial: 7 files fallaron / 5 pasaron por APIs y contratos todavía inexistentes.
Focal original-games final: 10 files / 44 tests.
Focal R-5/pipeline final: 12 files / 52 tests.
Suite completa: 80 files / 331 tests.
Build: 1380 módulos / 3.12s.
Audit: 0 vulnerabilidades.
Playwright: 2 viewports × 4 rutas, sin console/page/network errors ni overflow final.
```

La exploración lint de todo `src/telemetry` encontró warnings históricos fuera del diff. El gate focal incluye todos los archivos tocados por R-5 y se conserva separado para no convertir esta fase en una refactorización no acotada del subsistema ML completo.
