# Módulo stable_dg: Búsqueda visual (`visual_search`)

> **Versión del módulo:** `1.0.0` (auditoría FASE B.5, 2026-09-12)
> **Fecha:** 2026-09-12
> **Autor(es):** Hermes (FASE B, KRU-116)
> **Estado:** `implementado` (auditado; chain R-6 completa en este doc)
> **Runtime de inferencia:** `Edge AI (WASM / WebGL) — Zero Cloud`
> **Ruta producto:** `/postulaciones` (batería `stable_dg`, juego visible 4 de 4)
> **Batería:** `stable_dg` (`krumm_postulation_demo_stable_dg_v1`)
> **Plantilla:** `plantilla-modulo-original-game.md` adaptada a stable_dg (este doc
> cierra el P1 sistemático de stable_dg — el 5.º y último de los 5 juegos sin doc;
> ver `docs/qa/prelaunch/2026-09-12-visual-search.md`).

---

## 0. Traza de implementación (rutas reales `src/`)

| Sección doc | Archivo(s) `src/` | Export/Función clave | Tests |
|---|---|---|---|
| 1. Objetivo/flujo | `tasks/VisualSearchTask.jsx` | Componente, `handleResponse`, `completeIfFinished`, `onComplete` | `tasks/visualSearch.test.jsx` |
| 2. Estructura trials | `tasks/VisualSearchTask.jsx` | `buildVisualSearchTrials` (rampa setSize 8→12→16→20, celda objetivo + símbolos aleatorizados, `rng` inyectable) | `tasks/visualSearch.test.jsx` |
| 3. Textos UX | `tasks/VisualSearchTask.jsx` | i18n `t(es, en)` (título, progreso, objetivo en header pill, feedback, tiles aria) | `tasks/visualSearch.test.jsx` (EN copy) |
| 4. Puntuación | `tasks/VisualSearchTask.jsx` | `summarizeVisualSearchResults` (contrato session builder: `completedTrialCount`/`meanReactionTimeMs`/`meanScore`) | `tasks/visualSearch.test.jsx` |
| 5. Visual/Feedback | `tasks/VisualSearchTask.jsx` + `postulation-demo/postulationDemo.css` | rejilla responsive (tile ≥44 px AA), feedback chip con tone (correct/incorrect/timeout), header compacto | `tasks/visualSearch.test.jsx` + `PostulationGamesDesignSystem.test.jsx` + smoke B.5 |
| 7. State machine | `tasks/VisualSearchTask.jsx` | `initialSizeRef` (geometría bloqueada, VSP-P1-2), `handledRef`/`emittedForRef` guards, timeout por trial (VSP-P1-1), ITI jitter tracked (VSP-P2-5) | `tasks/visualSearch.test.jsx` + `tasks/gameRerenderStability.test.jsx` |
| 8. Contratos eventos | `telemetry/gameTelemetry.js` + `tasks/GameRuntime.jsx` | `normalizeGameEvent` (game_event_v1), `game_start` en GameRuntime | `telemetry/gameTelemetry.test.js` |
| 9. Pipeline señales | — (sin pointer sampler) | respuesta discreta: 1 click por trial + localización real del punto (VSP-P2-2) | `tasks/visualSearch.test.jsx` |
| 10. Agregados batería | `telemetry/gameTelemetry.js` | `summarizeGameEvents` → `visualSearch.*` (meanSetSize, searchEfficiency, clickDistance, errorRate) | `telemetry/gameTelemetry.test.js` |
| 11. Feature vector | `telemetry/gameFeatureVector.js` | `assessment_feature_vector_v2` keys `game.visualSearchEfficiency`, `game.visualSearchMeanSetSize` (sin reordenar) | `telemetry/gameFeatureVector.test.js` |
| 12. Contrato salida | `postulation-demo/postulationDemoSessionBuilder.js` | `stripForbidden` (allowlist `ASSESSMENT_FORBIDDEN_KEYS`, incluye `trials`/`items`) | `postulation-demo/postulationDemoSessionBuilder.test.js` |
| 13. Privacidad | `assessment/assessmentSession.js` | `ASSESSMENT_FORBIDDEN_KEYS`, `validateAssessmentSessionPrivacy` (recursivo) | `assessment/assessmentSession.test.js` |
| 14. Configuración | `postulation-demo/postulationDemoConfig.js` + `assessment/batteryConfig.js` | bloque `visible:true`, `skill: visual_search_efficiency`, trialCount 4 (demo) / 12 (eval practice), `durationLabel: '45 s'` (fix VSP-P3-1) | `postulation-demo/postulationDemoConfig.test.js` |
| 15. Render batería | `postulation-demo/PostulationGameStage.jsx` | props `width/height` (viewport clamp), `trialCount`, `onComplete=completeBlock` | `postulation-demo/PostulationGameStage.test.jsx` |

> **Regla:** si una celda queda vacía, el slice NO está listo para cerrar.

---

## 1. Objetivo y flujo de usuario

El candidato ve un **array de formas geométricas** (8, 12, 16 o 20 tiles blancos
con glifos): **un único objetivo ● (punto sólido)** entre distractores
(○, ◇, □, △ — asignación aleatoria por sesión, fix VSP-P2-4). Debe **tocar/clickear
el punto sólido** en cada panel — paradigma de búsqueda visual
(featuro-integrativa: Treisman & Gelade, 1980; Wolfe, 1994). La dificultad escala
por **set size**: 4 panels en batería (8→12→16→20, uno de cada tamaño); en el flujo
eval (`batteryConfig.js`, 12 trials) cada tamaño aparece 3 veces.

### 1.1. Propósito (una frase)

Evidencia observable de **eficiencia de búsqueda visual (visual search
efficiency)**: tiempo de localización del objetivo entre distractores y precisión
bajo carga visual creciente — **no** de velocidad motora pura (warmup `simple_rt`),
ni de precisión visomotora (juego 1), ni de inhibición (juego 2), ni de
interferencia (juego 3).

### 1.2. Constructos objetivo (provisionales, R-6)

