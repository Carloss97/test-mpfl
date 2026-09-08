# Módulo Juego Original: Desactivación de Secuencias / Bomb Defusal (`bomb_defusal`)

> **Versión plantilla:** `original-game-unified_v2`
> **Versión del módulo:** `1.1.0` (build `1.1.0`, config `bomb-v1.1`, featureDefinitions `2.2.0`)
> **Fecha:** 2026-09-08
> **Autor(es):** Hermes agent (cadena BOMB B1–B6) + Carlos Saldivia
> **Estado:** `implementado` (B6 cierre: reporte 9° constructo + docs + audit)
> **Runtime de inferencia:** `Edge AI (WASM / WebGL) — Zero Cloud` · biometría **off por defecto** (desacoplada, spec §1)
> **Ruta producto:** `/postulaciones-demo` (batería `original`, `?battery=original`)
> **Batería:** `original_games` — 6° juego ("Juego X de 6") · **Fallback:** `stable_dg` (se queda en 5 hasta pilotaje — decisión B6)
> **Spec (LEY):** `docs/spec/EXP-BOMB-001/EXP-BOMB-001_Especificacion_Tecnica_y_Psicometrica.docx` (Doc 1, Draft v1.1.0) + `EXP-BOMB-001_Diseno_UI_UX_y_Reglas.docx` (Doc 2, v1.1.0)
> **Plan:** `docs/plans/2026-09-07-plan-exp7-bomb.md` (cards B1–B6)
> **Constructo primario:** `proceduralWorkingMemory` (9° constructo del reporte, **experimental**, `descriptive_only`, sin score compuesto — spec §12.1)

---

## 0. Traza de implementación

| Sección doc | Archivo(s) `src/` | Export/Función clave | Tests |
|---|---|---|---|
| 1. Objetivo/flujo | `tasks/original-games/bomb/bombGame.jsx` | `BombDefusalGame` (chrome vía `GameRuntime`), `onComplete(sessionSummary)` | `bombGame.test.jsx` |
| 2. Estructura fases | `tasks/original-games/bomb/bombRules.js` | `BOMB_RULE_MANIFEST` (`levels`, `rules`, `hold`, `levelOrder`), `buildManualText` | `bombRules.test.js` |
| 3. Textos UX | `bombRules.js` (copy ES/EN del manifest) + `bombGame.jsx` | welcome §4.1, nodos T1–T5, transiciones §11, result/fail, modal §4.3 | `bombRules.test.js` (copy exacto) |
| 4. Economía | `bombRules.js` | penalización 30 % del restante (clamp 0), `max_errors: 2`, tolerancia hold ±200 ms | `bombRules.test.js` + `bombEngine.test.js` |
| 5. Visual/Feedback | `bombGame.jsx` + `bomb.css` | panel táctico/industrial, MODEL A/B (texto+placa), LED, timer phases, SFX 8 | `bombGame.test.jsx` (CSS + componentes) |
| 7. State machine | `tasks/original-games/bomb/bombEngine.js` | `createBombEngine` (estados spec §7, `BOMB_STATES`), `requireState` | `bombEngine.test.js` (QA-01…QA-10) |
| 8. Contrato ingesta | `bombRules.js` | manifest versionado (`bomb-v1.1`), transform B **desde el manifest** (DoD §16.2) | `bombRules.test.js` |
| 9. Pipeline señales | `telemetry/gameCorrelation.js` | `gameCorrelation.aggregate` (cámara opcional = contexto) | `gameCorrelation.test.js` |
| 10. Contratos evento | `bombEngine.js` + `bombGame.jsx` | diccionario §11 (`BOMB_EVENT_NAMES`), críticos con `level_id` (DoD §16.2), whitelist de meta | `bombEngineB5.test.js` + `bombTelemetry.test.js` |
| 11. Métricas derivadas | `bomb/bombTelemetry.js` + `assessment/originalGameFeatureVector.js` | `computeBombBehavioralMetrics` (§12, 10 métricas), `addBombFeatures` (12 features `bomb.*`) | `bombTelemetry.test.js` + `originalGameFeatureVector.test.js` |
| 12. Contrato salida | `bomb/bombTelemetry.js` + blueprint | `buildBombSessionPayload` (esquema §19, `exp_bomb_session_v1`), `buildBombBlockSummary` (41 escalares), `allowedAggregateFields` | `bombTelemetry.test.js` + `originalGameBlueprints.test.js` (anti-drift) |
| 13. Privacidad | `originalGameFeatureVector.js` + blueprint + `bomb/bombFeedback.js` | `FORBIDDEN_KEYS`, `FORBIDDEN_ORIGINAL_GAME_FIELDS`, `BOMB_FEEDBACK_FORBIDDEN_KEYS`, biometría off | `bombTelemetry.test.js` (verify payload) + privacy tests |
| 14. Riesgos | `bomb/bombFeedback.js` + `assessment/originalGameTalentMapping.js` | `buildBombDefusalFeedback`, `buildProceduralWorkingMemory` (descriptive_only, §12.1/§17) | `bombFeedback.test.js` + `originalGameTalentMapping.test.js` |

