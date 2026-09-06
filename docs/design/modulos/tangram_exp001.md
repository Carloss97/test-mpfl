# Módulo Juego Original: Ensamblaje Geométrico (Tangram) (`tangram_exp001`)

> **Versión plantilla:** `original-game-unified_v2`
> **Versión del módulo:** `1.0.0` (feature vector `2.1.0`)
> **Fecha:** 2026-09-06
> **Autor(es):** Hermes agent + Carlos Saldivia
> **Estado:** `implementado` (bugfix P0 de práctica 2026-09-06 + test componente)
> **Runtime de inferencia:** `Edge AI (WASM / WebGL) — Zero Cloud`
> **Ruta producto:** `/postulaciones`
> **Batería:** `original` (`?battery=original`) — **Fallback:** `stable_dg`
> **Fuentes spec:** `docs/plans/2026-09-04-tangram-exp001-implementation-plan.md` + PDFs de especificación (Tangram EXP-001)

---

## 0. Traza de implementación

| Sección doc | Archivo(s) `src/` | Export/Función clave | Tests |
|---|---|---|---|
| 1. Objetivo/flujo | `tasks/original-games/TangramPostulationTask.jsx` | Componente, fases, `onComplete` | `TangramPostulationTask.test.jsx` |
| 2. Estructura fases | `tasks/original-games/tangramTelemetry.js` | `TANGRAM_LEVEL_PARAMS`, `getTangramLevelParams` | `tangramTelemetry.test.js` |
| 3. Textos UX | `tasks/original-games/tangramFeedback.js` + `TangramPostulationTask.jsx` | `getTangramWelcomeCopy`, `getTangramOutcomeMessage`, i18n `t` | `tangramFeedback.test.js` |
| 4. Economía | `tasks/original-games/tangramStages.js` | `SLOT_LAYOUT`, shapes + symmetry, `buildTangramSlots/Tray` | `tangramStages.test.js` |
| 5. Visual/Feedback | `TangramPostulationTask.jsx` (SVG canvas) | `trayVerticesPx`, `role="status"`, coverage en vivo | `TangramPostulationTask.test.jsx` |
| 7. State machine | `TangramPostulationTask.jsx` | `phase: welcome→tutorial→transition→play(1..4)→finished` | `TangramPostulationTask.test.jsx` |
| 8. Contrato ingesta | `tangramTelemetry.js` | `levelMetrics` (typedef implícito en `computeTangramBehavioralMetrics`) | `tangramTelemetry.test.js` |
| 9. Pipeline señales | `telemetry/gameCorrelation.js` | `gameCorrelation.aggregate` (contexto biometría, opcional) | `gameCorrelation.test.js` |
| 10. Contratos evento | `TangramPostulationTask.jsx` | `emit` `stimulus_shown` / `response` / `game_end` (game_event_v1) | `TangramPostulationTask.test.jsx` |
| 11. Métricas derivadas | `assessment/originalGameFeatureVector.js` | `tangram.*` (9 features), `addTangramFeatures` | `originalGameFeatureVector.test.js` |
| 12. Contrato salida | `tangramTelemetry.js` | `buildTangramLevelAggregate`, `buildTangramSessionAggregate`, `sanitizeTangramPayload` | `tangramTelemetry.test.js` |
| 13. Privacidad | `originalGameFeatureVector.js` + blueprint | `FORBIDDEN_KEYS`, `allowedAggregateFields` (16 keys) | `tangramTelemetry.test.js` + privacy |
| 14. Riesgos | `TangramPostulationTask.jsx` | gates de fase (incidente 2026-09-06) | `TangramPostulationTask.test.jsx` |

> **Regla:** Si una celda queda vacía, el slice NO está listo para cerrar (SDD delta incompleto).

---

## 1. Objetivo y flujo de usuario

El candidato ensambla la silueta objetivo con piezas poligonales (tangram clásico
abstracto): selecciona una pieza, la rota a 45° si hace falta y la encaja en la zona de
su forma. Comienza con una **práctica sin puntaje** (nivel 0) que enseña la interacción,
y continúa con 4 niveles evaluativos de dificultad creciente (calibración → planificación
con límite de movimientos → presión de tiempo → carga crítica doble restricción).

