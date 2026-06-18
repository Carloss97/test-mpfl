# Plan de mejora continua — Actividades gamificadas y telemetría multimodal

> Estado vivo del plan. Formato por fases A, B, C… ordenadas por prioridad. Actualizar después de cada fase implementada.

**Objetivo:** extender KRUMM Edge Fusion para ejecutar actividades gamificadas que entreguen telemetría conductual rica: movimiento de cursor, clicks, resultados del juego, dificultad, tiempos de reacción, error/corrección, y correlación simultánea con AUs/FACS, emociones, gaze, postura, MoveNet y Edge AI.

**Arquitectura propuesta:** crear una capa de telemetría de juego desacoplada de cada actividad. Los juegos emiten eventos normalizados con `performance.now()`. Los módulos de telemetría transforman esos eventos en agregados privacy-safe. Edge AI consume agregados y features, no componentes de juego ni trayectorias crudas.

**Estado general:** Fase A-N completadas; microfase UX + integración game-aware + baseline/delta completadas; Fase O pendiente.

**Microfase UX/game-aware completada:** las actividades A-I son accesibles desde el selector visible `Actividades gamificadas` en la página inicial. Sus eventos `game_event_v1` se agregan con `summarizeGameEvents()` y se sincronizan por `performance.now()` con cámara/facial telemetry. El resumen se integra en:
- `src/App.jsx`: `gameSummary` en estado derivado, UI de actividad y conteo de eventos.
- `src/components/Dashboard.jsx`: panel `Actividad sincronizada` con precisión, RT, motor y errores.
- `src/telemetry/multimodalFeatures.js`: bloque `game` + `task` game-aware.
- `src/telemetry/edgeAiEngine.js`: `taskPerformance` y `motorControl` usan game telemetry cuando existe.
- `src/telemetry/insightMetrics.js`: recibe `task: gameSummary.performance` desde App para estrés/carga/engagement.
- `src/components/TaskImpact.jsx`: muestra baseline pre-actividad vs actual con actividad cuando existe cámara/Edge AI, y explica cámara-only vs cámara+actividad.

---

## Leyenda

- `[x] Completado`: implementado, probado y documentado.
- `[~] En trabajo`: iniciado, aún no completamente integrado o verificado.
- `[ ] Por implementar`: pendiente.
- `[!] Riesgo/decisión`: requiere validación antes de implementar.

---

## Principios transversales

1. **Reloj único:** todo evento usa `performance.now()`.
2. **Privacidad:** no persistir video, frames, landmarks crudos ni trayectoria completa de cursor por defecto.
3. **Separación de responsabilidades:** juegos emiten eventos; telemetría calcula agregados; Edge AI consume features.
4. **Compatibilidad:** no romper SimpleRT, payload actual, dashboard ni multimodal A-G.
5. **TDD:** cada fase funcional comienza con tests rojos y termina con build/tests verdes.
6. **Trazabilidad:** toda dificultad adaptativa debe registrar motivo y estado previo/posterior.
7. **Interpretabilidad:** separar rendimiento conductual, estado afectivo y calidad de señal.

---

## Fase A — Bus único de telemetría de juego

**Estado:** [x] Completado

**Prioridad:** 1

**Objetivo:** crear un contrato único `game_event_v1` para eventos de actividades gamificadas, compatible con eventos antiguos de SimpleRT (`target_shown`, `target_click`).

**Archivos implementados:**
- Creado: `src/telemetry/gameTelemetry.js`
- Creado: `src/telemetry/gameTelemetry.test.js`

**Alcance inicial seguro:**
- No modifica UI.
- No migra SimpleRT aún.
- No cambia payload ni Edge AI.
- Solo añade módulo + tests.

**Eventos normalizados:**
- `game_start`
- `stimulus_shown`
- `pointer_move`
- `pointer_down`
- `pointer_up`
- `response`
- `score_update`
- `trial_end`
- `game_end`

**Schema base:**

```js
{
  type: 'game_event_v1',
  timestamp,
  sessionId,
  gameId,
  trialId,
  eventType,
  targetId,
  pointer: { x, y, button, pressure },
  stimulus: { kind, payload },
  response: { value, correct, outcome, reactionTimeMs, score },
  gameState: { score, level, difficulty, combo },
  privacy: { rawPointer: false }
}
```