| Constructo (provisional) | Fuente de señal | Disponibilidad | Caveat / evidencia |
|---|---|---|---|
| `visual_search_efficiency` (dimensión `visualSearchEfficiency`) | `visualSearch.searchEfficiency` + `game.visualSearchEfficiency`/`game.visualSearchMeanSetSize` (feature v2) + `visualSearch.*` del gameSummary + canal EdgeAI `visualSearchEfficiency` | provisional (score 0–100, **sin baremos**) | matriz XLSX; la señal en batería es **debil**: 1 trial por set size (4 trials) → índice blend (RT+precisión+tamaño), no pendiente por tamaño (§11); el canal EdgeAI en stable_dg es proxy de agregado (sistémico, §11); limitación null-score sistémica en §11 |
| Colaterales | — | `not_measured` | no se derivan constructos adicionales de este juego (la RT media se agrega a la media de batería, no es claim de velocidad pura) |

### 1.3. Alcance IN / OUT (del módulo)

- **IN:** 4 panels (batería demo) / 12 (flujo eval), rampa de set size 8→12→16→20,
  celda objetivo + símbolos distractor aleatorizados por sesión (`rng` inyectable),
  RT por trial, localización real del click, precisión, timeout por trial (10 s,
  fix VSP-P1-1), eventos `game_event_v1`, i18n (ES/EN).
- **OUT:** tutorial guiado (la instrucción en el header pill es fija:
  "Objetivo: punto sólido" — el panel 1 de tamaño 8 funciona como warm-up
  implícito), SFX (no aplica en stable_dg), inferencia biométrica directa,
  score global, comparación entre personas, pendiente de búsqueda visual
  (RT vs set size) en batería de 4 trials (1 muestra por tamaño).

---

## 2. Estructura de trials / fases

| Fase | Trials | Propósito | ¿Evalúa? |
|---|---|---|---|
| Warmup (`simple_rt`, `visible:false`) | 4 | calibrar ritmo motor | NO (no cuenta en "Juego X de N") |
| Precisión (juego 1) | 4 | demanda Fitts | SÍ |
| Go/No-Go (juego 2) | 8 | inhibición | SÍ |
| Stroop (juego 3) | 8 | control de interferencia | SÍ |
| **Búsqueda visual (juego 4)** | **4 (demo) / 12 (eval)** | eficiencia de búsqueda bajo carga creciente | SÍ |
| Práctica G.2 | — | mecánica disponible (`originalGamePractice.js`) pero **sin botón de práctica** para stable_dg en el flujo actual | N/A |

Rampa de dificultad y aleatorización (fix FASE B.5, VSP-P2-4 — `buildVisualSearchTrials`):

- **Set size por panel:** `8 + (trialIndex % 4) * 4` → 8, 12, 16, 20 (rampa
  determinista: es el diseño `set_size` del constructo — el candidato enfrenta
  carga creciente en el orden del panel).
- **Celda objetivo:** `floor(rng() * setSize)` por panel — aleatoria por sesión
  (el código legado era `(5i+3) % setSize`: determinista, y en el flujo eval de
  12 trials el panel 0 era **pixel-igual** al panel 8 — memorización en
  reaplicaciones).
- **Símbolos distractor:** por celda no-objetivo, `floor(rng() * 4)` sobre
  {○, ◇, □, △} — asignación aleatoria por sesión (legado: `(i+trial) % 4`).
- **Panel único por sesión:** en 12 trials (3× cada tamaño) no se repite un
  panel idéntico (test: unicidad de la firma size+targetIndex+símbolos con seed
  fija).
- `rng` inyectable (default `Math.random`) para tests deterministas (Park–Miller
  LCG en `visualSearch.test.jsx`; draws clampados a [0, 0.999999], patrón B.3).
- **StrictMode (dev):** el `useMemo` consume el rng 2× en el doble render — el
  builder es una **función total** (cualquier stream de rng → trials válidos:
  1 objetivo, símbolos permitidos, panel dentro del canvas) → la secuencia
  remaneada sigue siendo válida; no se necesita guard (patrón B.4 §17).

Timing por trial: ventana de búsqueda **10 000 ms** (timeout → `timeout`,
correct:false — fix VSP-P1-1: el código legado no tenía timeout → trial
irresoluble/batería trabada) + ITI con **jitter [0.75, 1.25] × 350 ms**
(tracked, fix VSP-P2-5).

Duración total honesta: 4 × (RT ~1–3 s + ITI ~0.3 s) ≈ 6–14 s típicos; peor
caso (4 timeouts) 4 × 10.4 s ≈ 42 s → `durationLabel: '45 s'` (fix VSP-P3-1;
antes "1 min").

> **Nota de señal (honestidad R-6):** con 4 trials hay **1 muestra por set size**
> → la pendiente clásica de búsqueda visual (RT vs tamaño) es incalculable en la
> batería demo; el resumen usa un índice blend (§4). El flujo eval de 12 trials
> (3 por tamaño) sí soporta pendiente por tamaño — documentado como siguiente
> paso de validación, no como capacidad actual del producto.

---

## 3. Textos e instrucciones (UX Copy / script de pantalla)