### 1.1. Propósito (una frase)
Resolver un problema espacial de ensamblaje bajo restricciones de tiempo/movimientos:
evidencia **planificación, ejecución motora fina y gestión de presión** (conducta
observable; NO rasgo psicológico).

### 1.2. Constructos objetivo (provisionales, R-6)

| Constructo (provisional) | Feature vector key(s) | Disponibilidad | Caveat / evidencia |
|---|---|---|---|
| `spatial_planning` | `tangram.avgInitialLatencyMs`, `tangram.avgHesitationMs` | `insufficient` | Matriz XLSX; sin normas; composite `planning` blend P+TG |
| `executive_function` | `tangram.solvedRate`, `tangram.totalMoveOverhead` | `insufficient` | overhead = movimientos sobre óptimo; lectura observacional |
| `motor_persistence` (contexto) | `tangram.avgCoverage`, `tangram.completion` | `insufficient con batería actual` | cobertura bajo presión; no infiere destreza global |
| `leadership / communication` | — | `not_measured` | tarea individual |

### 1.3. Alcance IN / OUT (del módulo)
- **IN:** 5 niveles (0 tutorial + 1-4 evaluativos), interacción click-seleccionar + click-zona, rotación 45° (Espacio/R/botón), D para deseleccionar, snap por vértice ±8px, cobertura en vivo, límites de tiempo/movimientos por nivel, SFX, agregados por nivel + sesión.
- **OUT:** drag-and-drop como mecanismo de snap (el pointer se registra solo como telemetría de trayectoria agregada), inferencia biométrica, calibración normativa, comparación entre personas.

---

## 2. Estructura de niveles / fases

| Fase/Nivel | Nodos/Trials | Propósito | ¿Evalúa? (`is_tutorial`) |
|---|---|---|---|
| Welcome (onboarding) | 0 | Instrucciones + CTA "Iniciar Tutorial de Práctica" | — |
| Tutorial / Nivel 0 | 2 piezas, sin tiempo/mov. | Práctica sin puntaje (G.2) | `true` |
| Transición | 0 | Avisa que comienza la evaluación | — |
| Nivel 1 Calibración | 4 piezas, 60 s | Línea base motora | `false` |
| Nivel 2 Planificación | 5 piezas, 45 s, 3 mov. | Planificación vs impulsividad (overhead) | `false` |
| Nivel 3 Presión tiempo | 6 piezas, 30 s | Tolerancia a presión / jitter | `false` |
| Nivel 4 Carga crítica | 7 piezas, 35 s, 4 mov. | Priorización ejecutiva (doble restricción) | `false` |

**Gates de nivel:** éxito = cobertura 100% (todas las piezas encajadas); fallos =
`timeout` (segundosLeft→0) o `moves_exhausted` (límite de movimientos agotado).

> **Requisito duro cumplido (verificado 2026-09-06, incidente Tangram):** la práctica
> ES completatable — zonas renderizadas en tutorial, rotación operativa (botón +
> teclado), transición tutorial→evaluación funcional. Cubierto por
> `TangramPostulationTask.test.jsx` (4 tests). Antes del fix, los 3 estaban rotos.

---

## 3. Textos e instrucciones (UX Copy / script de pantalla)

> Fuente única de interacción: **clic en pieza → clic en zona de su forma → encaja;
> Espacio/R o botón para rotar 45°; Q para deseleccionar; 1-9 para seleccionar pieza.**
> (Fix 2026-09-06: el welcome decía "clic y arrastra" + "botón secundario", controles
> inexistentes — corregido en `getTangramWelcomeCopy`.)

| Pantalla / Momento | Texto ES (resumen) | Notas |
|---|---|---|
| Bienvenida | "Simulación de Resolución Espacial: Ensamblaje Geométrico" + 3 puntos (piezas/recursos/precisión) | CTA "Iniciar Tutorial de Práctica" |
| Tutorial (overlay) | "Tutorial: clic en una pieza y luego en la zona de su forma para encajarla. Usa Espacio/R para rotar 45°." | `role="status"` |
| Transición | "Práctica completada" + CTA iniciar evaluación | avisa que se registra |
| HUD | Nivel, movimientos, tiempo (si aplica), cobertura % en vivo | `tangram-level-label`, `tangram-moves`, `tangram-time`, `tangram-coverage` |
| Hint teclado | "Teclado: 1-9 pieza · Espacio/R rotar · Enter encajar · Q deseleccionar" | `GAME_KEYBOARD.tangram` |
| Salida nivel | éxito/fallo por outcome + "Cobertura: X%" | `getTangramOutcomeMessage` |
| Fin | resumen de sesión + CTA continuar | `getTangramFinalCopy` |

