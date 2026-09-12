# Módulo stable_dg: Interferencia color-palabra (`color_interference`)

> **Versión del módulo:** `1.0.0` (auditoría FASE B.4, 2026-09-12)
> **Fecha:** 2026-09-12
> **Autor(es):** Hermes (FASE B, KRU-116)
> **Estado:** `implementado` (auditado; chain R-6 completa en este doc)
> **Runtime de inferencia:** `Edge AI (WASM / WebGL) — Zero Cloud`
> **Ruta producto:** `/postulaciones` (batería `stable_dg`, juego visible 3 de 4)
> **Batería:** `stable_dg` (`krumm_postulation_demo_stable_dg_v1`)
> **Plantilla:** `plantilla-modulo-original-game.md` adaptada a stable_dg (los juegos
> original tienen doc propia; este cierra el gap P1 sistemático de stable_dg — ver
> `docs/qa/prelaunch/2026-09-12-color-interference.md`).

---

## 0. Traza de implementación (rutas reales `src/`)

| Sección doc | Archivo(s) `src/` | Export/Función clave | Tests |
|---|---|---|---|
| 1. Objetivo/flujo | `tasks/ColorInterferenceTask.jsx` | Componente, `handleResponse`, `completeIfFinished`, `onComplete` | `tasks/colorInterference.test.jsx` |
| 2. Estructura trials | `tasks/ColorInterferenceTask.jsx` | `buildColorInterferenceTrials` (3 condiciones, secuencia aleatorizada, `rng` inyectable) | `tasks/colorInterference.test.jsx` |
| 3. Textos UX | `tasks/ColorInterferenceTask.jsx` | i18n `t(es, en)` (título, prompt, opciones, feedback, estímulo ES/EN) | `tasks/colorInterference.test.jsx` (EN copy) |
| 4. Puntuación | `tasks/ColorInterferenceTask.jsx` | `scoreColorInterferenceResponse`, `summarizeColorInterferenceResults` (costo Stroop vs neutral) | `tasks/colorInterference.test.jsx` |
| 5. Visual/Feedback | `tasks/ColorInterferenceTask.jsx` + `postulation-demo/postulationDemo.css` | stimulus card (AA 3.99/4.27/3.11/4.15 large-text), botones ≥44px, timebar, feedback compacto | `tasks/colorInterference.test.jsx` + smoke B.4 |
| 7. State machine | `tasks/ColorInterferenceTask.jsx` | trial único visible, `handledRef`/`emittedForRef` guards, ITI jitter, timeout por trial, cleanup de `itiRef` | `tasks/colorInterference.test.jsx` + `tasks/gameRerenderStability.test.jsx` |
| 8. Contratos eventos | `telemetry/gameTelemetry.js` + `tasks/GameRuntime.jsx` | `normalizeGameEvent` (game_event_v1), `game_start` en GameRuntime | `telemetry/gameTelemetry.test.js` |
| 9. Pipeline señales | — (sin pointer sampler) | solo eventos discretos de respuesta; RT por trial | `tasks/colorInterference.test.jsx` |
| 10. Agregados batería | `telemetry/gameTelemetry.js` | `summarizeGameEvents` → `interference.*` (congruent/incongruent/neutral RT+accuracy, costo vs neutral con guard) | `telemetry/gameTelemetry.test.js` |
| 11. Feature vector | `telemetry/gameFeatureVector.js` | `assessment_feature_vector_v2` keys `interference.conflictCostMs`, `interference.errorRate` (sin reordenar — v0.2.0) | `telemetry/gameFeatureVector.test.js` |
| 12. Contrato salida | `postulation-demo/postulationDemoSessionBuilder.js` | `stripForbidden` (allowlist `ASSESSMENT_FORBIDDEN_KEYS`, incluye `trials`) | `postulation-demo/postulationDemoSessionBuilder.test.js` |
| 13. Privacidad | `assessment/assessmentSession.js` | `ASSESSMENT_FORBIDDEN_KEYS`, `validateAssessmentSessionPrivacy` (recursivo) | `assessment/assessmentSession.test.js` |
| 14. Configuración | `postulation-demo/postulationDemoConfig.js` + `assessment/batteryConfig.js` | bloque `visible:true`, `skill: interference_control`, trialCount 8 (demo) / 24 (standardized), `durationLabel: '30 s'` | `postulation-demo/postulationDemoConfig.test.js` |
| 15. Render batería | `postulation-demo/PostulationGameStage.jsx` | props `width/height` (viewport clamp), `trialCount`, `onComplete=completeBlock` | `postulation-demo/PostulationGameStage.test.jsx` |

> **Regla:** si una celda queda vacía, el slice NO está listo para cerrar.

---

## 1. Objetivo y flujo de usuario

El candidato ve una **palabra de color** (ROJO/AZUL/VERDE/AMARILLO, o su equivalente
EN RED/BLUE/GREEN/YELLOW, o el estímulo neutral `XXXXX`) escrita con una **tinta de
color**, y debe elegir el botón del **color real de la tinta** ignorando el texto —
paradigma Stroop (Stroop, 1935). Hay 3 condiciones:

- **Congruente:** palabra y tinta son el mismo color (ROJO en rojo).
- **Incongruente:** palabra y tinta difieren (AMARILLO en verde).
- **Neutral:** la "palabra" no es un nombre de color (`XXXXX`) → baseline de RT sin
  lectura automática.

