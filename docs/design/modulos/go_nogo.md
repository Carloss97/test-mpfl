# Módulo stable_dg: Control inhibitorio (`go_nogo`)

> **Versión del módulo:** `1.0.0` (auditoría FASE B.3, 2026-09-12)
> **Fecha:** 2026-09-12
> **Autor(es):** Hermes (FASE B, KRU-116)
> **Estado:** `implementado` (auditado; chain R-6 completa en este doc)
> **Runtime de inferencia:** `Edge AI (WASM / WebGL) — Zero Cloud`
> **Ruta producto:** `/postulaciones` (batería `stable_dg`, juego visible 2 de 4)
> **Batería:** `stable_dg` (`krumm_postulation_demo_stable_dg_v1`)
> **Plantilla:** `plantilla-modulo-original-game.md` adaptada a stable_dg (los juegos
> original tienen doc propia; este cierra el gap P1 sistemático de stable_dg — ver
> `docs/qa/prelaunch/2026-09-12-go-nogo.md`).

---

## 0. Traza de implementación (rutas reales `src/`)

| Sección doc | Archivo(s) `src/` | Export/Función clave | Tests |
|---|---|---|---|
| 1. Objetivo/flujo | `tasks/GoNoGoTask.jsx` | Componente, `finalizeTrial`, `onComplete` | `tasks/goNoGo.test.jsx` |
| 2. Estructura trials | `tasks/GoNoGoTask.jsx` | `buildGoNoGoTrials` (secuencia aleatorizada, `rng` inyectable) | `tasks/goNoGo.test.jsx` |
| 3. Textos UX | `tasks/GoNoGoTask.jsx` | i18n `t(es, en)` (semáforo, GO/NO-GO, tentación) | `tasks/goNoGo.test.jsx` (EN copy) |
| 4. Puntuación | `tasks/GoNoGoTask.jsx` | `scoreGoNoGoResponse`, `summarizeGoNoGoResults`, `computePostErrorSlowingMs` | `tasks/goNoGo.test.jsx` |
| 5. Visual/Feedback | `tasks/GoNoGoTask.jsx` + `postulation-demo/postulationDemo.css` | cue card GO/NO-GO, botón `go-nogo-task__response` (min-height 48 px) | `tasks/goNoGo.test.jsx` + smoke B.3 |
| 7. State machine | `tasks/GoNoGoTask.jsx` | trial único visible, `handledRef` guard, ITI con jitter, timeout por trial | `tasks/goNoGo.test.jsx` + `tasks/gameRerenderStability.test.jsx` |
| 8. Contratos eventos | `telemetry/gameTelemetry.js` + `tasks/GameRuntime.jsx` | `normalizeGameEvent` (game_event_v1), `game_start` en GameRuntime | `telemetry/gameTelemetry.test.js` |
| 9. Pipeline señales | — (sin pointer sampler) | solo eventos discretos de respuesta; RT por trial | `tasks/goNoGo.test.jsx` |
| 10. Agregados batería | `telemetry/gameTelemetry.js` | `summarizeGameEvents` → `inhibition.*` (commission/omission/correctGoRT/postErrorSlowing) | `telemetry/gameTelemetry.test.js` |
| 11. Feature vector | `telemetry/gameFeatureVector.js` | `assessment_feature_vector_v2` keys `response.postErrorSlowingMs`, `response.commissionErrorRate`, `response.omissionErrorRate` | `telemetry/gameFeatureVector.test.js` |
| 12. Contrato salida | `postulation-demo/postulationDemoSessionBuilder.js` | `stripForbidden` (allowlist `ASSESSMENT_FORBIDDEN_KEYS`) | `postulation-demo/postulationDemoSessionBuilder.test.js` |
| 13. Privacidad | `assessment/assessmentSession.js` | `ASSESSMENT_FORBIDDEN_KEYS` (incl. `trials`), `validateAssessmentSessionPrivacy` (recursivo) | `assessment/assessmentSession.test.js` |
| 14. Configuración | `postulation-demo/postulationDemoConfig.js` + `assessment/batteryConfig.js` | bloque `visible:true`, `skill: inhibitory_control`, trialCount 8 (demo) / 24 (standardized) | `postulation-demo/postulationDemoConfig.test.js` |
| 15. Render batería | `postulation-demo/PostulationGameStage.jsx` | props `width/height` (viewport clamp), `trialCount`, `onComplete=completeBlock` | `postulation-demo/PostulationGameStage.test.jsx` |