---

## 4. Economía del juego

No hay puntuación monetaria; la "economía" es **restricciones por nivel**:

| Nivel | Piezas | Tiempo | Límite mov. | Óptimo | Propósito |
|---|---|---|---|---|---|
| 0 | 2 | — | — | — | práctica |
| 1 | 4 | 60 s | — | — | calibración |
| 2 | 5 | 45 s | 3 | 1 | overhead de planificación |
| 3 | 6 | 30 s | — | — | jitter bajo presión |
| 4 | 7 | 35 s | 4 | 1 | doble restricción |

Score por nivel: `solved ? 100 : 0` · Score sesión: `round(avgCoverage*0.6 + (solved/attempted)*40)`
(lectura interna de progreso, **no** percentil ni norma).

**Geometría:** 7 shapes (`tri_large`, `tri_medium`, `tri_small`, `square`, `rhombus`, …)
con `symmetry` declarada (rotaciones que dejan la forma congruente) — el snap valida
shapeId + rotación dentro de la symmetría + posición exacta (el encaje es
click-zona, no coordenadas). Silueta objetivo fija: `TANGRAM_SILHOUETTE`.

---

## 5. Elementos visuales y feedback (UI/UX)

- **Señalética:** piezas en bandeja inferior (gris, ámbar cuando seleccionada); zonas
  objetivo (azul tenue → azul sólido al llenarse); silueta punteada de referencia.
- **HUD layout:** header (título + nivel + mov + tiempo), canvas SVG 600×420 (viewBox,
  escala CSS), footer (cobertura `role="status"` + hint teclado + botones).
- **Animaciones feedback:** flash de snap (`tangram-slot--flash` 250 ms), SFX
  (`select`/`rotate`/`place`/`denied`/`success`), overlay de outcome 1400 ms.
- **Responsive checklist:**
  - [x] 0 overflow horizontal en 390×844 y 1280×720 (canvas por viewBox)
  - [x] Texto `role="status"` por transición
  - [ ] Re-verificar touch real en dispositivo (C6 del plan corto plazo — jsdom no cubre)

---

## 6. Referencias diseño
- `docs/plans/2026-09-04-tangram-exp001-implementation-plan.md` (plan + matriz de dificultad)
- PDFs de especificación (Tangram EXP-001)
- `docs/design/krumm-postulation-pdd.md`, `krumm-postulation-sdd.md`, `AGENTS.md` (R-6)
- `docs/design/game-experience-audit.md` (G.2 práctica, G.5 teclado)

---

## 7. Máquina de estados del juego (state machine)

```
welcome -> tutorial (nivel 0, is_tutorial) -> transition -> play (niveles 1..4) -> finished
```

| Estado | Entrada | Salida | Notas privacidad |
|---|---|---|---|
| `welcome` | mount | CTA → `tutorial` | sin telemetría |
| `tutorial` | CTA | 2/2 encajadas → outcome → (1400 ms) `transition` | `is_tutorial: true`; NO entra al reporte evaluativo; **interacciones completas** (post-fix 2026-09-06) |
| `transition` | ok tutorial | CTA → `play` nivel 1 (fija `introDone`) | avisa que se registra |
| `play` | introDone | outcome por nivel → siguiente nivel / `finished` | `stimulus_shown` + `response` por nivel |
| `finished` | nivel 4 o practice | `game_end` + `onComplete(aggregate)` | aggregate-only |

> **Anti-pattern phase-gate (cumplido):** los gates (`introDone`, `phase`) aíslan
> TELEMETRÍA evaluativa (stimulus/timer/rotación-counted), NUNCA la UI. Incidente
> 2026-09-06 documentado en la plantilla v2 §7 y §17.

---

## 8. Contrato de ingesta de datos (configuración de nivel)

