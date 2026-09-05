# Auditoría técnica: sincronización local de señales en browser (Fase T — T.2)

- **Fecha:** 2026-08-26
- **Alcance:** cadena local de sincronización entre eventos de juego (`game_event_v1`) y señales faciales/cinéticas en browser, para la ruta producto `/postulaciones-demo` (baterías `stable_dg` default/fallback y `?battery=original`) y el flujo PoC legacy (`src/App.jsx`) que comparte `gameCorrelation.aggregate` y `buildCalibrationProfile`.
- **Método:** trazado estático de símbolos con verificación línea por línea (citas `archivo:línea` verificadas el 2026-08-26 en este repo), más tests deterministas con fixtures sintéticos y relojes inyectados (sin cámara, sin datos reales).
- **Test de regresión asociado:** `src/telemetry/localSignalSync.test.js` (6 tests, todos deterministas).
- **Contratos respetados (sin cambios):** `game_event_v1`, eventos `stimulus_shown`/`response`/`game_end`, `gameCorrelation.aggregate`, `assessment_feature_vector_v2`, allowlist de agregados, flags `humanReviewOnly`/`noAutomatedDecision`/`observationalOnly`/`privacySafe`.

## 1. Mapa de la cadena de relojes (verificado)

### 1.1 Reloj de página

| Sitio | Código | Nota |
|---|---|---|
| `src/telemetry/gameTelemetry.js:26-28` | `now()` = `globalThis.performance?.now?.() ?? Date.now()` | Reloj canónico de telemetría de juego. |
| `src/postulation-demo/BackgroundSignalOrchestrator.jsx:37-39` | `nowMs()` = `globalThis.performance?.now?.() ?? Date.now()` | Mismo dominio (page-relative) que `gameTelemetry.now()`. |
| `src/tasks/original-games/BalloonRiskPostulationTask.jsx:14`, `LaserPuzzlePostulationTask.jsx:20`, `PassengerRouteOptimizationTask.jsx:26`, `TeamCoordinationPostulationTask.jsx:24` | `const now = () => globalThis.performance?.now?.() ?? Date.now()` | Reloj local por juego (batería original), mismo dominio. |
| `src/tasks/VisualSearchTask.jsx:143` | `startTimeRef.current = performance.now()` | Directo, sin fallback (los browsers actuales siempre tienen `performance`). |

### 1.2 Cadena de captura facial (demo de postulación)

1. `src/telemetry/useFaceLandmarkerWorker.js:100-125` — loop `requestAnimationFrame`: `tick(now)` donde `now` es el **timestamp de rAF** (mismo time-origin que `performance.now()`, por especificación HTML). Gate de fps en L106: `if (now - lastSentRef.current >= frameIntervalMs)` (fps=10 → `frameIntervalMs=100`). En L112-115 envía `{ type: 'frame', payload: { bitmap, timestamp: now } }`.
2. `src/telemetry/faceLandmarkerWorker.js:73-111` — el worker ejecuta `detectForVideo(bitmap, timestamp)` (L75-78) y devuelve `{ type: 'sample', sample: { timestamp, blendshapes, quality } }` (L103-105): **el timestamp de captura rAF hace ida y vuelta intacto** al hilo principal.
3. `src/postulation-demo/BackgroundSignalOrchestrator.jsx:308-309` — `recordFaceSample`: `const timestamp = finiteOrNull(safeSample.timestamp) ?? nowMs();` → **conserva el timestamp de captura** (el fallback solo aplica si el worker no devolviera timestamp).
4. MoveNet (cuerpo): `BackgroundSignalOrchestrator.jsx:340` — `timestamp: finiteOrNull(sample.timestamp) ?? nowMs()`, y el hook `useMoveNet` estampa con el `now` de su propio rAF (fps=6, `frameIntervalMs≈167`, L346-348).

### 1.3 Cadena de eventos de juego