**Tareas:**
- [x] Crear tests RED para `createGameTelemetrySession`, `normalizeGameEvent`, `appendGameEvent`, `summarizeGameEvents`.
- [x] Implementar normalización de eventos nuevos.
- [x] Implementar normalización de eventos legacy `target_shown`/`task_shown` → `stimulus_shown`.
- [x] Implementar normalización de eventos legacy `target_click`/`task_response` → `response`.
- [x] Implementar resumen agregado sin trayectoria cruda.

**Criterios de éxito:**
- Tests focales pasan.
- `npm run build` pasa.
- El módulo no cambia comportamiento actual de la app.
- El resumen no contiene `pointerSamples`, `rawPointerPath`, `faceSamples` ni landmarks.

---

## Fase B — Pointer sampler y kinematics v2

**Estado:** [x] Completado

**Prioridad:** 2

**Objetivo:** capturar y resumir movimiento de cursor/clicks durante juegos sin persistir trayectoria cruda.

**Archivos implementados:**
- Creado: `src/telemetry/pointerSampler.js`
- Creado: `src/telemetry/pointerSampler.test.js`
- Modificado: `src/telemetry/kinematics.js`
- Creado: `src/telemetry/kinematics.v2.test.js`

**Features implementadas:**
- pathLength/totalDistancePx
- straightLineDistancePx
- pathEfficiency
- meanSpeed / maxSpeed
- acceleration
- jerk
- curvatureRad
- dwellTimeMs
- overshootCount en resumen por trial
- correctionCount
- clickDistanceToTargetPx

**Criterios de éxito:**
- [x] Trayectoria recta, curva, overshoot y quietud se diferencian en tests sintéticos.
- [x] No se persiste trayectoria cruda fuera de memoria.
- [x] Build/tests verdes.

---

## Fase C — Game Runtime común

**Estado:** [x] Completado

**Prioridad:** 3

**Objetivo:** crear un wrapper reusable para ciclo de vida de juego/trial, scoring y emisión de eventos.

**Archivos implementados:**
- Creado: `src/tasks/GameRuntime.jsx`
- Creado: `src/tasks/gameRuntime.test.jsx`
- No se modificó `src/tasks/taskLibrary.js` aún; queda para Fase D al migrar SimpleRT.

**API implementada:**

```jsx
<GameRuntime
  gameDefinition={definition}
  active={active}
  onEvent={handleGameEvent}
  renderTrial={(state, emit) => <Game />}
/>
```

**Criterios de éxito:**
- [x] Puede emitir `game_start`.
- [x] Normaliza eventos emitidos por children con `game_event_v1`.
- [x] No renderiza ni emite eventos cuando está inactivo.
- [x] No rompe SimpleRT actual.
- [x] Tests de lifecycle pasan.

---

## Fase D — Migrar SimpleRT a telemetría rica

**Estado:** [x] Completado

**Prioridad:** 4

**Objetivo:** convertir SimpleRT en la primera actividad compatible con `game_event_v1`, pointer sampler y GameRuntime.

**Archivos implementados:**
- Modificado: `src/tasks/SimpleRTTask.jsx`
- Creado: `src/tasks/SimpleRTTask.gameTelemetry.test.jsx`
- No se modificó `src/App.jsx` ni `taskCorrelation.js`: SimpleRT sigue emitiendo eventos legacy y además emite telemetría rica opcional vía `onGameEvent`.

**Datos por trial:**
- [x] target position
- [x] click position
- [x] click distance
- [x] path efficiency
- [x] pointer summary con speed/jerk/curvature/corrections
- [x] RT
- [x] correct/incorrect/timeout

**Criterios de éxito:**
- [x] SimpleRT visualmente sigue funcionando.
- [x] Eventos legacy siguen soportados.
- [x] Eventos nuevos se generan en paralelo si se pasa `onGameEvent`.
- [x] Payload sigue compacto porque aún no se integra persistencia de game events.
- [x] Build/tests verdes.

---

## Fase E — Precision Targeting / Fitts Law

**Estado:** [x] Completado

**Prioridad:** 5

**Objetivo:** medir precisión visomotora, velocidad-precisión y correcciones.

**Archivos implementados:**
- Creado: `src/tasks/PrecisionTargetingTask.jsx`
- Creado: `src/tasks/precisionTargeting.test.jsx`

**Features implementadas:**
- target distance
- target size
- índice de dificultad Fitts `ID = log2(D/W + 1)`
- throughput
- click distance
- hit/miss
- pointerSummary con pathEfficiency, jerk, curvature, correctionCount, overshoot

