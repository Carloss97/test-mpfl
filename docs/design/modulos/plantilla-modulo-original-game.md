<!--
================================================================================
PLANTILLA UNIFICADA — MÓDULO JUEGO ORIGINAL (KRUMM postulaciones-demo)
================================================================================
Unifica diseño/contenido + especificación técnica en un solo doc por juego.
Secciones 1-6 = diseño/contenido (antes plantilla-diseno-contenido.md)
Secciones 7-13 = especificación técnica (antes plantilla-especificacion-tecnica.md)
Sección 14 = trazabilidad implementación (NUEVA, obligatoria)
Sección 15 = criterios de aceptación (gates)

Cómo usar:
  1. Copiar a docs/design/modulos/<game-id>.md
  2. Rellenar <ENTRE_ANGULARES> y tablas.
  3. Mantener coherencia con:
     - docs/design/krumm-postulation-pdd.md (alcance in/out)
     - docs/design/krumm-postulation-sdd.md (proceso scope-driven)
     - AGENTS.md (privacidad/gobernanza y contrato científico R-6)
  4. Verificar trazabilidad §14 contra src/ real.
  5. Seguir el checklist de implementación para agentes §16 (orden RED→GREEN)
     y los casos de test componente obligatorios de §15.

CHANGELOG:
  v2 (2026-09-06) — lesson del incidente Tangram (3 bugs P0 de phase-gate que
  pasaron 40 tests de lógica pura): §2 requirement duro de práctica
  completatable, §7 anti-pattern phase-gate, §15 casos de test componente
  obligatorios, §16 checklist agente, §17 pitfalls de incidentes reales.
  v1 (2026-07-30) — unificación de diseño + técnica en un solo doc por juego.
================================================================================
-->

# Módulo Juego Original: <NOMBRE_HUMANO> (`<game-id>`)

> **Versión plantilla:** `original-game-unified_v2`
> **Versión del módulo:** `<x.y.z>`
> **Fecha:** `<YYYY-MM-DD>`
> **Autor(es):** `<nombre>`
> **Estado:** `<borrador | en revisión | aprobado | implementado>`
> **Runtime de inferencia:** `Edge AI (WASM / WebGL) — Zero Cloud`
> **Ruta producto:** `/postulaciones-demo`
> **Batería:** `original_games` (`?battery=original`) — **Fallback:** `stable_dg`

---

## 0. Traza de implementación (OBLIGATORIA — rellenar con rutas reales `src/`)

| Sección doc | Archivo(s) `src/` | Export/Función clave | Tests |
|---|---|---|---|
| 1. Objetivo/flujo | `tasks/original-games/<Game>PostulationTask.jsx` | Componente, `onComplete` | `*PostulationTask.test.jsx` |
| 2. Estructura fases | `tasks/original-games/<game>Telemetry.js` | `build<X>Rounds` | `*Telemetry.test.js` |
| 3. Textos UX | `tasks/original-games/<Game>PostulationTask.jsx` | i18n `t(es, en)` | `*PostulationTask.test.jsx` |
| 4. Economía | `tasks/original-games/<game>Telemetry.js` | thresholds, points, `build<X>ResponseAggregate` | `*Telemetry.test.js` |
| 5. Visual/Feedback | `tasks/original-games/<Game>PostulationTask.jsx` + CSS | `get<X>LayoutMetrics`, `role="status"` | `*PostulationTask.test.jsx` + smoke |
| 7. State machine | `tasks/original-games/<Game>PostulationTask.jsx` | Estados internos | `*PostulationTask.test.jsx` |
| 8. Contrato ingesta | `tasks/original-games/<game>Telemetry.js` | `RoundConfig` (JSDoc typedef) | `*Telemetry.test.js` |
| 9. Pipeline señales | `telemetry/gameCorrelation.js` | `correlateGameWithMultimodalSignals` | `gameCorrelation.test.js` |
| 10. Contratos evento | `tasks/original-games/<Game>PostulationTask.jsx` | `emitGameEvent` | `*PostulationTask.test.jsx` |
| 11. Métricas derivadas | `assessment/originalGameFeatureVector.js` | `add<X>Features`, `ORIGINAL_GAME_FEATURE_DEFINITIONS` | `originalGameFeatureVector.test.js` |
| 12. Contrato salida | `tasks/original-games/<game>Telemetry.js` | `sanitize<X>ResponsePayload`, `*_ALLOWED_RESPONSE_FIELDS` | `*Telemetry.test.js` |
| 13. Privacidad | `assessment/originalGameFeatureVector.js` + `*Feedback.js` | `FORBIDDEN_KEYS`, `*_FORBIDDEN_KEYS` | `*Feedback.test.js` + privacyValidation |
| 14. Riesgos | `tasks/original-games/<game>Feedback.js` | `build<X>Feedback` | `*Feedback.test.js` |