- **Batería `stable_dg` (default):** los juegos emiten a través de `src/tasks/GameRuntime.jsx:24-31` (`emit` → `normalizeGameEvent` **síncrono en el momento del emit**). `game_start` se auto-emite con `timestamp: session.startedAt` (L40-44), donde `startedAt = now()` (`gameTelemetry.js:92`).
- **Batería `?battery=original`:** los juegos emiten eventos *raw* (con `eventType` pero sin `type: 'game_event_v1'`) con **timestamps explícitos verificados en los 4 juegos**:
  - `stimulus_shown`: `timestamp: levelStartRef/roundStartRef/scenarioStartRef.current` (Balloon L46-51, Laser L104-109, Passenger L122-127, TeamCoord L197-202).
  - `response`: `timestamp: responseTime` / `checkTime` / `now()` (Balloon L108-112, Laser L216-220, Passenger L180-184 y L241-245, TeamCoord L231-235).
  - `game_end`: `timestamp: now()` (Balloon L76-78, Laser L181-183, Passenger L203-205 y L264-266, TeamCoord L264-266).
  - Estos raw se normalizan **en batch en el build de sesión** (`src/postulation-demo/postulationDemoSessionBuilder.js:97-98`): los eventos con `type === 'game_event_v1'` pasan intactos; los raw pasan por `normalizeGameEvent(event)` en ese momento (final de la demo).

### 1.4 Ventanas de correlación

`src/postulation-demo/postulationDemoSessionBuilder.js:126-129` → `correlateGameWithMultimodalSignals` (`src/telemetry/gameCorrelation.js:171-271`):

- `findTrialPairs` (L113-134): filtra eventos con `Number.isFinite(Number(event?.timestamp))` (L115) — **descarte silencioso** de eventos sin timestamp finito.
- Ventanas por trial (L184-223), con defaults `preTrialMs=300`, `postResponseMs=500`, `recoveryMs=1000` (L171-181):
  - preTrial: `[shownAt-300, shownAt]` (L188-190)
  - reaction: `[shownAt, completedAt]` (L197-199)
  - postResponse: `[completedAt, completedAt+500]` (L206-208)
  - recovery: `[completedAt+500, completedAt+1500]` (L215-217)
- Selección de muestras: `samplesBetween` (L27-32) — comparación numérica cruda `timestamp >= from && timestamp <= to`, **sin reconciliación de dominio de reloj**.

### 1.5 Calibración (from/to y `isInWindow`)

