<!--
================================================================================
MÓDULO JUEGO ORIGINAL: Globo de Riesgo (`balloon_risk`)
================================================================================
Instancia de: docs/design/modulos/plantilla-modulo-original-game.md
Datos reales extraídos de:
  - src/tasks/original-games/BalloonRiskPostulationTask.jsx
  - src/tasks/original-games/balloonRiskTelemetry.js
  - src/tasks/original-games/balloonRiskFeedback.js
  - src/assessment/originalGameFeatureVector.js (defs balloon.*)
Estado: aprobado (datos reales del repo)
================================================================================
-->

# Módulo Juego Original: Globo de Riesgo (`balloon_risk`)

> **Versión plantilla:** `original-game-unified_v1`
> **Versión del módulo:** `balloon_risk_aggregate_v1` (agregado) · feature `original_game_feature_vector_v1` `1.0.0`
> **Fecha:** `2026-07-27`
> **Autor(es):** `hermes (extraído de src/tasks/original-games/* y src/assessment/originalGameFeatureVector.js)`
> **Estado:** `aprobado (datos reales del repo)`
> **Runtime de inferencia:** `Edge AI (WASM / WebGL) — Zero Cloud`
> **Ruta producto:** `/postulaciones-demo`
> **Batería:** `original_games` (`?battery=original`) — **Fallback:** `stable_dg`

---

## 0. Traza de implementación (OBLIGATORIA — rellenar con rutas reales `src/`)

| Sección doc | Archivo(s) `src/` | Export/Función clave | Tests |
|---|---|---|---|
| 1. Objetivo/flujo | `tasks/original-games/BalloonRiskPostulationTask.jsx` | Componente, `onComplete` | `BalloonRiskPostulationTask.test.jsx` |
| 2. Estructura fases | `tasks/original-games/balloonRiskTelemetry.js` | `buildBalloonRiskRounds` | `balloonRiskTelemetry.test.js` |
| 3. Textos UX | `tasks/original-games/BalloonRiskPostulationTask.jsx` | i18n `t(es, en)` | `BalloonRiskPostulationTask.test.jsx` |
| 4. Economía | `tasks/original-games/balloonRiskTelemetry.js` | thresholds, points, `buildBalloonResponseAggregate` | `balloonRiskTelemetry.test.js` |
| 5. Visual/Feedback | `tasks/original-games/BalloonRiskPostulationTask.jsx` + CSS | `getBalloonRiskLayoutMetrics`, `role="status"` | `BalloonRiskPostulationTask.test.jsx` + smoke |
| 7. State machine | `tasks/original-games/BalloonRiskPostulationTask.jsx` | Estados internos | `BalloonRiskPostulationTask.test.jsx` |
| 8. Contrato ingesta | `tasks/original-games/balloonRiskTelemetry.js` | `RoundConfig` (JSDoc typedef) | `balloonRiskTelemetry.test.js` |
| 9. Pipeline señales | `telemetry/gameCorrelation.js` | `correlateGameWithMultimodalSignals` | `gameCorrelation.test.js` |
| 10. Contratos evento | `tasks/original-games/BalloonRiskPostulationTask.jsx` | `emitGameEvent` | `BalloonRiskPostulationTask.test.jsx` |
| 11. Métricas derivadas | `assessment/originalGameFeatureVector.js` | `addBalloonFeatures`, `ORIGINAL_GAME_FEATURE_DEFINITIONS` | `originalGameFeatureVector.test.js` |
| 12. Contrato salida | `tasks/original-games/balloonRiskTelemetry.js` | `sanitizeBalloonResponsePayload`, `BALLOON_ALLOWED_RESPONSE_FIELDS` | `balloonRiskTelemetry.test.js` |
| 13. Privacidad | `assessment/originalGameFeatureVector.js` + `balloonRiskFeedback.js` | `FORBIDDEN_KEYS`, `BALLOON_FEEDBACK_FORBIDDEN_KEYS` | `balloonRiskFeedback.test.js` + privacyValidation |
| 14. Riesgos | `tasks/original-games/balloonRiskFeedback.js` | `buildBalloonRiskFeedback` | `balloonRiskFeedback.test.js` |

---

## 1. Objetivo y flujo de usuario

