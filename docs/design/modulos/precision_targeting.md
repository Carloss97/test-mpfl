# Módulo stable_dg: Ruta de precisión adaptativa (`precision_targeting`)

> **Versión del módulo:** `1.0.0` (auditoría FASE B.2, 2026-09-12)
> **Fecha:** 2026-09-12
> **Autor(es):** Hermes (FASE B, KRU-116)
> **Estado:** `implementado` (auditado; chain R-6 completa en este doc)
> **Runtime de inferencia:** `Edge AI (WASM / WebGL) — Zero Cloud`
> **Ruta producto:** `/postulaciones` (batería `stable_dg`, juego visible 1 de 4)
> **Batería:** `stable_dg` (`krumm_postulation_demo_stable_dg_v1`)
> **Plantilla:** `plantilla-modulo-original-game.md` adaptada a stable_dg (los juegos
> original tienen doc propia; este cierra el gap P1 sistemático de stable_dg — ver
> `docs/qa/prelaunch/2026-09-12-precision-targeting.md`).

---

## 0. Traza de implementación (rutas reales `src/`)

| Sección doc | Archivo(s) `src/` | Export/Función clave | Tests |
|---|---|---|---|
| 1. Objetivo/flujo | `tasks/PrecisionTargetingTask.jsx` | Componente, `beginMovement`/`finishTrial`, `onComplete` | `tasks/precisionTargeting.test.jsx` |
| 2. Estructura trials | `tasks/PrecisionTargetingTask.jsx` | `buildPrecisionTrials` (geometría determinista), `TARGET_RADII` | `tasks/precisionTargeting.test.jsx` |
| 3. Textos UX | `tasks/PrecisionTargetingTask.jsx` | i18n `t(es, en)` + `ROUTE_LABEL_EN`/`PRECISION_HEADLINE_EN` | `tasks/precisionTargeting.test.jsx` (EN copy) |
| 4. Puntuación Fitts | `tasks/PrecisionTargetingTask.jsx` | `computeFittsIndex`, score por trial, `buildPrecisionResponseAggregate` | `tasks/precisionTargeting.test.jsx` |
| 5. Visual/Feedback | `tasks/PrecisionTargetingTask.jsx` + `postulation-demo/postulationDemo.css` | route card, corridor SVG, `PrecisionFeedbackStrip` (role="status") | `tasks/precisionTargeting.test.jsx` + smoke B.2 |
| 7. State machine | `tasks/PrecisionTargetingTask.jsx` | `phase: ready→target→feedback`, fase-guards, lock de geometría | `tasks/precisionTargeting.test.jsx` + `tasks/gameRerenderStability.test.jsx` |
| 8. Contratos eventos | `telemetry/gameTelemetry.js` + `tasks/GameRuntime.jsx` | `normalizeGameEvent` (game_event_v1), `game_start` en GameRuntime | `telemetry/gameTelemetry.test.js` |
| 9. Pipeline señales | `telemetry/pointerSampler.js` + `telemetry/kinematics.js` | sampler in-memory (cap 900), `summarizePointerTrial`, `MIN_KINEMATICS_SAMPLES` | `telemetry/pointerSampler.test.js`, `telemetry/kinematics.test.js` |
| 10. Agregados batería | `telemetry/gameTelemetry.js` | `summarizeGameEvents` → `motor.*` + `fitts.*` (+ `kinematicsMeasuredCount`) | `telemetry/gameTelemetry.test.js` |
| 11. Feature vector | `telemetry/gameFeatureVector.js` | `assessment_feature_vector_v2` keys `game.fitts*`, `pointer.*` + `qualityFlags` | `telemetry/gameFeatureVector.test.js` |
| 12. Contrato salida | `postulation-demo/postulationDemoSessionBuilder.js` | `stripForbidden` (allowlist `ASSESSMENT_FORBIDDEN_KEYS`), caveat kinemáticas | `postulation-demo/postulationDemoSessionBuilder.test.js` |
| 13. Privacidad | `assessment/assessmentSession.js` | `ASSESSMENT_FORBIDDEN_KEYS` (incl. `trials`), `validateAssessmentSessionPrivacy` (recursivo) | `assessment/assessmentSession.test.js` |
| 14. Configuración | `postulation-demo/postulationDemoConfig.js` + `assessment/batteryConfig.js` | bloque `visible:true`, `skill: visuomotor_precision`, trialCount 4 (demo) / 8 (standardized) | `postulation-demo/postulationDemoConfig.test.js` |
| 15. Render batería | `postulation-demo/PostulationGameStage.jsx` | props `width/height` (viewport clamp), `trialCount`, `onComplete=completeBlock` | `postulation-demo/PostulationGameStage.test.jsx` |