**Criterios de éxito:**
- [x] La tarea produce trials con dificultad variable.
- [x] Las features siguen Fitts Law de forma razonable en fixtures.
- [x] Emite telemetría `game_event_v1` privacy-safe.
- [x] Build/tests verdes.

---

## Fase F — Pursuit Tracking

**Estado:** [x] Completado

**Prioridad:** 6

**Objetivo:** medir seguimiento visuomotor continuo.

**Archivos implementados:**
- Creado: `src/tasks/PursuitTrackingTask.jsx`
- Creado: `src/tasks/pursuitTracking.test.jsx`

**Features implementadas:**
- RMS tracking error
- mean/max error
- loss ratio
- smooth pursuit score
- dwell/off-target aproximado vía `lossRatio`
- resumen privacy-safe sin samples crudos

**Criterios de éxito:**
- [x] Distingue tracking bueno vs errático en tests sintéticos.
- [x] No persiste trayectoria cruda.
- [x] Emite telemetría `game_event_v1` privacy-safe.
- [x] Build/tests verdes.

---

## Fase G — Go/No-Go

**Estado:** [x] Completado

**Prioridad:** 7

**Objetivo:** medir inhibición motora, impulsividad y post-error slowing.

**Archivos implementados:**
- Creado: `src/tasks/GoNoGoTask.jsx`
- Creado: `src/tasks/goNoGo.test.jsx`

**Features implementadas:**
- commissionErrorRate
- omissionErrorRate
- correctGoRT
- postErrorSlowingMs
- outcomes: `correct_go`, `correct_withhold`, `commission_error`, `omission_error`
- telemetría `game_event_v1` privacy-safe por trial

**Criterios de éxito:**
- [x] GO correcto, NO-GO correcto, comisión y omisión cubiertos por tests.
- [x] Eventos normalizados por trial.
- [x] Build/tests verdes.

---

## Fase H — Color Interference / Stroop simplificado

**Estado:** [x] Completado

**Prioridad:** 8

**Objetivo:** medir conflicto cognitivo e inhibición de respuesta automática.

**Archivos implementados:**
- Creado: `src/tasks/ColorInterferenceTask.jsx`
- Creado: `src/tasks/colorInterference.test.jsx`

**Features implementadas:**
- conflictCostMs
- congruentAccuracy
- incongruentAccuracy
- congruentRT
- incongruentRT
- errorRate
- clasificación responsive de palabras largas (`AMARILLO` → `long-word`)
- telemetría `game_event_v1` privacy-safe por trial

**Criterios de éxito:**
- [x] Ensayos congruentes/incongruentes diferenciados.
- [x] Tests de scoring y RT pasan.
- [x] Estímulos largos tienen path responsive probado.
- [x] Build/tests verdes.

---

## Fase I — Visual Search

**Estado:** [x] Completado

**Prioridad:** 9

**Objetivo:** medir atención selectiva y exploración visual/cursor.

**Archivos implementados:**
- Creado: `src/tasks/VisualSearchTask.jsx`
- Creado: `src/tasks/visualSearch.test.jsx`
- Modificado: `src/App.jsx`
- Modificado: `src/App.test.jsx`
- Modificado: `src/telemetry/gameTelemetry.js`
- Modificado: `src/telemetry/gameTelemetry.test.js`
- Modificado: `src/components/TaskImpact.jsx`
- Creado: `src/components/TaskImpact.test.jsx`

**Features implementadas:**
- matriz con un objetivo (`●`) y distractores (`○`, `◇`, `□`, `△`)
- setSize variable
- distractorCount
- reactionTimeMs
- clickDistanceToTargetPx
- searchEfficiency
- visualSearch summary agregado en `summarizeGameEvents()`
- selector App actualizado a `Fases A-I disponibles`
- baseline pre-actividad vs actual con actividad en `TaskImpact`

**Criterios de éxito:**
- [x] Distingue búsqueda eficiente vs distractores/errores.
- [x] Eventos y payload siguen privacy-safe.
- [x] Visual Search accesible desde la página inicial.
- [x] Baseline/delta visible en `TaskImpact` cuando existe Edge AI previo.
- [x] Tests/build verdes.

---

## Fase J — Correlación multimodal task/game v3

**Estado:** [x] Completado

**Prioridad:** 10

**Objetivo:** fusionar game events + pointer + face/gaze/posture/MoveNet por ventanas de trial.