El candidato infla un globo ronda a ronda: cada "Inflar" suma puntos en riesgo; "Asegurar puntos" (cashout) guarda lo acumulado; si llega al umbral oculto de la ronda, el globo explota y pierde los puntos de esa ronda. El objetivo es acumular la mayor recompensa agregada gestionando riesgo/recompensa bajo incertidumbre.

### 1.1. Propósito (una frase)
Evaluar **conducta observable de estrategia riesgo/recompensa y ajuste ante feedback de pérdida** dentro de una tarea acotada, no rasgos de personalidad ni tolerancia a la frustración.

### 1.2. Constructos objetivo (provisionales, R-6)

| Constructo (provisional) | Feature vector key(s) | Disponibilidad | Caveat / evidencia |
|---|---|---|---|
| `riskFeedbackProfile` (riesgo/feedback) | `balloon.riskEfficiency`, `balloon.cashoutRate`, `balloon.popRate` | `insufficient` | Feature `balloon.riskEfficiency` + cashout/pop; descriptivo, sin normas (originalGameTalentMapping.test.js). |
| `decision_strategy` (riesgo/recompensa) | `balloon.cashoutRate`, `balloon.popRate`, `balloon.averagePumpsNormalized` | `sufficient*` | *Agregados cashoutRate/popRate/averagePumpsNormalized; no dirección normativa. |
| `feedback_adjustment` (ajuste post-pérdida) | `balloon.postLossAdjustment`, `balloon.postLossAdjustmentObserved` | `insufficient` | Requiere oportunidad post-pérdida observada; si no, `unknown` (no bajo). |
| `leadership / communication` | — | `not_measured` | Tarea individual; no medido en batería actual. |

### 1.3. Alcance IN / OUT (del módulo)
- **IN:** 8 rondas (config `trialCount`, default demo 4), umbrales fijos por ronda, decisiones cashout/pop, emisión `game_event_v1` (`stimulus_shown` / `response` / `game_end`), agregado `balloon_risk_aggregate_v1`.
- **OUT:** secuencia de clicks/pumps cruda, reloj de acciones por timestamp, otros juegos, inferencia biométrica de emoción/estrés, contratación.

---

## 2. Estructura de niveles / fases
> Globo de Riesgo no tiene tutorial aislado (`is_tutorial`) en la implementación actual: todas las rondas computan. No confundir con el patrón STATE_0_TUTORIAL de Caminos.

| Fase/Nivel | Rondas/Trials | Propósito | ¿Evalúa? (`is_tutorial`) |
|---|---|---|---|
| Bloque único | 8 (default demo 4) | Administrar secuencia riesgo/recompensa | `false` (todas) |

**Umbrales por ronda (fijos, `BALLOON_THRESHOLDS`):** `[7, 10, 8, 12, 9, 11, 13, 8]` pumps.
**Banda de riesgo mostrada al candidato:** `threshold <= 8` → alto; `<= 10` → medio; `> 10` → bajo.
**Puntos por inflada:** `pointValue = 10 + (index % 3) * 2` (10/12/14 por ronda cíclica).

---

## 3. Textos e instrucciones (UX Copy / script de pantalla)
> Conservar ES/EN. Extraído literal de `BalloonRiskPostulationTask.jsx` (i18n `t(es, en)`).

| Pantalla / Momento | Texto ES | Texto EN | Notas |
|---|---|---|---|
| Título | `🎈 Globo de riesgo` | `🎈 Risk balloon` | Header |
| Instrucción inicial | "Infla el globo y asegura puntos antes de que explote." | "Inflate the balloon and secure points before it pops." | Estado inicial |
| Caption (privacidad) | "Infla para acumular puntos y decide cuándo asegurar. Se registra estrategia agregada, no una secuencia cruda de clicks." | "Inflate to accumulate points and decide when to secure them. Aggregated strategy is recorded, not a raw click sequence." | Contrato privacidad visible |
| Nueva ronda | "Nueva ronda: decide cuánto riesgo tomar." | "New round: decide how much risk to take." | Tras cada ronda |
| Al explotar | "El globo explotó. Observa si ajustas la siguiente ronda." | "The balloon popped. Watch whether you adjust the next round." | `pop` |
| Al asegurar | "Puntos asegurados." | "Points secured." | `cashout` |
| Acumulando | "Puntos acumulados. Puedes seguir o asegurar." | "Points accumulated. You can keep going or secure them." | tras cada inflada |
| Stats labels | `Infladas` / `En riesgo` / `Aseguradas` / `Explosiones` | `Pumps` / `At risk` / `Secured` / `Pops` | HUD stats |
| Botones | `Inflar` / `Asegurar puntos` | `Inflate` / `Secure points` | Controles |
| Fin | "Globo de riesgo completado" · "Rondas completadas" · "Puntaje agregado" | "Risk balloon completed" · "Rounds completed" · "Aggregated score" | Pantalla final |