> **Regla:** si una celda queda vacía, el slice NO está listo para cerrar.

---

## 1. Objetivo y flujo de usuario

El candidato toca el **punto de inicio** (pad central), mueve el puntero siguiendo el
**corredor ideal** (línea guía origen→blanco) y alcanza un **blanco activo** de tamaño y
distancia variable con un click/tap. Cada trial cambia blanco (4 radios cíclicos
34/26/20/16 px sobre órbitas deterministas de 0.62–0.94 × radio máximo del canvas).

### 1.1. Propósito (una frase)

Evidencia observable de **precisión visomotora bajo demanda de Fitts**: tiempo de
completar el movimiento (throughput), error espacial del endpoint (distancia
click→centro) y calidad de la trayectoria (eficiencia, overshoot, correcciones) —
no de velocidad de reacción simple (el warmup `simple_rt` cubre eso).

### 1.2. Constructos objetivo (provisionales, R-6)

| Constructo (provisional) | Fuente de señal | Disponibilidad | Caveat / evidencia |
|---|---|---|---|
| `visuomotor_precision` (dimensión `visuomotorPrecision`) | `pointer.pathEfficiencyMean`, `pointer.overshootRate`, `game.fittsThroughput`, `game.fittsMeanIndexDifficulty` + canal EdgeAI | provisional (score 0–100, **sin baremos**) | matriz XLSX; el score mezcla también `smoothPursuitScore` (= 0 en `stable_dg`: el juego pursuit no está en esta batería → sesgo constante documentado, §11) y las cinemáticas degradan a no-medibles en touch (§9) |
| Colaterales | — | `not_measured` | no se derivan constructos adicionales de este juego |

### 1.3. Alcance IN / OUT (del módulo)

- **IN:** 4 trials (batería demo) / 8 (batería standardized), Fitts ID determinista,
  corridor visual, feedback strip por trial, cinemáticas agregadas del puntero
  (in-memory), eventos `game_event_v1`.
- **OUT:** tutorial guiado (el warmup `simple_rt` precede en la batería; el primer
  trial se auto-explica con hint + route card), SFX (no aplica en stable_dg),
  inferencia biométrica directa, score global, comparación entre personas.

---

## 2. Estructura de trials / fases

| Fase | Trials | Propósito | ¿Evalúa? |
|---|---|---|---|
| Warmup (juego anterior `simple_rt`, `visible:false`) | 4 | calibrar ritmo motor | NO (no cuenta en "Juego X de N") |
| Evaluación | 4 (demo) / 8 (standardized) | medir Fitts bajo demanda variable | SÍ |
| Práctica G.2 | — | mecánica disponible (`originalGamePractice.js`) pero **sin botón de práctica** para stable_dg en el flujo actual | N/A |

Geometría (determinista, seed por índice — ver `buildPrecisionTrials`):

- Origen: centro del canvas (siempre).
- Blanco: ángulo `(i·0.78π + π/6)`, órbita `maxRadius·(0.62 + (i%3)·0.16)` con
  `maxRadius = max(70, min(w,h)·0.34)`, radio cíclico `[34, 26, 20, 16]`, clamp
  `radius+16 .. w|h−radius−16`.
- Fitts ID: `ID = log2(D/W + 1)` (Fitts 1954; variación con `+1` para D→0).

**Requisito duro:** no hay fase de tutorial renderizada; el estado `ready` muestra
hint "Toca el punto de inicio" + route card con las 3 etiquetas — verificable y
completatable (smoke B.2: 4/4 trials en ambos viewports).

---

## 3. Textos e instrucciones (UX Copy / script de pantalla)