> **Regla cumplida:** ninguna celda vacía — cada slice tiene `src/` real + tests (ver §15).

---

## 1. Objetivo y flujo de usuario

El candidato recibe un **manual de instrucciones** por nivel (exposición libre o
limitada), atraviesa un **intervalo de retención ciego** (pantalla negra, inputs
bloqueados) y **ejecuta la secuencia sobre un panel** (interruptores SW1–3, cables
ROJO/AZUL/VERDE/AMARILLO, botón amarillo de hold 2 s). La dificultad crece por
acumulación de pasos y reducción de tiempo; en el **nivel 4 el artefacto cambia a
MODELO B**, que transforma las reglas (SW1→SW3, ROJO→AZUL; ROJO queda prohibido) —
la transformación viene **del rule manifest versionado, no de condicionales en UI**
(DoD §16.2). Comienza con un **tutorial guiado T1–T5 (práctica, sin puntaje, DoD
§16.2)** que enseña switch, cable, hold, secuencia y retención con memoria.

### 1.1. Propósito (una frase)

Evidenciar **memoria de trabajo procedimental** — retención, actualización y ejecución
serial de un protocolo de acciones bajo retención ciega y presión temporal — como
conducta observable (NO como rasgo psicológico; spec §3).

### 1.2. Constructos objetivo (provisionales, R-6)

| Constructo (provisional) | Feature vector key(s) | Disponibilidad | Caveat / evidencia |
|---|---|---|---|
| `proceduralWorkingMemory` (9°, primario) | `bomb.retentionAccuracyRate`, `bomb.serialPositionAccuracy`, `bomb.memoryDecaySlope`, `bomb.firstActionLatencyMs`, `bomb.interStepLatencyMedianMs`, (+ covariables) | `descriptive_only` (score **null** — módulo experimental) | **Sin score compuesto** (pesos no fijados, spec §12.1); nextStep = fases A–G (spec §17.1); errores ≠ déficit (spec §3.3) |
| Control inhibitorio (secundario) | `bomb.interferenceErrorCount` | contextual en `proceduralWorkingMemory` | errores Type-A en Type-B (L4); no constructo independiente |
| Flexibilidad cognitiva (secundaria) | `bomb.switchCostMs` | contextual | costo del cambio A→B; estimación derivada |
| Atención sostenida (secundaria) | `bomb.timeoutRate` | contextual | timeouts / niveles evaluados |
| Velocidad de procesamiento (secundaria) | `bomb.firstActionLatencyMs`, `bomb.interStepLatencyMedianMs` | contextual | NO es norma de velocidad |
| `leadership / communication` | — | `not_measured` | tarea individual |

### 1.3. Alcance IN / OUT (del módulo)

- **IN:** 4 niveles evaluados (L1–L4) + tutorial guiado T1–T5 (práctica G.2), rule
  manifest versionado `bomb-v1.1`, máquina de estados (spec §7), penalización 30 %
  (configurable) / 2 errores → fail, timer monotónico (visual vs lógico ≤100 ms,
  DoD), telemetría §11–§14 (eventos + 10 métricas + integrity flags), payload §19
  reconstruible, SFX 8 desactivables, a11y §14 (color+letra, ≥44 px, foco, reduced
  motion), aviso <1024 px (§15), seed de campaña `BOMB_DEFAULT_SESSION_SEED`
  (determinismo §15).
- **OUT:** cámara/biometría como inferencia (off por defecto; solo contexto/calidad),
  staircase/adaptación de dificultad (v1 = progresión fija, §10.1), score compuesto
  con pesos fijados (§12.1), comparación entre personas, decisión de contratación.

---

## 2. Estructura de niveles / fases

| Fase/Nivel | Secuencia (base) | Tipo | Exposición | Delay | Tiempo | ¿Evalúa? (`evaluated`) |
|---|---|---|---|---|---|---|
| Welcome (onboarding) | — | A | — | — | — | — (CTA "Iniciar práctica") |
| Tutorial T1–T5 (práctica) | A1+A2 (S1) → A1+A2+B1 (S2, panel fresh) → lectura+delay (S3) | A | libre / 3 s (T5) | 1.5 s (T5) | sin presión | `true` (no alimenta scores — DoD §16.2) |
| L1 baseline | SW1→RED | A | manual visible (libre) | 0 s | 20 s | `false` |
| L2 acumulación | +HOLD 2000 ms | A | 3 s | 2 s | 15 s | `false` |
| L3 carga alta | +GREEN | A | 2 s | 4 s | 12 s | `false` |
| L4 interferencia | **MODELO B**: SW3→AZUL→HOLD→GREEN | B | 2 s | 3 s | 10 s | `false` |