**Archivos implementados:**
- Creado: `src/telemetry/gameCorrelation.js`
- Creado: `src/telemetry/gameCorrelation.test.js`
- Modificado: `src/telemetry/multimodalFeatures.js`
- Modificado: `src/telemetry/multimodalFeatures.test.js`
- Modificado: `src/telemetry/edgeAiEngine.js`
- Modificado: `src/telemetry/edgeAiEngine.test.js`
- Modificado: `src/App.jsx`
- Modificado: `src/components/Dashboard.jsx`
- Modificado: `src/components/Dashboard.signalVisibility.test.jsx`

**Ventanas:**
- pre-trial: -300 ms a stimulus
- reaction: stimulus a response
- post-response: response a +500 ms
- recovery: +500 ms a +1500 ms

**Criterios de éxito:**
- [x] Cada trial tiene ventanas `preTrial`, `reaction`, `postResponse`, `recovery` con features faciales, gaze, postura, upperBody, pointer y game.
- [x] Trials incompletos no fabrican ventanas post-response/recovery.
- [x] No se exportan señales crudas, landmarks, blendshapes, trayectoria de cursor ni estímulos completos.
- [x] Edge AI expone `multimodal.gameCorrelation` como agregado privacy-safe.
- [x] Dashboard muestra conteo de ventanas correlacionadas.
- [x] Tests/build verdes.

---

## Fase K — Feature vector v2

**Estado:** [x] Completado

**Prioridad:** 11

**Objetivo:** crear vector estable para análisis local/reportes con datos gamificados.

**Archivos implementados:**
- Creado: `src/telemetry/gameFeatureVector.js`
- Creado: `src/telemetry/gameFeatureVector.test.js`
- Modificado: `src/telemetry/assessmentFeatureVector.js`
- Modificado: `src/telemetry/assessmentFeatureVector.test.js`

**Nuevas dimensiones:**
- game.meanScore
- game.adaptiveDifficultySlope
- pointer.pathEfficiencyMean
- pointer.overshootRate
- pointer.jerkMean
- response.postErrorSlowingMs
- response.commissionErrorRate
- response.omissionErrorRate
- gaze.offscreenDuringTrialsRatio
- posture.headForwardDuringTrialsMean
- upperBody.armActivityDuringTrialsMean
- emotion.postErrorTensionDelta

**Criterios de éxito:**
- [x] `assessment_feature_vector_v2` versionado (`0.2.0`).
- [x] Dimensionalidad estable con `GAME_FEATURE_VECTOR_V2_ORDER`.
- [x] `featureArray` numérico y estable.
- [x] No exporta windows, estímulos crudos, landmarks ni rutas de cursor.

---

## Fase L — Edge AI v9.1 game-aware

**Estado:** [x] Completado

**Prioridad:** 12

**Objetivo:** incorporar desempeño de juego y telemetría conductual en canales Edge AI.

**Archivos implementados:**
- Modificado: `src/telemetry/edgeAiEngine.js`
- Creado: `src/telemetry/edgeAiEngine.game.test.js`
- Modificado: `src/telemetry/edgeAiEngine.test.js`

**Canales nuevos/refinados:**
- inhibitionControl
- visuomotorPrecision
- adaptiveResilience
- motorControl con pointer + MoveNet
- cognitiveLoad con conflictCost + RT variance + gaze instability

**Criterios de éxito:**
- [x] Edge AI separa rendimiento conductual, estado afectivo y calidad de señal.
- [x] Canales explícitos: `inhibitionControl`, `visuomotorPrecision`, `visualSearchEfficiency`, `adaptiveResilience`.
- [x] `cognitiveLoad` responde a conflicto/error/RT de juego.
- [x] Composite explica contribuyentes nuevos.
- [x] Tests sintéticos responden en dirección esperada.

---

## Fase M — UI de sesión gamificada

**Estado:** [x] Completado

**Prioridad:** 13

**Objetivo:** mostrar actividades, resultados y correlaciones sin saturar dashboard.

**Archivos implementados:**
- Creado: `src/components/GameSessionPanel.jsx`
- Creado: `src/components/GameTelemetrySummary.jsx`
- Creado: `src/components/GameCorrelationPanel.jsx`
- Creado: `src/components/GameSessionPanel.test.jsx`
- Modificado: `src/App.jsx`

**Criterios de éxito:**
- [x] Selector de actividad sigue visible.
- [x] Score/trials/RT/motor/inhibición/búsqueda visibles en panel compacto.
- [x] Resumen de telemetría conductual y correlación multimodal visibles.
- [x] Dashboard sigue legible: el panel vive junto a la tarea, no como saturación adicional del dashboard.

