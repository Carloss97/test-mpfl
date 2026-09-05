<!--
================================================================================
MÓDULO JUEGO ORIGINAL: Caminos (`caminos`)
================================================================================
Instancia de: docs/design/modulos/plantilla-modulo-original-game.md
Basado en: PDF "Diseño y Contenido — Módulo Caminos (V3)" (EXP-NODES-001)
PERO re-escrito bajo convenciones KRUMM (privacidad/gobernanza):
  - biometría = contexto/calidad (no "índice de estrés")
  - métricas descriptivas provisionales con caveat
  - descriptive_only (R-6)
Estado: aprobado
================================================================================
-->

# Módulo Juego Original: Caminos (`caminos`)

> **Versión plantilla:** `original-game-unified_v1`
> **Versión del módulo:** `3.0.0`
> **Fecha:** `2026-07-27`
> **Autor(es):** `hermes (a partir de PDF Diseño y Contenido V3 + Especificación Técnica V3, reescrito a convenciones KRUMM)`
> **Estado:** `aprobado`
> **Runtime de inferencia:** `Edge AI (WASM / WebGL) — Zero Cloud`
> **Ruta producto:** `/postulaciones-demo`
> **Batería:** `original_games` (`?battery=original`) — **Fallback:** `stable_dg`

---

## 0. Traza de implementación (OBLIGATORIA — rellenar con rutas reales `src/`)

| Sección doc | Archivo(s) `src/` | Export/Función clave | Tests |
|---|---|---|---|
| 1. Objetivo/flujo | `tasks/original-games/CaminosPostulationTask.jsx` | Componente, `onComplete` | `CaminosPostulationTask.test.jsx` |
| 2. Estructura fases | `tasks/original-games/caminosTelemetry.js` | `buildCaminosRounds` | `caminosTelemetry.test.js` |
| 3. Textos UX | `tasks/original-games/CaminosPostulationTask.jsx` | i18n `t(es, en)` | `CaminosPostulationTask.test.jsx` |
| 4. Economía | `tasks/original-games/caminosTelemetry.js` | thresholds, points, `buildCaminosResponseAggregate` | `caminosTelemetry.test.js` |
| 5. Visual/Feedback | `tasks/original-games/CaminosPostulationTask.jsx` + CSS | `getCaminosLayoutMetrics`, `role="status"` | `CaminosPostulationTask.test.jsx` + smoke |
| 7. State machine | `tasks/original-games/CaminosPostulationTask.jsx` | Estados internos | `CaminosPostulationTask.test.jsx` |
| 8. Contrato ingesta | `tasks/original-games/caminosTelemetry.js` | `RoundConfig` (JSDoc typedef) | `caminosTelemetry.test.js` |
| 9. Pipeline señales | `telemetry/gameCorrelation.js` | `correlateGameWithMultimodalSignals` | `gameCorrelation.test.js` |
| 10. Contratos evento | `tasks/original-games/CaminosPostulationTask.jsx` | `emitGameEvent` | `CaminosPostulationTask.test.jsx` |
| 11. Métricas derivadas | `assessment/originalGameFeatureVector.js` | `addCaminosFeatures`, `ORIGINAL_GAME_FEATURE_DEFINITIONS` | `originalGameFeatureVector.test.js` |
| 12. Contrato salida | `tasks/original-games/caminosTelemetry.js` | `sanitizeCaminosResponsePayload`, `CAMINOS_ALLOWED_RESPONSE_FIELDS` | `caminosTelemetry.test.js` |
| 13. Privacidad | `assessment/originalGameFeatureVector.js` + `caminosFeedback.js` | `FORBIDDEN_KEYS`, `CAMINOS_FEEDBACK_FORBIDDEN_KEYS` | `caminosFeedback.test.js` + privacyValidation |
| 14. Riesgos | `tasks/original-games/caminosFeedback.js` | `buildCaminosFeedback` | `caminosFeedback.test.js` |

> **NOTA:** Los archivos `caminosTelemetry.js`, `CaminosPostulationTask.jsx`, `caminosFeedback.js` deben crearse/actualizarse en `src/tasks/original-games/` siguiendo los patrones de `balloon_*`. Esta traza marca los contratos esperados.

---

## 1. Objetivo y flujo de usuario

Micro-simulador de bifurcaciones en el que el candidato guía a un personaje por cruces, eligiendo en cada uno entre un camino seguro (recompensa baja/estable) y uno arriesgado (mayor recompensa con probabilidad de falla). La presión temporal (12 s) fuerza decisión rápida; las fases cambian las probabilidades para evidenciar ajuste conductual.