**Reglas canónicas (spec §8.1, desde el manifest):** A1 `SW_1→ON` (B: `SW_3→ON`) ·
A2 `CUT RED` (B: `CUT BLUE`; ROJO prohibido en B) · B1 `HOLD YELLOW 2000 ms`
(ventana ±200 ms; se registra la duración exacta) · C1 `CUT GREEN`.

**Gates de nivel:** fail = `TIMEOUT` (tiempo agotado) o `MAX_ERRORS` (2 errores).
Penalización por error = 30 % del tiempo restante (clamp 0), sin revelar el paso
esperado (`show_step_feedback: false` en evaluación, §9).

> **Requisito duro cumplido (lección Tangram, plantilla v2 §2):** el tutorial ES
> completatable — nodos renderizados, switch/cable/hold operativos por click (y
> teclado donde aplica), transición tutorial→evaluación funcional. Cubierto por
> `bombGameTutorial.test.jsx` (14 tests) + smoke B4.

---

## 3. Textos e instrucciones (UX Copy / script de pantalla)

> Fuente única: `BOMB_RULE_MANIFEST` (copy ES fuente de verdad + EN en
> `manualEn`/`*En`). Tono (Doc 2 §11): frases cortas, labels idénticos a la UI,
> sin lenguaje alarmista. Cambiar una regla ⇒ actualizar ES y EN juntos.

| Pantalla / Momento | Texto ES (resumen exacto del manifest) | Notas |
|---|---|---|
| Bienvenida (Doc 2 §4.1) | "Simulación de Protocolo Operativo: Desactivación" + MENSAJE (§4.1) + CTA "Iniciar práctica" + secundario "Ajustes de audio / accesibilidad" (toggle funcional) | `data-testid=bomb-welcome` |
| Tutorial T1–T5 (Doc 2 §4.2) | nodos guiados: switch / cable / hold (ring de progreso SOLO en tutorial) / secuencia / memoria ("Lee la secuencia…") | pips de progreso T1–T5; "Repetir práctica" |
| Salida tutorial (Doc 2 §4.3) | modal §4.3 + "Comenzar evaluación" + "Repetir práctica" (replay, `tutorial_replay_count`) | `bomb-practice-done` |
| Transición nivel (Doc 1 §11) | "NUEVA REGLA" destacada (L2: hold; L3: GREEN; L4: aviso **MODELO B** + placa B) | desde el manifest (`newRuleForLevel`) |
| Encoding | "Memorize the sequence." / barra de exposición (L2–L4) + "Lectura libre" + CTA (L1) | pre-fade 200 ms antes del auto-hide (§16) |
| Delay | pantalla oscura; click ignorado + `INPUT_DURING_LOCK` (QA-08) | sin pistas residuales del manual |
| Penalty (error) | copy general del manifest (`intro.penaltyEs`): "Incorrect sequence. Time penalized." | **nunca revela el paso esperado** (evaluación) |
| Éxito nivel | microresumen neutro (nº nivel + tiempo + errores) | `bomb-success-card` |
| Fail | razón general: "Tiempo agotado…" / "Se alcanzó el límite de errores…" (sin revelar respuesta) | `bomb-fail-card` |
| Sesión completa | "Simulation finished. Your results have been processed." + "Finalizar" (onComplete con agregado) | `bomb-session-complete-overlay` |
| Aviso <1024 px (Doc 1 §15) | nota: evaluación recomendada ≥1280×720; viewport registrado en integridad | `bomb-viewport-warning` |
| HUD | NIVEL, MODEL A/B (texto + placa, **no solo color**), LED, timer (normal/warning/critical) | `bomb-hud` |

---

## 4. Economía del juego (restricciones y penalización)

No hay puntuación monetaria. La "economía" son **restricciones por nivel** +
**penalización de tiempo**:

| Parámetro | Valor v1 (manifest) |
|---|---|
| `error_time_penalty_pct` | 0.30 (30 % del tiempo restante, clamp 0) |
| `max_errors` | 2 (→ `LEVEL_FAIL MAX_ERRORS`) |
| `hold_target_ms` / `hold_tolerance_ms` | 2000 / ±200 (ventana [1800, 2400]; se registra duración exacta) |
| `show_step_feedback` | `false` en evaluación (no enseñar la respuesta durante el nivel) |
| `time_limit_s` | 20 / 15 / 12 / 10 (L1–L4) |
| Progresión | **fija v1** (§10.1: staircase solo en versiones futuras, registrado en telemetría) |

