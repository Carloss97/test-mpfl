<!--
================================================================================
MÓDULO JUEGO ORIGINAL: Puzzle Láser (`laser_puzzle`)
================================================================================
Instancia de: docs/design/modulos/plantilla-modulo-original-game.md (v2)
Fuente de verdad: código real en src/ (backfill J2, 2026-09-06)
Estado: implementado (backfill documental post-implementación)
================================================================================
-->

# Módulo Juego Original: Puzzle Láser (`laser_puzzle`)

> **Versión plantilla:** `original-game-unified_v2`
> **Versión del módulo:** `1.0.0`
> **Fecha:** `2026-09-06`
> **Autor(es):** `hermes (backfill J2, a partir del código real del repo)`
> **Estado:** `implementado`
> **Runtime de inferencia:** `Edge AI (WASM / WebGL) — Zero Cloud`
> **Ruta producto:** `/postulaciones-demo`
> **Batería:** `original_games` (`?battery=original`) — **Fallback:** `stable_dg`

---

## 0. Traza de implementación (rutas reales `src/`)

| Sección doc | Archivo(s) `src/` | Export/Función clave | Tests |
|---|---|---|---|
| 1. Objetivo/flujo | `tasks/original-games/LaserPuzzlePostulationTask.jsx` | Componente, `onComplete` | `LaserPuzzlePostulationTask.test.jsx` |
| 2. Estructura fases | `tasks/original-games/laserPuzzleTelemetry.js` | `buildLaserDemoLevels` | `laserPuzzleTelemetry.test.js` |
| 3. Textos UX | `tasks/original-games/LaserPuzzlePostulationTask.jsx` | i18n `t(es, en)`, `GameMicroIntro` | `LaserPuzzlePostulationTask.test.jsx` |
| 4. Economía | `tasks/original-games/laserPuzzleTelemetry.js` | `par`, `getLaserEfficiency`, `buildLaserResponseAggregate` | `laserPuzzleTelemetry.test.js` |
| 5. Visual/Feedback | `tasks/original-games/LaserPuzzlePostulationTask.jsx` | `getLaserBoardMetrics`, `getCellIcon`, `describeCell` | `LaserPuzzlePostulationTask.test.jsx` + smoke |
| 7. State machine | `tasks/original-games/LaserPuzzlePostulationTask.jsx` | `introDone`, `levelIndex`, `phase`, `finished` | `LaserPuzzlePostulationTask.test.jsx` |
| 8. Contrato ingesta | `tasks/original-games/laserPuzzleTelemetry.js` | Level object (freeze), `cells`, `solutionPlacements` | `laserPuzzleTelemetry.test.js` |
| 9. Pipeline señales | `telemetry/gameCorrelation.js` | `correlateGameWithMultimodalSignals` | `gameCorrelation.test.js` |
| 10. Contratos evento | `tasks/original-games/LaserPuzzlePostulationTask.jsx` | `emit` (stimulus_shown/response/game_end) | `LaserPuzzlePostulationTask.test.jsx` |
| 11. Métricas derivadas | `assessment/originalGameFeatureVector.js` | `addLaserFeatures`, defs `laser.*` | `originalGameFeatureVector.test.js` |
| 12. Contrato salida | `tasks/original-games/laserPuzzleTelemetry.js` | `sanitizeLaserResponsePayload`, `LASER_ALLOWED_RESPONSE_FIELDS` | `laserPuzzleTelemetry.test.js` |
| 13. Privacidad | `tasks/original-games/laserPuzzleFeedback.js` | `LASER_FEEDBACK_FORBIDDEN_KEYS` | `laserPuzzleFeedback.test.js`, `laserPuzzleAuthoringReview.test.js` |
| 14. Riesgos | `tasks/original-games/laserPuzzleFeedback.js` | `buildLaserPuzzleFeedback` | `laserPuzzleFeedback.test.js` |

---