> **Regla:** Si una celda queda vacía, el slice NO está listo para cerrar (SDD delta incompleto).

---

## 1. Objetivo y flujo de usuario

`<Descripción narrativa: qué hace el candidato, en qué orden, y qué conducta observable se pretende evidenciar (NO rasgo psicológico).>`

### 1.1. Propósito (una frase)
`<Qué evalúa en términos de conducta observable.>`

### 1.2. Constructos objetivo (provisionales, R-6)
> Solo listar los que el módulo alimenta. Disponibilidad según PDD/AGENTS.

| Constructo (provisional) | Feature vector key(s) | Disponibilidad | Caveat / evidencia |
|---|---|---|---|
| `<risk_propensity>` | `<game.metric1>`, `<game.metric2>` | `<insufficient \| sufficient* \| not_measured>` | `<matriz XLSX; sin normas>` |
| `<decision_speed>` | `<game.avg_decision_latency_ms>` | `<sufficient*>` | `<solo agregado de latencia; no infiere "parálisis">` |
| `<adaptability>` | `<game.adaptability_index>` | `<insufficient con batería actual>` | `<según PDD>` |
| `<leadership / communication>` | — | `<not_measured>` | `<tarea individual>` |

### 1.3. Alcance IN / OUT (del módulo)
- **IN:** `<mecánicas, fases, métricas de contenido, señales consumidas (solo nombradas).>`
- **OUT:** `<otros juegos, inferencia biométrica de emoción/estrés, contratación.>`

---

## 2. Estructura de niveles / fases
> Aislar explícitamente la fase de práctica/tutorial (`is_tutorial: true`, telemetría aislada).

| Fase/Nivel | Nodos/Trials | Propósito | ¿Evalúa? (`is_tutorial`) |
|---|---|---|---|
| `<Tutorial / Nivel 0>` | `<3 nodos>` | `<eliminar sesgo de aprendizaje>` | `true` |
| `<Evaluación / Nivel 1>` | `<N nodos>` | `<medir conducta bajo presión>` | `false` |
| `<Fase 1: Calibración>` | `<1-3>` | `<baseline>` | `false` |
| `<Fase 2: Dilemas>` | `<4-7>` | `<tentación vs seguridad>` | `false` |
| `<Fase 3: Cierre>` | `<8-10>` | `<riesgo crítico si bajo meta>` | `false` |

> **Requisito duro (lección Tangram, 2026-09-06):** toda fase práctica/tutorial debe ser
> **completatable**: zonas/objetivos renderizados, interacciones núcleo operativas en esa
> fase, y avance de fase sin gates de otra phase. Una práctica que no se puede completar
> es un bug P0, no un detalle de UX (Tangram: zonas invisibles + rotación muerta +
> transición atascada — 3 bugs P0 en la práctica, detectados solo por test de componente).

---

## 3. Textos e instrucciones (UX Copy / script de pantalla)
> Conservar ES/EN en paralelo. Cualquier cambio de reglas debe actualizar ES y EN juntos.