| Pantalla / Momento | Texto ES | Texto EN | Notas |
|---|---|---|---|
| Título (header) | `🎯 Ruta de precisión adaptativa` | `Adaptive precision route` | emoji en título (P3 real-device, §14) |
| Progreso | `Objetivo {n} de {total}` | `Target {n} of {total}` | |
| Fitts | `Fitts ID {id}` | `Fitts ID {id}` | 2 decimales |
| Caption | `No es RT simple: toca el punto de inicio y luego alcanza un blanco de tamaño/distancia variable. Se penaliza error espacial, overshoot y trayectoria ineficiente.` | `Not simple RT: touch the start point, then reach a target of variable size/distance. Spatial error, overshoot, and inefficient paths are penalized.` | |
| Route card | `Ruta de precisión adaptativa` · `Inicio controlado` · `Corredor ideal` · `Blanco activo` | `Adaptive precision route` · `Controlled start` · `Ideal corridor` · `Active target` | |
| Start pad | `Inicio` (aria: `Punto de inicio`) | `Start` (aria: `Start point`) | button 56 px, keyboard-operable |
| Hint ready | `Toca el punto de inicio` | `Touch the start point` | |
| Feedback ok | `Precisión estable` | `Stable precision` | |
| Feedback warn | `Ajuste fino requerido` | `Fine adjustment needed` | |
| Route label (kinemáticas medibles) | `Ruta precisa` / `Ruta estable` / `Ruta con correcciones` | `Precise route` / `Stable route` / `Route with corrections` | |
| Route label (kinemáticas no medibles) | `Ruta registrada` | `Route recorded` | **nuevo 2026-09-12** (P1 touch, §9) — sin claim de calidad |
| Pantalla final | `Precisión completada` · `Precisión espacial: {pct}%` · `Eficiencia de trayectoria: {pct}%` | `Precision complete` · `Spatial accuracy: {pct}%` · `Path efficiency: {pct}%` | en batería no se renderiza (el siguiente juego monta en el mismo batch; standalone sí) |

---

## 4. Puntuación (modelo Fitts por trial)

| Magnitud | Fórmula / valor | Notas |
|---|---|---|
| `correct` | `distancia(click, centro) ≤ radius` | hitbox = radio visual exacto (sin generosidad; diff. SRT-P2-1) |
| `score` (0–1 por trial) | `correct ? max(0.25, 1 − clickDist/(3·radius)) : 0` | floor 0.25 premia el acierto aunque el endpoint se desvíe |
| `Fitts ID` | `log2(D/W + 1)` | por trial, `difficultyTone`: high ≥2.4 / medium ≥1.6 / low <1.6 |
| `throughput` | `ID / (RT s)` | solo si `rt > 0` |
| `routeLabel` | por `overshoot`, `correctionCount`, `pathEfficiency`, `deviationRmsPx` (umbral 0.75 / 1 / 18 px) | si kinemáticas no medibles → `Ruta registrada` (§9) |
| Resumen final | `accuracy`, `meanScore`, `meanRT`, `meanPathEfficiency` (+ `trials` en-memory, **se elimina en el payload final** — §12) | `onComplete(summary)` |

No hay economía de puntos acumulado ni meta global: es una tarea de precisión con
score por trial (a diferencia de los juegos original).

---

## 5. Elementos visuales y feedback (UI/UX)

- **Señalética:** corridor = línea sólida (ancho = `corridorWidthPx`, 0.35 opacity)
  + línea punteada (3 px) sobre canvas crema; target = círculo con borde 3 px
  (`--postulation-game-target`) + halo; start pad = botón circular 56 px teal.
- **HUD:** header pills (título/progreso/Fitts ID) + route card (4 celdas) +
  feedback strip (`role="status"`, no intrusivo, fuera del canvas).
- **Animaciones:** `targetPopIn` 150 ms + `feedbackFade` 700 ms (CSS shared
  `styles.css`; **sin gate `prefers-reduced-motion`** — P3 sistemático, §14).
- **Responsive checklist (FASE B.2, 2026-09-12):**
  - [x] 0 overflow horizontal en 390×844 (smoke Playwright, 2026-09-12)
  - [x] 0 overflow horizontal en 1280×720 (smoke Playwright, 2026-09-12)
  - [x] canvas por viewport: 520×290 (desktop) / 312×340 (móvil) — `getPostulationGameViewport`
  - [x] start pad 56 px ≥ 44 px AA (smoke asert)
  - [~] target mínimo 32 px (radio 16): ≥ 24 px (WCAG 2.5.8 AA) pero < 44 px —
        trade-off de Fitts documentado (P3-6, §14); hit test por distancia al centro
  - [ ] P3: canvas alineado a la izquierda en desktop ancho (vacío a la derecha) —
        centrar `task-area` (recomendado, sin fix en B.2)
  - [x] feedback `role="status"` describe cada trial (headline + route label + detalle)