> **Regla:** si una celda queda vacía, el slice NO está listo para cerrar.

---

## 1. Objetivo y flujo de usuario

El candidato ve una señal grande (**GO** en verde o **NO-GO** en rojo) en un semáforo
de impulso. En **GO** debe pulsar "Responder ahora" lo antes posible; en **NO-GO**
debe **inhibir** la respuesta (no pulsar). El withhold correcto se genera por
**timeout sin pulsación** (no hay botón de "no responder": pulsar en NO-GO es siempre
un error de comisión — patrón R-6 de la skill: la inhibición no es auto-reporteable).

### 1.1. Propósito (una frase)

Evidencia observable de **control inhibitorio (response inhibition)**: tasa de
errores de comisión (pulsar en NO-GO), tasa de omisión (no pulsar en GO), velocidad
de respuesta en GO (RT) y ajuste post-error (post-error slowing) — **no** de velocidad
de reacción simple (el warmup `simple_rt` cubre eso) ni de precisión (juego 1).

### 1.2. Constructos objetivo (provisionales, R-6)

| Constructo (provisional) | Fuente de señal | Disponibilidad | Caveat / evidencia |
|---|---|---|---|
| `inhibitory_control` (dimensión `inhibitoryControl`) | `response.commissionErrorRate`, `response.omissionErrorRate`, `response.postErrorSlowingMs`, `inhibition.correctGoRT` + canal EdgeAI | provisional (score 0–100, **sin baremos**) | matriz XLSX; el score mezcla también un canal EdgeAI de agregado (proxy, §11); la señal de inhibición **siempre existe** tras el fix GNP-P1-1 (piso de 2 NO-GO por sesión, §2) |
| Colaterales | — | `not_measured` | no se derivan constructos adicionales de este juego (la RT de GO se agrega a la media de batería, no es claim de velocidad pura) |

### 1.3. Alcance IN / OUT (del módulo)

- **IN:** 8 trials (batería demo) / 24 (standardized), secuencia aleatorizada de cues
  (p(NO-GO)=0.35, piso 2, tope ½), RT por trial, comisión/omisión, post-error slowing,
  eventos `game_event_v1`.
- **OUT:** tutorial guiado (el micro-bloque precede a precisión; la instrucción en
  pantalla se actualiza por tipo de señal), SFX (no aplica en stable_dg),
  inferencia biométrica directa, score global, comparación entre personas.

---

## 2. Estructura de trials / fases

| Fase | Trials | Propósito | ¿Evalúa? |
|---|---|---|---|
| Warmup (`simple_rt`, `visible:false`) | 4 | calibrar ritmo motor | NO (no cuenta en "Juego X de N") |
| Precisión (juego 1) | 4 | demanda Fitts | SÍ |
| **Go/No-Go (juego 2)** | **8 (demo) / 24 (standardized)** | inhibición bajo demanda aleatorizada | SÍ |
| Práctica G.2 | — | mecánica disponible (`originalGamePractice.js`) pero **sin botón de práctica** para stable_dg en el flujo actual | N/A |

Secuencia de cues (fix FASE B.3, GNP-P1-1 — `buildGoNoGoTrials`):

- **Trial 0 = GO siempre** (enseña el mapeo de respuesta antes de la primera demanda
  de inhibición).
- Trials ≥1: NO-GO con probabilidad `noGoProbability = 0.35` (rango típico 25–50 %
  en tareas go/no-go; evita sesgo de espera sin perder mayoría GO para la señal de RT).
- **Piso `minNoGo = 2`**: garantiza ≥2 NO-GO por sesión → la señal de inhibición
  (commission rate) **siempre existe** (sin piso, una sesión azarosa de 0 NO-GO dejaría
  `commissionErrorRate = 0/0 → 0`, que se leería como inhibición perfecta).
- **Tope `maxNoGo = count/2`**: mantiene la mayoría GO (señal de RT motor; 8 trials →
  2–4 NO-GO; 24 trials → 2–12 NO-GO).