## 1. Objetivo y flujo de usuario

Puzzle espacial de rutas ópticas: el candidato recoloca reflectores móviles en una grilla 8×8 para que el haz emitido por la nave recorra todos los relés (◆) y encienda la(s) antena(s) (📡), evitando meteoritos (☄) y usando portales y bifurcadores. Cada nivel tiene un `par` de movimientos óptimos; la eficiencia `par/moves` agregada alimenta la evidencia de planificación.

### 1.1. Propósito (una frase)
Evaluar **conducta observable de planificación espacial y cumplimiento de reglas explícitas** (eficiencia de solución, cumplimiento de reglas, tasa de niveles resueltos), no rasgos de personalidad.

### 1.2. Constructos objetivo (provisionales, R-6)

| Constructo (provisional) | Feature vector key(s) | Disponibilidad | Caveat / evidencia |
|---|---|---|---|
| `problem_solving / spatial_planning` | `laser.solutionEfficiency`, `laser.solvedRate` | `insufficient` | Hipótesis de diseño; sin normas ni validación (R-6). |
| `decision_speed` | `laser.timeMs` | `insufficient` | Solo contexto temporal agregado; no es norma de velocidad. |
| `rule compliance` (conductual) | `laser.ruleCompliance` | `insufficient` | Violaciones contadas = mover a celda ocupada/no móvil; hipótesis sin validar. |
| `leadership / communication` | — | `not_measured` | Tarea individual espacial. |

### 1.3. Alcance IN / OUT (del módulo)
- **IN:** 3 niveles de dificultad creciente (4/5/6 reflectores móviles; relés 3/5/6; antenas 1/1/2; portal azul en nivel 2, portal rojo + bifurcador + 2 antenas en nivel 3); límites de tiempo por nivel (100/130/160 s); teclado completo (flechas + Enter/Espacio + R reiniciar + C comprobar). Emisión `game_event_v1` (`stimulus_shown` / `response` / `game_end`).
- **OUT:** otros juegos de la batería; inferencia biométrica de emoción/estrés; contratación.

---

## 2. Estructura de niveles / fases

| Nivel | Id | Nombre | Elementos | Par | Límite | ¿Tutorial? |
|---|---|---|---|---|---|---|
| 1 | `laser-v2-1-orbita-quebrada` | Órbita quebrada | 4 reflectores, 3 relés, 1 antena | 4 mov. | 100 s | `false` |
| 2 | `laser-v2-2-salto-cuantico` | Salto cuántico | 5 reflectores, 5 relés, portal azul (dirección conservada) | 5 mov. | 130 s | `false` |
| 3 | `laser-v2-3-nexo-gemelo` | Nexo gemelo | 6 reflectores, portal rojo, bifurcador, 6 relés, **2 antenas** | 6 mov. | 160 s | `false` |

No hay fase tutorial separada por nodos; el onboarding es `GameMicroIntro` (overlay previo a `gameStartTimeRef`). La práctica de batería (G.2, `practice` prop) se aisla con `markPracticeSummary`.

---

## 3. Textos e instrucciones (UX Copy)

| Pantalla / Momento | Texto ES | Texto EN | Notas |
|---|---|---|---|
| Micro intro | (overlay `GameMicroIntro` gameId `laser_puzzle`) | same | previo al timer |
| Estado inicial | `Selecciona una pieza móvil y luego una celda vacía.` | `Select a movable piece, then an empty cell.` | `role="status"` |
| Hint teclado | `Teclado: ← ↑ → ↓ mover foco · Enter/Espacio mover pieza · R reiniciar · C comprobar ruta` | `Keyboard: ← ↑ → ↓ move focus · Enter/Space move piece · R reset · C check route` | `GAME_KEYBOARD.laser` |
| Objetivo nivel 1 | `Reconstruye una órbita de cuatro reflectores y activa todos los relés antes de alcanzar la antena.` | `Rebuild a four-reflector orbit and light every relay before reaching the antenna.` | |
| Iconos celda | 🚀 nave · 📡 antena · ◆ relé · ☄ meteorito · ╱ ╲ reflectores · Y bifurcador · ◌/◎ portales | same | `getCellIcon` |