---

## 6. Referencias diseño

- `docs/design/krumm-postulation-pdd.md`, `krumm-postulation-sdd.md`.
- `AGENTS.md` — privacidad/gobernanza y contrato científico R-6.
- `docs/qa/prelaunch/2026-09-12-precision-targeting.md` — auditoría 8 dims + hallazgos.
- Fitts, P. M. (1954). *The information capacity of the human motor system in
  targeting a two-dimensional spatial task.* Human Factors, 2(3), 191–198.
  (referencia del índice de dificultad; evidencia adyacente, no validación normativa)
- `src/tasks/PrecisionTargetingTask.jsx` — componente y UX copy.
- `src/telemetry/kinematics.js`, `src/telemetry/pointerSampler.js` — cinemáticas.

---

## 7. Máquina de estados del juego (state machine)

```
ready  --(click/tap start pad)-->  target  --(click/tap anywhere)-->  feedback  --(450 ms ITI)-->  ready (trial n+1)
ready/target: clicks fuera de fase = no-op (phase guards en beginMovement/recordPointer/finishTrial)
feedback del trial N --> finished (game_end + onComplete; en batería el siguiente juego monta en el mismo batch)
```

| Estado | Entrada | Salida | Notas |
|---|---|---|---|
| `ready` | mount / ITI | click en start pad | hint visible; start pad enabled |
| `target` | `beginMovement` | click en canvas (hit o miss) | pointermove muestrea; cualquier click cierra el trial (miss si fuera del radio) |
| `feedback` | `finishTrial` | ITI 450 ms → `ready` (o `finished`) | feedback strip; handlers en no-op |

- **Phase gates:** `beginMovement` exige `phase==='ready'`; `recordPointer`/`finishTrial`
  exigen `phase==='target'` — clicks dobles/multitouch no corrompen el trial.
- **Lock de geometría (fix FASE B.2, PRE-P2-1):** `buildPrecisionTrials` se calcula con el
  tamaño del stage al **montar** (`initialSizeRef`); la re-medición del viewport
  (resize/rotación/URL-bar) a mitad de trial NO re-sitúa blancos, NO reinicia el sampler
  y NO emite `stimulus_shown` duplicado/huérfano. El canvas conserva su tamaño inicial;
  si el contenedor se encoge por debajo, el clip residual se resuelve con un click
  (miss) — **nunca deja el trial irresoluble**. Test: `precisionTargeting.test.jsx`
  ("does not reset an in-flight trial when the stage re-measures the viewport mid-trial").
- **Timer ITI:** 450 ms, con cleanup en unmount (`itimerRef`) — fix FASE B.2 (PRE-P3-4).
- **Sin timeout por trial (decisión PRE-P2-2):** el trial `target` es sin bound temporal
  por diseño: el RT/throughput de Fitts mide el tiempo real de completar el movimiento;
  un timeout global contaminaría la métrica principal. Abandono = no completar el juego
  (la batería lo refleja en `completedTrialRatio`).
- **Anti-pattern phase-gate (lección Tangram):** auditado — los gates aíslan telemetría/
  fase, nunca UI visible: el start pad funciona en `ready` (teclado: es un `<button>`),
  el hint se renderiza en `ready`, el target+corridor en `target`. La interacción núcleo
  (alcanzar el blanco) es **solo puntero** por diseño (tarea Fitts); no hay equivalente
  de teclado — documentado (PRE-P3-1).

---

## 8. Contrato de ingesta (geometría de trial)

```js
// buildPrecisionTrials → por trial (todo numérico finito, determinista):
{
  trialId: 'precision-<i>', targetId: 'precision-target-<i>', trialIndex: i,
  origin: { x, y },                 // centro del canvas
  target: { x, y, radius },         // clamp [radius+16, w|h−radius−16]
  distancePx, targetWidthPx,        // 2·radius
  fittsId,                          // log2(D/W+1), 4 decimales
}
```