| Pantalla / Momento | Texto ES | Texto EN | Notas |
|---|---|---|---|
| Bienvenida | `<...>` | `<...>` | `<consentimiento previo>` |
| Tutorial (overlay) | `<...>` | `<...>` | `<aislado>` |
| Transición a evaluación | `<...>` | `<...>` | `<avisa que se registra>` |
| HUD marcador | `Puntos: [X] / Meta: [Y]` | `Score: [X] / Target: [Y]` | `<>` |
| Notificación éxito | `+[X] Puntos` | `+[X] Points` | `<>` |
| Notificación fallo | `0 Puntos` | `0 Points` | `<>` |
| Pantalla final | `Puntaje Total: [X]` | `Total Score: [X]` | `<>` |

---

## 4. Economía del juego (matriz dinámica, si aplica)
> Solo si el módulo tiene recompensas/probabilidades. Diseño de contenido, no señal.

| Fase | Nodos | Opción A (segura) | Opción B (arriesgada) | Propósito |
|---|---|---|---|---|
| `<1>` | `<1-3>` | `+<a> pts (prob <pA>)` | `+<b> pts (prob <pB>)` | `<baseline>` |
| `<2>` | `<4-7>` | `+<a> pts (prob <pA>)` | `+<b> pts (prob <pB>)` | `<tentación>` |
| `<3>` | `<8-10>` | `+<a> pts (prob <pA>)` | `+<b> pts (prob <pB>)` | `<cierre>` |

**Meta (Target):** `<Y> pts` · **Límite temporal:** `<T> s` · **Penalización timeout:** `<0 pts, conserva acumulado>`

---

## 5. Elementos visuales y feedback (UI/UX)

- **Señalética:** `<cómo se codifica visualmente la opción segura vs arriesgada.>`
- **HUD layout:** `<dónde vive marcador, temporizador, progreso.>`
- **Animaciones feedback:** `<éxito (verde/dorado), fallo (obstáculo/rojo), timeout.>`
- **Responsive checklist (PR-4 — obligatorio marcar):**
  - [ ] 0 overflow horizontal en 390×844 (mobile)
  - [ ] 0 overflow horizontal en 1280×720 (desktop)
  - [ ] `containerMinHeight`, `maxBalloonScale` / equivalentes definidos por viewport
  - [ ] HUD cols: 4 en desktop, 2 en compact (`width <= 620 || height <= 360`)
  - [ ] Texto `role="status"` describe cada transición (acumuló/aseguró/explotó/nueva ronda)

---

## 6. Referencias diseño
- `docs/design/krumm-postulation-pdd.md`, `krumm-postulation-sdd.md`.
- `AGENTS.md` — privacidad/gobernanza y contrato científico R-6.
- `src/tasks/original-games/<Game>PostulationTask.jsx` — componente y UX copy.
- `src/tasks/original-games/<game>Telemetry.js` — umbrales, agregado, allowlist.
- `src/tasks/original-games/<game>Feedback.js` — feedback comprehension + caveats.

---

## 7. Máquina de estados del juego (state machine)
> Estados secuenciales no reversibles. La transición a evaluación debe avisar al usuario.

```
STATE_0_TUTORIAL      -> nodos guiados, is_tutorial: true, telemetría aislada
STATE_1_EVALUATION    -> nodos en fases; ingesta continua de señales (contexto)
STATE_2_PAYLOAD_BUILD -> serialización + métricas + despacho local (aggregate-only)
```

| Estado | Entrada | Salida | Notas privacidad |
|---|---|---|---|
| `STATE_0_TUTORIAL` | `<init>` | `<N nodos>` | `is_tutorial: true`; no entra al reporte |
| `STATE_1_EVALUATION` | `<ok tutorial>` | `<N nodos>` | correlación con ventanas biométricas (contexto) |
| `STATE_2_PAYLOAD_BUILD` | `<fin nodos>` | `<payload local>` | aggregate-only; sin raw |