### 1.1. Propósito (una frase)
Evaluar **conducta observable de toma de decisión bajo presión temporal** (propensión a riesgo, latencia de decisión, ajuste táctico cuando está bajo meta), no rasgos de personalidad.

### 1.2. Constructos objetivo (provisionales, R-6)

| Constructo (provisional) | Feature vector key(s) | Disponibilidad | Caveat / evidencia |
|---|---|---|---|
| `risk_propensity` | `game.risk_tolerance_index` | `insufficient` | Matriz de hipótesis XLSX; sin normas; mapeo provisional pendiente R-7. |
| `decision_speed` | `game.avg_decision_latency_ms` | `sufficient*` | *Solo agregado de latencia; no infiere "parálisis por análisis". |
| `adaptability` | `game.adaptability_index` | `insufficient` | Según PDD/AGENTS: adaptabilidad insufficient con batería actual. |
| `punishment_sensitivity` | `game.post_failure_recovery` | `insufficient` | Hipótesis sin validación normativa. |
| `leadership / communication` | — | `not_measured` | Tarea individual; no medido en batería actual. |

### 1.3. Alcance IN / OUT (del módulo)
- **IN:** mecánica de 10 nodos en 3 fases; presión 12 s/nodo; meta 450 pts; emisión `game_event_v1` (`stimulus_shown` / `response` / `game_end`).
- **OUT:** otros juegos de la batería; inferencia biométrica de emoción/estrés; contratación.

---

## 2. Estructura de niveles / fases

| Fase/Nivel | Nodos/Trials | Propósito | ¿Evalúa? (`is_tutorial`) |
|---|---|---|---|
| Tutorial / Nivel 0 | 3 nodos (T1-T3) | Eliminar sesgo de aprendizaje mecánico | `true` |
| Evaluación / Nivel 1 | 10 nodos (1-10) | Medir conducta bajo presión | `false` |
| Fase 1: Calibración | 1-3 | Baseline sin aversión extrema | `false` |
| Fase 2: Dilemas Asimétricos | 4-7 | Tentación alto rendimiento vs seguridad | `false` |
| Fase 3: Cierre Estratégico | 8-10 | Riesgo crítico si está bajo meta | `false` |

---

## 3. Textos e instrucciones (UX Copy / script de pantalla)
> Conservar ES/EN. Cualquier cambio de reglas debe actualizar ES y EN juntos.

| Pantalla / Momento | Texto ES | Texto EN | Notas |
|---|---|---|---|
| Bienvenida | "Simulación de Toma de Decisiones: Caminos" | "Decision-Making Simulation: Paths" | Consentimiento previo |
| Tutorial (overlay T1) | "Observa los dos caminos. Haz clic en A (Seguro) o B (Arriesgado)." | "Observe both paths. Click A (Safe) or B (Risky)." | Aislado |
| Tutorial (overlay T2) | "Tienes 12 segundos por decisión." | "You have 12 seconds per decision." | Aislado |
| Tutorial (overlay T3) | "Tu meta son 450 Puntos. Evalúa los indicadores de cada camino." | "Your target is 450 Points. Read each path's cues." | Aislado |
| Transición a evaluación | "Tus decisiones serán registradas. 10 nodos para alcanzar 450 pts. ¿Listo/a?" | "Your decisions will be recorded. 10 nodes to reach 450 pts. Ready?" | Avisa que se registra |
| HUD marcador | `Puntos: [X] / Meta: 450` | `Score: [X] / Target: 450` | Superior izquierda |
| HUD progreso | `Decisión [X] de 10` | `Decision [X] of 10` | HUD superior |
| Notificación éxito | `+[X] Puntos obtenidos` | `+[X] Points` | Destello verde/dorado |
| Notificación fallo | `Camino Bloqueado — 0 Puntos` | `Path Blocked — 0 Points` | Texto rojo |
| Notificación timeout | `¡Tiempo Agotado! — 0 Puntos` | `Time's Up! — 0 Points` | Personaje tropieza |
| Pantalla final | `Evaluación Finalizada. Puntaje Total: [X] Pts.` | `Assessment Complete. Total Score: [X].` | Sin decisión |

---

## 4. Economía del juego (matriz dinámica)