---

## 4. Economía del juego

- **Score por nivel/agregado:** `solutionEfficiency = min(1, par / moveCount)` (`getLaserEfficiency`).
- **Score global:** `(solutionEfficiency*0.65) + (solvedRate*0.35) − penalty_violations` donde `penalty = min(0.35, ruleViolationCount * 0.05)`; clamp [0,1] (`buildLaserResponseAggregate`).
- **Violación de regla:** intento de mover a celda ocupada o pieza no móvil (`movePiece` → `violation: true`, `ruleViolationCount++`).

---

## 5. Elementos visuales y feedback (UI/UX)

- **Board responsivo:** `getLaserBoardMetrics(level, viewport)` — gap 2/4, padding 10/12, celda preferida 42/48 px, mínima 24/28 px; clamp por ancho y alto; modo `compact` si `width <= 620 || height <= 360`.
- **Accesibilidad:** cada celda describe pieza vía `describeCell` (aria-label); feedback de estado con `role="status"`.
- **Tipos fijos vs móviles:** nave/antena/relé/meteorito/portales fijos; reflectores `reflector_ne`/`reflector_nw` con `movable: true`.

## 6. Referencias diseño
- `docs/plans/2026-07-20-laser-passenger-product-game-design-review.md`, `docs/plans/2026-07-21-original-games-v2-laser-passenger-team-rpg-plan.md`.
- Blueprint: `src/postulation-demo/originalGameBlueprints.js` (entry `laser_puzzle`, skill `spatial_planning`, `durationLabel: '4 min'`, `trialCount: 3`).

---

## 7. Máquina de estados del juego

```
INTRO (GameMicroIntro) -> introDone -> gameStartTimeRef = now()
PLAY_NIVEL_i -> seleccionar pieza móvil -> mover a celda vacía (o violación)
  -> traceLaserBeam actualiza relés/antenas encendidos
  -> nivel resuelto (todas antenas+relés) -> clear/interstitial -> siguiente nivel
FIN -> buildLaserResponseAggregate -> sanitize -> game_end -> onComplete
```

Los gates aíslan telemetría de práctica (`practice`), no la interacción. `pushTimeout` con `clearMs=1500`, `interstitialMs=1400` (tests deben usar `waitFor` con timeout ≥ 2.5 s).

## 8. Contrato de ingesta (nivel)

```js
/** Level object (Object.freeze): id, name/nameEn, difficulty, objective(s),
 *  coreChallenge(s), cols, rows, par, antennaCount, relayCount, timeLimitMs,
 *  solutionPlacements: Array<[fromKey, toKey]>,  // grader authoring, no se persiste
 *  cells: [{x, y, type, dir?, movable?, portalId?, targetPortalId?}] */
```
Tipos de celda: `ship`, `antenna`, `relay`, `wall`, `reflector_ne`, `reflector_nw`, `bifurcator`, `portal_blue`, `portal_red`.

## 9. Pipeline de señales (Edge AI)

- Emisión `game_event_v1` por nivel (stimulus/response) y `game_end`; correlación contextual vía `telemetry/gameCorrelation.js`.
- Biometría (gaze/FACS/postura) = contexto/calidad solamente; sin inferencia de rasgo.

## 10. Contratos de evento (`game_event_v1`)

| Evento | meta/resumen |
|---|---|
| `stimulus_shown` | nivel id, índice, `difficulty: 'spatial_planning'` |
| `response` | sanitizado por `sanitizeLaserResponsePayload` (correct/outcome, reactionTimeMs, score, subobjeto `laserPuzzle` allowlist) |
| `game_end` | agregado `buildLaserResponseAggregate` |