---

## Fase N — Payload, reportes y privacidad

**Estado:** [x] Completado

**Prioridad:** 14

**Objetivo:** exportar resultados agregados de juego sin señales crudas sensibles.

**Archivos implementados:**
- Modificado: `src/telemetry/payload.js`
- Modificado: `src/telemetry/reportGenerator.js`
- Modificado: `src/App.jsx`
- Creado: `src/telemetry/gamePayload.test.js`

**Criterios de éxito:**
- [x] Payload contiene `gameTelemetry.summary`, `gameTelemetry.correlation.aggregate` y `assessment_feature_vector_v2`.
- [x] Reportes markdown/json contienen sección `Actividad gamificada` + `Feature vector v2`.
- [x] Payload/reporte no contienen `pointerSamples`, `rawPointerPath`, `landmarks`, `faceSamples`, video, frames, windows crudas, estímulos completos ni raw game events.

---

## Fase O — Dificultad adaptativa

**Estado:** [ ] Por implementar

**Prioridad:** 15

**Objetivo:** ajustar dificultad por rendimiento con reglas trazables.

**Archivos:**
- Crear: `src/tasks/adaptiveDifficulty.js`
- Crear: `src/tasks/adaptiveDifficulty.test.js`

**Criterios de éxito:**
- Dificultad sube/baja monotónicamente según accuracy/RT.
- Cada cambio registra motivo.
- La dificultad queda disponible para análisis posterior.

---

## Fase P — Simulación y validación

**Estado:** [ ] Por implementar

**Prioridad:** 16

**Objetivo:** validar algoritmos con sesiones sintéticas antes de depender de usuarios reales.

**Archivos:**
- Crear: `src/telemetry/simulatedGameSessions.test.js`
- Crear: `src/telemetry/gameScenarioFixtures.js`

**Escenarios:**
- buen control motor
- fatiga
- estrés/error
- distracción
- mejora por práctica

**Criterios de éxito:**
- Métricas y Edge AI responden en dirección esperada en todos los escenarios.

---

## Fase Q — Export investigación opcional

**Estado:** [ ] Por implementar

**Prioridad:** 17

**Objetivo:** permitir exportar datasets locales agregados por trial para análisis offline.

**Archivos:**
- Crear: `src/telemetry/researchExport.js`
- Crear: `src/telemetry/researchExport.test.js`

**Criterios de éxito:**
- JSONL/CSV por trial.
- Sin PII ni señales reconstructivas.
- Compatible con feature vector v2.

---

## Orden de prioridad

1. Fase A — Bus único de telemetría de juego.
2. Fase B — Pointer sampler y kinematics v2.
3. Fase C — Game Runtime común.
4. Fase D — Migrar SimpleRT a telemetría rica.
5. Fase E — Precision Targeting / Fitts Law.
6. Fase F — Pursuit Tracking.
7. Fase G — Go/No-Go.
8. Fase H — Color Interference / Stroop simplificado.
9. Fase I — Visual Search.
10. Fase J — Correlación multimodal task/game v3.
11. Fase K — Feature vector v2.
12. Fase L — Edge AI v9.1 game-aware.
13. Fase M — UI de sesión gamificada.
14. Fase N — Payload, reportes y privacidad.
15. Fase O — Dificultad adaptativa.
16. Fase P — Simulación y validación.
17. Fase Q — Export investigación opcional.

---

## Definición de “done” por fase

Cada fase se considera completada solo si:

1. Tiene tests nuevos o extendidos.
2. `npm run build` pasa.
3. `npx vitest run` pasa o, como mínimo durante desarrollo incremental, pasan tests focales y queda documentado qué falta.
4. No introduce raw video/frames/landmarks/pointer path en payload.
5. Este plan queda actualizado.
6. La guía de referencia se actualiza si cambia fórmula, señal visible o contrato público.

---

## Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Saturar UI con juegos y señales | Panel separado `GameSessionPanel`, resumen por defecto. |
| Guardar trayectoria cruda sensible | Ring buffer en memoria + agregados privacy-safe. |
| Confundir score del juego con estado emocional | Separar rendimiento conductual, estado afectivo y calidad de señal. |
| Dificultad adaptativa sesga métricas | Registrar dificultad y analizar por nivel. |
| Eventos desincronizados | Usar `performance.now()` en todo. |
| Tests inestables por azar | Fixtures deterministas con seeds o datos fijos. |