---

## 4. Economía del juego (matriz dinámica)
> El "riesgo" es el umbral oculto por ronda; la recompensa es lineal por inflada.

| Parámetro | Valor |
|---|---|
| Rondas | 8 (demo 4) |
| Umbrales (pumps) | `[7, 10, 8, 12, 9, 11, 13, 8]` |
| Puntos por inflada | `10 + (roundIndex % 3) * 2` → 10/12/14 cíclico |
| Cashout | Guarda `roundPoints` acumulados; ronda exitosa (`correct: true`). |
| Pop | Pierde `roundPoints` de la ronda; `correct: false`. |
| Penalización agregada | `riskEfficiency` descuenta hasta 0.6 por pops: `(1 - min(0.6, popCount*0.12))`. |

---

## 5. Elementos visuales y feedback (UI/UX)

- **Arena:** globo 🎈 que escala `1 + pumpCount * 0.16` (tope `maxBalloonScale` por viewport).
- **HUD stats:** 4 columnas (Infladas / En riesgo / Aseguradas / Explosiones), 2 columnas en compact (`width <= 620 || height <= 360`).
- **Controles:** botón primario "Inflar", secundario "Asegurar puntos".
- **Layout responsive:** `containerMinHeight` 520 / 0 en compact; `maxBalloonScale` 2.6 / 2.05 / 1.85 (muy corto); `bodyPadding` 18 / 12. Sin overflow horizontal en 390×844 y 1280×720 (PR-4).
- **Feedback de estado:** texto `role="status"` explica cada transición (acumuló / aseguró / explotó / nueva ronda) — descriptivo, no juicio de rasgo.

**Responsive checklist (PR-4 — obligatorio):**
- [x] 0 overflow horizontal en 390×844 (mobile)
- [x] 0 overflow horizontal en 1280×720 (desktop)
- [x] `containerMinHeight`, `maxBalloonScale` definidos por viewport
- [x] HUD cols: 4 en desktop, 2 en compact (`width <= 620 || height <= 360`)
- [x] Texto `role="status"` describe cada transición

---

## 6. Referencias diseño
- `docs/design/krumm-postulation-pdd.md`, `krumm-postulation-sdd.md`.
- `AGENTS.md` — privacidad/gobernanza y contrato científico R-6.
- `src/tasks/original-games/BalloonRiskPostulationTask.jsx` — componente y UX copy.
- `src/tasks/original-games/balloonRiskTelemetry.js` — umbrales, agregado, allowlist.
- `src/tasks/original-games/balloonRiskFeedback.js` — feedback comprehension (caveats).
- `src/assessment/originalGameFeatureVector.js` — definiciones `balloon.*`.

---

## 7. Máquina de estados del juego (state machine)
> Globo no usa STATE_0_TUTORIAL aislado; el flujo es lineal por rondas dentro de GameRuntime.

```
GAME_RUNTIME_ACTIVE  -> BalloonRiskInner monta, ronda 0
ROUND_LOOP           -> stimulus_shown -> pump*/cashout -> response (outcome)
ROUND_END            -> cashout|pop -> siguiente ronda o completeGame
GAME_END             -> buildBalloonResponseAggregate + game_end + onComplete(aggregate)
```

| Estado | Entrada | Salida | Notas privacidad |
|---|---|---|---|
| `GAME_RUNTIME_ACTIVE` | `active=true` | ronda 0 | sin tutorial aislado |
| `ROUND_LOOP` | `stimulus_shown` | `response` por ronda | emite game_event_v1 |
| `GAME_END` | `roundIndex+1 >= rounds.length` | agregado `balloon_risk_aggregate_v1` | aggregate-only |