| Fase | Nodos | Opción A (segura) | Opción B (arriesgada) | Propósito |
|---|---|---|---|---|
| 1 Calibración | 1-3 | +30 pts (prob 0.85) | +60 pts (prob 0.55) | Baseline |
| 2 Dilemas | 4-7 | +20 pts (prob 0.90) | +100 pts (prob 0.30) | Tentación |
| 3 Cierre | 8-10 | +40 pts (prob 0.75) | +120 pts (prob 0.25) | Riesgo crítico |

**Meta:** 450 pts · **Límite:** 12 s/nodo · **Timeout:** 0 pts, conserva acumulado.

---

## 5. Elementos visuales y feedback (UI/UX)

- **Señalética:** Camino A = iluminación clara, ruta despejada, indicador de estabilidad. Camino B = iconografía de advertencia, recompensa proyectada resaltada.
- **HUD layout:** barra superior con marcador + progreso (Decisión X de 10); temporizador decreciente central.
- **Animaciones:** éxito = avance fluido + partículas; fallo = obstáculo/derrumbe + texto rojo.
- **Responsive:** sin overflow horizontal en 390×844 y 1280×720 (PR-4).

**Responsive checklist (PR-4 — obligatorio):**
- [ ] 0 overflow horizontal en 390×844 (mobile)
- [ ] 0 overflow horizontal en 1280×720 (desktop)
- [ ] `containerMinHeight`, `maxBalloonScale` (o equivalente) definidos por viewport
- [ ] HUD cols adaptativos (desktop vs compact)
- [ ] Texto `role="status"` describe cada transición

---

## 6. Referencias diseño
- `docs/design/krumm-postulation-pdd.md`, `krumm-postulation-sdd.md`.
- `AGENTS.md` — privacidad/gobernanza y contrato científico R-6.
- PDF origen: "Diseño y Contenido — Módulo Caminos (V3)" (EXP-NODES-001).
- `src/tasks/original-games/CaminosPostulationTask.jsx` — componente y UX copy.
- `src/tasks/original-games/caminosTelemetry.js` — umbrales, agregado, allowlist.
- `src/tasks/original-games/caminosFeedback.js` — feedback comprehension (caveats).
- `src/assessment/originalGameFeatureVector.js` — definiciones `caminos.*` (por añadir).

---

## 7. Máquina de estados del juego (state machine)

```
STATE_0_TUTORIAL      -> 3 nodos guiados, is_tutorial: true, telemetría aislada
STATE_1_EVALUATION    -> 10 nodos en 3 fases; ingesta continua de señales (contexto)
STATE_2_PAYLOAD_BUILD -> serialización + métricas + despacho local (aggregate-only)
```

| Estado | Entrada | Salida | Notas privacidad |
|---|---|---|---|
| `STATE_0_TUTORIAL` | init | 3 nodos | `is_tutorial: true`; no entra al reporte |
| `STATE_1_EVALUATION` | ok tutorial | 10 nodos | correlación con ventanas biométricas (contexto/calidad) |
| `STATE_2_PAYLOAD_BUILD` | fin nodos | payload local | aggregate-only; sin raw |

---

## 8. Contrato de ingesta de datos (configuración de nodo)
> Estructura que el motor recibe por nodo. Tipos primitivos + allowlist.

```js
/** @typedef {Object} RoundConfig
 * @property {number} node_id - T1-T3 | 1-10
 * @property {boolean} is_tutorial - aislamiento telemetría
 * @property {1|2|3} phase - 1 | 2 | 3
 * @property {number} timeout_ms - 12000 (constante)
 * @property {Object} option_a - { reward_pts: number, win_probability: number }
 * @property {Object} option_b - { reward_pts: number, win_probability: number }
 */

// RoundConfig (por nodo)
{
  node_id:     <int>,            // T1-T3 | 1-10
  is_tutorial: <bool>,
  phase:       <int>,            // 1 | 2 | 3
  timeout_ms:  12000,
  option_a: { reward_pts: <int>, win_probability: <float[0..1]> },
  option_b: { reward_pts: <int>, win_probability: <float[0..1]> }
}
```
Layout: `getCaminosLayoutMetrics({width,height})` → `compact / statColumns / bodyPadding / timerPosition`.

---

## 9. Pipeline de señales (Edge AI, privado por diseño)