### 1.1. Propósito (una frase)

Evidencia observable de **control de interferencia (interference control)**: costo de
interferencia Stroop (RT incongruente − RT neutral), precisión por condición y ajuste
bajo conflicto — **no** de velocidad pura (el warmup `simple_rt` cubre eso) ni de
inhibición motora (juego 2: go/no-go).

### 1.2. Constructos objetivo (provisionales, R-6)

| Constructo (provisional) | Fuente de señal | Disponibilidad | Caveat / evidencia |
|---|---|---|---|
| `interference_control` (dimensión `interferenceControl`) | `interference.conflictCostMs`, `interference.errorRate` (feature v2) + `inhibition`/`interference` del gameSummary + canal EdgeAI `cognitiveLoad` | provisional (score 0–100, **sin baremos**) | matriz XLSX; el score mezcla también un canal EdgeAI de agregado (proxy, §11); la señal **existe por construcción** tras el fix CIP-P1-1 (piso ≥2 por condición en batería de 8, §2); limitación sistémica de sesiones interrumpidas en §11 |
| Colaterales | — | `not_measured` | no se derivan constructos adicionales de este juego (la RT media se agrega a la media de batería, no es claim de velocidad pura) |

### 1.3. Alcance IN / OUT (del módulo)

- **IN:** 8 trials (batería demo) / 24 (standardized), secuencia aleatorizada de 3
  condiciones (peso ~1/3, trial 0 congruente, piso ≥2/condición en 8 trials), RT por
  trial, precisión por condición, costo de interferencia vs neutral, eventos
  `game_event_v1`, estímulo i18n (ES/EN).