```js
/** @typedef {Object} TangramLevelParams
 * @property {number} level          - 0 tutorial | 1-4 evaluación
 * @property {number} pieceCount     - 2 | 4 | 5 | 6 | 7
 * @property {number} timeLimitS     - 0 (sin timer) | 60 | 45 | 30 | 35
 * @property {number} moveLimit      - 0 (sin límite) | 3 | 4
 * @property {number} [optimalMoves] - referencia de overhead
 * @property {boolean} isTutorial
 * @property {string} purpose         - 'tutorial'|'calibration'|'planning'|'stress'|'dual_constraint'
 */
```

`levelMetrics` (por nivel): `completed, timedOut, moveLimitReached, coveragePercent,
movesUsed, rotationsUsed, timeMs, initialLatencyMs, trajectoryDistance, idealDistance,
hesitationMs, last10sJitter, score, optimalMoves`.

---

## 9. Pipeline de señales (Edge AI, privado por diseño)

- Cámara **opcional**: si hay señal MoveNet/FaceMesh, solo como **calidad de captura /
  contexto** (presencia, calidad), correlacionada por `gameCorrelation.aggregate` en
  ventanas pre-task/response/post-event. Nunca infiere talento/emoción/estrés.
- Señales de juego (agregadas, en dispositivo): latencia inicial, distancia de
  trayectoria vs ideal (eficiencia), hesitación (ventana de inactividad), jitter de
  aceleración de los últimos 10 s, cobertura, movimientos, rotaciones, tiempo.
- **Nunca** persiste: pointer samples crudos, secuencia de movimientos, rutas por evento.

---

## 10. Contratos de evento (game_event_v1)

| Evento | Campos obligatorios | Ejemplo `meta` |
|---|---|---|
| `stimulus_shown` | `gameId, trialId, timestamp, stimulus{kind:'tangram_level', payload{level, levelCount, pieceCount, timeLimitS}}` | solo niveles `play` (post-`introDone`) |
| `response` | `gameId, trialId, timestamp, response=sanitized levelAggregate, gameState{level, score}` | `tangram_level_N` |
| `game_end` | `gameId, timestamp, gameState{level:4, score: sessionScore}` | al finalizar (practice: summary marcado) |

`trialId`: `tangram_level_{N}` · `targetId`: `tangram_level_{N}_slots`.

---

## 11. Métricas conductuales derivadas (provisionales, descriptive_only)

| Métrica (feature vector key) | Fórmula / definición | Constructo provisional | Caveat | Fuente agregado |
|---|---|---|---|---|
| `tangram.completion` | binary (sesión completada) | `spatial_planning` | sin normas | `completed` |
| `tangram.solvedRate` | solved/attempted (niveles 1-4) | `executive_function` | lectura observacional | `solvedLevels/levelsAttempted` |
| `tangram.avgCoverage` | Σ coverage % por nivel / N | `motor_persistence` (ctx) | bajo presión, no destreza global | `avgCoveragePercent` |
| `tangram.avgTrajectoryEfficiency` | ideal/real por nivel (acotado) | `executive_function` | eficiencia de trayectoria agregada | `avgTrajectoryEfficiency` |
| `tangram.avgInitialLatencyMs` | media latencia primer-interacción→primer-snap | `spatial_planning` | NO "parálisis"; sin normas | `avgInitialLatencyMs` |
| `tangram.avgHesitationMs` | media inactividad en ventana | `spatial_planning` | NO "duda/estrés" | `avgHesitationTimeMs` |
| `tangram.totalMoveOverhead` | Σ(mov - óptimo) en niveles con límite | `executive_function` | overhead vs plan, sin corte | `totalMoveOverhead` |
| `tangram.totalMoves` | Σ movimientos | contexto | — | `totalMoves` |
| `tangram.totalTimeMs` | Σ tiempo por nivel | contexto | — | `totalTimeMs` |

**Regla de nulos:** señal/constructo sin evidencia → `score: null` (nunca 0 ni 50).
Leadership/communication = `not_measured`. `timingPressureHighLatency` = flag de calidad
(observación), no métrica de estrés.

---

## 12. Contrato de salida

### 12.1. Agregados (allowlist-only)
`allowedAggregateFields` (blueprint, 16 keys): `aggregateSchemaVersion, score, completed,
levelsAttempted, completedLevels, solvedLevels, totalTimeMs, totalMoves, totalRotations,
avgCoveragePercent, avgInitialLatencyMs, avgTrajectoryEfficiency, avgHesitationTimeMs,
totalMoveOverhead, timingPressureHighLatency, aggregateOnly`.