- **Frecuencia de captura:** 30 Hz (render loop).
- **Ventana:** `NODE_ENTERED` (T₀) → `PATH_SELECTED` / `NODE_TIMEOUT` (T_end).
- **Vectores (solo agregados, nunca raw):**
  - `BIO_GAZE_COORD` → razón de fijación AOI_A vs AOI_B (contexto de atención visual).
  - `BIO_CURSOR_TRACK` → jitter/área de titubeo y distancia **agregada** (contexto motriz); NUNCA pointer samples ni secuencia de movimientos.
  - `BIO_FACS_TENSOR` → AU4/AU7/AU12/AU45 como **calidad de captura / carga contextual**, no "índice de estrés" ni inferencia emocional.
- **Correlación:** `gameCorrelation.aggregate` correlaciona `game_event_v1` con ventanas pre-task / response / post-event. Ver `src/telemetry/gameCorrelation.js`.

---

## 10. Contratos de evento (game_event_v1)

| Evento | Campos obligatorios | Ejemplo `meta` |
|---|---|---|
| `stimulus_shown` | `gameId:'caminos', trialId, timestamp, stimulus{kind:'node',payload:{phase,opt_a,opt_b}}` | `{ node_id:1, phase:1, opt_a:[30,0.85], opt_b:[60,0.55] }` |
| `response` | `gameId, trialId, timestamp, response{correct,outcome,score,latencyMs}` | `{ choice:'B', latency_ms:2800, outcome:'SUCCESS', score_change:60 }` |
| `game_end` | `gameId, timestamp, summary{...}` | `{ target_score:450, final_score:480, target_achieved:true }` |

`outcome` ∈ `{SUCCESS, FAIL, TIMEOUT}`. `correct: outcome === 'SUCCESS'`.

---

## 11. Métricas conductuales derivadas (provisionales, descriptive_only)

| Métrica (feature vector key) | Fórmula / definición | Constructo provisional | Caveat | Fuente agregado |
|---|---|---|---|---|
| `game.risk_tolerance_index` | `Σ selecciones B (1..10) / 10` | `risk_propensity` | Hipótesis XLSX; sin normas. | `risk_tolerance_index` en `caminos_aggregate_v1` |
| `game.avg_decision_latency_ms` | `Σ(latency_ms) / 10` | `decision_speed` | Agregado; no infiere "parálisis". | `avg_decision_latency_ms` |
| `game.adaptability_index` | `B_fase3 / B_fase1` (cond. score < target) | `adaptability` | `insufficient` con batería actual. | `adaptability_index` |
| `game.post_failure_recovery` | `P(A_{i+1} \| resultado_i = FAIL)` | `punishment_sensitivity` | Hipótesis; sin validación. | `post_failure_recovery` |

**Regla de nulos:** señal/constructo sin evidencia → `score: null` (nunca 0 ni 50). Leadership/communication y tolerancia-a-frustración = `not_measured`.

---

## 12. Contrato de salida

### 12.1. Agregados (allowlist-only)

```js
// caminos_aggregate_v1 (buildCaminosResponseAggregate)
behavioral_metrics: {
  risk_tolerance_index:    <float>,
  avg_decision_latency_ms: <float>,
  adaptability_index:      <float | null>,   // null si señal ausente
  post_failure_recovery:   <float>
}
```

### 12.2. Assessment feature vector (v2)

```js
{
  type: 'assessment_feature_vector_v2',
  version: '0.2.0',
  featureOrder: ['game.risk_tolerance_index', 'game.avg_decision_latency_ms',
                 'game.adaptability_index', 'game.post_failure_recovery'],
  featureArray: [<v1>, <v2>, <v3|null>, <v4>],
  qualityFlags: [/* 'low_face_presence' si aplica */]
}
```

### 12.3. Payload definitivo (esqueleto)

```json
{
  "exp_id": "caminos",
  "version": "3.0.0",
  "session_id": "uuid-v4",
  "timestamp_utc": "2026-07-27T13:16:00Z",
  "session_summary": {
    "target_score": 450, "final_score": 480,
    "target_achieved": true, "total_evaluation_time_ms": 34200
  },
  "telemetry": {
    "behavioral_metrics": {
      "risk_tolerance_index": 0.50,
      "avg_decision_latency_ms": 3420,
      "adaptability_index": 0.82,
      "post_failure_recovery": 0.60
    },
    "biometric_summary": {
      "avg_arousal_index": 0.58,
      "gaze_aoi_b_ratio": 0.64,
      "facs_capture_quality_peaks": 2
    }
  },
  "raw_series": {
    "events": [
      { "t_ms": 0, "event": "N0_TUTORIAL_START", "meta": { "is_tutorial": true } },
      { "t_ms": 12500, "event": "NODE_ENTERED", "meta": { "node_id": 1, "phase": 1, "opt_a": [30, 0.85], "opt_b": [60, 0.55] } },
      { "t_ms": 15300, "event": "PATH_SELECTED", "meta": { "choice": "B", "latency_ms": 2800 } },
      { "t_ms": 15350, "event": "OUTCOME_GENERATED", "meta": { "result": "SUCCESS", "score_change": 60, "current_total": 60 } }
    ]
  },
  "integrity_flags": { "blur_events": 0, "fps_drops": 1, "bio_tracking_loss_ms": 0 }
}
```