## 11. Métricas conductuales derivadas (descriptive_only)

| Métrica (feature vector key) | Fórmula | Fuente agregado |
|---|---|---|
| `laser.completion` | `completed ? 1 : 0` | `completed` |
| `laser.solvedRate` | `solvedLevels / levelCount` | `solvedLevels`, `levelCount` |
| `laser.solutionEfficiency` | `min(1, par/moveCount)` (upstream) | `solutionEfficiency` |
| `laser.ruleCompliance` | `1 − min(1, violations/max(1,levelCount))` | `ruleViolationCount` |
| `laser.moveCount` | contador agregado | `moveCount` |
| `laser.timeMs` | milisegundos totales | `timeMs` |

Señal ausente → `score: null` (regla de nulos); defs completas en `originalGameFeatureVector.js` (`ORIGINAL_GAME_FEATURE_DEFINITIONS`, entradas `laser.*`).

## 12. Contrato de salida

### 12.1. Agregados (allowlist `LASER_ALLOWED_RESPONSE_FIELDS` / `laser_puzzle_aggregate_v1`)
`aggregateSchemaVersion, score, completed, levelCount, solvedLevels, moveCount, reconfigurationCount, hintCount, timeMs, solutionEfficiency, ruleViolationCount, aggregateOnly: true`.

### 12.2. Feature vector
`original_game_feature_vector_v1`: entradas `laser.*` en `ORIGINAL_GAME_FEATURE_ORDER` (6 features), calculadas en `addLaserFeatures` con qualityFlags (`laser_puzzle_contains_forbidden_raw_keys`, `invalid_aggregate`).

### 12.3. Campos PROHIBIDOS
- `src/tasks/original-games/laserPuzzleFeedback.js` → `LASER_FEEDBACK_FORBIDDEN_KEYS`: `beamCells, fullRoute, routeTrace, visitedCells, rawPointerPath, pointerSamples, rawGameEvents, clickTrace`.
- `src/assessment/originalGameFeatureVector.js` → `FORBIDDEN_KEYS` (370+).
- `originalGameBlueprints.js` → `FORBIDDEN_ORIGINAL_GAME_FIELDS`.
- **No se persiste:** ubicación de piezas movidas, orden de movimientos, `beamCells`, traza de solución, `solutionPlacements` (solo authoring).

## 13. Privacidad y gobernanza (checklist)
- [x] Sin video/frames/landmarks/keypoints/rutas/celdas del haz/pointer samples.
- [x] Agregados allowlist-only; `aggregateOnly: true` validado en feature vector.
- [x] `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe` (cadena global).
- [x] `descriptive_only` (R-6): sin percentiles/cortes.
- [x] Leadership/communication → `not_measured`.
- [x] Feedback (`buildLaserPuzzleFeedback`) con caveats y `unavailable()` ante agregado inválido o con claves prohibidas.

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Par mal calibrado infla/desinfla eficiencia | `laserPuzzleAuthoringReview.js` revisa coherencia authoring (par vs placed pieces, portals, etc.) |
| Violaciones = mala lectura de reglas | Contadas separadas del score núcleo; caveat en feedback |
| Overflow móvil | `getLaserBoardMetrics` clamp + compact |
| Interpretación como inteligencia general | Lenguaje observacional + `limitations` por feature |

## 15. Criterios de aceptación (gates ejecutados 2026-09-06)

```bash
NODE_ENV=test npx vitest run src/tasks/original-games/LaserPuzzlePostulationTask.test.jsx src/tasks/original-games/laserPuzzleTelemetry.test.js src/tasks/original-games/laserPuzzleFeedback.test.js src/tasks/original-games/laserPuzzleAuthoringReview.test.js
```
- [x] Tests componente (onboarding, interacción pieza, payload privacy).
- [x] Agregado allowlist-only; sin campos prohibidos.
- [x] Feature vector `laser.*` finito con qualityFlags.