> **Anti-pattern phase-gate (P0, incidente real 2026-09-06):** TODO handler/effect con
> gate de fase (`phase !== 'play'`, `introDone`, `finished`, ...) debe auditarse por fase:
> si una fase RENDERIZA una interacción (zona, botón, hint de teclado), esa interacción
> DEBE funcionar en esa fase. En Tangram, gates escritos para aislar la telemetría
> evaluativa bloquearon también: slots (no se renderizaban en tutorial), rotación (botón +
> teclado muertos en la práctica que la enseña) y la transición tutorial→evaluación
> (candidato atorado). Regla: los gates aíslan TELEMETRÍA (is_tutorial), nunca UI/interacción.

---

## 8. Contrato de ingesta de datos (configuración de nodo)
> Estructura que el motor recibe por nodo. Tipos primitivos + allowlist.

```js
/** @typedef {Object} RoundConfig
 * @property {number} node_id - T1-T3 tutorial | 1-N evaluación
 * @property {boolean} is_tutorial - aislamiento de telemetría
 * @property {1|2|3} phase - 1 Calibración | 2 Dilemas | 3 Cierre
 * @property {number} timeout_ms - constante (ej. 12000)
 * @property {Object} option_a - { reward_pts: number, win_probability: number }
 * @property {Object} option_b - { reward_pts: number, win_probability: number }
 */
```

---

## 9. Pipeline de señales (Edge AI, privado por diseño)
> Frecuencia y ventanas. Toda señal biométrica = CONTEXTO/CALIDAD, no inferencia de rasgo.

- **Frecuencia de captura:** `<30 Hz>` sincronizada con render loop.
- **Ventana de muestreo:** desde `<NODE_ENTERED>` (T₀) hasta `<PATH_SELECTED>` / `<NODE_TIMEOUT>` (T_end).
- **Vectores capturados en dispositivo (solo agregados, nunca raw):**
  - `BIO_GAZE_COORD` → razón de fijación entre AOIs (contexto de atención visual).
  - `BIO_CURSOR_TRACK` → aceleración, área de titubeo (jitter), distancia **agregada**; NUNCA pointer samples ni secuencia de movimientos.
  - `BIO_FACS_TENSOR` → AU4/AU7/AU12/AU45 como **calidad de captura / carga contextual**, no "índice de estrés" ni inferencia emocional.
- **Correlación:** `gameCorrelation.aggregate` correlaciona `game_event_v1` con ventanas pre-task / response / post-event. Ver `src/telemetry/gameCorrelation.js`.

---

## 10. Contratos de evento (game_event_v1)
> El módulo emite `game_event_v1` con `stimulus_shown` / `response` / `game_end`.
> Ver `src/telemetry/gameTelemetry.js` (normalizeGameEvent) y fixtures.

| Evento | Campos obligatorios | Ejemplo `meta` |
|---|---|---|
| `stimulus_shown` | `gameId, trialId, timestamp, stimulus{kind,payload}` | `{ node_id, phase, opt_a:[r,p], opt_b:[r,p] }` |
| `response` | `gameId, trialId, timestamp, response{correct,outcome,score,latencyMs}` | `{ choice:'B', latency_ms:2800, outcome:'SUCCESS' }` |
| `game_end` | `gameId, timestamp, summary{...}` | `{ target_score, final_score, target_achieved }` |

---

## 11. Métricas conductuales derivadas (provisionales, descriptive_only)
> Fórmulas sobre agregados. Cada métrica mapea a un constructo provisional con caveat.
> NO son percentiles, normas, diagnósticos ni puntos de corte (PDD §2.3, R-6).