> **Nota gobernanza:** en el repo real, `biometric_summary.facs_stress_peaks` se renombra a `facs_capture_quality_peaks` (calidad, no estrés) y `avg_arousal_index` se reporta como contexto de captura, no como rasgo.

### 12.4. Campos PROHIBIDOS (privacy guard)
> Ver `CAMINOS_FEEDBACK_FORBIDDEN_KEYS` (por definir, patrón `balloonRiskFeedback.js`):
`rawPointerPath`, `pointerSamples`, `clickTrace`, `rawGameEvents`, `trials`, `fullRoute`, `routeTrace`, `visitedCells`, `stepByStepPath`.
> Ver también: `FORBIDDEN_KEYS` en `src/assessment/originalGameFeatureVector.js` (370+ claves) y `FORBIDDEN_ORIGINAL_GAME_FIELDS` en `src/postulation-demo/originalGameBlueprints.js`.

---

## 13. Privacidad y gobernanza (no negociables — checklist por módulo)

- [x] Sin video/frames/landmarks/keypoints/rutas/celdas/pointer samples/DOM crudos.
- [x] Gaze/FACS/postura = contexto/calidad; no inferencia de talento/emoción/estrés.
- [x] Agregados allowlist-only; `gameCorrelation.aggregate` y `assessment_feature_vector_v2` intactos.
- [x] Señal ausente = `null`/caveated; nunca bajo desempeño.
- [x] MoveNet real o caveat; sin fallback FaceMesh para hombros.
- [x] `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe` presentes.
- [x] `descriptive_only` (R-6): sin percentiles/cortes/ranking/apto-no-apto.
- [x] Leadership/communication y evidencia faltante → `not_measured` / `null`.
- [x] Cadena: constructo → demanda → conducta observable → telemetría agregada → feature versionada → regla provisional → disponibilidad/confianza/caveats → revisión humana.

---

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Overclaiming HR / decisión automática | Lenguaje observacional, `humanReviewOnly`. |
| Señal ausente → bajo desempeño | `score: null` + caveats. |
| Más entregas que destinos (agregado inflado) | Clamp por id global + allowlist escalar. |
| Overflow en 390×844 | Layout responsive (PR-4). |
| MoveNet sin hombros | Status/error; sin fallback FaceMesh. |

---

## 15. Criterios de aceptación (gates)

```bash
NODE_ENV=test npx vitest run src/tasks/original-games/caminos --pool=threads --reporter=default
npx oxlint src/tasks/original-games/caminos src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

- [ ] Tests RED→GREEN: agregados allowlist + campos prohibidos del payload = 0.
- [ ] Browser smoke (stable/original + fixtures, 1280×720 y 390×844): consola limpia, page errors 0, request failures 0, 0 overflow, semántica "No medido" donde aplica.
- [ ] `assessment_feature_vector_v2` con `featureArray` finito y `qualityFlags`.
- [ ] Payload sin raw fields prohibidos.

---

## A. Referencias técnicas

- `docs/design/krumm-postulation-pdd.md`, `krumm-postulation-sdd.md`.
- `src/telemetry/gameCorrelation.js`, `src/telemetry/gameFeatureVector.js`.
- PDF origen: "Especificación Técnica — Módulo Caminos (V3)" (EXP-NODES-001).
- `AGENTS.md` — privacidad/gobernanza y contrato científico R-6.
- `src/tasks/original-games/CaminosPostulationTask.jsx` (por implementar).
- `src/tasks/original-games/caminosTelemetry.js` (por implementar).
- `src/tasks/original-games/caminosFeedback.js` (por implementar).
- `src/assessment/originalGameFeatureVector.js` — defs `caminos.*` (por añadir).