- `rng` inyectable (default `Math.random`) para tests deterministas (LCG en
  `goNoGo.test.jsx`).

> **Antecedente (bug corregido 2026-09-12):** la secuencia era determinista
> (`noGoEvery: 2` → GO/NO-GO/GO/NO-GO…). Tras 2 trials el candidato predecía el tipo
> de cada señal y podía lograr 100% de precisión alternando pulsar/no pulsar sin
> inhibición real — constructo inválido. La aleatorización cierra esa vía.

Timing por trial: SO (stimulus on) 900 ms fijo (duración de presentación estándar en
go/no-go web; documentado en §14) + ITI con **jitter [0.75, 1.25] × 350 ms** (fix
GNP-P2-5: el ITI fijo telegrafiaba el ritmo).

---

## 3. Textos e instrucciones (UX Copy / script de pantalla)

| Pantalla / Momento | Texto ES | Texto EN | Notas |
|---|---|---|---|
| Título (header) | `🚦 Semáforo de impulso` | `Impulse traffic light` | emoji en título (P3 real-device, §14) |
| Progreso | `Señal {n} de {total}` | `Signal {n} of {total}` | |
| Captura (config) | `Control inhibitorio` · `Responde a señales GO e inhibe respuestas ante señales NO-GO.` | `Inhibitory control` · `Respond to GO signals and inhibit responses to NO-GO signals.` | `postulationDemoConfig.js` (labelEn/descriptionEn desde t_42978412) |
| Instrucción GO | `Pulsa responder solo cuando aparezca GO.` | `Press respond only when GO appears.` | |
| Instrucción NO-GO | `NO-GO: espera sin pulsar para inhibir la respuesta.` | `NO-GO: wait without pressing to inhibit the response.` | |
| Tentación NO-GO | `No lo pulses en NO-GO` | `Do not press on NO-GO` | |
| Botón respuesta | `Responder ahora` | `Respond now` | button 48 px min-height, keyboard-operable (`data-state` go/no-go) |
| Pantalla final | `Go/No-Go completado` · `Precisión: {pct}%` | `Go/No-Go complete` · `Accuracy: {pct}%` | en batería no se renderiza (el siguiente juego monta en el mismo batch; standalone/práctica sí) |

---

## 4. Puntuación (modelo de inhibición por trial)

| Magnitud | Fórmula / valor | Notas |
|---|---|---|
| `correct_go` | GO + pulso en ≤900 ms | `reactionTimeMs = now − shownAt` |
| `omission_error` | GO + timeout (sin pulso a los 900 ms) | `reactionTimeMs = null` |
| `commission_error` | NO-GO + pulso | `reactionTimeMs` medido (velocidad del error) |
| `correct_withhold` | NO-GO + timeout sin pulso | `reactionTimeMs = null`; **el withhold es por timeout, nunca por botón** |
| `score` (0–1 por trial) | `correct ? 1 : 0` | |
| `accuracy` | correctos / total | |
| `commissionErrorRate` | comisiones / NO-GO | piso 2 NO-GO (§2) → denominador ≥ 2 siempre |
| `omissionErrorRate` | omisiones / GO | |
| `correctGoRT` / `meanReactionTimeMs` | media de RT de correct_go | solo trials GO (en NO-GO no hay RT de acierto) — **clave de contrato del session builder** (fix GNP-P2-1) |
| `postErrorSlowingMs` | media de (rt(n) − media correct_go previos) para cada trial n con RT finito tras un error | ajuste post-error (post-error slowing); también emitido **por respuesta** en el evento (fix GNP-P2-2) |

Resumen final (`summarizeGoNoGoResults` → `onComplete(summary)`):
`{ gameId, totalTrials, completedTrialCount, meanReactionTimeMs, accuracy, meanScore,
commissionErrorRate, omissionErrorRate, correctGoRT, goTrialCount, noGoTrialCount,
postErrorSlowingMs, trials (in-memory, **se elimina en el payload** — §12) }`.

No hay economía de puntos ni meta global: es una tarea de inhibición con score por
trial (a diferencia de los juegos original).

---

## 5. Elementos visuales y feedback (UI/UX)