Tamaño del canvas: `width/height` props del stage (`getPostulationGameViewport`,
clamp 240..620 × 280..340 compact; 720×460 no-compact) — **bloqueado al montar** (§7).

---

## 9. Pipeline de señales (puntero, privado por diseño)

- **Frecuencia:** eventos `pointermove` nativos (típicamente 60–125 Hz en desktop).
- **Ventana de muestreo:** desde `beginMovement` (T₀, muestra sintética de origen)
  hasta el click de `finishTrial` (T_end, muestra del endpoint).
- **Buffer:** `pointerSampler` **in-memory** (`pointer_sampler_v1`, cap 900 muestras;
  overflow = descarta las más antiguas, P3-8) — `rawPointerPathStored: false`,
  `inMemoryOnly: true`. Nunca viaja al payload.
- **Agregado:** `summarizePointerTrial` (kinemáticas: `pathEfficiency`,
  `meanJerkPxPerMs3`, `correctionCount` (giros >45°), `overshootCount` (proyección
  >1.05 sobre la línea), `dwellTimeMs`, `deviationRmsPx`, `sampleCount`) +
  `buildPrecisionResponseAggregate` (labels + `measurable`).
- **Umbral de medibilidad (fix FASE B.2, PRE-P1-1):**
  `MIN_KINEMATICS_SAMPLES = 3` (`kinematics.js`). Un **tap touch** produce exactamente
  2 muestras (origen sintético + click): la "trayectoria" es la recta trivial
  origen→click con `pathEfficiency = 1.0`, jerk/correction/overshoot = 0 — cinemáticas
  **degeneradas** que no pueden leerse como "ruta perfecta" (R-6: señal ausente =
  desconocida/caveated, nunca desempeño bajo **ni perfecto**). Comportamiento:
  1. Trial: `adaptivePrecision.measurable = false` + label neutro `Ruta registrada`
     (sin claim de calidad; feedback honesto en dispositivo touch).
  2. Agregado batería: `motor.kinematicsResponseCount` / `motor.kinematicsMeasuredCount`
     (`summarizeGameEvents`).
  3. Feature vector: `qualityFlags += 'kinematics_insufficient_samples'` cuando
     `measured < responseCount` (additivo, v2 intacto).
  4. Reporte: caveat `kinematics_insufficient_samples` en `qualitySummary` → todas las
     dimensiones (incluida `visuomotorPrecision`) lo heredan y `qualityConfidence` lo
     penaliza (−0.08). La evidencia Fitts (RT, throughput, error espacial) **sí** es
     válida en touch; solo la cinemática de trayectoria queda caveada.
- **Cámaras/biometría:** contexto/calidad únicamente (no se consume para este módulo).

---

## 10. Contratos de evento (game_event_v1)

Emitidos vía `GameRuntime` → `normalizeGameEvent` (contrato `game_event_v1`,
`privacy.rawPointer: false` por evento):

| Evento | Emisión | Campos |
|---|---|---|
| `game_start` | `GameRuntime` al activar (1× por montaje) | `gameId`, `timestamp`, `gameState{level:1, difficulty:'fitts'}` |
| `stimulus_shown` | `beginMovement` (por trial) | `trialId`, `targetId`, `stimulus{kind:'fitts_target_after_start_pad', payload{target, origin, distancePx, targetWidthPx, indexDifficulty}}`, `gameState{score acumulado, level, difficulty}` |
| `response` | `finishTrial` (por trial, hit o miss) | `pointer{x,y}` (endpoint único, sanitized), `response{correct, outcome:'hit'\|'miss', reactionTimeMs, score, fitts{distancePx, targetWidthPx, indexDifficulty, throughput}, adaptivePrecision{routeLabel, measurable, ...agregados}, pointerSummary{...kinemáticas + privacy}}` |
| `game_end` | trial final (antes de `onComplete`) | `gameState{score total, level: totalTrials, difficulty}` — **verificado FASE B.2** (ya existía desde el diseño) |

Agregado batería: `summarizeGameEvents` → `performance` + `motor` (+ `kinematics*`) +
`fitts{meanIndexDifficulty, meanThroughput}` + `privacy{aggregateOnly:true}`.

---

## 11. Métricas conductuales derivadas (provisionales, descriptive_only)