| Pantalla / Momento | Texto ES | Texto EN | Notas |
|---|---|---|---|
| Título (header) | `🔎 Búsqueda visual` | `Visual search` | emoji en título (P3 real-device, §14) |
| Progreso | `Panel {n} de {total}` | `Panel {n} of {total}` | |
| Objetivo (header pill) | `Objetivo: punto sólido` | `Target: solid dot` | instrucción fija; **reemplaza al brief standalone** ("Panel de búsqueda activa") retirado en FASE B.5 por fit en stage (patrón B.4 CIP-P2-4) |
| Tiles (aria) | `Objetivo: punto sólido` / `Distractor: forma geométrica` | `Target: solid dot` / `Distractor: geometric shape` | **caveat §11.3:** el aria del objetivo revela su identidad a lectores de pantalla (demanda distinta del constructo para usuarios SR — decisionado, no fix) |
| Feedback acierto | `✓` + `{rt}ms` | `✓` + `{rt}ms` | chip `.visual-search-task__feedback--correct` (verde 5.48:1 AA) |
| Feedback error | `✗` + `{rt}ms` | `✗` + `{rt}ms` | chip `--incorrect` (rojo 6.47:1 AA) |
| Feedback timeout | `✗` + `Tiempo agotado` | `✗` + `Time out` | chip `--timeout` (ámbar 5.02:1 AA) |
| Pantalla final | `Búsqueda visual completada` · `Precisión: {pct}%` · `Eficiencia: {value}` | `Visual search complete` · `Accuracy: {pct}%` · `Efficiency: {value}` | en batería no se renderiza (onComplete monta la siguiente superficie en el mismo batch; standalone/práctica sí) |
| Captura (config) | `Búsqueda visual` · `Encuentra un objetivo entre distractores con foco y eficiencia.` | `Visual search` · `Find a target among distractors with focus and efficiency.` | `postulationDemoConfig.js` |