**Score de sesión:** NO existe score compuesto del módulo (spec §12.1: "Pesos
finales: NO fijar hasta pilotaje y calibración"). El reporte muestra solo métricas
descriptivas (ver §11).

---

## 5. Elementos visuales y feedback (UI/UX)

- **Mundo propio (H4.5 — no tokenizado):** estética táctica/industrial "Desactivación"
  (oscuro acero + ámbar/rojo de panel + LED); el **chrome shared** (task-title pill,
  pips, sfx-toggle, footer) usa tokens `--k-*`.
- **Señalética:** cables = **color + letra** (R/B/G/Y) + patrón (a11y §14: daltónico);
  switches con palanca OFF/ON; botón amarillo con estado IDLE/PRESSED; LED de estado.
- **MODEL A/B:** indicador con **texto + placa** (no depende solo de color, spec §14).
- **HUD:** 2 columnas (manual | panel) en ≥900 px; 1 columna <900 px; timer con
  fases normal/warning (último 30 %)/critical (5 s) + beep progresivo (`bomb_beep`,
  `bomb_beep_hi`).
- **SFX (8, desactivables, sin audio la info crítica es visual §10.1/§14):**
  `bomb_switch`, `bomb_wire_cut`, `bomb_button`, `bomb_beep`, `bomb_beep_hi`,
  `bomb_penalty`, `bomb_success`, `bomb_fail` (catálogo `originalGameSfx.js`).
- **Animaciones (§16, durations fijas, solo bajo `prefers-reduced-motion: no-preference`):**
  power-on 400 ms, switch 120 ms, cut 150 ms, shake 120 ms, success 300 ms,
  critical 650 ms.
- **Responsive checklist:**
  - [x] 0 overflow horizontal en 390×844 (audit B6, `docs/qa/b6-bomb-visual-audit/`)
  - [x] 0 overflow horizontal en 1280×720 (id.)
  - [x] aviso <1024 px visible (`bomb-viewport-warning`)
  - [x] estados hover/focus-visible/disabled en todo interactivo (tests B2)
  - [x] hitboxes ≥44 px; foco visible (tests a11y B2)

---

## 6. Referencias diseño

- `docs/spec/EXP-BOMB-001/` (Doc 1 + Doc 2, v1.1.0) — **fuente de ley**.
- `docs/plans/2026-09-07-plan-exp7-bomb.md` (plan B1–B6) + handoffs
  `docs/plans/2026-09-08-handoff-b{1,2,3,4,6}-bomb-*.md`.
- `docs/design/design-system.md` + `src/styles/krumm-tokens.css` (chrome shared).
- `AGENTS.md` (privacidad/gobernanza, contrato R-6, mundo ≠ marca H4.5).

---

## 7. Máquina de estados del juego (state machine)

> Implementación pura en `bombEngine.js` (`BOMB_STATES`), sin UI. Espec §7.

```
BOOT → TUTORIAL_INTRO → TUTORIAL_PLAY (T1–T5, segmentos S1/S2/S3) → TUTORIAL_RESULT
     → LEVEL_INTRO → INSTRUCTION_ENCODING → BLIND_DELAY → EXECUTION
         → (STEP_VALIDATED loop) → LEVEL_SUCCESS | LEVEL_FAIL (TIMEOUT/MAX_ERRORS)
     → TRANSITION → (next LEVEL_INTRO) | SESSION_COMPLETE
```

| Estado | Entrada | Salida | Notas privacidad / reglas |
|---|---|---|---|
| `BOOT` | mount | CTA welcome | sin telemetría de sesión |
| `TUTORIAL_*` | "Iniciar práctica" | S1→S2→S3 (panel fresh en S2) | `evaluated:false`; **no alimenta scores** (DoD §16.2); ring de hold SOLO aquí |
| `LEVEL_INTRO` | transición | "Continuar" → countdown 0.5 s | regla nueva destacada (desde manifest) |
| `INSTRUCTION_ENCODING` | countdown | INSTRUCTIONS_SHOW → HIDE (libre L1 / 3-2-2 s) | inputs de bomba bloqueados (click → `INPUT_DURING_LOCK`, QA-08) |
| `BLIND_DELAY` | INSTRUCTIONS_HIDE | BLACK_SCREEN_START → END (0/2/4/3 s) | panel oculto/neutral; inputs bloqueados |
| `EXECUTION` | BLACK_SCREEN_END | loop STEP_VALIDATED; timer activo | penalización 30 %; 2 errores → fail; feedback no revela respuesta |
| `LEVEL_SUCCESS/FAIL` | fin | "Continuar" (razón general) | microresumen neutro (nivel, tiempo, errores) |
| `SESSION_COMPLETE` | L4 cerrado | "Finalizar" → `onComplete(aggregate)` | payload §19 listo (`payload_ready`) |

> **Anti-pattern phase-gate (lección Tangram):** los gates de fase aíslan
> TELEMETRÍA/inputs según estado, nunca UI que debe operar: verificado por
> `bombGamePhases.test.jsx` (QA-01…QA-10 como specs) y smokes B3/B4.

---

## 8. Contrato de ingesta de datos (rule manifest versionado)

```js
/** BOMB_RULE_MANIFEST (config 'bomb-v1.1', build 1.1.0)
 * @property {Object} levels      - tutorial/1/2/3/4: {bombType, sequenceIds, exposureMs|null, delayMs, timeLimitMs|null, evaluated}
 * @property {Object} rules       - A1/A2/B1/C1: {typeA, typeB?, forbiddenInB?, stepIds{A,B}, manualEs, manualEn}
 * @property {Object} hold        - {targetMs: 2000, window: [1800, 2400]}
 * @property {number} errorTimePenaltyPct - 0.30 (clamp 0)
 * @property {number} maxErrors   - 2
 * @property {string[]} levelOrder - ['tutorial', 1, 2, 3, 4] (progresión fija v1)
 * @property {Object} tutorial    - segmentos S1/S2/S3 (copy §4.1/§4.2/§4.3, readMs/delayMs)
 */
```

`effective_sequence = transform(base_sequence, bomb_type)` — la transformación B
(ROJO→AZUL, SW1→SW3) **viene del manifest** (`rules[typeB]` + `forbiddenInB`),
nunca de condicionales en UI (DoD §16.2, Riesgo 3 del plan). Seed de sesión:
`BOMB_DEFAULT_SESSION_SEED` (20260907) cuando el host no inyecta otro (determinismo
§15: mismo seed + config ⇒ misma forma/secuencia/transformaciones).

---

## 9. Pipeline de señales (Edge AI, privado por diseño)

- **Biometría off por defecto** (spec §1/§19): `biometric_metrics: {enabled: false}`;
  `bio_tracking_loss_ms: 0`. El módulo funciona completamente sin cámara.
- Cámara opcional = **contexto/calidad** (presencia, confianza), correlacionada por
  `gameCorrelation.aggregate`; **nunca** inferencia de talento/emoción/estrés (R-6).
- Señales de juego (agregadas, en dispositivo): métricas §12 (retención, orden
  serial, latencias, interferencia, switch cost, hold error, decay, timeout,
  recuperación) + integrity flags §14.1 (blur, fps, drift, viewport, dpr,
  input_device, resume, transiciones inesperadas, input-during-lock, misclick,
  technical abort, tutorial replay).
- **Nunca** persiste: video/frames, landmarks/keypoints, secuencia de acciones
  reconstruible por el payload del reporte (solo el agregado allowlist), pointer
  samples, DOM events. El payload §19 (raw events por sesión, timestamps relativos)
  existe **en memoria para auditoría** (DoD §16.2: "la sesión puede reconstruirse
  desde raw events") y viaja como `sessionPayload` local, fuera del allowlist de
  agregado del reporte.

---

## 10. Contratos de evento (game_event_v1 + diccionario §11)

El componente emite `game_event_v1` (`response` con `bomb: {event, meta}`) para
**todos** los eventos del diccionario §11 con meta saneada por
`BOMB_TELEMETRY_META_KEYS` (whitelist; nada de coordenadas/DOM/rostro sale por
`onGameEvent`).

| Grupo | Eventos (diccionario §11 canónico) | Meta mínima (spec) |
|---|---|---|
| Sesión | `SESSION_START`, `SESSION_COMPLETE` | session_id, build_version, config_version, rule_manifest_version, seed / levels_completed |
| Nivel | `LEVEL_START`, `NEXT_LEVEL` | level, bomb_type, seq_ids, seed / next_level |
| Encoding | `INSTRUCTIONS_SHOW`, `INSTRUCTIONS_HIDE` | exposure_ms / reason |
| Delay | `BLACK_SCREEN_START`, `BLACK_SCREEN_END` | duration_ms |
| Ejecución | `EXECUTION_START`, `ACTION_SWITCH`, `ACTION_WIRE_CUT`, `ACTION_BUTTON_DOWN/UP`, `STEP_SUCCESS`, `STEP_ERROR`, `TIME_PENALTY` | time_limit_s / id,from,to / id / id,hold_ms / step_id,serial_pos / expected,observed,error_class / pct,ms_removed |
| Resultado | `LEVEL_SUCCESS`, `LEVEL_FAIL` | elapsed_ms, errors / reason,elapsed_ms,errors |
| Integridad | `FOCUS_CHANGE` | visible, blur_count |

**DoD §16.2:** todos los eventos críticos contienen `timestamp` (relativo al nivel)
+ `level_id`; `SESSION_START` es el único exento de `level_id`. Verificado por
`bombEngineB5.test.js` (225 tests bomb en total al cierre de B6, 10 archivos).

---

## 11. Métricas conductuales derivadas (provisionales, `descriptive_only`)

> Fórmulas sobre agregados (spec §12). Cada métrica mapea a `proceduralWorkingMemory`
> con caveat. **NO son percentiles, normas, diagnósticos ni puntos de corte** (R-6).
> **NO se fija score compuesto** (spec §12.1: "Pesos finales: NO fijar hasta
> pilotaje y calibración").

| Métrica (feature vector key) | Fórmula / definición (spec §12) | Rol en el constructo | Caveat | Fuente agregado |
|---|---|---|---|---|
| `bomb.completion` | `completed ? 1 : 0` | availability gate | binario; no calidad | `completed` |
| `bomb.retentionAccuracyRate` | pasos correctos post-delay / pasos requeridos | **primaria — retención global** | sin normas; error ≠ déficit (§3.3) | `retention_accuracy_rate` |
| `bomb.serialPositionAccuracy` | posiciones correctas / longitud secuencia | **primaria — orden serial** | task-specific | `serial_position_accuracy` |
| `bomb.firstActionLatencyMs` | EXECUTION_START → primera acción | recuperación/planificación | lento ≠ peor (puede ser planificar) | `first_action_latency_ms` |
| `bomb.interStepLatencyMedianMs` | mediana entre acciones válidas consecutivas | fluidez de recuperación | mezcla retrieval + motor | `inter_step_latency_median_ms` |
| `bomb.interferenceErrorCount` | errores Type-A cometidos en Type-B | **secundaria — inhibición** (L4) | cuenta de sesión única | `interference_error_count` |
| `bomb.switchCostMs` | latencia L4 ajustada − latencia esperada por longitud | **secundaria — set shifting** | derivada, puede ser negativa | `switch_cost_ms` |
| `bomb.holdDurationErrorMs` | `abs(hold_ms − 2000)` agregado | **control** motor (no constructo central, §3.2) | input-device dependent | `hold_duration_error_ms` |
| `bomb.memoryDecaySlope` | pendiente precisión vs delay a través de niveles | sensibilidad al intervalo | pocos puntos (L1–L4); provisional | `memory_decay_slope` |
| `bomb.timeoutRate` | niveles con timeout / niveles evaluativos | contexto atención sostenida | NO es score de atención; límites authored | `timeout_rate` |
| `bomb.errorRecoveryLatencyMs` | error → siguiente acción válida | recuperación tras feedback | sparse (null si 0 errores); NO tolerancia a frustración | `error_recovery_latency_ms` |
| `bomb.timeMs` | duración de sesión (raw events) | contexto revisor | device/lectura afectan | `timeMs` |

**Regla de nulos:** métrica sin evidencia → `null` en el agregado → `not_observed`
en el vector (featureArray 0 + mask 0) → evidencia ausente (nunca 0 neutro) en el
constructo. Constructo sin BOMB administrado → `not_measured` (score null), nunca
bajo desempeño.

**Hipótesis mínimas a contrastar (spec §17.2, para las fases de validación):**
(i) precisión decrece monotónicamente con longitud+delay sin colapso temprano;
(ii) errores Type-A→B se concentran en L4; (iii) latencia inicial crece con la
carga pero separa de exactitud; (iv) métricas motoras explican varianza limitada
(else rediseño).

---

## 12. Contrato de salida

### 12.1. Agregados (allowlist-only)

`allowedAggregateFields` (blueprint `bomb_defusal`, **41 escalares** =
`bomb_defusal_aggregate_v1`, generado por `buildBombBlockSummary`):
`aggregateSchemaVersion, completed, state, levelsCompleted, levelsFailed,
levelsIncomplete, timeoutCount, totalErrorCount, retentionAccuracyRate,
serialPositionAccuracy, firstActionLatencyMs, interStepLatencyMedianMs,
interferenceErrorCount, switchCostMs, holdDurationErrorMs, memoryDecaySlope,
timeoutRate, errorRecoveryLatencyMs, blurEvents, totalBlurMs, fpsDropCount, minFps,
eventClockDriftMs, bioTrackingLossMs, inputDeviceType, viewportWidth, viewportHeight,
devicePixelRatio, sessionResumeCount, unexpectedStateTransitionCount,
inputDuringLockCount, misclickCount, technicalAbortCount, viewportResizeCount,
tutorialReplayCount, sessionIncomplete, timeMs, seed, reachedLevelCount,
sessionPayloadVersion, aggregateOnly`.

Test anti-drift: `originalGameBlueprints.test.js` exige que el allowlist sea
**superset** de las claves reales de `buildBombBlockSummary` (payload genuino del
motor).

### 12.2. Assessment feature vector

`original_game_feature_vector_v1` (type/version estables),
`featureDefinitionsVersion: '2.2.0'` — **delta aditivo**: 12 features `bomb.*`
apendidas al final (53 en total); las 41 anteriores conservan orden/semántica
(sin breaking). `addBombFeatures` valida `aggregateOnly`, consistencia
`levelsCompleted ≤ reachedLevelCount`, ratios en [0,1] (retención/serial/timeout);
slope/cost pueden ser negativos (son pendientes/diferencias, no ratios).
Game availability: `not_administered | measured_complete | measured_partial | invalid`.

### 12.3. Payload de sesión (esquema JSON spec §19)

`exp_bomb_session_v1` (`buildBombSessionPayload`): `exp_id, build_version,
config_version, session_id, timestamp_utc, seed, level_summary[]` (level, bomb_type,
sequence_ids, effective_sequence, time_limit_s, delay_duration_ms, errors, result),
`telemetry.behavioral_metrics` (10 métricas §12) + `biometric_metrics.enabled=false`,
`integrity_flags` (§14.1), `raw_series.events[]` (`t_ms` relativo al nivel +
`level_id` en críticos). `verifyBombSessionPayload` = gate de forma + privacidad +
reconstrucción (`reconstructBombSession`); `generateBombSyntheticSessionPayload`
ejecuta el **motor real** headless (reloj falso, seed fijo) → fixture de la batería
original y del demo v3 (agregado genuino, reconstruible — DoD §16.2).

### 12.4. Campos PROHIBIDOS (privacy guard)

- `assessment/originalGameFeatureVector.js` → `FORBIDDEN_KEYS`
- `postulation-demo/originalGameBlueprints.js` → `FORBIDDEN_ORIGINAL_GAME_FIELDS`
- `bomb/bombFeedback.js` → `BOMB_FEEDBACK_FORBIDDEN_KEYS`
- Típicos: `rawGameEvents`, `eventLog`, `pointerSamples`, `rawPointerPath`,
  `actionSequence`, `sequenceTrace`, `componentStates`, `trials`, `frames`,
  `landmarks`, `freeText`. El payload §19 raw viaja SOLO en memoria/local para
  auditoría, nunca por el allowlist del reporte.

---

## 13. Privacidad y gobernanza (no negociables — estado verificado 2026-09-08)

- [x] Sin video/frames/landmarks/keypoints/rutas/celdas/pointer samples/DOM crudos.
- [x] Cámara/biometría **off por defecto** y desacoplada; si se habilita =
      contexto/calidad, no inferencia de talento/emoción/estrés (R-6).
- [x] Agregados allowlist-only (41 keys blueprint); `gameCorrelation.aggregate`
      intacto; `assessment_feature_vector_v2` sin cambios incompatibles.
- [x] Señal ausente = desconocida/caveated (`score: null` / `not_measured`), nunca
      bajo desempeño.
- [x] `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe`
      presentes en el framework (`buildOriginalGameTalentFramework`).
- [x] `descriptive_only` (R-6): sin percentiles/cortes/ranking/apto-no-apto; el
      constructo 9° nace **sin score compuesto** (§12.1).
- [x] Leadership/communication = `not_measured`; tolerancia a frustración NO se
      deriva de BOMB (caveat en feedback + métricas).
- [x] Cadena R-6 completa: constructo → demanda de tarea → conducta observable →
      telemetría agregada → feature versionada → regla provisional →
      disponibilidad/caveats → narrativa para revisión humana.
- [x] Feedback comprehension: `bombFeedback.js` con lenguaje observacional
      ("señal descriptiva", "revisión humana", "no déficit de memoria" §3.3).

---

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Scoring prematuro (concluir "memoria" sin validación) | constructo `descriptive_only`, score **null**, sin pesos compuestos (§12.1); caveats `experimental_module_validation_pending` + nextStep A–G (§17.1) |
| Error interpretado como déficit de memoria | spec §3.3: comprensión/dispositivo/motricidad también causan errores; copy del feedback y narrativa lo enmarcan explícitamente |
| Timer en headless / drift visual | reloj inyectado (fake timers) en tests; DoD visual vs lógico ≤100 ms (test específico B3); `event_clock_drift_ms` en integridad |
| Interferencia L4 mal transformada | transformación B 100 % desde el manifest (DoD §16.2) + tests QA-04/05 específicos + test anti-drift |
| Mundo nuevo ≠ marca | mundo propio (H4.5); solo chrome shared con tokens `--k-*` (verificado en tests B2) |
| Audio como único canal de info crítica | audio desactivable; toda info crítica también visual (spec §10.1/§14) |
| Overflow móvil / <1024 px | aviso §15 (`bomb-viewport-warning`); audit B6 390×844 overflow 0 |
| B5 quedó incompleto (código sin commit, sin registro de batería) | detectado al iniciar B6; backfill commit `4e65c75` (blueprint + game map + fixture + feedback + seed de campaña + instruction check); tests anti-drift |

---

## 15. Criterios de aceptación (gates) — ejecutados 2026-09-08

```bash
NODE_ENV=test npx vitest run --pool=threads --reporter=default   # suite completa (número en handoff B6)
npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

- [x] Tests bomb (B1–B6): **225 tests / 10 archivos** (`bombRules`, `bombEngine`,
      `bombEngineB5`, `bombEngineTutorial`, `bombTelemetry`, `bombFeedback`,
      `bombTimer`, `bombGame`, `bombGamePhases`, `bombGameTutorial`).
- [x] Feature vector delta aditivo: 53 features, orden estable, `bomb.*` sin
      regredir las 41 previas (`originalGameFeatureVector.test.js`).
- [x] Reporte con **9 constructos** sin regredir los 8 (`PostulationReportScreen`,
      `V3CompanyReport`, `V3CompanyProcess` GREEN).
- [x] Constructo 9° `descriptive_only` (score null, confidence ≤ 0.2, caveats
      §12.1/§17/§3.3) (`originalGameTalentMapping.test.js`).
- [x] Batería `original` = 6 juegos ("Juego X de 6"); `stable_dg` intacta (5)
      (`postulationDemoConfig/fixture` tests).
- [x] Payload §19 verificado + reconstruible desde raw events (DoD §16.2).
- [x] Audit visual mundo (2 viewports, 0 overflow, 0 console errors):
      `docs/qa/b6-bomb-visual-audit/`.
- [x] Smoke recorrido completo 6 juegos: fixture + app tests (ver handoff B6).

---

## 16. Bitácora de incidentes / lecciones (B5→B6, 2026-09-08)

- **B5 marcado done con código sin commit ni registro de batería** (detectado al
  iniciar B6; commit `4e65c75` lo cierra): lección → al cerrar una card, el
  handoff debe listar commits verificados (`git rev-parse HEAD`) y los tests
  ejecutados; "done" sin commit ≠ done.
- **`candidateInstructionCheck` no conocía `bomb_defusal`** (default `review`
  rompía el drawer "Claridad de instrucciones"): lección → cada juego nuevo pasa
  por el check de comprensión (§3.3: errores de memoria ≠ riesgo de instrucción).
- **Seed null en producción**: el stage no inyecta seed; se fijó default de campaña
  (`BOMB_DEFAULT_SESSION_SEED`) en el componente (determinismo §15).
- **Conteo de features**: la cadena original era 41 (no 42) — el test de delta
  aditivo fija el índice de corte (40/41) para evitar derivas.

---

## 17. Validación (nextStep — spec §17.1)

El módulo es **experimental** hasta completar el plan de validación:

| Fase | Objetivo | Salida esperada |
|---|---|---|
| A. Validación de contenido | Revisión psicometría + diseño + dominio | mapa constructo→mecánica; eliminar confounds |
| B. Usabilidad técnica | Errores de comprensión, device bias, bugs | tasas de tutorial, misclicks, tiempos de lectura |
| C. Piloto psicométrico | Dificultad, floor/ceiling, distribución | parámetros y formas revisadas |
| D. Convergencia / discriminación | Comparación con medidas externas | patrón de correlaciones esperado/no esperado |
| E. Confiabilidad | Test-retest o formas paralelas | índices de estabilidad con IC |
| F. Validez de criterio | Solo si hay outcome pertinente | evidencia incremental |
| G. Fairness | Dispositivo, idioma, grupos demográficos | DIF/impacto; ajustes o normas |

**Decisión B6 — `stable_dg`: NO incorporar BOMB a la batería pública** (se queda
en 5 juegos, ~14–16 min) hasta pilotaje: sin validación, la duración pública no
cambia sin evidence (plan §3); la batería controlada `?battery=original` (6 juegos,
~18–23 min) es donde BOMB se evalúa en demo/fixture.

## A. Referencias técnicas

- `src/tasks/original-games/bomb/` — implementación (13 archivos) + tests (10).
- `src/assessment/originalGameFeatureVector.js` (features `bomb.*`, `addBombFeatures`).
- `src/assessment/originalGameTalentMapping.js` (`buildProceduralWorkingMemory`,
  9° constructo).
- `src/postulation-demo/originalGameBlueprints.js` (entrada `bomb_defusal`,
  allowlist 41).
- `docs/spec/EXP-BOMB-001/` (spec v1.1.0 — ley), `docs/plans/2026-09-07-plan-exp7-bomb.md`.
- Referencias teóricas (spec §20, para la etapa formal de validación): Baddeley
  (2000), Cowan (2001), Miyake et al. (2000), Kane et al. (2004), Unsworth & Engle
  (2007).