| Métrica (feature vector key) | Fórmula / definición | Constructo provisional | Caveat | Fuente agregado (campo en `*_aggregate_v1`) |
|---|---|---|---|---|
| `<game.risk_tolerance_index>` | `Σ selecciones B (1..N) / N` | `<risk_propensity>` | `<hipótesis XLSX; sin normas>` | `<risk_tolerance_index>` |
| `<game.avg_decision_latency_ms>` | `Σ(latency) / N` | `<decision_speed>` | `<>` | `<avg_decision_latency_ms>` |
| `<game.adaptability_index>` | `B_fase3 / B_fase1` (cond. score < target) | `<adaptability>` | `<insufficient>` | `<adaptability_index>` |
| `<game.post_failure_recovery>` | `P(A_{i+1} \| resultado_i = FAIL)` | `<punishment_sensitivity>` | `<>` | `<post_failure_recovery>` |

**Regla de nulos:** señal/constructo sin evidencia → `score: null` (nunca 0 ni 50 neutro).
Leadership/communication y tolerancia-a-frustración = `not_measured`.

---

## 12. Contrato de salida

### 12.1. Agregados (allowlist-only)
> Solo escalares agregados. Ver `src/tasks/original-games/*Telemetry.js` (scalar allowlist).

```js
behavioral_metrics: {
  <metric1>:    <float>,
  <metric2>:    <float>,
  <metric3>:    <float | null>,   // null si señal ausente
  <metric4>:    <float>
}
```

### 12.2. Assessment feature vector
> `assessment_feature_vector_v2` o `original_game_feature_vector_v1`:
> `featureOrder` estable, `featureArray` numérico finito, `qualityFlags`.

```js
{
  type: '<assessment_feature_vector_v2 | original_game_feature_vector_v1>',
  version: '<x.y.z>',
  featureOrder: ['game.<metric1>', 'game.<metric2>', ...],
  featureArray: [<v1>, <v2>, ...],
  qualityFlags: [/* ej. 'low_face_presence' */]
}
```

### 12.3. Payload definitivo (esqueleto)
> Basado en `finalAssessmentPayload.js` / `gamePayload.js`. `session_summary`, `telemetry`
> (behavioral + biometric_summary solo calidad), `raw_series.events` (`game_event_v1`),
> `integrity_flags`. **SIN raw fields prohibidos.**

```json
{
  "exp_id": "<GAME-ID>",
  "version": "<x.y.z>",
  "session_id": "uuid-v4",
  "timestamp_utc": "<ISO8601>",
  "session_summary": {
    "target_score": <Y>, "final_score": <X>,
    "target_achieved": <bool>, "total_evaluation_time_ms": <ms>
  },
  "telemetry": {
    "behavioral_metrics": { "<...>": <v> },
    "biometric_summary": { "avg_arousal_index": <v>, "gaze_aoi_b_ratio": <v>, "facs_capture_quality_peaks": <n> }
  },
  "raw_series": { "events": [ { "t_ms": 0, "event": "NODE_ENTERED", "meta": { "node_id": 1 } } ] },
  "integrity_flags": { "blur_events": 0, "fps_drops": 0, "bio_tracking_loss_ms": 0 }
}
```

### 12.4. Campos PROHIBIDOS (privacy guard)
> Referencia a constantes reales del repo — NO inventar listas.

- `src/assessment/originalGameFeatureVector.js` → `FORBIDDEN_KEYS` (370+ claves)
- `src/tasks/original-games/<game>Feedback.js` → `<GAME>_FEEDBACK_FORBIDDEN_KEYS`
- `src/postulation-demo/originalGameBlueprints.js` → `FORBIDDEN_ORIGINAL_GAME_FIELDS`

Ejemplos típicos bloqueados: `pumpSequence`, `rawGameEvents`, `clickTrace`, `rawPointerPath`, `pointerSamples`, `trials`, `frames`, `landmarks`, `keypoints`, `domEvent`, `screenshot`, `rawChoices`, `choiceSequence`, `freeText`, `optionText`, `scenarioText`, `messageText`, `typedResponse`, `video`, `imageData`, `faceSamples`, `blendshapesRaw`, `normalizedKeypoints`, `fullRoute`, `routeTrace`, `visitedCells`, `stepByStepPath`, `beamCells`, `stimuli`, `items`, `windows`, `DOMEvent`, `MouseEvent`, `PointerEvent`.