| Métrica (fuente) | Definición | Constructo provisional | Caveat |
|---|---|---|---|
| `game.fittsMeanIndexDifficulty` (feature v2) | mean(ID por trial) | demanda de la tarea (no señal) | describe la dificultad presentada |
| `game.fittsThroughput` (feature v2) | mean(ID/RT) | `visuomotor_precision` | RT incluye deliberación (sin timeout por diseño, §7); **válida en touch y mouse** |
| `pointer.pathEfficiencyMean` (feature v2) | mean(straight/total por trial) | `visuomotor_precision` | **degenerada en touch** (2 muestras → 1.0): caveat `kinematics_insufficient_samples` (§9) |
| `pointer.overshootRate` / `pointer.correctionRate` / `pointer.jerkMean` (feature v2) | mean por trial | `visuomotor_precision` | idem caveat touch |
| `meanRT`, `accuracy`, `meanScore`, `meanPathEfficiency` (block summary) | resumen del juego | `visuomotor_precision` (evidencia) | score 0–100 provisional, **sin baremos** |

**Nota de dimensión (`visuomotorPrecision` en `talentProfile.js`):**
`rawScore = mean(pathEfficiency, 1−overshoot, smoothPursuit, canalEdgeAI)`.
`smoothPursuitScore` = 0 siempre en `stable_dg` (el juego `pursuit_tracking` no está en
esta batería) → **sesgo constante** hacia abajo para todos los candidatos
(nondiscriminativo, pero infla la distancia al "100"). Aceptado como provisional
descriptivo (PRE-P2-3); la corrección requiere el mapeo R-6 validado por batería
(fase posterior a B), no un hotfix por juego. La regla R-6 "señal ausente ≠ bajo
desempeño" se cumple a nivel de caveat/confianza, no de la fórmula (documentado).

**Regla de nulos:** constructo sin evidencia → `score: null` (framework original);
en `stable_dg` la dimensión siempre tiene score provisional porque el juego es
obligatorio y visible — su limitación se expresa por caveats + confidence (§9).

---

## 12. Contrato de salida (allowlist-only)

### 12.1. Block summary (`onComplete` → `completedDemo.blocks[].summary`)

```js
{ gameId: 'precision_targeting', totalTrials, accuracy, meanScore, meanRT,
  meanPathEfficiency, trials: [ ...por trial (agregados, in-memory)... ] }
```

### 12.2. Estructura final (payload)

`normalizeCompletedBlocks` aplica **`stripForbidden`** (recursivo,
`ASSESSMENT_FORBIDDEN_KEYS` — incluye `trials`) → el `result` del bloque que llega a
sesión/payload es **solo**: `{gameId, totalTrials, accuracy, meanScore, meanRT,
meanPathEfficiency}`. `sanitizeBlocks` (allowlist por campo) + `sanitizeGameResults`
(clone) + `validateFinalAssessmentPayload` (recursivo, forbidden keys) re-verifican.
**Verificado FASE B.2:** test `postulationDemoSessionBuilder.test.js`
(`result` sin `trials`, `payload.validation.ok`).

### 12.3. Feature vector

`assessment_feature_vector_v2` (v0.2.0) — keys aditivas de este juego:
`game.fittsMeanIndexDifficulty`, `game.fittsThroughput`, `pointer.pathEfficiencyMean`,
`pointer.overshootRate`, `pointer.jerkMean`, `pointer.correctionRate`
(+ `qualityFlags` incl. `kinematics_insufficient_samples` cuando aplica).
`featureArray` finito; `privacy.payloadContainsAggregatesOnly: true`.

### 12.4. Campos PROHIBIDOS (privacy guard)

- `assessment/assessmentSession.js` → `ASSESSMENT_FORBIDDEN_KEYS` (33 claves:
  `trials`, `pointerSamples`, `rawPointerPath`, `clickTrace`, `rawGameEvents`,
  `landmarks`, `frames`, `screenshot`, `DOMEvent`, `PointerEvent`, …).
- El sampler in-memory nunca se serializa; `response.pointer` = **un** endpoint
  sanitized (no trayectoria).

---

## 13. Privacidad y gobernanza (no negociables — verificado FASE B.2)