- **Señalética:** cue card grande (texto GO/NO-GO, `clamp(3rem, 9vw, 4.8rem)`,
  `white-space: nowrap`) — verde (`#ccfbf1`/`#0f766e`) para GO, rojo/rosa
  (`#fff1f2`/`#be123c`) para NO-GO. Hex documentados en el regime del design system
  (asertados en `PostulationGamesDesignSystem.test.jsx` — colores semánticos
  señal/fallo, no de marca).
- **HUD:** header pills (título 🚦 / progreso "Señal n de N") + botón de respuesta
  (`min-height: 48 px` ≥ 44 AA; `:hover`/`:focus-visible`/`data-state` en CSS shared).
- **Animaciones:** ninguna propia (el cue cambia por re-render de texto). Sin
  `@keyframes` en go-nogo → `prefers-reduced-motion` N/A para este juego.
- **Sin feedback por trial** (decisión documentada §14): en go/no-go, indicar acierto/
  fallo tras cada señal sesga el ajuste del candidato (aprender de la propia respuesta
  es parte de la medida: post-error slowing). El resumen final sí existe.
- **Responsive checklist (FASE B.3, 2026-09-12):**
  - [x] 0 overflow horizontal en 390×844 (smoke Playwright)
  - [x] 0 overflow horizontal en 1280×720 (smoke Playwright)
  - [x] task-area por viewport: 520×290 (desktop-compact) / 312×340 (móvil) —
        `getPostulationGameViewport`; **ahora respeta el prop `height`** (fix GNP-P2-4;
        antes 300 px fijo > 290 px del stage desktop-compact → scroll interno)
  - [x] botón "Responder ahora" 48 px ≥ 44 px AA (asert smoke)
  - [x] vision-verification de screenshots (cue legible, sin clip, emoji renderizado
        en headless — real-device pendiente)

---

## 6. Referencias diseño

- `docs/design/krumm-postulation-pdd.md`, `krumm-postulation-sdd.md`.
- `AGENTS.md` — privacidad/gobernanza y contrato científico R-6.
- `docs/qa/prelaunch/2026-09-12-go-nogo.md` — auditoría 8 dims + hallazgos.
- Logan, G. S. (1972). *Comparison of human information processing systems: A
  psychophysiological approach.* Journal of Experimental Psychology, 93(3), 367–375.
  (paradigma go/no-go; referencia adyacente del constructo, no validación normativa)
- `src/tasks/GoNoGoTask.jsx` — componente y UX copy.

---

## 7. Máquina de estados del juego (state machine)

```
trial N (stimulus_shown, SO 900 ms)
   ├─ pulso en GO ────────→ response(correct_go) ─┐
   ├─ timeout en GO ─────→ response(omission) ────┤
   ├─ pulso en NO-GO ─────→ response(commission) ─┤
   └─ timeout en NO-GO ──→ response(withhold) ────┤
                                                    ↓
                          (N < total) ITI jitter [0.75,1.25]×350 ms → trial N+1
                          (N = total) game_end + onComplete
```

| Entrada | Guard | Notas |
|---|---|---|
| pulso en cualquier trial | `handledRef` (1 finalización por trial) | double-click / multitouch = no-op tras el primer pulso |
| timeout | `stimulusMs` (900 ms) | el withhold de NO-GO **solo** existe por timeout |
| ITI | `itiRef` + cleanup en unmount/change | jitter aleatorio (fix GNP-P2-5) |
| StrictMode (dev) | `emittedForRef` por índice de trial | evita `stimulus_shown` duplicado del trial 0 (fix GNP-P3-6) |

- **Sin estado irresoluble:** todo trial termina por pulso o timeout (900 ms bound).
- **Clock único** `performance.now()` (pitfall 23 de la skill ✓): `shownAtRef`,
  timestamps de eventos y RT en el mismo clock.