- **OUT:** tutorial guiado (la instrucción en pantalla es fija: "Elige la tinta,
  ignora el texto."), SFX (no aplica en stable_dg), inferencia biométrica directa,
  score global, comparación entre personas, condiciones de lectura (sin condición
  "reading" — solo naming de tinta).

---

## 2. Estructura de trials / fases

| Fase | Trials | Propósito | ¿Evalúa? |
|---|---|---|---|
| Warmup (`simple_rt`, `visible:false`) | 4 | calibrar ritmo motor | NO (no cuenta en "Juego X de N") |
| Precisión (juego 1) | 4 | demanda Fitts | SÍ |
| Go/No-Go (juego 2) | 8 | inhibición | SÍ |
| **Stroop (juego 3)** | **8 (demo) / 24 (standardized)** | control de interferencia bajo conflicto color-palabra | SÍ |
| Búsqueda visual (juego 4) | 4 | eficiencia de búsqueda | SÍ |
| Práctica G.2 | — | mecánica disponible (`originalGamePractice.js`) pero **sin botón de práctica** para stable_dg en el flujo actual | N/A |

Secuencia de condiciones (fix FASE B.4, CIP-P1-1 — `buildColorInterferenceTrials`):

- **Trial 0 = congruente siempre** (enseña el mapeo tinta→respuesta antes de la
  primera demanda de conflicto; patrón B.3 "trial 0 GO").
- Trials ≥1: condición por peso ~1/3 cada una (congruent 0.34 / incongruent 0.33 /
  neutral 0.33).
- **Piso `minPerCondition`** (default `min(2, max(1, floor(count/4)))` → 2 en batería
  de 8): garantiza las 3 condiciones por sesión → cada condición tiene RT de
  referencia (sin piso, una sesión azarosa de 0 neutrales dejaría el costo Stroop
  incalculable, y el fallback `conflictScore(0) = 1` del talentProfile lo leería como
  desempeño óptimo — §11). El piso se aplica robando solo trials de condiciones por
  encima de su piso (nunca deja otra condición sin señal).
- **Tinta y palabra por trial:** tinta aleatoria (4 colores); congruente → palabra =
  tinta; incongruente → palabra = otro color (aleatorio entre los 3 restantes);
  neutral → `XXXXX`.
- `rng` inyectable (default `Math.random`) para tests deterministas (Park–Miller LCG
  en `colorInterference.test.jsx`; Fisher-Yates con clamp, patrón B.3).
- **El estímulo se renderiza en el idioma de la sesión** (note c): ES
  ROJO/AZUL/VERDE/AMARILLO, EN RED/BLUE/GREEN/YELLOW; la clasificación de tamaño
  (`long-word` ≥8 letras) es **por idioma** (AMARILLO=8 → 2.5rem; YELLOW=6 → 3rem).

> **Antecedente (bug corregido 2026-09-12):** el estímulo era una tabla fija de 7
> (`TRIAL_PATTERN`) que en 8 trials producía **congruente/incongruente estrictamente
> alternante** — y además la UI **anunciaba la condición de cada trial** con el pill
> "Tipo: congruente/incongruente". Tras el 2° trial el candidato predecía qué
> condición venía y podía modular su estrategia sin conflicto genuino; sin condición
> neutral, `conflictCostMs = RT incongruente − RT congruente` no era la métrica
> Stroop canónica. El constructo `interference_control` se medía inválido. La
> aleatorización + piso + retirada del anuncio cierran esa vía.

Timing por trial: ventana de respuesta 3200 ms (timeout → `incorrect`/`timeout`) +
ITI con **jitter [0.75, 1.25] × 250 ms** (fix CIP-P2-5: el ritmo fijo telegrafiaba el
timing del próximo estímulo; mismo patrón que GNP-P2-5 en B.3).

Duración total honesta: 8 × (RT ~1–1.5 s + ITI ~0.2 s) ≈ 10–17 s típicos; peor caso
(8 timeouts) ≈ 28 s → `durationLabel: '30 s'` (fix CIP-P3-1; antes "1 min").

---

## 3. Textos e instrucciones (UX Copy / script de pantalla)

| Pantalla / Momento | Texto ES | Texto EN | Notas |
|---|---|---|---|
| Título (header) | `🌈 Tarjetas de color` | `Color cards` | emoji en título (P3 real-device, §14) |
| Progreso | `Pregunta {n} de {total}` | `Question {n} of {total}` | |
| Timer | `Tiempo {s}s` (pill `role="timer"`, aria "Tiempo restante") | `Time {s}s` | numérico, AA 6.84:1 |
| Instrucción (prompt) | `Elige la tinta, ignora el texto.` | `Pick the ink, ignore the text.` | `--k-ink-terracotta` (AA 6.05:1) |
| Opciones | `Rojo` / `Azul` / `Verde` / `Amarillo` (aria `Elegir tinta {color}`) | `Red` / `Blue` / `Green` / `Yellow` (aria `Pick ink {color}`) | botones `min-height: 44px` AA touch; borde semántico por color |
| Feedback acierto | `Correcto` · `Tinta esperada: {color}` | `Correct` · `Expected ink: {color}` | |
| Feedback error | `Interferencia detectada` · `Tinta esperada: {color}` | `Interference detected` · `Expected ink: {color}` | |
| Feedback timeout | `Tiempo agotado` · `Tinta esperada: {color}` | `Time out` · `Expected ink: {color}` | |
| Pantalla final | `Interferencia completada` · `Precisión: {pct}%` | `Interference complete` · `Accuracy: {pct}%` | en batería no se renderiza (el siguiente juego monta en el mismo batch; standalone/práctica sí) |
| Captura (config) | `Interferencia cognitiva` · `Selecciona el color real de la palabra y gestiona conflicto atencional.` | `Cognitive interference` · `Select the true ink color of the word and manage attentional conflict.` | `postulationDemoConfig.js` (labelEn/descriptionEn desde t_42978412) |

> **Retirado (fix CIP-P1-1):** el pill `Tipo: congruente/incongruente` que anunciaba
> la condición del trial en curso. Regresión testeada (ES + EN):
> `queryByText(/Tipo:/i)` / `queryByText(/Type:/i)` = null.

---

## 4. Puntuación (modelo Stroop de 3 condiciones)

| Magnitud | Fórmula / valor | Notas |
|---|---|---|
| `correct` / `incorrect` / `timeout` | respuesta === tinta esperada (timeout a 3200 ms) | `reactionTimeMs = now − shownAt` (clock único `performance.now()`, pitfall 23 ✓) |
| `score` (0–1 por trial) | `correct ? 1 : 0` | |
| `accuracy` | correctos / total | |
| `congruentAccuracy` / `incongruentAccuracy` / `neutralAccuracy` | correctos / trials de la condición | piso §2 → denominador ≥ 2 por condición en batería de 8 |
| `congruentRT` / `incongruentRT` / `neutralRT` | media de RT de **aciertos** de la condición | solo RTs de acierto (estándar Stroop) |
| `conflictCostMs` | `incongruentRT − neutralRT` (0 si falta alguna baseline) | **métrica Stroop canónica** (antes: − congruente, CIP-P1-1); guard no-negativo (CIP-P3-7) |
| `facilitationMs` | `congruentRT − neutralRT` (0 si falta baseline) | descriptivo, extra |
| `meanReactionTimeMs` | media de RT de aciertos (3 condiciones) | **clave de contrato del session builder** (fix CIP-P2-1; sin ella la RT de este juego no entraba a la media de batería ni al "Tiempo" del reporte — mismo bug que GNP-P2-1 en B.3) |
| `completedTrialCount` | trials completados (= total: todo trial termina por respuesta o timeout) | clave de contrato del session builder (fix CIP-P2-1) |

Resumen final (`summarizeColorInterferenceResults` → `onComplete(summary)`):
`{ gameId, totalTrials, completedTrialCount, meanReactionTimeMs, accuracy, meanScore,
errorRate, congruentAccuracy, incongruentAccuracy, neutralAccuracy, congruentRT,
incongruentRT, neutralRT, conflictCostMs, facilitationMs, conditionCounts,
trials (in-memory, **se elimina en el payload** — §12) }`.

No hay economía de puntos ni meta global: es una tarea de conflicto con score por
trial (como go/no-go en B.3).

---

## 5. Elementos visuales y feedback (UI/UX)

- **Estímulo:** card crema (`--k-card-cream`) con la palabra en 900 weight; tinta por
  color de opción. **Contraste medido FASE B.4 (note c, AA):** sobre la card crema,
  rojo `#dc2626` = **3.99:1**, azul `#2563eb` = **4.27:1**, verde `#059669` =
  **3.11:1**, amarillo `#b45309` = **4.15:1** — el estímulo es texto grande
  (2.5–3rem, 900 weight → WCAG large text, umbral AA **3:1**) → las 4 tintas **PASS**.
  Nota: "amarillo" usa `#b45309` (ámbar oscuro, no `#facc15`) precisamente para pasar
  AA sobre crema — documentado, no es bug.
- **Opciones:** grid 2×2 en <900px / 4×1 en ≥900px (fix CIP-P2-4, para que el
  card-stage quepa sin scroll interno en el stage de 290 px desktop-compact);
  `min-height: 44px` ≥ 44 AA touch; bordes semánticos por color (0.52 alpha);
  `:hover`/`:focus-visible` en CSS shared.
- **Timebar:** 9 px, urgencia por `data-urgency` (teal/ámbar/rojo) — duplica el timer
  numérico (AA 6.84:1); el contraste no-textual 1.4–2.45:1 es aceptable (información
  redundante, CIP-P3-10).
- **Feedback:** flash ~190–315 ms (ITI jitter) en `role="status"`; compacto (fix
  CIP-P2-4) para no forzar scroll del stage.
- **Animaciones:** transición de width 120 ms en la timebar (funcional, duplica el
  timer numérico); sin `@keyframes` propios → `prefers-reduced-motion` sin impacto
  adicional.
- **Responsive checklist (FASE B.4, 2026-09-12):**
  - [x] 0 overflow horizontal en 390×844 (smoke Playwright)
  - [x] 0 overflow horizontal en 1280×720 (smoke Playwright)
  - [x] task-area por viewport: 520×290 (desktop-compact) / 312×340 (móvil) —
        `getPostulationGameViewport`; **respetando el prop `height`** (fix CIP-P2-4)
  - [x] **sin scroll interno del stage** en estímulo ni en feedback (asert smoke
        `scrollHeight ≤ clientHeight+1` por trial)
  - [x] botones de tinta ≥44px (asert smoke + CSS `min-height: 44px`)
  - [x] AMARILLO (long-word, 8 letras) cabe **en 1 línea** en 240–312 px de contenido
        (vision-verified en screenshots desktop y mobile)
  - [x] teclado: 4 `<button>` focusables → Tab/Enter juega la tarea completa

---

## 6. Referencias diseño

- `docs/design/krumm-postulation-pdd.md`, `krumm-postulation-sdd.md`.
- `AGENTS.md` — privacidad/gobernanza y contrato científico R-6.
- `docs/qa/prelaunch/2026-09-12-color-interference.md` — auditoría 8 dims + hallazgos.
- `docs/design/design-system.md` + tokens `--k-*` (colores de marca/semánticos).
- Stroop, J. R. (1935). *Studies in reading: The effect of irrelevant stimulus
  factors.* Journal of Experimental Psychology, 18(6), 643–662. (paradigma
  color-palabra; referencia directa del constructo, no validación normativa —
  `descriptive_only`, sin baremos)
- `src/tasks/ColorInterferenceTask.jsx` — componente y UX copy.

---

## 7. Máquina de estados del juego (state machine)

```
trial N (stimulus_shown, ventana 3200 ms)
   ├─ click tinta correcta ─→ response(correct) ─┐
   ├─ click tinta incorrecta→ response(incorrect)┤
   └─ timeout (3200 ms) ────→ response(timeout) ─┤
                                                  ↓
                     (N < total) ITI jitter [0.75,1.25]×250 ms → trial N+1
                     (N = total) game_end + onComplete (inmediato, patrón B.3)
```

| Entrada | Guard | Notas |
|---|---|---|
| click en opción | `handledRef` (1 finalización por trial) | double-click / multitouch = no-op tras el primer click (fix CIP-P3-5; patrón B.3) |
| timeout | `trialDurationMs` (3200 ms) | `timedOut: true` en el payload; outcome `timeout` |
| ITI | `itiRef` + cleanup en unmount/cambio de trial | jitter aleatorio (fix CIP-P2-5); el setTimeout legado sin ref (completar tardío tras abort) es el fix CIP-P2-3 |
| StrictMode (dev) | `emittedForRef` por índice de trial | evita `stimulus_shown` duplicado del trial 0 (fix CIP-P3-4; patrón GNP-P3-6) |

- **Sin estado irresoluble:** todo trial termina por click o timeout (3200 ms bound).
- **Clock único** `performance.now()` (pitfall 23 ✓): `shownAtRef`, timestamps de
  eventos y RT en el mismo clock. Nota sistémica: `shownAtRef` se fija en el effect
  (post-paint) → sesgo de montaje de 1 frame (~16 ms) en la RT; sub-segundo y
  constante, documentado (no se corrige: el estímulo y el reloj empiezan juntos a
  efectos de la ventana).
- **Orden de finalización = orden de resultados** (secuencial, 1 trial a la vez) →
  la agregación por condición es directa (regla skill #12 ✓).
- **Inmune al reset por re-medición de viewport** (patrón B.2/B.5): la geometría no
  puntúa; `trials` es `useMemo([trialCount])` (sin dependencia de width/height).

---

## 8. Contrato de ingesta (geometría de trial)

```js
// buildColorInterferenceTrials → por trial (aleatorizado con rng inyectable):
{
  trialId: 'color-<i>', targetId: 'color-stimulus-<i>', trialIndex: i,
  condition: 'congruent' | 'incongruent' | 'neutral',
  congruent: true | false | null,   // booleano legado; neutral = null
  ink: 'red' | 'blue' | 'green' | 'yellow',
  wordColor: 'red' | ... | null,    // null en neutral
  wordEs: 'ROJO' | ... | 'XXXXX',
  wordEn: 'RED' | ... | 'XXXXX',
  expectedResponse: ink,            // siempre la tinta
  expectedLabel: label ES de ink,
}
```

Tamaño del área: props `width/height` del stage (`getPostulationGameViewport`,
clamp 240..620 × 280..340 compact; 720×460 no-compact) — el `height` ahora se usa en
el task-area (fix CIP-P2-4).

---

## 9. Pipeline de señales (respuesta discreta, privado por diseño)

- **Sin pointer sampler** (note (f) de la card): color_interference no captura
  `pointermove` (la respuesta es un click discreto en un botón, no una trayectoria)
  → el patrón SRT-P3-2 (cache de `getBoundingClientRect` por pointermove) es **N/A**
  para este juego, y las kinemáticas de touch degeneradas (fix B.2) no aplican.
- **Muestra por trial:** 1 evento `response` (outcome + RT + bloque `interference`)
  — la RT es el único valor de señal continua; no hay muestras crudas.
- **Cámaras/biometría:** contexto/calidad únicamente (no se consume para este módulo);
  la correlación game↔facial agrega por trial vía `gameCorrelation` (ventanas
  reaction/pre/post) sin persistir samples.

---

## 10. Contratos de evento (game_event_v1)

Emitidos vía `GameRuntime` → `normalizeGameEvent` (contrato `game_event_v1`,
`privacy.rawPointer: false` por evento):

| Evento | Emisión | Campos |
|---|---|---|
| `game_start` | `GameRuntime` al activar (1× por montaje) | `gameId`, `timestamp`, `gameState{level:1, difficulty:'color_interference'}` |
| `stimulus_shown` | por trial (guard StrictMode) | `trialId`, `targetId`, `stimulus{kind:'color_word', payload{wordEs, wordEn, wordColor, ink, expectedResponse, condition, congruent, wordFit}}`, `gameState{score acumulado, level, difficulty:'color_interference'}` |
| `response` | por trial (click o timeout) | `response{correct, outcome, reactionTimeMs, score, interference{condition, congruent (null en neutral), wordEs, wordEn, wordColor, ink, expectedResponse, response, timedOut, trialDurationMs}}` + `gameState` |
| `game_end` | trial final, **inmediato** antes de `onComplete` (patrón B.3) | `gameState{score 0-100, level: totalTrials, difficulty:'color_interference'}` — **verificado FASE B.4** (note (d): ya se emitía en el código legado; se mantuvo y se normalizó escala/difficulty) |

Agregado batería: `summarizeGameEvents` → `interference{congruentAccuracy,
incongruentAccuracy, neutralAccuracy, congruentRT, incongruentRT, neutralRT,
conflictCostMs (vs neutral, con guard no-negativo), errorRate}` (fix CIP-P2-2:
clasificación por `condition` con fallback al booleano legado para eventos viejos)
+ `performance` + `privacy{aggregateOnly:true}`.

**Nota de orden (sistémico):** el effect del hijo (stimulus_shown) corre antes que el
del padre (game_start en GameRuntime) — aplica a todos los juegos GameRuntime; no se
asume orden entre ambos en los tests (comentario en `colorInterference.test.jsx`).

---

## 11. Métricas conductuales derivadas (provisionales, descriptive_only)

| Métrica (fuente) | Definición | Constructo provisional | Caveat |
|---|---|---|---|
| `interference.conflictCostMs` (feature v2) | RT incongruente − RT neutral (media de batería, con guard) | `interference_control` | **Stroop canónico** tras CIP-P1-1; 0 = sin ambas baselines (convención de nulos del feature vector v2, no "costo cero"); sin baremos |
| `interference.errorRate` (feature v2) | errores / respuestas con bloque interference | `interference_control` | incluye timeouts como error (ventana 3200 ms) |
| `inhibition`/`interference` per-condition RT (gameSummary) | RT media de aciertos por condición | `interference_control` | el piso §2 garantiza presencia de las 3 condiciones; no garantiza RT de **acierto** (ver residual abajo) |
| `meanReactionTimeMs` (block summary) | RT media de aciertos (3 condiciones) | evidencia de la dimensión | clave de contrato del session builder (fix CIP-P2-1) |
| `accuracy`, `meanScore` (block summary) | acierto global | evidencia general | score 0–100 provisional, **sin baremos** |

**Nota de dimensión (`interferenceControl` en `talentProfile.js`):**
`rawScore = mean(conflictScore(conflictCostMs), 1 − errorRate, 1 − canalEdgeAI('cognitiveLoad'))`
con `conflictScore(ms) = clamp(1 − ms/700)`. Dos limitaciones documentadas (ambas
sistemáticas de stable_dg, mismas que GNP-P3-7/GNP-P3-8 de B.3):

1. **Canal EdgeAI `cognitiveLoad` = proxy de agregado** (derivado de taskPerformance
   global, evidencia no específica del juego) → mezcla la señal Stroop real con un
   componente no discriminatorio; corrección (pesos/canal por juego) en el mapeo R-6
   validado post-FASE B.
2. **Sin camino de score nulo por dimensión:** una sesión sin datos de
   color_interference (interrupción antes del juego 3) → `conflictCostMs = 0` →
   `conflictScore(0) = 1` (máximo) y `1 − errorRate(0) = 1` → la dimensión se leería
   **alta** en lugar de desconocida. Afecta a todas las dimensiones de stable_dg;
   fix post-B (null-safe por fuente de señal). **Mitigación por construcción en este
   juego:** el piso ≥2 por condición (batería completa) garantiza las 3 baselines; el
   caso residual es solo interrupción.

**Regla de nulos (R-6):** constructo sin evidencia → `score: null` en el framework
original. En `stable_dg` la dimensión siempre tiene score provisional (juego
obligatorio y visible); el reporte lo presenta como **score provisional sin
baremos** + confidence + caveats (`descriptive_only`), nunca como diagnóstico ni
comparación entre personas.

---

## 12. Contrato de salida (allowlist-only)

### 12.1. Block summary (`onComplete` → `completedDemo.blocks[].summary`)

```js
{ gameId: 'color_interference', totalTrials, completedTrialCount, meanReactionTimeMs,
  accuracy, meanScore, errorRate, congruentAccuracy, incongruentAccuracy,
  neutralAccuracy, congruentRT, incongruentRT, neutralRT, conflictCostMs,
  facilitationMs, conditionCounts, trials: [...por trial (agregados, in-memory)] }
```

### 12.2. Estructura final (payload)

`normalizeCompletedBlocks` aplica **`stripForbidden`** (recursivo,
`ASSESSMENT_FORBIDDEN_KEYS` — incluye `trials`) → el `result` del bloque que llega a
sesión/payload es **solo** los agregados (sin `trials`). `sanitizeGameResults`
(clone) + `validateFinalAssessmentPayload` (recursivo, forbidden keys) re-verifican.
**Verificado FASE B.4:** suite focal incluye `postulationDemoSessionBuilder`
(7/7) y `finalAssessmentPayload` (2/2).

### 12.3. Feature vector

`assessment_feature_vector_v2` (v0.2.0, `gameFeatureVector.js`) — keys de este juego:
`interference.conflictCostMs`, `interference.errorRate` (+ `game.*`/`performance`
agregados de batería). **Sin reordenar `featureOrder`** (AGENTS: sin cambios
incompatibles): el fix CIP-P2-2 cambió la **semántica** del valor (vs neutral, con
guard) dentro de la misma key — documentado aquí y en el changelog de la auditoría.
`featureArray` finito; `privacy.payloadContainsAggregatesOnly: true`.

### 12.4. Campos PROHIBIDOS (privacy guard)

- `assessment/assessmentSession.js` → `ASSESSMENT_FORBIDDEN_KEYS` (incl. `trials`,
  `pointerSamples`, `rawPointerPath`, `rawGameEvents`, `stimuli`, …).
- Los eventos de respuesta llevan **un** outcome + RT + bloque `interference` por
  trial (metadatos del estímulo: palabra ES/EN, colores, condición — no coordenadas,
  no pointer, no DOM events).

---

## 13. Privacidad y gobernanza (no negociables — verificado FASE B.4)

- [x] Sin video/frames/landmarks/keypoints/rutas/pointer samples crudos en payload.
- [x] Cámara/biometría = contexto/calidad, no inferencia de este módulo.
- [x] Agregados allowlist-only; `game_event_v1` + `stimulus_shown`/`response`/`game_end` intactos.
- [x] Señal por condición garantizada en batería completa (piso ≥2 por condición) →
      no hay sesión "costo Stroop incalculable por azar".
- [x] `trials` del summary eliminado por `stripForbidden` antes del payload.
- [x] `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe` en payload.
- [x] `descriptive_only`: sin percentiles/cortes/ranking/apto-no-apto; score 0–100
      provisional explícitamente **sin baremos**.
- [x] Chain R-6 completa: constructo (interference_control) → demanda (Stroop de 3
      condiciones aleatorizado, sin anuncio) → conducta (naming de tinta bajo
      conflicto, RT, errores por condición) → telemetría agregada (`interference.*`)
      → feature versionada (v2) → regla provisional (dimensión `interferenceControl`)
      → disponibilidad/confianza/caveats → narrativa de revisión humana.

---

## 14. Riesgos y mitigaciones

| Riesgo | Sev | Mitigación / decisión |
|---|---|---|
| Secuencia de condiciones determinista (C/I alternante) + condición **anunciada** en UI → el candidato predecía y modular la estrategia; constructo inválido | **P1 (cerrado B.4)** | `buildColorInterferenceTrials` aleatorizado (peso ~1/3, trial 0 congruente, piso ≥2/condición, `rng` inyectable) + retirada del pill "Tipo:" + estímulo i18n (fix CIP-P1-1, RED→GREEN + smoke E2E: secuencias en vivo con las 3 condiciones, floor cumplido, no-legacy) |
| Sin doc módulo R-6 (P1 sistemático de los 5 stable_dg) | **P1 (cerrado B.4)** | Este doc |
| Summary sin claves de contrato del session builder (`completedTrialCount`, `meanReactionTimeMs`) → RT de stroop ausente de la media de batería y del "Tiempo" del reporte | P2 (cerrado B.4) | fix CIP-P2-1 (+ test de contrato) |
| `conflictCostMs` = incongruente − **congruente** (no canónico) + sin condición neutral + sin guard no-negativo | P2 (cerrado B.4) | fix CIP-P2-2 en `gameTelemetry.js` (3 condiciones, costo vs neutral, guard, fallback a payload legado) + tests |
| ITI `setTimeout` sin ref → `onComplete` tardío si el flujo se aborta/unmount durante ITI (bloque completado con datos viejos) | P2 (cerrado B.4) | fix CIP-P2-3: `itiRef` + cleanup en unmount/cambio de trial + test de unmount-during-ITI |
| `height` prop ignorada (min-height 260 fijo) + layout alto (~317–350 px) > stage 290/340 px → scroll interno durante trial cronometrado | P2 (cerrado B.4) | fix CIP-P2-4: prop `height` + CSS compacto (gap 8, padding 12/10, línea estímulo 1.15, feedback compacto, grid 4×1 en ≥900) + smoke asert `scrollHeight ≤ clientHeight` por trial (estímulo y feedback) |
| ITI fijo 250 ms → ritmo telegrafiado | P2 (cerrado B.4) | jitter [0.75, 1.25] × itiMs (fix CIP-P2-5, mismo patrón GNP-P2-5) + test de límites (74/126 ms) |
| `durationLabel: '1 min'` vs 10–30 s reales (8 trials) | P3 (cerrado B.4) | `'30 s'` en `postulationDemoConfig.js` (+ test) |
| `game_end.gameState.score` en escala 0–1 (resto de la batería: 0–100) | P3 (cerrado B.4) | `Math.round(meanScore * 100)` |
| `difficulty` inconsistente (`conflict` en game_start / `congruent`/`incongruent` por trial / `mixed_interference` en game_end) | P3 (cerrado B.4) | unificada a `color_interference` en `gameState.difficulty`; la condición vive en el payload estímulo/respuesta (`condition`) |
| StrictMode (dev): `stimulus_shown` duplicado del trial 0 | P3 (cerrado B.4) | guard `emittedForRef` por índice + test (1 evento, no 2) |
| Sin `handledRef` (double-click ultra-rápido podría puntuar 2× en teoría) | P3 (cerrado B.4) | `handledRef` por trial (patrón B.3) + test de double-click |
| `conflictScore(0) = 1` → sesión interrumpida se leería "alta" en `interferenceControl` | P3 (abierto, sistemático) | Mismo patrón GNP-P3-8 (B.3): `talentProfile` sin camino null-score por dimensión; afecta a todo stable_dg; fix post-B (null-safe por fuente de señal). Mitigado aquí por el piso §2 (batería completa) |
| Canal EdgeAI `cognitiveLoad` = proxy de agregado (no específico del juego) | P3 (abierto, sistemático) | Mismo patrón GNP-P3-7 (B.3); fix en mapeo R-6 post-B |
| Emoji 🌈 en título (+ SFX toggle 🔊/🔇 shared) | P3 (abierto, sistemático) | Headless: OK (screenshots de smoke B.4); real-device pendiente (patrón `t_25009e33`); si tofu → SVG inline |
| Timebar no-textual 1.4–2.45:1 sobre arena | P3 (decisionado) | Duplica el timer numérico (6.84:1 AA) → la información está disponible con contraste AA; color de estado no es único canal |
| `colorStimulusLayout.js` (stub de 4 líneas) sin imports — código muerto | P3 (cerrado B.4) | eliminado (fix CIP-P3-8); el layout real está inline en el componente (`classifyStimulusWordLength` + CSS de la card) |
| role `calibration`/`scored` no expuesto en `sanitizeGameResults` (SRT-P2-3) | P3 (abierto, sistemático) | Este juego es `visible:true` (scored) → impacto bajo; fix coordinado con B.1/epic |
| Tinta "amarillo" = `#b45309` (ámbar) no amarillo puro | P3 (decisionado) | Elegido para pasar AA (3:1 large) sobre crema; documentado §5; el botón "Amarillo" mantiene el borde ámbar coherente |

---

## 15. Criterios de aceptación (gates) — resultado FASE B.4

```bash
NODE_ENV=test npm run test -- <focales> --pool=threads --reporter=default   # ver reporte QA
./node_modules/.bin/oxlint <archivos tocados>                              # 0
npm run build                                                              # OK
```

- [x] Tests RED→GREEN del fix P1 (3 condiciones aleatorizadas + i18n + sin anuncio)
      + P2 (contrato summary, costo vs neutral, ITI tracked, height/layout, jitter)
      + P3 (durationLabel, score 0-100, difficulty, StrictMode, handledRef, dead code):
      `colorInterference.test.jsx` (18 tests), `gameTelemetry.test.js` (+2 tests),
      `postulationDemoConfig.test.js` (+1 test).
- [x] Browser smoke 2 viewports (1280×720 mouse + 390×844 touch) —
      `scripts/smoke-b4-color-interference-2026-09-12.mjs`: 0 failures, 0 console
      errors, 0 requestfailed, 0 overflow; stroop jugado completo 8/8 trials por
      viewport; **E2E del fix P1: secuencias en vivo con las 3 condiciones, floor
      ≥2 cumplido, pregunta 1 congruente, sin anuncio de condición, sin secuencia
      legacy**; fit del stage (sin scroll interno) por trial en estímulo y feedback;
      AMARILLO 1 línea vision-verified; transición a visual search íntegra; fixture
      report OK en ambos viewports.
- [x] Payload sin raw fields prohibidos (`trials` eliminado; validación recursiva OK).
- [x] `game_end` emitido (note (d) verificado) con score 0–100 + difficulty unificada.

**Test de componente (lección Tangram) — presente:** interacción núcleo por botón
(correcto/incorrecto/timeout), transición de trial (ITI real con fake timers), límites
del jitter (74/126 ms), secuencia aleatorizada (propiedades + rng inyectable +
reproducibilidad por seed), StrictMode (sin duplicado), unmount-during-ITI (sin
completar tardío), double-click (1 score), privacidad del payload emitido
(`JSON.stringify` sin `samples`), EN copy + estímulo EN, contract keys del summary.

---

## 16. Trazabilidad de auditoría (FASE B.4)

| Hallazgo | Sev | Estado | Evidencia |
|---|---|---|---|
| CIP-P1-1 secuencia determinista + condición anunciada + sin neutral (constructo inválido) | P1 | **cerrado** (fix + tests + smoke E2E) | §2, §3, §15 |
| CIP-P1-2 sin doc módulo R-6 (sistemático stable_dg) | P1 | **cerrado** (este doc) | §0–§15 |
| CIP-P2-1 summary sin contrato de session builder | P2 | **cerrado** (fix + test) | §4, §12 |
| CIP-P2-2 costo Stroop no canónico + sin neutral + sin guard | P2 | **cerrado** (fix gameTelemetry + tests) | §10, §11 |
| CIP-P2-3 ITI setTimeout sin cleanup (onComplete tardío) | P2 | **cerrado** (fix + test unmount) | §7 |
| CIP-P2-4 height ignorada + layout > stage (scroll interno) | P2 | **cerrado** (fix + CSS + smoke fit) | §5 |
| CIP-P2-5 ITI fijo (jitter) | P2 | **cerrado** (fix + test de límites) | §2, §7 |
| CIP-P3-1..8 (durationLabel, score 0-100, difficulty, StrictMode, handledRef, emoji, costo negativo, dead code) | P3 | 7 cerrados, 1 abierto sistemático (emoji real-device) | §14 |
| CIP-P3-9/10 (role flag, timebar no-textual) | P3 | abierto sistemático / decisionado | §14 |
| CIP-P3-11 (talentProfile sin null-score: sesión interrumpida → `conflictScore(0)=1` "alta") | P3 | abierto sistemático (mismo GNP-P3-8; fix post-B) | §11, §14 |

---

## 17. Pitfalls (incidentes reales — revisar antes de cerrar cambios)

| Pitfall | Incidente | Prevención |
|---|---|---|
| Tabla de estímulo fija + anuncio de condición en Stroop se lee como "control de interferencia perfecto" sin conflicto genuino | FASE B.4 CIP-P1-1 (este doc) | 3 condiciones aleatorizadas + piso por condición + rng inyectable; **sin** pill de condición en UI; tests de propiedades (no la secuencia exacta); smoke E2E aserta floor + no-legacy en vivo |
| `conflictCostMs` sin baseline neutral → negativo o 0 → `conflictScore(0)=1` (máximo) en talentProfile | FASE B.4 CIP-P3-7 (guard) / GNP-P3-8 (null-score, sistémico) | Guard no-negativo en juego y en `gameTelemetry`; la ausencia de señal sigue siendo un gap sistémico de post-B (documentado §11) |
| `getByRole` (RTL) con regex que matchea varios botones → `getMultipleElementsFoundError` | FASE B.4 smoke de tests (3 failures iniciales) | `getAllByRole(...)[0]` cuando la regex matchea el set completo; o nombre exacto (`'Elegir tinta Rojo'`) |
| Heurística de "1 línea" que mide el rect **incluido padding/border** del card → falso wrap | FASE B.4 smoke B.4 (AMARILLO 68 px = 1 línea + 23 px chrome) | Restar el chrome (23 px) antes de dividir por la altura de línea; verificar con vision en screenshots |
| Smoke bajo carga (suite completa corriendo en paralelo en la Pi) → round-trips de Playwright de ~1 s → timeout de trial legítimo en vivo | FASE B.4 smoke B.4 (desktop Q1 timeout bajo CPU contention) | No asertar precisión en vivo; la ventana 3200 ms + timeout → siguiente trial hace el juego robusto; re-ejecutar smoke con la Pi libre para evidencia limpia |
| StrictMode (dev): `useMemo` del builder consume el rng 2× (doble render) | FASE B.4 (analizado) | El builder es una función **total** (cualquier stream de rng → trials válidos, trial 0 siempre congruente) → la secuencia remaneada sigue siendo válida; no se necesita guard en el builder |
| Contratos de summary por juego (claves `meanReactionTimeMs`/`completedTrialCount`) no verificados contra el session builder | FASE B.4 CIP-P2-1 (mismo bug que GNP-P2-1 en B.3) | Cada juego stable_dg documenta en su §4 las claves de contrato; test aserta el contrato en el summary |
| Pantalla "finished" nunca visible en batería (onComplete monta siguiente juego en el mismo batch) | FASE B.1 (SimpleRT) — aplica aquí | Smoke espera la SUPERFICIE siguiente ("Juego 4 de 4"), no el testid `color-finished` |
| Orden de effects hijo-ante-padre: stimulus_shown antes que game_start (GameRuntime) | FASE B.3 (observado) — sistémico | No asertar orden entre ambos en tests |