> **Retirado (FASE B.5):** el bloque `panel-brief` ("Panel de búsqueda activa" +
> "Objetivo: punto sólido") y la caption descriptiva ("Mide eficiencia de
> búsqueda, distracción y precisión bajo carga visual.") — la instrucción vive en
> el header pill y la descripción del bloque ya se muestra en la pantalla de
> setup. Regresión testeada ES+EN (`queryByText(...)` = null).

---

## 4. Puntuación (modelo de búsqueda visual por set size)

| Magnitud | Fórmula / valor | Notas |
|---|---|---|
| `correct` / `distractor_click` / `timeout` | click en el tile objetivo / en distractor / sin click a los 10 000 ms | `reactionTimeMs = now − startTimeRef` (clock único `performance.now()`, pitfall 23 ✓; nota §7: `startTimeRef` se fija en el effect post-paint → sesgo de montaje ~1 frame, sub-segundo y constante) |
| `score` (0–1 por trial) | `correct ? 1 : 0` | timeout = 0 |
| `pointer` (solo en `response`) | coords reales del click relativas al canvas (evento con `detail > 0`); teclado (`detail === 0`) → centro del tile | fix VSP-P2-2 (legado: siempre el centro de la celda — localización degenerada); timeout → ausente |
| `clickDistanceToTargetPx` | distancia euclídea real `pointer → centro del objetivo` (null en timeout) | fix VSP-P2-2 (legado: distancia celda-celda) |
| `searchEfficiency` (por trial) | `(correct ? 1 : 0) / (RT/1000) / (setSize/8)` | índice ad-hoc provisional (0 si RT=0); penaliza tamaño y RT, bonifica acierto |
| `accuracy` | correctos / total | timeouts cuentan como error |
| `meanReactionTimeMs` | media de RT de **aciertos** (canónico; timeouts excluidos) | **clave de contrato del session builder** (fix VSP-P2-1) |
| `meanScore` | media de score por trial (= accuracy) | **clave de contrato** (sin ella la card del reporte no mostraba "Puntaje" — fix VSP-P2-1) |
| `completedTrialCount` | trials completados (= total: todo trial termina por click o timeout) | **clave de contrato** (fix VSP-P2-1) |
| `timeoutCount` | trials terminados por timeout | evidencia de carga/dificultad |
| `searchEfficiency` (summary) | `(correct/total) / (meanRT_all/1000) / (meanSetSize/8)` | índice blend **no validado** (1 muestra por tamaño en batería — §2/§11); 0 si sin RT |

Resumen final (`summarizeVisualSearchResults` → `onComplete(summary)`):
`{ gameId, trialCount, totalTrials, completedTrialCount, meanReactionTimeMs,
meanScore, accuracy, errorRate, timeoutCount, meanRT, meanSetSize,
meanDistractorCount, meanClickDistanceToTargetPx, searchEfficiency,
trials (in-memory, **se elimina en el payload** — §12) }`.

No hay economía de puntos ni meta global: es una tarea de localización con score
por trial (como go/no-go y stroop).

---

## 5. Elementos visuales y feedback (UI/UX)

- **Rejilla:** `buildVisualSearchGridMetrics` — `cols = ceil(sqrt(size × w/h))`,
  `rows = ceil(size/cols)`, tiles centrados en celda. **Tamaño calculado con el
  canvas REAL** (fix VSP-P2-3: el legado usaba `safeWidth = max(260, w)` mientras
  el task-area se renderizaba con `w=240` → columna derecha **cortada** por
  `overflow:hidden` en setSize 20).
- **Tile:** blanco `#ffffff`, glifo `#334155` (**10.35:1** sobre blanco — AAA),
  borde `rgba(49,46,129,0.42)`; objetivo y distractores comparten contenedor
  (test: sin revelación por color/preselección). `tileSize = clamp(floor(0.47 ×
  min(celW, celH)), 44, 64)` — **piso 44 px = AA touch targets** (fix VSP-P2-3;
  antes 42). `min-width/min-height: 44px` redundante en CSS.
- **Fit verificado (test + smoke, 2 viewports):** en los 3 tamaños de stage del
  producto (240×280 piso, 312×340 móvil 390×844, 520×290 desktop 1280×720) y los
  4 set sizes, **todo tile está completo dentro del canvas** (márgenes derecho/
  inferior: 2 px en el caso más justo, 240×280 setSize 20) y el gap mínimo entre
  tiles es 4 px (sin solapamiento — note (b) de la card).
- **Feedback:** chip centrado (`transform: translate(-50%,-50%)`) con tone
  semántico — **fix FASE B.5**: antes usaba la clase `.trial-feedback` que solo
  estaba estilizada bajo `.simple-rt-task` (tema oscuro de App) → en batería
  renderizaba **sin centrado ni estilo**. Contrastes medidos (sobre blanco):
  correct `#047857` **5.48:1**, incorrect `#b91c1c` **6.47:1**, timeout
  `#b45309` **5.02:1**, RT-display `--k-ink-medium` `#6f503a` **7.70:1** —
  todos AA ≥4.5:1.
- **Header compacto:** 3 pills (título / progreso / objetivo) en 1 fila en
  desktop (520 px) y 2 filas en móvil (312 px, stage de altura auto → sin scroll
  interno). `margin-bottom: 8px` (antes el brief+caption sumaban ~80 px → el
  juego no cabía en el stage 290/340 px desktop — mismo fix de fit que B.4
  CIP-P2-4).
- **Animaciones:** sin `@keyframes` propios en el juego → `prefers-reduced-motion`
  sin impacto adicional (el feedback es estático durante el ITI).
- **Responsive checklist (FASE B.5):**
  - [x] 0 overflow horizontal en 390×844 y 1280×720 (smoke Playwright)
  - [x] task-area por viewport: 520×290 (desktop-compact) / 312×340 (móvil)
        (`getPostulationGameViewport`)
  - [x] **sin scroll interno del stage** (asert smoke `scrollHeight ≤ clientHeight+1` por panel)
  - [x] tiles completos dentro del canvas + ≥44 px (asert smoke por panel, 4 panels × 2 viewports)
  - [x] teclado: 8–20 `<button>` focusables → Tab/Enter juega la tarea completa
        (fallback de localización al centro del tile, `detail === 0`)

---

## 6. Referencias diseño

- `docs/design/krumm-postulation-pdd.md`, `krumm-postulation-sdd.md`.
- `AGENTS.md` — privacidad/gobernanza y contrato científico R-6.
- `docs/qa/prelaunch/2026-09-12-visual-search.md` — auditoría 8 dims + hallazgos.
- `docs/design/design-system.md` + tokens `--k-*` (colores de marca/semánticos).
- Treisman, A. M., & Gelade, G. (1980). *A feature-integration theory of
  attention.* Cognitive Psychology, 12(1), 97–136. (paradigma de búsqueda
  visual; referencia del constructo, no validación normativa —
  `descriptive_only`, sin baremos)
- Wolfe, K. L. (1994). *Guided Search 2.0: An updated model of visual search.*
  Human Factors, 36(1), 185–254.
- `src/tasks/VisualSearchTask.jsx` — componente y UX copy.

---

## 7. Máquina de estados del juego (state machine)

```
trial N (stimulus_shown, ventana 10 000 ms)
   ├─ click objetivo ────→ response(target_found) ──┐
   ├─ click distractor ──→ response(distractor_click)┤
   └─ timeout (10 000 ms)→ response(timeout) ────────┤
                                                      ↓
                     (N < total) ITI jitter [0.75,1.25]×350 ms → trial N+1
                     (N = total) game_end + onComplete (inmediato, patrón B.3)
```

| Entrada | Guard | Notas |
|---|---|---|
| click en tile | `handledRef` (1 finalización por trial) | double-tap = no-op tras el primer click (fix VSP-P3-5; patrón B.3/B.4) |
| timeout | `trialTimeoutMs` (10 000 ms, prop inyectable) | bound del trial: **todo trial termina** (fix VSP-P1-1; antes el trial sin click permanecía abierto → batería trabada) |
| ITI | `itiRef` + cleanup en unmount/cambio de trial | jitter aleatorio (fix VSP-P2-5); el setTimeout legado sin ref era VSP-P2-5 (onComplete tardío tras abort) |
| StrictMode (dev) | `emittedForRef` por índice de trial | evita `stimulus_shown` duplicado del trial 0 (fix VSP-P3-4; patrón CIP-P3-4) |
| resize/visualViewport | `initialSizeRef` (geometría bloqueada al montar) | la re-medición del stage NO reconstruye trials ni re-emite estímulo (fix VSP-P1-2; patrón B.2 `initialSizeRef`) |

- **Sin estado irresoluble:** todo trial termina por click o timeout (10 000 ms
  bound, fix VSP-P1-1). Foco perdido → el timeout corre igual (el trial termina;
  se registra como error — mismo tratamiento que en CI/GoNoGo).
- **Clock único** `performance.now()` (pitfall 23 ✓): `startTimeRef`,
  timestamps de eventos y RT en el mismo clock. Nota sistémica: `startTimeRef`
  se fija en el effect (post-paint) → sesgo de montaje de 1 frame (~16 ms) en la
  RT; sub-segundo y constante, documentado (mismo que CI §7).
- **Orden de finalización = orden de resultados** (secuencial, 1 panel a la vez)
  → la agregación es directa (regla skill #12 ✓).
- **Geometría bloqueada (fix VSP-P1-2, rollup B.2→B.5):** `trials =
  useMemo([initialSize, trialCount])` y el task-area usa `initialSize` — el
  canvas conserva su tamaño inicial; si el contenedor se encoge, el clip
  residual no deja el trial irresoluble (el timeout cubre el bound máximo; el
  objetivo siempre existe en el canvas).

---

## 8. Contrato de ingesta (geometría de trial)

```js
// buildVisualSearchTrials → por panel (celda objetivo + símbolos aleatorizados):
{
  trialId: 'visual-search-<i>', targetId: 'vs-<i>-<celda>', trialIndex: i,
  setSize: 8 | 12 | 16 | 20,          // rampa determinista (diseño set_size)
  targetIndex: 0..setSize-1,          // aleatoria por sesión (rng)
  distractorCount: setSize - 1,
  target: { id, x, y, isTarget: true, symbol: '●', tileSize, ... },
  items: [ { id, x, y, isTarget, symbol: '●'|'○'|'◇'|'□'|'△', color, containerTone, preSelectionHighlight, tileSize } ],
  grid: { cols, rows, tileSize, compact },
}
```

Tamaño del área: props `width/height` del stage (`getPostulationGameViewport`,
clamp 240..620 × 280..340 compact; 720×460 no-compact), **bloqueadas al montar**
(`initialSizeRef`, fix VSP-P1-2) y usadas para la rejilla y el task-area.

---

## 9. Pipeline de señales (respuesta discreta, privado por diseño)

- **Sin pointer sampler** (note (f) de la card): visual_search no captura
  `pointermove` (la respuesta es un click discreto en un tile, no una
  trayectoria) → el patrón SRT-P3-2 (cache de `getBoundingClientRect` por
  pointermove) es **N/A** para este juego, y las kinemáticas de touch
  degeneradas (fix B.2) no aplican. 1 `getBoundingClientRect()` por respuesta
  (para la localización del click), no por frame.
- **Localización real del click (fix VSP-P2-2, note (c)):** `pointer =
  {x: clientX − rect.left, y: clientY − rect.top}` (solo si `event.detail > 0`
  y coords finias) → `clickDistanceToTargetPx` = distancia euclídea real
  click→objetivo. Teclado (`detail === 0`) → fallback al centro del tile (no se
  penaliza la localización por no-uso de puntero). El legado emitía siempre el
  centro de la celda (distancia celda-celda, señal de localización inexistente).
- **Muestra por panel:** 1 evento `response` (outcome + RT + bloque
  `visualSearch` + 1 punto `pointer`) — no hay muestras crudas.
- **Cámaras/biometría:** contexto/calidad únicamente (no se consume para este
  módulo); la correlación game↔facial agrega por trial vía `gameCorrelation`
  (ventanas reaction/pre/post) sin persistir samples.

---

## 10. Contratos de evento (game_event_v1)

Emitidos vía `GameRuntime` → `normalizeGameEvent` (contrato `game_event_v1`,
`privacy.rawPointer: false` por evento):

| Evento | Emisión | Campos |
|---|---|---|
| `game_start` | `GameRuntime` al activar (1× por montaje) | `gameId`, `timestamp`, `gameState{level:1, difficulty:'visual_search'}` |
| `stimulus_shown` | por panel (guard StrictMode) | `trialId`, `targetId`, `stimulus{kind:'visual_search_array', payload{setSize, targetIndex, distractorCount, targetSymbol}}`, `gameState{score acumulado, level, difficulty:'visual_search'}` |
| `response` | por panel (click o timeout) | `response{correct, outcome: target_found\|distractor_click\|timeout, reactionTimeMs, score, timedOut, visualSearch{setSize, distractorCount, clickDistanceToTargetPx (null en timeout), searchEfficiency, timedOut}}` + `pointer{x,y}` (ausente en timeout/teclado-fallback=centro) + `gameState` |
| `game_end` | panel final, **inmediato** antes de `onComplete` (patrón B.3) | `gameState{score 0-100, level: totalPanels, difficulty:'visual_search'}` — **verificado FASE B.5** (note (d): ya se emitía en el código legado; se mantuvo y se normalizó escala 0-1→0-100 (VSP-P3-2) + difficulty (VSP-P3-3)) |

Agregado batería: `summarizeGameEvents` → `visualSearch{meanSetSize,
meanDistractorCount, searchEfficiency, meanClickDistanceToTargetPx, errorRate}`
(allowlist preexistente en `gameTelemetry.js` — sin cambios en FASE B.5) +
`performance` + `privacy{aggregateOnly:true}`.

**Nota de orden (sistémico):** el effect del hijo (stimulus_shown) corre antes
que el del padre (game_start en GameRuntime) — aplica a todos los juegos
GameRuntime; no se asume orden entre ambos en los tests (comentario en
`visualSearch.test.jsx`; B.3).

---

## 11. Métricas conductuales derivadas (provisionales, descriptive_only)

| Métrica (fuente) | Definición | Constructo provisional | Caveat |
|---|---|---|---|
| `game.visualSearchEfficiency` (feature v2) | `visualSearch.searchEfficiency` del gameSummary (media de batería) | `visual_search_efficiency` | índice blend ad-hoc (RT+precisión+tamaño); 1 muestra por tamaño en batería de 4 → **no** es pendiente de búsqueda; sin baremos |
| `game.visualSearchMeanSetSize` (feature v2) | `visualSearch.meanSetSize` | contexto de carga | descriptivo |
| `visualSearch.meanClickDistanceToTargetPx` (gameSummary) | distancia media real click→objetivo (aciertos ≈ 0; errores = distancia de celda) | precisión de localización | timeouts excluidos (null); teclado → 0 (fallback centro) |
| `accuracy`, `timeoutCount`, `meanScore` (block summary) | acierto global, timeouts, score medio | evidencia general | keys de contrato del session builder (fix VSP-P2-1) |
| `meanReactionTimeMs` (block summary) | RT media de **aciertos** | evidencia de velocidad de búsqueda | timeouts excluidos (canónico) |

**Nota de dimensión (`visualSearchEfficiency` en `talentProfile.js`):**
`rawScore = mean(visualEfficiency, 1 − errorRate, canalEdgeAI('visualSearchEfficiency'))`.
Tres limitaciones documentadas:

1. **Canal EdgeAI = proxy de agregado** (en stable_dg el session builder fija
   `visualSearchEfficiency: taskPerformance` global — evidencia no específica
   del juego) → mezcla la señal real con un componente no discriminatorio;
   corrección (canal por juego) en el mapeo R-6 validado post-FASE B
   (sistémico, patrón GNP-P3-7).
2. **Sin camino de score nulo por dimensión:** una sesión sin datos de
   visual_search (interrupción antes del juego 4) → `searchEfficiency 0` +
   `1 − errorRate(0) = 1` → la dimensión se leería **alta** en lugar de
   desconocida. Afecta a todas las dimensiones de stable_dg; fix post-B
   (null-safe por fuente de señal — sistémico, patrón GNP-P3-8).
3. **Caveat de a11y (decisionado, VSP-P3):** el `aria-label` del tile objetivo
   ("Objetivo: punto sólido") revela su identidad a usuarios de lector de
   pantalla → su RT no ejercita el constructo (resuelven por label, no por
   búsqueda). Mitigación: documentar en revisión humana; no se retira el aria
   (accesibilidad > validez para ese subgrupo; el score se presenta
   `descriptive_only` con confidence).

**Regla de nulos (R-6):** constructo sin evidencia → `score: null` en el
framework original. En `stable_dg` la dimensión siempre tiene score provisional
(juego obligatorio y visible); el reporte lo presenta como **score provisional
sin baremos** + confidence + caveats (`descriptive_only`), nunca como
diagnóstico ni comparación entre personas. Señal ausente = desconocida, nunca
desempeño bajo (limitación 2 es el residual documentado).

---

## 12. Contrato de salida (allowlist-only)

### 12.1. Block summary (`onComplete` → `completedDemo.blocks[].summary`)

```js
{ gameId: 'visual_search', trialCount, totalTrials, completedTrialCount,
  meanReactionTimeMs, meanScore, accuracy, errorRate, timeoutCount, meanRT,
  meanSetSize, meanDistractorCount, meanClickDistanceToTargetPx,
  searchEfficiency, trials: [...por panel (agregados, in-memory)] }
```

### 12.2. Estructura final (payload)

`normalizeCompletedBlocks` aplica **`stripForbidden`** (recursivo,
`ASSESSMENT_FORBIDDEN_KEYS` — incluye `trials`, `items`) → el `result` del
bloque que llega a sesión/payload es **solo** los agregados.
`sanitizeGameResults` (clone) + `validateFinalAssessmentPayload` (recursivo,
forbidden keys) re-verifican. **Verificado FASE B.5:** suite focal incluye
`postulationDemoSessionBuilder` (7/7) y `finalAssessmentPayload` (2/2).

### 12.3. Feature vector

`assessment_feature_vector_v2` (v0.2.0, `gameFeatureVector.js`) — keys de este
juego: `game.visualSearchEfficiency`, `game.visualSearchMeanSetSize` (+
`game.*`/`performance` agregados de batería). **Sin reordenar `featureOrder`**
(AGENTS: sin cambios incompatibles). `featureArray` finito;
`privacy.payloadContainsAggregatesOnly: true`.

### 12.4. Campos PROHIBIDOS (privacy guard)

- `assessment/assessmentSession.js` → `ASSESSMENT_FORBIDDEN_KEYS` (incl.
  `trials`, `items`, `pointerSamples`, `rawPointerPath`, `rawGameEvents`, …).
- Los eventos de respuesta llevan **1** outcome + RT + bloque `visualSearch` +
  **1** punto `pointer` por panel (fix VSP-P2-2: punto real del click, no
  trayectoria; contrato `game_event_v1` permite `pointer` sanitizado por
  respuesta — `sanitizePointer` en `gameTelemetry.js`). Sin muestras, sin DOM
  events, sin secuencias.

---

## 13. Privacidad y gobernanza (no negociables — verificado FASE B.5)

- [x] Sin video/frames/landmarks/keypoints/rutas/pointer samples crudos en payload.
- [x] Cámara/biometría = contexto/calidad, no inferencia de este módulo.
- [x] Agregados allowlist-only; `game_event_v1` + `stimulus_shown`/`response`/`game_end` intactos.
- [x] Señal por sesión garantizada (rampa 4 tamaños + aleatorización VSP-P2-4);
      timeouts acotados (VSP-P1-1) → sin panel "eterno".
- [x] `trials` del summary eliminado por `stripForbidden` antes del payload.
- [x] `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe` en payload.
- [x] `descriptive_only`: sin percentiles/cortes/ranking/apto-no-apto; score 0–100
      provisional explícitamente **sin baremos**.
- [x] Chain R-6 completa: constructo (visual_search_efficiency) → demanda
      (localización de ● entre 7–19 distractores, rampa de set size, timeout
      10 s) → conducta (RT de aciertos, errores, timeouts, distancia de
      localización) → telemetría agregada (`visualSearch.*`) → feature
      versionada (v2) → regla provisional (dimensión `visualSearchEfficiency`)
      → disponibilidad/confianza/caveats → narrativa de revisión humana.

---

## 14. Riesgos y mitigaciones

| Riesgo | Sev | Mitigación / decisión |
|---|---|---|
| Sin timeout por trial → panel sin click permanecía abierto para siempre (batería no completatable; el resto de la familia tiene bound: SimpleRT 3000, GoNoGo 900, CI 3200 ms) | **P1 (cerrado B.5)** | fix VSP-P1-1: `trialTimeoutMs` (10 000 ms, prop inyectable) → `response(outcome:'timeout', timedOut:true)` + feedback "Tiempo agotado" + avance; test unitario + E2E en smoke (panel 1 desktop sin click) |
| Geometría dependiente de viewport mid-trial: `useMemo([width, height])` + effect dependiente de la identidad del trial → resize/visualViewport re-mede el stage y **resetea el panel en curso** (estímulo huérfano + RT reiniciada — rollup B.2→B.5, línea 138 del legado) | **P1 (cerrado B.5)** | fix VSP-P1-2: `initialSizeRef` (patrón B.2) — trials y task-area usan el tamaño bloqueado; test (re-render con width/height nuevos: sin re-emisión, canvas intacto) + inamovible en smoke |
| Sin doc módulo R-6 (P1 sistemático de los 5 stable_dg) | **P1 (cerrado B.5)** | Este doc (5.º y último de stable_dg — gap sistemático cerrado) |
| Summary sin claves de contrato del session builder (`completedTrialCount`, `meanReactionTimeMs`, `meanScore`) → RT/Puntaje de visual_search ausentes de la media de batería y de la card del reporte (mismo bug GNP-P2-1/CIP-P2-1) | P2 (cerrado B.5) | fix VSP-P2-1 (+ test de contrato + asert de "Puntaje" en card VS del smoke en vivo) |
| Localización degenerada: `pointer` = centro de la celda (no el click real) + `clickDistanceToTargetPx` = distancia celda-celda + `event` sin usar (note (c): "RT por trial + localización correcta en telemetría") | P2 (cerrado B.5) | fix VSP-P2-2: coords reales del evento relativas al canvas (guard `detail > 0` + finitud), fallback teclado al centro del tile, distancia euclídea real; tests (mouse + teclado) |
| Canvas móvil cortado: rejilla con `safeWidth = max(260, w)` vs task-area renderizado a `w=240` → tiles de la columna derecha **fuera del canvas** (setSize 20: borde 255 px > 240) y recortados por `overflow:hidden`; tile 42 px < 44 AA | P2 (cerrado B.5) | fix VSP-P2-3: rejilla con el tamaño real renderizado + piso de tile 44 px (+ CSS `min-width/min-height: 44px`); test de fit en 240×280/312×340/520×290 × 4 tamaños + asert de tiles-en-canvas por panel en smoke 2 viewports |
| Arrays deterministas por sesión (`(5i+3)%size`; símbolo `(i+trial)%4`) → mismos panels para todos los candidatos; en el flujo eval de 12 trials el panel 0 ≡ panel 8 (memorización en reaplicaciones) | P2 (cerrado B.5) | fix VSP-P2-4: celda objetivo + símbolos aleatorizados con `rng` inyectable (rampa setSize conservada — diseño); tests (reproducibilidad por seed, sensibilidad, unicidad 12 trials) + E2E en smoke (no-todo-legacy en 8 panels de 2 corridas) |
| ITI `setTimeout` sin ref/cleanup (onComplete tardío tras abort/unmount) + ritmo fijo telegrafiado | P2 (cerrado B.5) | fix VSP-P2-5: `itiRef` + cleanup en unmount/cambio de trial + jitter [0.75, 1.25] × 350 ms (test de límites 262.5/437.5) |
| Feedback sin estilo en batería (clase `.trial-feedback` solo bajo `.simple-rt-task` tema oscuro) → renderizaba sin centrado | P2 (cerrado B.5) | chip `.visual-search-task__feedback` con tone semántico + centrado + `pointer-events:none` (contrastes AA medidos §5) + asert en tests |
| `durationLabel: '1 min'` vs 6–42 s reales (4 panels) | P3 (cerrado B.5) | `'45 s'` en `postulationDemoConfig.js` (+ test) |
| `game_end.gameState.score` en escala 0–1 (resto de la batería: 0–100) | P3 (cerrado B.5) | `Math.round(accuracy * 100)` (+ test) |
| `difficulty` inconsistente (`'set_size'` en game_start / número `setSize` por evento) | P3 (cerrado B.5) | unificada a `'visual_search'` en `gameState` (fix VSP-P3-3); el setSize vive en el payload estímulo/respuesta (`visualSearch.setSize`) |
| StrictMode (dev): `stimulus_shown` duplicado del panel 0 | P3 (cerrado B.5) | guard `emittedForRef` por índice + test (1 evento, no 2) |
| Sin `handledRef` (doble-tap ultra-rápido → 2 responses + trial duplicado en summary) | P3 (cerrado B.5) | `handledRef` por panel (patrón B.3/B.4) + test de doble-click |
| Brief standalone + caption (~80 px) → el juego no cabía sin scroll interno en el stage 290/340 px desktop | P2 (cerrado B.5, layout) | instrucción → header pill; brief/caption retirados (regresión ES+EN testeada); fit verificado por panel en smoke |
| 1 trial por set size en batería de 4 → índice blend, no pendiente de búsqueda (limitación de señal) | P3 (decisionado) | documentado §2/§11 (honestidad R-6); el flujo eval de 12 trials (3 por tamaño) soporta pendiente — siguiente paso de validación, no cambio de presupuesto de batería (decisión de producto) |
| `aria-label` del objetivo revela su identidad a lectores de pantalla (demanda distinta del constructo) | P3 (decisionado) | caveat §11.3 (revisión humana); accesibilidad > validez para ese subgrupo |
| Emojis/glifos unicode (🔎 ●○◇□△ ✓✗) en juego | P3 (abierto, sistemático) | Headless: OK (screenshots de smoke B.5 + vision); real-device pendiente (patrón `t_25009e33`); si tofu → SVG inline |
| role `calibration`/`scored` no expuesto en `sanitizeGameResults` (SRT-P2-3) | P3 (abierto, sistemático) | Este juego es `visible:true` (scored) → impacto bajo; fix coordinado con B.1/epic (patrón CIP-P3-9/GNP-P3-10) |
| `talentProfile` sin camino null-score por dimensión: sesión interrumpida → dimensión "alta" sin evidencia | P3 (abierto, sistemático) | Mismo GNP-P3-8 (B.3)/CIP-P3-11 (B.4); afecta a todo stable_dg; fix post-B (null-safe por fuente de señal) — §11.2 |
| Canal EdgeAI `visualSearchEfficiency` = proxy de agregado (taskPerformance global) | P3 (abierto, sistemático) | Mismo patrón GNP-P3-7; fix en mapeo R-6 post-B — §11.1 |

---

## 15. Criterios de aceptación (gates) — resultado FASE B.5

```bash
NODE_ENV=test npx vitest run <focales> --pool=threads --reporter=default   # ver reporte QA
npx oxlint <archivos tocados>                                              # 0
npm run build                                                              # OK
```

- [x] Tests RED→GREEN del fix P1 (timeout por trial, geometría bloqueada) +
      P2 (contrato summary, localización real, fit canvas 240 px + tile 44,
      aleatorización rng, ITI tracked + jitter, feedback estilizado) + P3
      (durationLabel, score 0-100, difficulty, StrictMode, handledRef):
      `visualSearch.test.jsx` (19 tests), `postulationDemoConfig.test.js`
      (+1 test), `PostulationGamesDesignSystem.test.jsx` (CSS re-apuntado).
- [x] Browser smoke 2 viewports (1280×720 mouse + 390×844 touch) —
      `scripts/smoke-b5-visual-search-2026-09-12.mjs`: 0 failures, 0 console
      errors, 0 requestfailed, 0 overflow; visual search jugado completo
      4/4 panels por viewport; **E2E del fix VSP-P1-1 (timeout real del
      panel 1 desktop: "Tiempo agotado" + avance)**; **E2E del fix VSP-P2-4
      (no-todo-legacy en 8 panels)**; tiles completos en canvas + ≥44 px por
      panel; fit del stage (sin scroll interno) por panel en desktop; card VS
      en reporte en vivo con Puntaje; fixture report OK en ambos viewports.
- [x] Payload sin raw fields prohibidos (`trials` eliminado; validación
      recursiva OK).
- [x] `game_end` emitido (note (d) verificado) con score 0–100 + difficulty
      unificada.

**Test de componente (lección Tangram) — presente:** interacción núcleo por
tile (acierto/timeout), transición de panel (ITI real con fake timers), límites
del jitter, aleatorización (propiedades + rng inyectable + reproducibilidad +
unicidad 12 trials), geometría bloqueada (re-render con size nuevo),
StrictMode (sin duplicado), unmount-during-ITI (sin completar tardío),
double-click (1 score), localización (mouse + teclado), privacidad del payload
emitido, EN copy, contrato de keys del summary.

---

## 16. Trazabilidad de auditoría (FASE B.5)

| Hallazgo | Sev | Estado | Evidencia |
|---|---|---|---|
| VSP-P1-1 sin timeout por trial (panel irresoluble; batería no completatable) | P1 | **cerrado** (fix + test + E2E smoke) | §2, §7, §15 |
| VSP-P1-2 geometría mid-trial (reset de panel + estímulo huérfano en resize) | P1 | **cerrado** (fix `initialSizeRef` + test) | §7, §15 |
| VSP-P1-3 sin doc módulo R-6 (sistemático stable_dg — 5.º/5.º) | P1 | **cerrado** (este doc) | §0–§15 |
| VSP-P2-1 summary sin contrato de session builder (RT/Puntaje ausentes en batería/reporte) | P2 | **cerrado** (fix + test + asert card VS) | §4, §12 |
| VSP-P2-2 localización degenerada (pointer = celda; event sin usar) | P2 | **cerrado** (fix + tests mouse/teclado) | §9, §10 |
| VSP-P2-3 canvas móvil cortado (safeWidth 260 vs 240) + tile 42 < 44 AA | P2 | **cerrado** (fix + test fit + smoke tiles-en-canvas) | §5, §15 |
| VSP-P2-4 arrays deterministas (memorización en reaplicaciones; panel 0 ≡ 8 en eval) | P2 | **cerrado** (fix rng + tests + E2E no-legacy) | §2, §15 |
| VSP-P2-5 ITI sin ref/cleanup + ritmo fijo | P2 | **cerrado** (fix + test jitter/unmount) | §7, §15 |
| VSP-P3-1..5 (durationLabel, score 0-100, difficulty, StrictMode, handledRef) | P3 | cerrados (fix + tests) | §3, §10, §14 |
| VSP-P3-6..9 (unicode real-device, role flag, null-score, 1-trial-por-tamaño, aria SR) | P3 | abiertos sistemáticos / decisionados (documentados) | §11.3, §14 |

---

## 17. Pitfalls (incidentes reales — revisar antes de cerrar cambios)

| Pitfall | Incidente | Prevención |
|---|---|---|
| Guard de piso en la geometría (`Math.max(260, w)`) que difiere del tamaño **renderizado** (task-area a `w=240`) → tiles fuera del canvas, recortados por `overflow:hidden` | FASE B.5 VSP-P2-3 (este doc) | la rejilla debe calcularse con el tamaño que se pinta; test de fit en el piso del stage (240×280) × todos los set sizes; smoke aserta tiles-completos-en-canvas por panel |
| `pointer` = centro de la celda y `event` sin usar → la métrica `clickDistanceToTargetPx` se llamaba "localización" pero medía distancia celda-celda (0 en acierto, siempre) | FASE B.5 VSP-P2-2 (note (c) de la card) | coords reales del evento relativas al canvas con guard de `detail` (teclado = fallback centro); test con `clientX/clientY/detail:1` vs click sin coords |
| Trial sin timeout → panel eternamente abierto si el candidato no clickea (o pierde el foco) → batería no completatable | FASE B.5 VSP-P1-1 | bound por trial (10 s) + `outcome:'timeout'` + feedback; todo juego de la familia tiene timeout (SimpleRT/GoNoGo/CI) |
| `useMemo([width, height, count])` con props que el stage re-mide a mitad de sesión (resize/visualViewport, muy común en móvil) → reconstrucción de trials + re-emisión de `stimulus_shown` + reset de RT | FASE B.5 VSP-P1-2 (rollup B.2→B.5) | `initialSizeRef` (geometría bloqueada al montar, patrón B.2); test de re-render con size nuevo |
| Secuencia determinista por índice de trial → mismos estímulos para todos los candidatos y panels idénticos en flujos largos (eval 12: 0 ≡ 8) | FASE B.5 VSP-P2-4 (patrón B.3 GNP-P1-1 / B.4 CIP-P1-1) | `rng` inyectable + test de propiedades (reproducibilidad por seed, sensibilidad, unicidad en 12 trials); smoke aserta no-todo-legacy en vivo |
| `setTimeout` de ITI sin ref → completado tardío tras unmount/abort | FASE B.5 VSP-P2-5 (patrón CIP-P2-3) | `itiRef` + cleanup en unmount/cambio de trial + test de unmount-during-ITI |
| Clase de feedback definida solo bajo un scope de tema (`.simple-rt-task` oscuro) → sin estilo en el contexto de batería | FASE B.5 (feedback VS sin centrado en `/postulaciones`) | las clases de juego se definen en el CSS de su contexto (postulationDemo.css); test aserta el chip + smoke lo ve |
| Pantalla "finished" nunca visible en batería (onComplete monta la siguiente superficie en el mismo batch) | FASE B.1 — aplica aquí (VS es el último juego → reporte) | Smoke espera la SUPERFICIE SIGUIENTE (`[data-demo-phase="report-preview"]`), no el testid `visual-search-finished` |
| Orden de effects hijo-ante-padre: stimulus_shown antes que game_start (GameRuntime) | FASE B.3 — sistémico | No asertar orden entre ambos en tests |
| StrictMode (dev): `useMemo` del builder consume el rng 2× (doble render) | FASE B.4 (analizado) — aplica aquí | El builder es una **función total** (cualquier stream de rng → panels válidos) → no se necesita guard (test de propiedades lo cubre) |