---

## 13. Privacidad y gobernanza (no negociables — checklist por módulo)

- [ ] Sin video/frames/landmarks/keypoints/rutas/celdas/pointer samples/DOM crudos.
- [ ] Cámara/biometría (gaze, FACS, postura, MoveNet) = contexto/calidad, no inferencia de talento/personalidad/emoción/estrés/fatiga/sinceridad/contratación.
- [ ] Agregados allowlist-only; `gameCorrelation.aggregate` y `assessment_feature_vector_v2` intactos.
- [ ] Señal ausente = desconocida/caveated (`score: null`), nunca bajo desempeño.
- [ ] MoveNet real o caveat; **sin fallback FaceMesh para hombros**.
- [ ] `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe` presentes.
- [ ] `descriptive_only` (R-6): sin percentiles/cortes/ranking/apto-no-apto.
- [ ] Leadership/communication y evidencia faltante → `not_measured` / `null`.
- [ ] Cadena: constructo → demanda de tarea → conducta observable → telemetría agregada → feature versionada → regla provisional → disponibilidad/confianza/caveats → revisión humana.
- [ ] Feedback comprehension explícito: lenguaje observacional, sin diagnóstico.

---

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| `<Overclaiming HR / decisión automática>` | `<lenguaje observacional, humanReviewOnly>` |
| `<Señal ausente → bajo desempeño>` | `<score: null + caveats>` |
| `<Más entregas que destinos (agregado inflado)>` | `<clamp por id global, allowlist escalar>` |
| `<Overflow en 390×844>` | `<layout responsive, PR-4 checklist §5>` |
| `<MoveNet sin hombros>` | `<status/error, sin fallback FaceMesh>` |

---

## 15. Criterios de aceptación (gates)