- [x] Sin video/frames/landmarks/keypoints/rutas/pointer samples crudos en payload.
- [x] Cámara/biometría = contexto/calidad, no inferencia de este módulo.
- [x] Agregados allowlist-only; `game_event_v1` + `stimulus_shown`/`response`/`game_end` intactos.
- [x] Señal ausente/degenerada = caveated (`kinematics_insufficient_samples`), nunca
      bajo desempeño ni desempeño perfecto.
- [x] `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe` en payload.
- [x] `descriptive_only`: sin percentiles/cortes/ranking/apto-no-apto.
- [x] Chain R-6 completa: constructo → demanda (Fitts) → conducta (RT, error endpoint,
      trayectoria) → telemetría agregada (`motor.*`, `fitts.*`) → feature versionada
      (v2) → regla provisional (dimensión `visuomotorPrecision`) → disponibilidad/
      confianza/caveats → narrativa de revisión humana.

---

## 14. Riesgos y mitigaciones

| Riesgo | Sev | Mitigación / decisión |
|---|---|---|
| Kinemáticas touch degeneradas leídas como "ruta perfecta" (infla evidencia en móvil, dispositivo principal de piloto) | **P1 (cerrado B.2)** | `MIN_KINEMATICS_SAMPLES=3` + label neutro `Ruta registrada` + counts agregados + quality flag + caveat en reporte (RED→GREEN; smoke E2E touch verifica el label en vivo) |
| Re-medición de viewport a mitad de trial (resize/rotación) reinicia trial + `stimulus_shown` huérfano | **P2 (cerrado B.2)** | Lock de geometría al montar (§7) + test de regresión |
| Timeout ITI (450 ms) sin cleanup en unmount | **P3 (cerrado B.2)** | `itimerRef` + cleanup |
| `smoothPursuitScore` ausente en stable_dg → sesgo constante en la dimensión | P2 (abierto, decisionado) | Documentado (§11); fix en mapeo R-6 validado (post-B) |
| `sanitizeGameResults` sin `role: calibration\|scored` (SRT-P2-3, sistemático B.1) | P2 (abierto, decisionado) | Este juego es `visible:true` (scored) → impacto bajo; fix coordinado con B.1 |
| Sin timeout por trial (RT incluye deliberación) | P2 (decisionado) | Por diseño (Fitts throughput); documentado §7; no cambia en B.2 |
| Keyboard: interacción núcleo solo-puntero (start pad sí es button) | P3 (decisionado) | Tarea Fitts por puntero; documentado §7 |
| `getBoundingClientRect()` por `pointermove` (patrón SRT-P3-2) | P3 (revisado, decisionado) | Se mantiene por-evento: cache por trial podría volverse stale con scroll interno del stage (coordenadas erróneas); sin layout thrash (no hay write tras la read en el mismo frame) — decisión idéntica a SRT-P3-2 |
| Touch target mínimo 32 px < 44 px guideline | P3 (decisionado) | ≥ 24 px (WCAG 2.5.8 AA); Fitts exige blancos pequeños; hit test por distancia al centro es generoso en el borde |
| Emoji `🎯` en título (tofu en algunos dispositivos) | P3 (abierto, sistemático) | Verificar en real (patrón `t_25009e33`); si tofu → SVG inline |
| Animaciones shared `.rt-target`/`.trial-feedback` sin gate `prefers-reduced-motion` | P3 (abierto, sistemático CSS shared) | Fix coordinado (afecta a todos los stable_dg) |
| Sin detección de focus-loss (tab switch infla RT) | P3 (abierto, sistemático) | Igual que resto de stable_dg (plan B.2.1 `blurCount` no implementado en ninguno) |
| Cap 900 muestras descarta las más antiguas en movimiento >~10 s continuo | P3 (abierto) | Cap de protección de memoria; kinemáticas sobre ventana retenida (documentado) |
| Canvas alineado a la izquierda en desktop ancho (vacío derecho) | P3 (abierto) | Centrar `task-area` (cosmético, sin fix en B.2) |
| Overclaiming HR / decisión automática | — | Lenguaje observacional, `humanReviewOnly`, sin baremos |

---

## 15. Criterios de aceptación (gates) — resultado FASE B.2