---

## 8. Contrato de ingesta de datos (configuración de ronda)
> Construido por `buildBalloonRiskRounds({ count })`. Umbrales fijos, no aleatorios.

```js
/** @typedef {Object} RoundConfig
 * @property {number} node_id - T1-T3 | 1-N
 * @property {boolean} is_tutorial - aislamiento telemetría
 * @property {1|2|3} phase - 1 Calibración | 2 Dilemas | 3 Cierre
 * @property {number} timeout_ms - constante (ej. 12000)
 * @property {Object} option_a - { reward_pts: number, win_probability: number }
 * @property {Object} option_b - { reward_pts: number, win_probability: number }
 */
```

```js
// RoundConfig (por ronda)
{
  roundId:    `balloon-risk-${index}`,     // estable
  roundIndex: <int>,                        // 0..count-1
  threshold:  BALLOON_THRESHOLDS[index % 8], // [7,10,8,12,9,11,13,8]
  pointValue: 10 + (index % 3) * 2          // 10 | 12 | 14 cíclico
}
```
Layout: `getBalloonRiskLayoutMetrics({width,height})` → `compact / maxBalloonScale / statColumns / bodyPadding`.

---

## 9. Pipeline de señales (Edge AI, privado por diseño)

- **Frecuencia de captura:** 30 Hz (render loop global), no específica del globo.
- **Ventana:** por ronda, desde `stimulus_shown` (T₀) hasta `response` / `game_end` (T_end).
- **Vectores (solo agregados, nunca raw):**
  - `BIO_GAZE_COORD` → contexto de atención visual (no inferencia de emoción).
  - `BIO_CURSOR_TRACK` → **prohibido** en este módulo: `BALLOON_FEEDBACK_FORBIDDEN_KEYS` incluye `rawPointerPath`, `pointerSamples`, `clickTrace`. Solo agregado de decisión.
  - `BIO_FACS_TENSOR` → calidad de captura/contexto, no "estrés" ni impulsividad.
- **Correlación:** `gameCorrelation.aggregate` correlaciona `game_event_v1` con ventanas pre-task / response / post-event. Ver `src/telemetry/gameCorrelation.js`.

---

## 10. Contratos de evento (game_event_v1)
> Emitidos desde `BalloonRiskPostulationTask.jsx`. `gameId: 'balloon_risk'`.

| Evento | Campos | Ejemplo `meta` |
|---|---|---|
| `stimulus_shown` | `trialId=roundId, targetId='${roundId}-decision', timestamp, stimulus{kind:'balloon_risk_round',payload:{roundIndex,totalRounds,riskBand}}` | `{ roundIndex:1, totalRounds:8, riskBand:'alto' }` |
| `response` | `trialId, targetId, timestamp, response{sanitized}` | `{ correct:true, outcome:'cashout', reactionTimeMs:.., score:0.72, balloonRisk:{aggregate} }` |
| `game_end` | `timestamp, gameState{level,difficulty:'risk_feedback',score:riskEfficiency}` | — |

`outcome` ∈ `{cashout, pop, round_completed}`. `correct: outcome === 'cashout'`.

---

## 11. Métricas conductuales derivadas (provisionales, descriptive_only)
> Del agregado `balloon_risk_aggregate_v1` y feature vector `original_game_feature_vector_v1`.

| Métrica (feature vector key) | Fórmula / definición | Constructo provisional | Caveat | Fuente agregado |
|---|---|---|---|---|
| `balloon.completion` | `completed ? 1 : 0` | disponibilidad de evidencia | No es score de calidad. | `completed` |
| `balloon.riskEfficiency` | agregado `riskEfficiency` en [0,1] | `riskFeedbackProfile` | No es personalidad ni frustración. | `riskEfficiency` |
| `balloon.cashoutRate` | `cashoutCount / totalRounds` | estrategia riesgo/recompensa | Sin dirección normativa. | `cashoutCount`, `totalRounds` |
| `balloon.popRate` | `popCount / totalRounds` | exposición a pérdida | No es impulsividad. | `popCount`, `totalRounds` |
| `balloon.averagePumpsNormalized` | `min(1, averagePumps / 12)` | intensidad de acumulación | Cap provisional. | `averagePumps` |
| `balloon.postLossAdjustment` | `postPopAdjustment` solo si `postPopAdjustmentCount > 0` | ajuste ante feedback | Requiere oportunidad observada. | `postPopAdjustment`, `postPopAdjustmentCount` |
| `balloon.postLossAdjustmentObserved` | `postPopAdjustmentCount > 0 ? 1 : 0` | máscara de disponibilidad | 0 ≠ ajuste nulo. | `postPopAdjustmentCount` |
| `balloon.timeMs` | ms del bloque | contexto de revisor | No es norma de velocidad. | `timeMs` |