```bash
NODE_ENV=test npx vitest run src/tasks/original-games/<game> --pool=threads --reporter=default
npx oxlint src/tasks/original-games/<game> src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

- [ ] Tests RED→GREEN: agregados allowlist + campos prohibidos del payload = 0 (ver `<game>Feedback.test.js` hasForbiddenKeys).
- [ ] Browser smoke (stable/original + fixtures, 1280×720 y 390×844): consola limpia, page errors 0, request failures 0, 0 overflow, semántica "No medido" donde aplica, privacidad y ausencia de claims HR no soportados.
- [ ] Feature vector (`assessment_feature_vector_v2` o `original_game_feature_vector_v1`) con `featureArray` finito y `qualityFlags`.
- [ ] Payload sin raw fields prohibidos (ver §12.4).

**Test de componente OBLIGATORIO (`<Game>PostulationTask.test.jsx`) — no es opcional:**
los tests de lógica pura (telemetry/stages/feedback) NO cubren la máquina de estados.
Casos mínimos (lección Tangram 2026-09-06):
- [ ] Onboarding: pantalla bienvenida → CTA → primera fase jugable (con zonas/objetivos VISIBLES).
- [ ] Interacción núcleo funciona en la fase práctica/tutorial **por teclado Y por botón**
      (ej. rotación: keyDown en el canvas + click en el botón).
- [ ] Completar la práctica avanza de verdad (transición/evaluación) — con `waitFor`
      y timeout ≥ 2.5 s si hay `pushTimeout` real (~1400 ms).
- [ ] Evento emitido (response/game_end) sin campos prohibidos (assert privacy sobre el payload).

---

## 16. Checklist de implementación para agentes (orden RED→GREEN)

Secuencia obligatoria para implementar el módulo. Cada paso deja tests verdes antes de
pasar al siguiente (evita el patrón Tangram: todo el stack de lógica verde y la UI rota).

1. **Doc del módulo**: copiar plantilla → `docs/design/modulos/<game-id>.md`, estado
   `en implementación`. Llenar §0 traza + §1-§6 (diseño) + §7-§12 (técnica) CON la
   especificación real — no completar §0 después.
2. **`<game>Telemetry.js`** (puro): builders de niveles/fases + agregado + allowlist
   escalar. Tests RED primero (agregado, allowlist, determinismo).
3. **`<game>Feedback.js`** (puro): feedback comprehension + `<GAME>_FEEDBACK_FORBIDDEN_KEYS`
   + caveats. Tests RED (privacidad: hasForbiddenKeys = 0, lenguaje observacional).
4. **Blueprint + feature vector**: `originalGameBlueprints.js` (entry `<game-id>`) +
   `originalGameFeatureVector.js` (`add<X>Features`, bump de versión). Tests (featureOrder
   estable, finite array, keys en §1.2).
5. **`<Game>PostulationTask.jsx`**: máquina de estados §7 + onboarding §3 + interacción
   núcleo. **Test componente obligatorio §15** (onboarding, interacción teclado+botón en
   tutorial, avance de práctica, payload privacy-safe). Auditar CADA gate de fase contra §7.
6. **Integración**: mapa de juegos en `PostulationGameStage`, config de batería, fixture,
   workbook card del reporte. Tests de integración (PostulationGameStage/fixture).
7. **Gates §15** completos + browser smoke (desktop 1280×720 + móvil 390×844, original +
   fixture).
8. **Cierre**: doc → `implementado` (rellenar §14/§15 reales), tabla README modulos,
   kanban done + Linear sync, handoff de sesión.

## 17. Pitfalls comunes (incidentes reales — revisar antes de cerrar)

| Pitfall | Incidente | Prevención |
|---|---|---|
| Phase-gate bloquea interacción visible | Tangram 2026-09-06: rotación muerta en tutorial; slots no renderizados; transición atascada | Anti-pattern §7; gates aíslan telemetría, nunca UI |
| Solo tests de lógica pura | Tangram: 40 tests verdes + 3 bugs P0 de UI | Test componente obligatorio §15 |
| Copia que enseña controles inexistentes | Tangram welcome 2026-09-06: "clic y arrastra" / "botón secundario" sin implementar | §3 = fuente única de interacción; verificar contra handlers reales (`onKeyDown`, `onClick`) |
| Testids renumerados | Tangram: `tangram-piece-N` se reindexa al encajar una pieza | En tests, referenciar la primera pieza libre o identidad estable |
| Handler en hijo, testid en padre | SVG: `onClick` en `<path>`, testid en `<g>` — click al `<g>` no dispara | En tests, click al elemento visible exacto |
| Transición con timeout | Tangram: tutorial→transition tras `pushTimeout` 1400 ms | `waitFor` con timeout ≥ 2.5 s (timers reales) |
| Restos de copy "demo" en ruta prod | P1 2026-09-06: "Demo provisional", "Repetir demo" en /postulaciones | Tabla §3 + grep de copy visible antes de deploy |
| Practica sin flag is_tutorial | — | §2: toda fase práctica con `is_tutorial: true` y telemetría aislada |

---

## A. Referencias técnicas

- `docs/design/krumm-postulation-pdd.md`, `krumm-postulation-sdd.md`.
- `src/telemetry/gameCorrelation.js`, `src/telemetry/gameFeatureVector.js`, `src/telemetry/assessmentFeatureVector.js`.
- `src/tasks/original-games/<game>/` — implementación y tests.
- `src/assessment/originalGameFeatureVector.js` — `ORIGINAL_GAME_FEATURE_ORDER`, defs `<game>.*`, `FORBIDDEN_KEYS`.
- `AGENTS.md` — privacidad/gobernanza y contrato científico R-6.