- **Orden de finalización = orden de resultados:** `resultsRef` se apende en el orden
  en que los trials se resuelven (secuencial, 1 trial a la vez) → el post-error
  slowing se calcula en orden de finalización (regla R-6/skill #12 ✓).

---

## 8. Contrato de ingesta (geometría de trial)

```js
// buildGoNoGoTrials → por trial (aleatorizado con rng inyectable):
{
  trialId: 'gonogo-<i>', targetId: 'gonogo-cue-<i>', trialIndex: i,
  cue: 'GO' | 'NO-GO',
  responseRequired: boolean,
  expectedResponse: 'press' | 'withhold',
}
```

Tamaño del área: props `width/height` del stage (`getPostulationGameViewport`,
clamp 240..620 × 280..340 compact; 720×460 no-compact) — sin dependencia de
re-medición mid-trial (la geometría no se usa para puntuar; solo para layout) →
**inmune al patrón de reset por resize detectado en B.2/B.5** (no hay `useMemo`
de trials sobre width/height; ver nota del rollup para `visual_search`).

---

## 9. Pipeline de señales (respuesta discreta, privado por diseño)

- **Sin pointer sampler** (note (d) de la card): go/no-go no captura `pointermove`
  (la respuesta es un click discreto en un botón, no una trayectoria) → el patrón
  SRT-P3-2 (cache de `getBoundingClientRect` por pointermove) es **N/A** para este
  juego y las kinemáticas de touch degeneradas (fix B.2) no aplican.
- **Muestra por trial:** 1 evento `response` (outcome + RT + bloque `inhibition`) —
  la RT es el único valor de señal continua; no hay muestras crudas.
- **Cámaras/biometría:** contexto/calidad únicamente (no se consume para este módulo);
  la correlación game↔facial agrega por trial vía `gameCorrelation` (ventanas
  reaction/pre/post) sin persistir samples.

---

## 10. Contratos de evento (game_event_v1)

Emitidos vía `GameRuntime` → `normalizeGameEvent` (contrato `game_event_v1`,
`privacy.rawPointer: false` por evento):

| Evento | Emisión | Campos |
|---|---|---|
| `game_start` | `GameRuntime` al activar (1× por montaje) | `gameId`, `timestamp`, `gameState{level:1, difficulty:'go_no_go'}` |
| `stimulus_shown` | por trial (SO) | `trialId`, `targetId`, `stimulus{kind:'go_nogo_cue', payload{cue, responseRequired}}`, `gameState{score acumulado, level, difficulty:'go_no_go'}` |
| `response` | por trial (pulso o timeout) | `response{correct, outcome, reactionTimeMs, score, inhibition{cue, responseRequired, response}, postErrorSlowingMs?}` + `gameState` |
| `game_end` | trial final (antes de `onComplete`) | `gameState{score 0-100, level: totalTrials, difficulty:'go_no_go'}` — **verificado FASE B.3** (ya existía; note (b) de la card) |

Agregado batería: `summarizeGameEvents` → `inhibition{commissionErrorRate,
omissionErrorRate, correctGoRT, postErrorSlowingMs}` (fix GNP-P2-2: el
`postErrorSlowingMs` por respuesta permite que el agregado no se quede en 0) +
`performance` + `privacy{aggregateOnly:true}`.

**Nota de orden (sistémico):** el effect del hijo (stimulus_shown) corre antes que el
del padre (game_start en GameRuntime) — aplica a todos los juegos GameRuntime; no se
asume orden entre ambos en los tests (comentario en `goNoGo.test.jsx`).

---

## 11. Métricas conductuales derivadas (provisionales, descriptive_only)

| Métrica (fuente) | Definición | Constructo provisional | Caveat |
|---|---|---|---|
| `response.commissionErrorRate` (feature v2) | comisiones / NO-GO (media de batería) | `inhibitory_control` | piso 2 NO-GO → señal garantizada; sin baremos |
| `response.omissionErrorRate` (feature v2) | omisiones / GO | `inhibitory_control` | idem |
| `response.postErrorSlowingMs` (feature v2) | ajuste post-error (delta RT tras error) | `inhibitory_control` (regulación) | 0 = sin evidencia de error (convención de nulos del feature vector v2, no "sin slowing") |
| `inhibition.correctGoRT` (gameSummary) | media RT de correct_go | `inhibitory_control` (velocidad asociada) | RT de GO; la velocidad pura la cubre `simple_rt` |
| `meanReactionTimeMs` (block summary) | = correctGoRT | evidencia de la dimensión | clave de contrato del session builder (fix GNP-P2-1) |
| `accuracy`, `meanScore` (block summary) | acierto global | evidencia general | score 0–100 provisional, **sin baremos** |

**Nota de dimensión (`inhibitoryControl` en `talentProfile.js`):**
`rawScore = mean(1 − max(commission, omission), canalEdgeAI('inhibitionControl'))`.
El canal EdgeAI en postulación demo es un **proxy de agregado** (derivado de
taskPerformance global, evidencia `'candidate_game_stage'` — no específico del
juego) → mezcla la señal de inhibición real con un componente no discriminatorio
por juego (mismo patrón documentado en B.2 PRE-P2-3 para `visuomotorPrecision`).
Decisión: aceptado como provisional descriptivo; la corrección (pesos por juego /
canal específico) pertenece al mapeo R-6 validado post-FASE B.

**Regla de nulos (R-6):** constructo sin evidencia → `score: null` en el framework
original. En `stable_dg` la dimensión siempre tiene score provisional (juego
obligatorio y visible); tras el fix GNP-P1-1 la señal de inhibición **existe por
construcción** (≥2 NO-GO). Limitación residual sistémica (documentada, sin fix en
B.3): `talentProfile` no tiene camino de score nulo por dimensión — una sesión sin
datos de go_nogo (interrupción) daría commission/omission = 0 → `1 − 0 = 1` (se leería
como alto, no como desconocido). Afecta a todas las dimensiones de stable_dg; fix en
mapeo R-6 post-B (null-safe por fuente de señal).

---

## 12. Contrato de salida (allowlist-only)

### 12.1. Block summary (`onComplete` → `completedDemo.blocks[].summary`)

```js
{ gameId: 'go_nogo', totalTrials, completedTrialCount, meanReactionTimeMs,
  accuracy, meanScore, commissionErrorRate, omissionErrorRate, correctGoRT,
  goTrialCount, noGoTrialCount, postErrorSlowingMs, trials: [...por trial (agregados, in-memory)] }
```

### 12.2. Estructura final (payload)

`normalizeCompletedBlocks` aplica **`stripForbidden`** (recursivo,
`ASSESSMENT_FORBIDDEN_KEYS` — incluye `trials`) → el `result` del bloque que llega a
sesión/payload es **solo** los agregados (sin `trials`). `sanitizeGameResults`
(clone) + `validateFinalAssessmentPayload` (recursivo, forbidden keys) re-verifican.
**Verificado FASE B.3:** test `postulationDemoSessionBuilder.test.js`
(`result` sin `trials`, `payload.validation.ok`) + suite focal 88/88.

### 12.3. Feature vector

`assessment_feature_vector_v2` (v0.2.0) — keys de este juego:
`response.postErrorSlowingMs`, `response.commissionErrorRate`,
`response.omissionErrorRate` (+ `game.*`/`performance` agregados de batería).
`featureArray` finito; `privacy.payloadContainsAggregatesOnly: true`.

### 12.4. Campos PROHIBIDOS (privacy guard)

- `assessment/assessmentSession.js` → `ASSESSMENT_FORBIDDEN_KEYS` (incl. `trials`,
  `pointerSamples`, `rawPointerPath`, `rawGameEvents`, `stimuli`, …).
- Los eventos de respuesta llevan **un** outcome + RT + bloque `inhibition` por trial
  (agregado seguro); la secuencia de cues por sí sola no es reconstructiva (no hay
  timestamps crudos de pointer/DOM en el payload).

---

## 13. Privacidad y gobernanza (no negociables — verificado FASE B.3)

- [x] Sin video/frames/landmarks/keypoints/rutas/pointer samples crudos en payload.
- [x] Cámara/biometría = contexto/calidad, no inferencia de este módulo.
- [x] Agregados allowlist-only; `game_event_v1` + `stimulus_shown`/`response`/`game_end` intactos.
- [x] Señal de inhibición garantizada (piso 2 NO-GO) → no hay sesión "inhibición
      perfecta por azar sin NO-GO".
- [x] `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe` en payload.
- [x] `descriptive_only`: sin percentiles/cortes/ranking/apto-no-apto.
- [x] Chain R-6 completa: constructo (inhibitory_control) → demanda (GO/NO-GO
      aleatorizado) → conducta (pulso/withhold, RT, comisión, omisión, post-error
      slowing) → telemetría agregada (`inhibition.*`) → feature versionada (v2) →
      regla provisional (dimensión `inhibitoryControl`) → disponibilidad/confianza/
      caveats → narrativa de revisión humana.

---

## 14. Riesgos y mitigaciones

| Riesgo | Sev | Mitigación / decisión |
|---|---|---|
| Secuencia de cues determinista (GO/NO-GO alternante) telegrafiaba el tipo → 100% sin inhibición real (constructo inválido) | **P1 (cerrado B.3)** | Aleatorización p=0.35 + piso 2 + tope ½ + rng inyectable (fix GNP-P1-1, RED→GREEN + smoke E2E: secuencias observadas en vivo no alternantes en 2 viewports) |
| Sin doc módulo R-6 (P1 sistemático de los 5 stable_dg) | **P1 (cerrado B.3)** | Este doc |
| ITI fijo 350 ms → ritmo telegrafiado | P2 (cerrado B.3) | jitter [0.75, 1.25] × itiMs (fix GNP-P2-5) + test de límites |
| Summary sin claves de contrato del session builder (`completedTrialCount`, `meanReactionTimeMs`) → RT de go/nogo ausente de la media de batería | P2 (cerrado B.3) | fix GNP-P2-1 (meanReactionTimeMs = correctGoRT, documentado: RT medible solo en GO) |
| `postErrorSlowingMs` solo en el resumen del juego; el agregado por eventos (→ feature vector) siempre 0 | P2 (cerrado B.3) | fix GNP-P2-2: emisión por respuesta + test de agregación en `gameTelemetry.test.js` |
| `height` prop ignorada (300 px fijo > 290 px del stage desktop-compact) → scroll interno | P2 (cerrado B.3) | fix GNP-P2-4: `height` prop con default 300 |
| `durationLabel: '1 min'` vs ~10–15 s reales (8 trials) | P3 (cerrado B.3) | `'15 s'` en `postulationDemoConfig.js` |
| `game_end.gameState.score` en escala 0–1 (resto de la batería: 0–100) | P3 (cerrado B.3) | `Math.round(meanScore * 100)` |
| `difficulty` inconsistente (`response_inhibition` en game_start vs `go_no_go` en el resto) | P3 (cerrado B.3) | unificada a `go_no_go` |
| Campo `noWrap` muerto (retornado, nunca usado) | P3 (cerrado B.3) | eliminado |
| StrictMode (dev): `stimulus_shown` duplicado del trial 0 | P3 (cerrado B.3) | guard `emittedForRef` por índice + test |
| Emoji 🚦 en título (+ SFX toggle 🔊/🔇 shared) | P3 (abierto, sistemático) | Verificación real-device pendiente (patrón `t_25009e33`); si tofu → SVG inline |
| Canal EdgeAI `inhibitoryControl` = proxy de agregado (no específico del juego) | P3 (abierto, sistemático) | Mismo patrón que B.2 PRE-P2-3; fix en mapeo R-6 post-B |
| Sin camino de score nulo por dimensión en `talentProfile` (señal ausente → 0 → `1−0` alto) | P3 (abierto, sistemático) | Afecta a todo stable_dg; fix en mapeo R-6 post-B (null-safe). Mitigado en este juego por el piso de 2 NO-GO (§11) |
| Sin feedback por trial | P3 (decisionado) | Por diseño: el feedback inmediato sesga el ajuste medido (post-error slowing); resumen final sí existe |
| SO fijo 900 ms | P3 (decisionado) | Duración de presentación estándar en go/no-go web; window de respuesta = SO |
| role `calibration`/`scored` no expuesto en `sanitizeGameResults` (SRT-P2-3) | P3 (abierto, sistemático) | Este juego es `visible:true` (scored) → impacto bajo; fix coordinado con B.1/epic |

---

## 15. Criterios de aceptación (gates) — resultado FASE B.3

```bash
NODE_ENV=test npx vitest run <focales> --pool=threads --reporter=default   # 88/88 (11 files)
npx oxlint <archivos tocados>                                              # 0 warnings
npm run build                                                              # OK
```

- [x] Tests RED→GREEN del fix P1 (secuencia aleatorizada) + P2 (contrato summary,
      post-error por respuesta, ITI jitter, height): `goNoGo.test.jsx` (15 tests),
      `gameTelemetry.test.js` (+1 test de agregación), configs.
- [x] Browser smoke 2 viewports (1280×720 mouse + 390×844 touch) —
      `scripts/smoke-b3-go-nogo-2026-09-12.mjs`: 0 failures, 0 console errors,
      0 requestfailed, 0 overflow; go/nogo jugado completo 8/8 trials por viewport;
      **E2E del fix P1: secuencias de cues en vivo no alternantes** (desktop:
      GO,NO,NO,GO,GO,NO,NO,GO — 4 NO-GO; mobile: GO,GO,NO,NO,NO,GO,GO,GO — 3 NO-GO);
      transición a stroop íntegra; fixture report OK en ambos viewports.
      Screenshots: `docs/qa/prelaunch-b3-go-nogo/` (15 shots).
- [x] Payload sin raw fields prohibidos (`trials` eliminado; validación recursiva OK).
- [x] `game_end` emitido (note (b) verificado) con score 0–100 + difficulty unificada.

**Test de componente (lección Tangram) — presente:** interacción núcleo por botón
(comisión en NO-GO), withhold por timeout en NO-GO, omisión por timeout en GO,
transición de trial (ITI real con fake timers), límites del jitter, secuencia
aleatorizada (propiedades + rng inyectable), StrictMode (sin duplicado), privacidad
del payload emitido (`JSON.stringify` sin `samples`), EN copy.

---

## 16. Trazabilidad de auditoría (FASE B.3)

| Hallazgo | Sev | Estado | Evidencia |
|---|---|---|---|
| GNP-P1-1 secuencia de cues determinista (constructo inválido) | P1 | **cerrado** (fix + tests + smoke E2E) | §2, §15 |
| GNP-P1-2 sin doc módulo R-6 (sistemático stable_dg) | P1 | **cerrado** (este doc) | §0–§15 |
| GNP-P2-1 summary sin contrato de session builder | P2 | **cerrado** (fix + test) | §4, §12 |
| GNP-P2-2 postErrorSlowingMs ausente del agregado por eventos | P2 | **cerrado** (fix + test gameTelemetry) | §10, §11 |
| GNP-P2-4 height prop ignorada | P2 | **cerrado** (fix + test) | §5 |
| GNP-P2-5 ITI fijo (jitter) | P2 | **cerrado** (fix + test de límites) | §2, §7 |
| GNP-P3-1..7 (durationLabel, score 0-100, difficulty, noWrap, emoji, StrictMode, proxy EdgeAI) | P3 | 5 cerrados, 2 abiertos sistemáticos (emoji real-device, proxy/null-score post-B) | §14 |

## 17. Pitfalls (incidentes reales — revisar antes de cerrar cambios)

| Pitfall | Incidente | Prevención |
|---|---|---|
| Secuencia determinista de cues en go/no-go (noGoEvery) se lee como 100% de inhibición | FASE B.3 GNP-P1-1 (este doc) | Aleatorización + piso de NO-GO + tope; tests de propiedades (no la secuencia exacta); smoke E2E aserta no-alternancia en vivo |
| Fisher-Yates con rng que devuelve 1.0 (tests) → j out-of-bounds + clave `undefined` | FASE B.3 GNP-P1-1 (fix en `shuffleIndices`) | clamp `Math.min(i, …)` en el índice de swap |
| Contratos de summary por juego (claves `meanReactionTimeMs`/`completedTrialCount`) no verificados contra el session builder | FASE B.3 GNP-P2-1 | Cada juego stable_dg documenta en su §4 las claves de contrato; test de session builder con resumen real del juego |
| Pantalla "finished" nunca visible en batería (onComplete monta siguiente juego en el mismo batch) | FASE B.1 (SimpleRT) — aplica aquí | Smoke espera la SUPERFICIE siguiente ("Juego 3 de 4"), no el testid `gonogo-finished` |
| Orden de effects hijo-ante-padre: stimulus_shown antes que game_start (GameRuntime) | FASE B.3 (observado en test) | No asertar orden entre ambos; sistémico de todos los GameRuntime |