**Regla de nulos:** si no hubo oportunidad post-pérdida → `postLossAdjustment` queda desconocido (máscara `observed: false`), nunca "bajo". Leadership/communication = `not_measured`.

---

## 12. Contrato de salida

### 12.1. Agregados (allowlist-only)
> `BALLOON_ALLOWED_RESPONSE_FIELDS` (scalar allowlist) + `sanitizeBalloonResponsePayload`.

```js
// balloon_risk_aggregate_v1 (buildBalloonResponseAggregate)
{
  aggregateSchemaVersion: 'balloon_risk_aggregate_v1',
  score: <riskEfficiency>,
  completed: <bool>,
  roundsCompleted: <int>,
  totalRounds: <int>,
  averagePumps: <float>,
  cashoutCount: <int>,
  popCount: <int>,
  postPopAdjustment: <float>,          // mean de postPopAdjustments
  postPopAdjustmentCount: <int>,
  riskEfficiency: <float[0..1]>,
  timeMs: <int>,
  aggregateOnly: true
}
```

### 12.2. Assessment feature vector (original games)
> `original_game_feature_vector_v1` `1.0.0`. Balloon ocupa índices 6–13 de `ORIGINAL_GAME_FEATURE_ORDER`.

```js
{
  type: 'original_game_feature_vector_v1',
  version: '1.0.0',
  featureOrder: [ /* ...laser.* (0-5), */ 'balloon.completion', 'balloon.riskEfficiency',
                  'balloon.cashoutRate', 'balloon.popRate', 'balloon.averagePumpsNormalized',
                  'balloon.postLossAdjustment', 'balloon.postLossAdjustmentObserved', 'balloon.timeMs',
                  /* passenger.*, team.* */ ],
  featureArray: [ /* ... */ ],   // finito, sin NaN
  qualityFlags: [ /* ej. 'low_face_presence' */ ]
}
```

### 12.3. Payload definitivo (esqueleto)
> Integrado bajo `session_summary`, `telemetry.behavioral` (feature vector), `raw_series.events` (`game_event_v1`), `integrity_flags`. **Sin raw fields prohibidos** (ver 12.4).

```json
{
  "exp_id": "balloon_risk",
  "version": "balloon_risk_aggregate_v1",
  "session_id": "uuid-v4",
  "timestamp_utc": "<ISO8601>",
  "session_summary": {
    "target_score": null,
    "final_score": <totalScore>,
    "target_achieved": null,
    "total_evaluation_time_ms": <timeMs>
  },
  "telemetry": {
    "behavioral_metrics": {
      "balloon.riskEfficiency": 0.72,
      "balloon.cashoutRate": 0.75,
      "balloon.popRate": 0.25,
      "balloon.averagePumpsNormalized": 0.6,
      "balloon.postLossAdjustment": null,
      "balloon.postLossAdjustmentObserved": false
    },
    "biometric_summary": { "avg_arousal_index": <v>, "gaze_aoi_ratio": <v>, "facs_capture_quality_peaks": <n> }
  },
  "raw_series": { "events": [
    { "event": "stimulus_shown", "trialId": "balloon-risk-0", "meta": { "riskBand": "alto" } },
    { "event": "response", "trialId": "balloon-risk-0", "meta": { "outcome": "cashout", "score": 0.72 } },
    { "event": "game_end", "meta": { "score": 0.72 } }
  ] },
  "integrity_flags": { "blur_events": 0, "fps_drops": 0, "bio_tracking_loss_ms": 0 }
}
```