```bash
NODE_ENV=test npx vitest run <focales> --pool=threads --reporter=default   # 34/34 (5 files)
NODE_ENV=test npx vitest run <relacionados> --pool=threads                 # 122/122 (19 files)
npx oxlint src/tasks/PrecisionTargetingTask.jsx src/tasks/precisionTargeting.test.jsx \
  src/telemetry/kinematics.js src/telemetry/kinematics.test.js \
  src/telemetry/gameTelemetry.js src/telemetry/gameTelemetry.test.js \
  src/telemetry/gameFeatureVector.js src/telemetry/gameFeatureVector.test.js \
  src/postulation-demo/postulationDemoSessionBuilder.js \
  src/postulation-demo/postulationDemoSessionBuilder.test.js              # 0 warnings (v1.81.0)
npm run build                                                             # OK (5.7 s)
```

- [x] Tests RED→GREEN del fix P1 (touch) + P2 (resize) + P3 (ITI):
      `precisionTargeting.test.jsx` (11 tests), `kinematics.test.js`,
      `gameTelemetry.test.js`, `gameFeatureVector.test.js`,
      `postulationDemoSessionBuilder.test.js`.
- [x] Browser smoke 2 viewports (1280×720 mouse + 390×844 touch) —
      `scripts/smoke-b2-precision-targeting-2026-09-12.mjs`: 0 failures, 0 console
      errors, 0 requestfailed, 0 overflow; 4/4 trials por viewport; transición a
      go/no-go íntegra; **E2E: label `Ruta registrada` visible en vivo en touch** y
      labels de calidad (no degenerados) en mouse; fixture report OK en ambos
      viewports. Screenshots: `docs/qa/prelaunch-b2-precision/`.
- [x] Feature vector v2 con `featureArray` finito + `qualityFlags` (incl.
      `kinematics_insufficient_samples` condicional).
- [x] Payload sin raw fields prohibidos (`trials` eliminado; validación recursiva OK).

**Test de componente (lección Tangram) — presente:** onboarding (start pad → target
visible), interacción núcleo por puntero (click) con keyboard en el start pad,
transición de trial (ITI real con fake timers) y privacidad del payload emitido
(`JSON.stringify` sin `samples`), más los tests de regresión de FASE B.2.

---

## 16. Trazabilidad de auditoría (FASE B.2)

| Hallazgo | Sev | Estado | Evidencia |
|---|---|---|---|
| PRE-P1-1 kinemáticas touch degeneradas | P1 | **cerrado** (fix + tests + smoke E2E) | §9, §15 |
| PRE-P1-2 sin doc módulo R-6 (sistemático stable_dg) | P1 | **cerrado** (este doc) | §0–§15 |
| PRE-P2-1 reset de trial por re-medición de viewport | P2 | **cerrado** (fix + test) | §7 |
| PRE-P2-2 sin timeout por trial | P2 | decisionado (por diseño) | §7 |
| PRE-P2-3 sesgo constante `smoothPursuit` en dimensión | P2 | decisionado (mapeo R-6 post-B) | §11 |
| PRE-P2-4 `role calibration/scored` ausente (SRT-P2-3) | P2 | abierto sistemático (impacto bajo: juego scored) | §14 |
| PRE-P3-1..8 (keyboard, rect por event, emoji, ITI cleanup, focus-loss, target 32 px, reduced-motion, cap 900) + canvas left-aligned | P3 | 1 cerrado (ITI), resto decisionados/documentados | §14 |

## 17. Pitfalls (incidentes reales — revisar antes de cerrar cambios)

| Pitfall | Incidente | Prevención |
|---|---|---|
| Trayectoria de 2 puntos (touch) se lee como eficiencia 1.0 | FASE B.2 PRE-P1-1 (este doc) | `MIN_KINEMATICS_SAMPLES`; label neutro; quality flag + caveat; verificar en smoke touch |
| Geometría con `useMemo` sobre props de viewport + effect de reset dependiente de la identidad del objeto de trial | FASE B.2 PRE-P2-1 (este doc) | Lock al montar (`initialSizeRef`); el reset effect solo debe reaccionar al índice de trial; re-verificar en B.5 `visual_search` (mismo patrón detectado) |
| Pantalla "finished" nunca visible en batería (onComplete monta siguiente juego en el mismo batch) | FASE B.1 (SimpleRT) — aplica aquí | Smoke espera la SUPERFICIE siguiente, no el testid `*-finished` |