- `src/telemetry/microgestureFeatures.js:20-23` — `isInWindow`: misma comparación numérica cruda.
- L52-77 — `summarizeSignalQuality`: con lista vacía produce `flags: ['no_facial_samples']` (L58); `eligible` depende de caveats.
- L79-98 — `extractMicrogestureWindow`; L112-128 — `buildCalibrationProfile`: `eligible: caveats.length === 0` (L123).
- Llamarantes:
  - `src/App.jsx:321` (PoC legacy): `buildCalibrationProfile(samples, { from: firstTs, to: lastTs })` — **from/to desde las muestras reales** (patrón correcto del pitfall #23). `sessionStartRef` (L101) se fija con `performance.now()` al iniciar calibración (L226) y solo se usa para fps/duración (L354, L420), **no** para from/to. El patrón legacy anterior quedó documentado en `src/App.jsx.bak:119,236` (`sessionStartRef.current ?? samples[0]?.timestamp ?? now - 1000`).
  - `src/telemetry/payload.js:170-174` — fallback `buildCalibrationProfile(faceSamples, { from: start, to: Math.min(end, start + 3000) })` con reloj de **sesión** del caller.

**Conclusión del trazado:** en la cadena actual de browser, todos los timestamps de la ruta producto son page-relative del mismo time-origin (`performance.now()` / timestamp de rAF, que comparten time-origin), y el timestamp de captura facial viaja intacto desde el rAF hasta el worker y de vuelta. No se encontró desincronización activa.

## 2. Paths de desincronización

| # | Path | Severidad | Estado | Recomendación |
|---|---|---|---|---|
| P1 | Mezcla de relojes `Date.now()` (epoch) vs `performance.now()` (page-relative) | **Alto** | Latente (cadena consistente hoy) | Monitorizar + test de regresión; normalizar dominio antes de correlacionar si aparece persistencia/replay |
| P2 | Evento de juego sin timestamp → fallback `now()` evaluado en tiempo de normalización (batch en build de sesión) | **Medio** | Latente (todos los emits actuales llevan timestamp explícito, verificado) | Test de regresión; futura iteración: normalizar en emit o avisar en batch |
| P3 | Pestaña en background: rAF se detiene y timers quedan throttled (≥1 s) | **Bajo** | Comportamiento esperado de browser, documentado | Aceptar + monitorizar (los caveats ya lo cubren vía `signalQuality.flags`) |
| P4 | Latencia evento→ventana: la muestra del instante físico T se estampa en el siguiente tick rAF (≤ `frameIntervalMs`) | **Bajo** | Acotada y determinista, verificada | Aceptar + test de regresión que fija el bound |
| P5 | `sessionStartRef` (App.jsx PoC) | **N/A** | Verificado correcto (no es finding) | Mantener; ya cubierto por regresión |
| P6 | Ventana de calibración fallback en `payload.js` con reloj de sesión | **Medio** | Latente; solo afecta flujo PoC (la demo de postulación no lo invoca) | Monitorizar; preferir `calibrationProfile` con from/to de muestras reales |
| P7 | Contrato `quality` asimétrico: muestra sin `quality` cuenta como PRESENTE en correlación pero AUSENTE en calibración | **Medio** | Latente (el worker actual siempre popula `quality`); repro determinista en test P1 | Fix futuro: unificar contrato de calidad con default explícito; monitorizar |

### P1 — Mezcla de relojes `Date.now()` vs `performance.now()` — ALTO (latente)

- **Archivo:línea:** `src/telemetry/gameCorrelation.js:27-32` (`samplesBetween`), `src/telemetry/microgestureFeatures.js:20-23` (`isInWindow`); orígenes de fallback: `gameTelemetry.js:26-28`, `BackgroundSignalOrchestrator.jsx:37-39`, juegos originales (L14/L20/L24/L26).
- **Mecanismo de falla:** la selección de ventanas es una comparación numérica cruda sin verificación de dominio. Si un flujo estampa en epoch-millis (`Date.now()` ≈ 1.7e12) y el otro en page-relative (`performance.now()`, valores pequeños), la ventana `[shownAt-300, shownAt]` nunca contiene muestras del otro dominio: `sampleCount` 0, deltas vacíos, `facePresenceRatio` 0, y en calibración `no_facial_samples` + `eligible: false`. La falla es **silenciosa** (sin error ni warning).
- **Evidencia:** test `localSignalSync.test.js` → "mezcla de relojes Date.now vs performance.now: las ventanas de correlación y calibración nunca contienen muestras (no_facial_samples / eligible:false)".
- **Recomendación:** **monitorizar**. La cadena actual es consistente (sección 1); el riesgo se activa con eventos importados/reproducidos desde persistencia con epoch, entornos donde el fallback a `Date.now()` se dispara de forma asimétrica, o código futuro que use `Date.now()` directamente. Si se añade persistencia/replay, insertar una capa de normalización de dominio de reloj antes de `correlateGameWithMultimodalSignals` (fix propuesto, fuera de esta oleada por no cambiar contratos).

### P2 — Evento sin timestamp → `now()` en tiempo de normalización (batch) — MEDIO (latente)

- **Archivo:línea:** `src/telemetry/gameTelemetry.js:110` (`const timestamp = finiteOrNull(event.timestamp) ?? now();`), `src/postulation-demo/postulationDemoSessionBuilder.js:97-98` (normalización de eventos raw en batch, en el build final de sesión).
- **Mecanismo de falla:** si un evento raw (sin `type: 'game_event_v1'`) llega **sin timestamp**, el fallback `now()` se evalúa no en el momento del emit sino en el momento de normalizar (final de la demo, minutos después) → el evento hereda el reloj de build → las ventanas del trial se anclan al final de la demo (preTrial `[build-300, build]`) y la correlación del trial queda corrupta; además `findTrialPairs` (L115) descarta silenciosamente cualquier `game_event_v1` que llegue sin timestamp finito.
- **Estado actual:** **latente** — verificado que todos los emits de ambas baterías llevan timestamp explícito (sección 1.3: Balloon L46-51/L108-112/L76-78, Laser L104-109/L216-220/L181-183, Passenger L122-127/L180-184/L203-205/L264-266, TeamCoord L197-202/L231-235/L264-266; `game_start` con `session.startedAt` en `GameRuntime.jsx:40-44`).
- **Evidencia:** test `localSignalSync.test.js` → "evento de juego sin timestamp: el fallback now() de normalizeGameEvent usa el reloj del momento de normalización (batch) y desalinea la ventana" (reloj inyectado).
- **Recomendación:** **monitorizar** con test de regresión que fija el mecanismo. Iteración futura sugerida (sin cambio de contrato hoy): normalizar en el momento del emit en la batería original o registrar un warning agregado cuando un evento raw sin timestamp se normalice en batch.

### P3 — Pestaña en background: rAF detenido + timers throttled — BAJO

- **Archivo:línea:** `src/telemetry/useFaceLandmarkerWorker.js:101-125` (loop de captura rAF), `src/tasks/original-games/PassengerRouteOptimizationTask.jsx:117` (`transitionTimeoutRef`, transición por timer).
- **Mecanismo de falla (esperado, no defecto):** en background tab, rAF no dispara → **no hay nuevas muestras faciales/MoveNet** (hueco de captura), mientras `performance.now()` sigue avanzando (monótono, real). Los timers (`setTimeout`/`setInterval`) quedan throttled a ≥1 s; un evento programado en foreground (p. ej. una transición en `t=1200`) se emite en el primer tick posible (p. ej. `t=2000`) con el timestamp del reloj en el momento del fire. Ventanas que caen en el hueco contienen 0 muestras faciales → `facePresenceRatio` 0 / `no_facial_samples` en esas ventanas: comportamiento correcto bajo la regla "señal ausente = desconocida/caveated, nunca desempeño bajo". Al volver a foreground, la captura se reanuda y las ventanas vuelven a poblar.
- **Evidencia:** test `localSignalSync.test.js` → "pestaña en background: rAF detenido produce hueco de muestras sin desincronización de reloj (ventanas del hueco vacías, post-foreground pobladas)" (simulación determinista del gate rAF de L106 con reloj inyectado, sin cámara).
- **Recomendación:** **aceptar + monitorizar**. No hay desincronización de reloj (mismo clock monótono); solo hay pérdida de cobertura, que ya se surfacea vía `signalQuality.flags`.

### P4 — Latencia evento→ventana acotada y determinista — BAJO

- **Archivo:línea:** gate `src/telemetry/useFaceLandmarkerWorker.js:106` (`frameIntervalMs = 1000/fps`, 100 ms @ fps=10; ~167 ms MoveNet @ fps=6, `BackgroundSignalOrchestrator.jsx:333-334,346-348`); preservación del timestamp de captura en `BackgroundSignalOrchestrator.jsx:309`; ventanas en `gameCorrelation.js:188-223`.
- **Mecanismo:** una muestra que representa el instante físico `T` se estampa con el tick rAF de captura (el siguiente tick ≤ `T + frameIntervalMs`). La latencia evento→muestra está **acotada por arriba en un intervalo de frame** y es determinista. Consecuencias fijas: (i) la ventana reaction `[shownAt, completedAt]` solo contiene muestras capturadas dentro del intervalo; una muestra del instante justo posterior al response llega en el siguiente tick y cae en postResponse (no es desync, es anclaje por ticks); (ii) con `reactionTimeMs < frameIntervalMs` (<100 ms a 10 fps) la ventana reaction puede contener **0** muestras faciales (caso acotado y documentado). El pipeline **no re-estampa** muestras en la llegada (el orchestrator conserva el ts de captura, L309), por lo que no hay latencia acumulativa ni deriva.
- **Evidencia:** test `localSignalSync.test.js` → "latencia evento→ventana acotada y determinista: la muestra del instante físico T se estampa en el siguiente tick (≤ frameIntervalMs)".
- **Recomendación:** **aceptar + test de regresión** que fija los conteos exactos (RT=300 → 3 muestras; RT=150 → 1; RT=50 → 0) y el bound `Δt ≤ frameIntervalMs`.

### P5 — `sessionStartRef` (App.jsx PoC) — VERIFICADO, sin finding

- **Archivo:línea:** `src/App.jsx:101` (declaración), `:226` (`sessionStartRef.current = performance.now()` al iniciar calibración), `:321` (calibración con `from: firstTs, to: lastTs` de las muestras reales), `:354,:420` (fps/duración desde `sessionStartRef`).
- **Evidencia:** from/to de calibración ya se derivan de las muestras reales (pitfall #23 aplicado); el patrón legacy (`sessionStartRef.current ?? samples[0]?.timestamp ?? now - 1000`) quedó solo en `src/App.jsx.bak:119,236`.
- **Recomendación:** mantener; cubierto por la regresión de esta auditoría (test 1) y por los tests existentes de `microgestureFeatures`.

### P6 — Ventana de calibración fallback en `payload.js` con reloj de sesión — MEDIO (solo PoC)

- **Archivo:línea:** `src/telemetry/payload.js:170-174` — `calibrationProfile ?? buildCalibrationProfile(faceSamples, { from: start, to: Math.min(end, start + 3000) })`, con `start`/`end` = reloj de sesión del caller.
- **Mecanismo de falla:** si el caller estampa la sesión (startedAt/endedAt) en un dominio distinto al de las muestras, la ventana de calibración queda vacía → `no_facial_samples` → `eligible: false` (mismo mecanismo que P1, aplicado a calibración).
- **Estado actual:** la demo de postulación **no** invoca `buildCalibrationProfile` (búsqueda verificada: sin matches en `src/postulation-demo/`); solo el flujo PoC `src/App.jsx` lo usa, y lo hace con from/to de muestras reales (P5). Latente para cualquier caller futuro de `buildFusionPayload`.
- **Recomendación:** **monitorizar**. Si se reutiliza el path PoC, preferir pasar `calibrationProfile` ya construido con from/to de muestras reales (el contrato ya lo soporta: parámetro `calibrationProfile` en `buildFusionPayload`, L120).

### P7 — Contrato `quality` asimétrico entre correlación y calibración — MEDIO (latente)

- **Archivo:línea:** `src/telemetry/gameCorrelation.js:35` — `summarizeFace` filtra presencia con `sample?.quality?.facePresent !== false` (muestra sin `quality` → se cuenta como PRESENTE). `src/telemetry/microgestureFeatures.js:62-63` — `summarizeSignalQuality` exige `sample.quality?.facePresent` truthy y lee `sample.quality?.confidence ?? 0` (muestra sin `quality` → AUSENTE, confianza 0).
- **Mecanismo de falla:** si un productor degradado emite muestras faciales sin objeto `quality`, las ventanas de correlación reportan presencia normal (`facePresenceRatio` > 0, `gameCorrelation.aggregate` poblado) mientras `buildCalibrationProfile` marca `insufficient_facial_coverage` + `low_detection_confidence` y `eligible: false` para los mismos datos. Las dos señales divergen silenciosamente.
- **Evidencia:** contraste de lectura L35 vs L62-63; reproducción determinista en `src/telemetry/localSignalSync.test.js` (test P1): fixture sin `quality` → calibración `eligible:false` con 4 muestras en la ventana, mientras `summarizeFace` da `facePresenceRatio=1` para esas mismas muestras; con `quality` poblado → `eligible:true`.
- **Estado actual:** latente — el worker de captura popula siempre `quality` en la ruta producto (verificado en la sección 1); el riesgo se activa con cualquier productor futuro/fallback que omita `quality`.
- **Recomendación:** **fix** en iteración futura (helper compartido de calidad con default explícito, o contrato que prohíba `quality` ausente). Hasta entonces, monitorizar: si `signalQuality.flags` muestra cobertura insuficiente mientras las ventanas de correlación reportan presencia, se activa este path.

## 3. Decisión de fixes

La auditoría **no reveló bugs de sincronización activos** en la cadena de browser actual:

1. Reloj único page-relative en toda la ruta producto (rAF y `performance.now()` comparten time-origin; el ts de captura facial viaja intacto worker→main→orquestador).
2. Todos los emits de eventos de juego (ambas baterías) llevan timestamp explícito verificado línea por línea.
3. La normalización en batch (batería original) solo toca eventos que ya traen timestamp.

Por tanto, **no se aplican fixes de código** y los tests nuevos quedan como **regresión** (fijan el comportamiento consistente actual y demuestran los modos de falla de P1–P4 para que cualquier regresión futura falle de forma explícita y determinista). No se modificaron contratos.

El único candidato a fix de contrato identificado (P7, contrato `quality` asimétrico) queda documentado como recomendación para iteración futura, sin cambio de contrato en esta oleada.

## 4. Tests de regresión (nuevos)

Archivo: `src/telemetry/localSignalSync.test.js` — 6 tests deterministas, solo fixtures sintéticos, sin cámara, sin datos reales, sin persistencia de muestras crudas (los fixtures son números de timestamp + calidad, nunca landmarks/frames).

| # | Test | Path cubierto |
|---|---|---|
| 1 | Reloj único: ventanas de correlación contienen las muestras cuando ambos flujos usan el mismo dominio | Invariante de contrato (P1 control positivo) |
| 2 | Mezcla `Date.now()` vs `performance.now()`: ventanas vacías + `no_facial_samples` + `eligible:false` | P1 |
| 3 | Evento sin timestamp: fallback `now()` en tiempo de normalización (batch) desalinea la ventana (reloj inyectado) | P2 |
| 4 | Background tab: rAF detenido → hueco de muestras, reloj monótono, ventanas del hueco vacías y post-foreground pobladas | P3 |
| 5 | Latencia evento→ventana acotada: conteos exactos por RT y bound `Δt ≤ frameIntervalMs` | P4 |
| 6 | `findTrialPairs` descarta silenciosamente `game_event_v1` sin timestamp finito (contrato implícito) | P1/P2 (mecanismo de descarte) |

Ejecución:

```bash
NODE_ENV=test npx vitest run src/telemetry/localSignalSync.test.js --pool=threads --reporter=default
```

Resultado (2026-08-27): 6/6 GREEN (verificación post-delegación; las aserciones de presencia se alinearon al shape real de `summarizeFace`: `face.facePresenceRatio` y `face.topAUs` por ventana, y `trial.deltas` a nivel trial).

## 5. Nota de privacidad

Todo el análisis usa fixtures sintéticos generados en los tests. No se capturó, leyó ni persistió video, frames, landmarks, keypoints, pointer samples, rutas reconstructivas ni eventos crudos de juego. Los agregados inspeccionados en el trazado ya son allowlist-only y los flags `humanReviewOnly`/`noAutomatedDecision`/`observationalOnly`/`privacySafe` se mantienen intactos.