### 12.4. Campos PROHIBIDOS (privacy guard)
> `BALLOON_FEEDBACK_FORBIDDEN_KEYS` — rechazados en feedback y agregado:
`pumpSequence`, `rawGameEvents`, `clickTrace`, `rawPointerPath`, `pointerSamples`, `trials`.
> Ver también: `FORBIDDEN_KEYS` en `src/assessment/originalGameFeatureVector.js` (370+ claves) y `FORBIDDEN_ORIGINAL_GAME_FIELDS` en `src/postulation-demo/originalGameBlueprints.js`.

---

## 13. Privacidad y gobernanza (no negociables — checklist por módulo)

- [x] Sin video/frames/landmarks/keypoints/rutas/pointer samples/DOM crudos.
- [x] `BALLOON_FEEDBACK_FORBIDDEN_KEYS` bloquea `pumpSequence`, `rawPointerPath`, `pointerSamples`, `clickTrace`, `rawGameEvents`, `trials`.
- [x] Gaze/FACS/postura = contexto/calidad; no inferencia de talento/emoción/estrés/impulsividad.
- [x] Agregados allowlist-only (`aggregateOnly: true`); `gameCorrelation.aggregate` y feature vector intactos.
- [x] Señal ausente (sin post-pérdida observada) = `unknown`/caveated (`postLossAdjustmentObserved: false`), nunca bajo.
- [x] MoveNet real o caveat; sin fallback FaceMesh para hombros.
- [x] `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe` presentes.
- [x] `descriptive_only` (R-6): sin percentiles/cortes/ranking/apto-no-apto.
- [x] Feedback comprehension explícito: "Las pérdidas dependen del azar y de la estructura del juego; no son fracaso personal, impulsividad clínica ni tolerancia a la frustración."
- [x] Leadership/communication = `not_measured`.

---

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Overclaiming HR / decisión automática | `balloonRiskFeedback` caveats explícitos + `humanReviewOnly`. |
| Post-pérdida no observada → "ajuste bajo" | Máscara `postLossAdjustmentObserved`; `unknown` no 0. |
| Inflar secuencia de clicks como señal | `rawPointerPath`/`pointerSamples` en forbidden keys. |
| Azar del threshold → "impulsividad" | Feedback: pérdidas = azar/estructura, no rasgo. |
| Overflow en 390×844 | Layout responsive `getBalloonRiskLayoutMetrics` (PR-4). |

---

## 15. Criterios de aceptación (gates)

```bash
NODE_ENV=test npx vitest run src/tasks/original-games/balloonRiskTelemetry.test.js \
  src/tasks/original-games/balloonRiskFeedback.test.js \
  src/tasks/original-games/BalloonRiskPostulationTask.test.jsx \
  src/assessment/originalGameFeatureVector.test.js --pool=threads --reporter=default
npx oxlint src/tasks/original-games/balloonRiskTelemetry.js src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

- [ ] Tests RED→GREEN: agregado allowlist + campos prohibidos del payload = 0 (ver `balloonRiskFeedback.test.js` hasForbiddenKeys).
- [ ] Browser smoke (stable/original + fixtures, 1280×720 y 390×844): consola limpia, page errors 0, request failures 0, 0 overflow, semántica "No medido" donde aplica.
- [ ] Feature vector `original_game_feature_vector_v1` con `featureArray` finito y `qualityFlags`.
- [ ] Payload sin raw fields prohibidos (`pumpSequence`, `rawPointerPath`, etc.).

---

## A. Referencias técnicas

- `docs/design/krumm-postulation-pdd.md`, `krumm-postulation-sdd.md`.
- `src/telemetry/gameCorrelation.js`, `src/telemetry/gameFeatureVector.js`, `src/telemetry/assessmentFeatureVector.js`.
- `src/tasks/original-games/balloonRiskTelemetry.js` — umbrales, agregado, allowlist, sanitize.
- `src/tasks/original-games/BalloonRiskPostulationTask.jsx` — eventos game_event_v1, UX.
- `src/tasks/original-games/balloonRiskFeedback.js` — feedback comprehension + forbidden keys.
- `src/assessment/originalGameFeatureVector.js` — `ORIGINAL_GAME_FEATURE_ORDER`, defs `balloon.*`.
- `AGENTS.md` — privacidad/gobernanza y contrato científico R-6.