### 12.2. Assessment feature vector
`original_game_feature_vector_v1`, `featureDefinitionsVersion: '2.1.0'` — 9 features
`tangram.*` (§11) en `ORIGINAL_GAME_FEATURE_ORDER` con tipos (`binary|ratio|ms|count`).

### 12.3. Payload definitivo
`sanitizeTangramPayload` (session aggregate) → reporte workbook (card "Planificación
ejecutiva y resolución espacial bajo presión temporal; lectura observacional para
revisión humana") + bundle local descargable. `integrity_flags` vía fixtures.

### 12.4. Campos PROHIBIDOS (privacy guard)
- `originalGameFeatureVector.js` → `FORBIDDEN_KEYS`
- Blueprint → `FORBIDDEN_ORIGINAL_GAME_FIELDS`
- Típicos: `pointerSamples`, `rawPointerPath`, `trayPosition`, `dragX/dragY`,
  `jitterWindow`, `trials`, `sequence`, `freeText`, `rawGameEvents`, frames/landmarks.

---

## 13. Privacidad y gobernanza (no negociables)

- [x] Sin video/frames/landmarks/keypoints/rutas/pointer samples/DOM crudos.
- [x] Cámara/biometría = contexto/calidad, no inferencia (R-6).
- [x] Agregados allowlist-only (16 keys blueprint); `gameCorrelation.aggregate` intacto.
- [x] Señal ausente = `score: null` / caveat, nunca bajo desempeño.
- [x] MoveNet real o caveat; sin fallback FaceMesh para hombros.
- [x] `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe`.
- [x] `descriptive_only`: sin percentiles/cortes/ranking/apto-no-apto.
- [x] Leadership/communication = `not_measured`.
- [x] Cadena R-6 completa: constructo → demanda → conducta → telemetría → feature →
      regla provisional → caveats → revisión humana.
- [x] Feedback comprehension: lenguaje observacional ("lectura preliminar", "sin baremos").

---

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Phase-gate bloquea UI (INCIDENTE 2026-09-06) | Fix: gates solo telemetría; test componente con 4 casos obligatorios; anti-pattern documentado en plantilla v2 §7/§17 |
| Cópia que enseña controles inexistentes (welcome "drag"/"botón secundario") | Fix 2026-09-06 en `getTangramWelcomeCopy`; §3 = fuente única; verificación contra handlers reales |
| Overclaiming "tolerancia a frustración" desde nivel 3 | Caveat explícito: presión temporal = observación, sin inferencia (AGENTS.md: frustración NO se deriva de juegos/AUs) |
| Overflow en 390×844 | viewBox + CSS; smoke desktop/móvil en gates |
| Touch real no cubierto por jsdom | C6 plan corto plazo: verificación manual en dispositivo |

---

## 15. Criterios de aceptación (gates) — ejecutados 2026-09-06

```bash
NODE_ENV=test npx vitest run src/tasks/original-games/tangram* src/tasks/original-games/TangramPostulationTask.test.jsx --pool=threads
npx oxlint src/tasks/original-games src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

- [x] Tests RED→GREEN: agregados allowlist + campos prohibidos = 0 (`tangramTelemetry.test.js`).
- [x] Test componente obligatorio: onboarding → práctica → (rotación botón+teclado) → transición → nivel 1; payload privacy-safe. **4/4 GREEN.**
- [x] Feature vector v2.1.0 con `featureArray` finito (9 features `tangram.*`).
- [x] Suite completa 601/601; deploy krumm.cl verificado (2026-09-06).

---

## 16. Bitácora de incidentes (lecciones aplicadas a la plantilla v2)

- **2026-09-06 (3 bugs P0, pre-test-componente):** (1) slots no renderizados en tutorial
  (`useMemo` gateado en `phase==='play'`); (2) `rotateSelected` gateado en
  `phase!=='play'` → rotación muerta en la práctica; (3) effect de transición gateado en
  `phase!=='play'` → candidato atorado al completar la práctica. Fixes: gates incluyen
  `tutorial`; los gates de telemetría (`introDone`) se mantienen solo para `play`.
- **2026-09-06 (cópia):** welcome enseñaba "clic y arrastra" + "botón secundario del
  ratón" (no implementados) → corregido a click-seleccionar + Espacio/R/botón.
