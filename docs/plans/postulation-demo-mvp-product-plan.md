# KRUMM Postulation Demo MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Implement only after explicit user approval; this document is the planning deliverable.

**Goal:** Build a separate, polished candidate-facing demo MVP for job applications where games are the primary product experience, while video/telemetry/Edge AI processing runs quietly in the background and generates a final human-review report.

**Architecture:** Keep the current `test-mpfl` telemetry/reporting pipeline as the technical backbone, but introduce a new isolated demo surface under `src/postulation-demo/` with its own shell, visual language, game flow, mini background-status HUD, and final report screen. Use the `Test/` project as visual/product inspiration, not as the primary telemetry source, because `Test/src/components/DemoShell.jsx` currently uses a dummy post-demo report and intentionally skips camera/microphone prompts.

**Tech Stack:** React 19 + Vite 8, existing `test-mpfl` telemetry modules (`useFaceLandmarkerWorker`, `useMoveNet`, `gameTelemetry`, `gameCorrelation`, `edgeAiEngine`, final assessment/report modules), CSS modules/plain CSS matching the KRUMM product style from `Test/`, Vitest + Testing Library.

---

## 0. Current context observed

### Source project for robust telemetry and reports

Repo:

```text
/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl
```

Relevant current modules:

| Area | Existing files to reuse |
|---|---|
| Camera/video | `src/telemetry/adaptiveCapture.js`, `useFaceLandmarkerWorker.js`, `faceLandmarkerWorker.js` |
| AUs/FACS | `gestureInsights.js`, `auEnhancer.js`, `auProcessor.js` |
| Gaze/posture/MoveNet | `gazeEstimator.js`, `upperBodyPosture.js`, `useMoveNet.js` |
| Game telemetry | `gameTelemetry.js`, `gameCorrelation.js`, `pointerSampler.js`, `kinematics.js` |
| Edge AI | `edgeAiEngine.js`, `multimodalFeatures.js`, `assessmentFeatureVector.js` |
| Final report | `assessmentSession.js`, `talentProfile.js`, `finalAssessmentPayload.js`, `talentReportGenerator.js`, `reportSubmissionClient.js`, `finalAssessmentStorage.js` |
| Current guided battery | `assessment/UnifiedGameBattery.jsx`, `batteryConfig.js`, `SignalReadinessPanel.jsx`, `FinalReportPanel.jsx` |
| Stable games | `tasks/SimpleRTTask.jsx`, `PrecisionTargetingTask.jsx`, `PursuitTrackingTask.jsx`, `GoNoGoTask.jsx`, `ColorInterferenceTask.jsx`, `VisualSearchTask.jsx` |

### Product/design reference project

Repo:

```text
/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test
```

Useful references:

| Area | Files |
|---|---|
| Existing product shell/routing | `src/App.jsx` |
| Polished demo flow | `src/components/DemoShell.jsx`, `DemoShell.css` |
| Game gallery/progress | `GameGallery.jsx`, `ProgressTracker.jsx`, `GlobalProgressBar.jsx` |
| Candidate/recruiter surfaces | `PostulantesLogin.jsx`, `RecruiterDashboard.jsx`, `PostDemoScreen.jsx` |
| Mini background HUD idea | `LiveDemoTelemetryHud.jsx`, `LiveDemoTelemetryHud.css` |
| More attractive games | `games/GridFlowGame.jsx`, `LaserPuzzleGame.jsx`, `BalloonGame.jsx`, `GoNoGoGame.jsx`, `ColorWordGame.jsx`, etc. |

Important finding: `Test/src/components/DemoShell.jsx` explicitly says the public demo skips camera/microphone prompts and uses a dummy final report. For this new MVP demo, avoid copying that behavior. The new demo must generate a real final report from synchronized aggregate telemetry.

---

## 1. Product definition

### Target experience

A candidate opens a polished KRUMM application demo and experiences:

```text
Landing / postulante intro
→ privacy + camera setup
→ signal readiness in human terms
→ fullscreen game flow
→ unobtrusive “background processing” corner HUD
→ final progress/report generation screen
→ polished candidate/recruiter-style report preview
→ optional local export bundle
```

### Main product principle

The games are the product surface. The algorithmic stack must run quietly in the background.

Visible priority order:

1. Clear role/context and game instructions.
2. Smooth fullscreen gameplay.
3. Progress, time, completion feedback.
4. Small corner status showing that KRUMM is processing signals.
5. Final report and summary.
6. Technical details only behind expandable “Qué pasó detrás” sections.

### What this demo is not

- Not the current technical dashboard.
- Not a developer laboratory page.
- Not a raw metrics explorer.
- Not a backend/recruiter production system yet.
- Not a decision engine.

---

## 2. Recommended architecture

### Recommendation

Build inside `test-mpfl`, not inside `Test`, for v1.

Reason:

- `test-mpfl` already has stable synchronized telemetry, privacy guards, final payload, local report bundle, and current game-aware Edge AI.
- `Test` has better product shell/game aesthetics, but its demo report is currently dummy and its webcam pipeline is less complete than `test-mpfl`.
- Rebuilding in `test-mpfl` as a separate `postulation-demo` surface avoids destabilizing the technical PoC while allowing a polished MVP route.

### Route strategy

Add a separate entry surface without replacing the existing app:

```text
/postulaciones-demo
/postulaciones-demo?mode=record
/postulaciones-demo?fixture=1
```

Possible implementation:

```text
src/main.jsx
  if pathname starts with /postulaciones-demo → render <PostulationDemoApp />
  else → render current <App />
```

This avoids adding `react-router-dom` to `test-mpfl` and keeps the current PoC untouched.

### New folder proposal

```text
src/postulation-demo/
  PostulationDemoApp.jsx
  PostulationDemoShell.jsx
  PostulationLanding.jsx
  PostulationConsentSetup.jsx
  PostulationGameStage.jsx
  PostulationGameIntro.jsx
  PostulationProgressHeader.jsx
  BackgroundSignalOrchestrator.jsx
  BehindTheScenesMiniHud.jsx
  PostulationReportScreen.jsx
  PostulationReportSummary.jsx
  PostulationFallbackReport.jsx
  postulationDemoConfig.js
  postulationDemoSessionBuilder.js
  postulationDemoGameAdapters.js
  postulationDemoCopy.js
  postulationDemo.css
  __tests__/
```

---

## 3. Proposed MVP flow

## 3.1 Landing / candidate intro

Purpose: make it feel like a real product MVP, not a lab.

Content:

- KRUMM logo/title.
- “Evaluación gamificada para postulaciones”.
- Short explanation: “juegos breves + señales locales observacionales + reporte para revisión humana”.
- Role selector or fixed demo role:

```text
Analista de Operaciones
Atención / Coordinación
Técnico / Operaciones en terreno
```

- Time estimate:

```text
6-8 minutos en modo demo
```

- CTA:

```text
Comenzar demo de postulación
```

Files:

```text
src/postulation-demo/PostulationLanding.jsx
src/postulation-demo/postulationDemoCopy.js
src/postulation-demo/postulationDemo.css
```

---

## 3.2 Consent + setup

Purpose: ask for camera in product language, not technical language.

UI copy:

```text
KRUMM puede usar cámara local para estimar calidad de señal, AUs/FACS, mirada, postura y hombros visibles.
No se guarda video, frames, landmarks crudos ni trayectorias de puntero.
Puedes continuar con caveats si alguna señal no está disponible.
```

Inputs:

- Camera permission.
- Camera selector if multiple devices exist.
- “Continuar sin cámara” only if the presenter wants a fallback mode.

Use existing modules:

```text
requestCameraWithFallback()
normalizeVideoInputDevices()
useFaceLandmarkerWorker()
useMoveNet()
SignalReadinessPanel.jsx, adapted visually or wrapped
```

Files:

```text
src/postulation-demo/PostulationConsentSetup.jsx
src/postulation-demo/BackgroundSignalOrchestrator.jsx
src/postulation-demo/BehindTheScenesMiniHud.jsx
```

---

## 3.3 Game-focused assessment

Purpose: games occupy the viewport; telemetry stays background.

Layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ KRUMM · Postulación demo        Juego 2/5      04:21        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     GAME FULLSCREEN                         │
│                                                             │
│                                          ┌───────────────┐  │
│                                          │ Procesando... │  │
│                                          │ Cámara OK     │  │
│                                          │ Señales 6/9   │  │
│                                          └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

The corner HUD must be small and non-intrusive:

```text
Procesando en segundo plano
● Cámara local
● Señales sincronizadas
● Eventos de juego
● Reporte al finalizar
```

Expandable panel:

```text
¿Qué está pasando detrás?
- Sincronización por performance.now()
- AUs/FACS agregados
- Mirada/postura/hombros si disponibles
- Eventos de juego privacy-safe
- Correlación por ventanas pre/reacción/post
```

Do not show raw AUs, mesh, tables, or scientific dashboard by default.

Files:

```text
src/postulation-demo/PostulationDemoShell.jsx
src/postulation-demo/PostulationGameStage.jsx
src/postulation-demo/PostulationProgressHeader.jsx
src/postulation-demo/BehindTheScenesMiniHud.jsx
```

---

## 3.4 Game battery for MVP demo

### Option A — highest stability, first implementation

Use current `test-mpfl` games with a polished wrapper:

| Order | Game | Current component | Why |
|---:|---|---|---|
| 1 | RT Simple warmup | `SimpleRTTask.jsx` | calibrates response timing and gets candidate comfortable |
| 2 | Precision targeting | `PrecisionTargetingTask.jsx` | visuomotor precision; strong event contract |
| 3 | Go/No-Go | `GoNoGoTask.jsx` | inhibition control; clear to explain |
| 4 | Color interference | `ColorInterferenceTask.jsx` | conflict/interference; intuitive |
| 5 | Visual search | `VisualSearchTask.jsx` | attention/search; good final game |

This is the recommended v1 because it reuses stable telemetry and tests.

### Option B — more attractive product demo, second step

Port/adapt selected games from `Test` only after v1 is stable:

| Game | Source | Requirement before using |
|---|---|---|
| GridFlow | `Test/src/games/GridFlowGame.jsx` | adapter emits `game_event_v1`, stable completion summary, no raw path persistence |
| Laser Puzzle | `Test/src/games/LaserPuzzleGame.jsx` | adapter emits trial/stimulus/response events and summary |
| Balloon | `Test/src/games/BalloonGame.jsx` | adapter emits risk/reward events and privacy-safe summary |

Recommendation: plan v1 with Option A; add Option B as Phase H or v1.1 polish, because importing games from `Test` directly may bring different state conventions, CSS, dependencies, and dummy-report assumptions.

---

## 4. Background signal orchestration

Create one orchestrator hook/component that owns all background signal state.

Suggested API:

```jsx
<BackgroundSignalOrchestrator
  active={cameraAllowed && demoStarted}
  videoRef={videoRef}
  gameEventsRef={gameEventsRef}
  onSnapshot={setSignalSnapshot}
  onFinalContext={setFinalSignalContext}
/>
```

Responsibilities:

- Start/stop camera.
- Run Face Landmarker worker.
- Run MoveNet low-FPS main-thread detector.
- Maintain bounded histories:

```text
faceSamplesRef
latestLandmarks
gazeSamplesRef
postureSamplesRef
upperBodySamplesRef
gameEventsRef
pointerSummariesRef if needed
```

- Compute light UI snapshot every ~500-1000ms.
- Keep final report data ready without rendering full dashboard.
- Use `performance.now()` for all synchronization.
- Reset AU/gaze/posture state at session start.
- Never persist raw video/frames/landmarks/pointer paths.

Files:

```text
src/postulation-demo/BackgroundSignalOrchestrator.jsx
src/postulation-demo/usePostulationTelemetrySession.js
src/postulation-demo/postulationDemoSessionBuilder.js
```

---

## 5. Data model and synchronization

### Core runtime refs

```text
sessionStartRef: performance.now()
gameEventsRef: game_event_v1[]
faceSamplesRef: privacy-safe samples only
gazeSamplesRef: aggregate gaze samples
postureSamplesRef: aggregate posture samples
upperBodySamplesRef: MoveNet metrics only
gameSummariesRef: per-game completion summaries
```

### Event contract

Every game adapter must emit:

```text
game_start
game_end
trial_start
stimulus_shown
response
trial_end
```

At minimum, each response must include:

```text
trialId
gameId
timestamp = performance.now()
correct/outcome
reactionTimeMs if applicable
score if applicable
privacy flags
```

For games without trial semantics, define pseudo-trials or level phases.

### Final assembly

At demo completion:

```text
summarizeGameEvents(gameEventsRef.current)
correlateGameWithMultimodalSignals({ gameEvents, faceSamples, gazeSamples, postureSamples, upperBodySamples })
runEdgeAIInference({ faceSamples, gameSummary, gameCorrelation, latestGaze, latestPosture, moveNetPose })
buildAssessmentFeatureVectorV2(...)
buildUnifiedAssessmentSession(...)
buildTalentProfile(...)
buildFinalAssessmentPayload(...)
generateTalentReport(...)
buildLocalReportBundle(...)
```

---

## 6. Final report UX

Candidate-facing final screen should be polished and not look like a raw Markdown viewer.

Sections:

1. “Demo completada”.
2. Session quality badges:
   - cámara/local;
   - muestras;
   - rostro presente;
   - juegos completados;
   - caveats.
3. Game result cards.
4. Skill profile cards:
   - velocidad de procesamiento;
   - precisión visomotora;
   - atención sostenida;
   - inhibición;
   - interferencia;
   - búsqueda visual;
   - regulación bajo carga.
5. “Qué se procesó en segundo plano” expandable section.
6. Governance/privacy block.
7. Buttons:
   - Ver reporte completo.
   - Descargar reporte local.
   - Descargar bundle técnico.
   - Repetir demo.

Technical report can reuse:

```text
FinalReportPanel.jsx
FinalAssessmentHistoryPanel.jsx
```

but default UX should be a polished summary, not the developer panel.

Files:

```text
src/postulation-demo/PostulationReportScreen.jsx
src/postulation-demo/PostulationReportSummary.jsx
src/postulation-demo/PostulationReportTechnicalDrawer.jsx
```

---

## 7. Phased roadmap

# Fase A — Product shell separado

**Estado:** [x] Completado  
**Prioridad:** 1  
**Objetivo:** crear una ruta/superficie separada para demo de postulaciones sin afectar `App.jsx` técnico.

## Archivos

- Creado: `src/postulation-demo/PostulationDemoApp.jsx`
- Creado: `src/postulation-demo/PostulationLanding.jsx`
- Creado: `src/postulation-demo/postulationDemo.css`
- Creado: `src/postulation-demo/postulationDemoCopy.js`
- Creado: `src/postulation-demo/postulationDemoRoute.js`
- Creado: `src/postulation-demo/PostulationDemoApp.test.jsx`
- Modificado: `src/main.jsx` para seleccionar app por pathname.

## Implementación realizada

1. RED confirmado: `PostulationDemoApp.test.jsx` falló por import faltante antes de crear archivos.
2. Se creó una landing candidate-facing con copy de producto, cards de valor y bloque de privacidad/alcance.
3. Se creó una fase interna `setup-preview` para validar el CTA sin activar cámara todavía.
4. Se agregó `isPostulationDemoPath()` para aislar `/postulaciones-demo` sin introducir `react-router-dom`.
5. `main.jsx` ahora renderiza `PostulationDemoApp` solo para `/postulaciones-demo`; el resto sigue usando `App` técnico.
6. Se mantuvo Fase A sin cámara, sin Workers y sin cambios en pipeline de telemetría.

## Evidencia

```bash
NODE_ENV=test npx vitest run src/postulation-demo/PostulationDemoApp.test.jsx --pool=forks --maxWorkers=1 --reporter=default
```

Resultado:

```text
1 test file passed
3 tests passed
```

```bash
NODE_ENV=test npx vitest run src/App.test.jsx src/postulation-demo/PostulationDemoApp.test.jsx --pool=forks --maxWorkers=1 --reporter=default
```

Resultado:

```text
2 test files passed
7 tests passed
```

```bash
npx oxlint src/postulation-demo src/main.jsx
```

Resultado:

```text
Found 0 warnings and 0 errors.
```

```bash
npm run build
```

Resultado:

```text
built successfully
```

## Criterios de éxito

- [x] `/postulaciones-demo` no rompe la app técnica existente.
- [x] El landing se ve como producto, no como dashboard.
- [x] No hay dependencias nuevas.
- [x] No se inicia cámara todavía.
- [x] La ruta se puede detectar sin router nuevo.

---

# Fase B — Consentimiento, cámara y readiness productizado

**Estado:** [x] Completada — 2026-07-09  
**Prioridad:** 2  
**Objetivo:** iniciar cámara y señales en lenguaje de producto, con readiness compacto.

## Archivos

- Creado: `src/postulation-demo/PostulationConsentSetup.jsx`
- Creado: `src/postulation-demo/BackgroundSignalOrchestrator.jsx`
- Creado: `src/postulation-demo/BehindTheScenesMiniHud.jsx`
- Tests: `src/postulation-demo/BehindTheScenesMiniHud.test.jsx`, `src/postulation-demo/BackgroundSignalOrchestrator.test.jsx`, `src/postulation-demo/PostulationDemoApp.test.jsx`

## Implementado

1. Setup candidate-facing con consentimiento, privacidad y CTA de cámara local.
2. `BackgroundSignalOrchestrator` jsdom-safe que activa `requestCameraWithFallback()`, `useFaceLandmarkerWorker()` y `useMoveNet()` solo cuando la persona habilita cámara.
3. Snapshot compacto para HUD: cámara, rostro, señal, eventos y reporte.
4. Caveat explícito cuando MoveNet está ready pero no hay hombros visibles; no hay fallback geométrico.
5. No se muestra dashboard técnico ni mesh por defecto; la vista se mantiene como producto.
6. Señales y muestras usadas solo en memoria para agregados; no se exportan video, frames, landmarks crudos ni trayectorias.

## Evidencia

```bash
NODE_ENV=test npx vitest run src/postulation-demo/BehindTheScenesMiniHud.test.jsx src/postulation-demo/BackgroundSignalOrchestrator.test.jsx src/postulation-demo/PostulationDemoApp.test.jsx --pool=forks --maxWorkers=1 --reporter=default
```

Resultado dentro del bloque focal B/C:

```text
5 test files passed
11 tests passed
```

## Criterios de éxito

- [x] Cámara se solicita de forma explícita y local.
- [x] Si MoveNet no detecta hombros, muestra caveat.
- [x] No hay fallback geométrico de hombros.
- [x] No se muestra dashboard técnico en la demo de postulaciones.

---

# Fase C — Game stage fullscreen y battery demo para postulaciones

**Estado:** [x] Completada — 2026-07-09  
**Prioridad:** 3  
**Objetivo:** priorizar juegos con experiencia visual limpia y progresión clara.

## Archivos

- Creado: `src/postulation-demo/PostulationGameStage.jsx`
- Creado: `src/postulation-demo/PostulationProgressHeader.jsx`
- Creado: `src/postulation-demo/postulationDemoConfig.js`
- Tests: `src/postulation-demo/PostulationGameStage.test.jsx`, `src/postulation-demo/postulationDemoConfig.test.js`

## Config implementada

```js
export const POSTULATION_DEMO_BATTERY = [
  { gameId: 'simple_rt', label: 'Calentamiento de reacción', visible: false },
  { gameId: 'precision_targeting', label: 'Precisión visomotora', visible: true },
  { gameId: 'go_nogo', label: 'Control inhibitorio', visible: true },
  { gameId: 'color_interference', label: 'Interferencia cognitiva', visible: true },
  { gameId: 'visual_search', label: 'Búsqueda visual', visible: true },
];
```

`simple_rt` queda definido como warmup/calibración no destacado; el stage visible inicia con precisión visomotora y continúa con Go/No-Go, Stroop y búsqueda visual.

## Implementado

1. Header KRUMM candidate-facing con juego actual, descripción, duración y progreso.
2. Stage fullscreen que monta un juego a la vez y mantiene el HUD discreto en esquina.
3. Defaults a juegos estables de `test-mpfl`: Precision Targeting, Go/No-Go, Color Interference y Visual Search.
4. Tests con juegos mockeables para validar avance de bloques sin depender de timers reales.
5. Eventos `game_start`/`game_end` emitidos con `performance.now()` y wrapper `game_event_v1`.
6. Integración en `PostulationDemoApp`: setup → juegos → preview de reporte Fase D.

## Evidencia

```bash
NODE_ENV=test npx vitest run src/postulation-demo/postulationDemoConfig.test.js src/postulation-demo/PostulationGameStage.test.jsx src/postulation-demo/BehindTheScenesMiniHud.test.jsx src/postulation-demo/BackgroundSignalOrchestrator.test.jsx src/postulation-demo/PostulationDemoApp.test.jsx --pool=forks --maxWorkers=1 --reporter=default
```

Resultado:

```text
5 test files passed
11 tests passed
```

## Criterios de éxito

- [x] Juegos ocupan la pantalla principal.
- [x] HUD no tapa el stage principal y queda en una esquina.
- [x] Eventos de juego se sincronizan con `performance.now()`.
- [x] Stage es testeable con juegos mockeables y usa juegos reales por defecto.

---

# Fase D — Synchronization engine y sesión final real

**Estado:** [x] D v1 implementada — 2026-07-09  
**Prioridad:** 4  
**Objetivo:** garantizar que juegos, cámara, gaze, postura y MoveNet alimenten un reporte real y sincronizado.

## Archivos

- Creado: `src/postulation-demo/postulationDemoSessionBuilder.js`
- Test: `src/postulation-demo/postulationDemoSessionBuilder.test.js`
- Integrado: `src/postulation-demo/PostulationDemoApp.jsx` captura eventos/resúmenes y muestra preview final.

## Implementado

1. Test RED/GREEN: una demo completada con eventos + snapshot de señal produce artefactos finales privacy-safe.
2. `PostulationDemoApp` conserva `gameEventsRef` acotado en memoria y no lo persiste ni exporta como eventos crudos.
3. Al completar el stage, `buildPostulationDemoArtifacts()` genera:

```text
gameSummary
assessmentSession
talentProfile
finalPayload
reports
bundle
```

4. `edgeAIResult` D v1 es un resumen agregado/caveated (`krumm-postulation-demo-aggregate-v0.1`) para mantener contrato con `talentProfile` sin inventar señales crudas.
5. Si no hay cámara o muestras, el reporte se genera con caveats (`camera_not_enabled_or_no_samples`, `low_sample_count`, `low_face_presence`, `low_face_confidence`) y confianza baja.
6. Preview final muestra runId, validación privacy-safe, conteo de archivos y primeras líneas del reporte Markdown.

## Pendiente para D v2

- Incorporar `gameCorrelation.aggregate` real de la ruta `/postulaciones-demo` usando histories bounded de gaze/postura/upperBody.
- Construir `assessment_feature_vector_v2` específico de esta ruta en vez de dejarlo `null`.
- Añadir botones de descarga directa desde el preview de reporte o reutilizar `FinalReportPanel` con una variante productizada.

## Evidencia

```bash
NODE_ENV=test npx vitest run src/postulation-demo/postulationDemoSessionBuilder.test.js src/postulation-demo/PostulationDemoApp.test.jsx --pool=forks --maxWorkers=1 --reporter=default
```

Resultado en tests focales:

```text
postulationDemoSessionBuilder.test.js: 2 tests passed
PostulationDemoApp.test.jsx: 5 tests passed
```

## Criterios de éxito

- [x] Final payload valida con `validateFinalAssessmentPayload()`.
- [x] No contiene keys prohibidas en session/payload/manifest.
- [x] Sin cámara, el reporte conserva caveats y no inventa calidad facial.
- [ ] D v2: correlación usa ventanas agregadas reales de esta ruta.

---

# Fase E — Mini HUD “lo que pasa detrás”

**Estado:** [ ] Por implementar  
**Prioridad:** 5  
**Objetivo:** mostrar procesamiento en segundo plano sin convertir la demo en panel técnico.

## Archivos

- Crear o completar: `src/postulation-demo/BehindTheScenesMiniHud.jsx`
- Crear: `src/postulation-demo/BehindTheScenesDrawer.jsx`
- Test: `src/postulation-demo/BehindTheScenesMiniHud.test.jsx`

## HUD compacto

Default colapsado:

```text
● Procesando
Cámara OK · Señales 7/9 · Eventos 24
```

Expandido:

```text
Señales locales
- Cámara local activa
- FaceMesh agregado
- AUs/FACS agregados
- Mirada/postura en calibración
- MoveNet hombros OK / caveat
- Eventos de juego sincronizados
```

## Reglas

- Nunca mostrar landmarks crudos.
- Nunca mostrar paths de puntero.
- Nunca mostrar expresiones como conclusión psicológica.
- Siempre etiquetar como observacional/local.

---

# Fase F — Report screen pulido

**Estado:** [ ] Por implementar  
**Prioridad:** 6  
**Objetivo:** transformar el reporte técnico en una pantalla MVP atractiva para postulaciones.

## Archivos

- Crear: `src/postulation-demo/PostulationReportScreen.jsx`
- Crear: `src/postulation-demo/PostulationReportSummary.jsx`
- Crear: `src/postulation-demo/PostulationReportTechnicalDrawer.jsx`
- Test: `src/postulation-demo/PostulationReportScreen.test.jsx`

## Tareas

1. Test RED: renderiza “Reporte listo para revisión humana”.
2. Mostrar cards de juegos completados.
3. Mostrar perfil de habilidades observacionales.
4. Mostrar calidad y caveats.
5. Integrar descargas desde `buildLocalReportBundle()`.
6. Añadir sección “Qué pasó detrás”.
7. Mantener lenguaje conservador.

## Criterios de éxito

- La primera vista parece producto MVP.
- El reporte técnico sigue disponible, pero no domina la UI.
- No hay claims de decisión automática.

---

# Fase G — Modo fallback y demo fixture

**Estado:** [ ] Por implementar  
**Prioridad:** 7  
**Objetivo:** permitir una demo estable incluso si la cámara falla o la reunión no permite jugar todo.

## Archivos

- Crear: `src/postulation-demo/postulationDemoFixture.js`
- Crear: `src/postulation-demo/PostulationFallbackReport.jsx`
- Test: `src/postulation-demo/postulationDemoFixture.test.js`

## Tareas

1. Crear fixture de payload final privacy-safe.
2. Crear modo URL:

```text
/postulaciones-demo?fixture=1
```

3. Mostrar aviso claro:

```text
Datos sintéticos de demostración
```

4. Prohibir mezclar fixture con sesión real sin etiqueta.

## Criterios de éxito

- Plan B usable en reuniones.
- Fixture no contiene PII ni raw telemetry.
- El usuario puede mostrar reporte si cámara falla.

---

# Fase H — Port opcional de juegos más atractivos desde `Test`

**Estado:** [ ] Por implementar  
**Prioridad:** 8  
**Objetivo:** mejorar atractivo visual incorporando juegos tipo GridFlow/Laser/Balloon con adaptadores seguros.

## Archivos fuente posibles

```text
Test/src/games/GridFlowGame.jsx
Test/src/games/LaserPuzzleGame.jsx
Test/src/games/BalloonGame.jsx
Test/src/components/GameGallery.jsx
Test/src/components/ProgressTracker.jsx
```

## Archivos destino posibles

```text
src/postulation-demo/imported-games/GridFlowPostulationGame.jsx
src/postulation-demo/imported-games/LaserPostulationGame.jsx
src/postulation-demo/imported-games/BalloonPostulationGame.jsx
src/postulation-demo/imported-games/importedGameAdapters.js
```

## Tareas

1. Portar un juego a la vez.
2. Crear adapter de `onGameEvent` para `game_event_v1`.
3. Crear test de estabilidad de re-render.
4. Crear test de privacidad de payload.
5. Verificar que CSS no rompa el stage.

## Criterio de entrada

No iniciar esta fase hasta que Fases A-G estén verdes. El atractivo visual no debe sacrificar sincronización ni estabilidad.

---

# Fase I — Design polish y QA visual

**Estado:** [ ] Por implementar  
**Prioridad:** 9  
**Objetivo:** llevar la demo a apariencia de producto MVP.

## Design direction

Inspiración permitida:

- `Test/src/components/DemoShell.css` para layout fullscreen, header flotante, selección de juegos.
- Landing estilo SaaS moderno: fondo claro, gradientes sobrios, cards, progress chips.
- HUD tipo “system status” pequeño, no dashboard.

## Tareas

1. Crear tokens CSS:

```text
--krumm-bg
--krumm-surface
--krumm-primary
--krumm-accent
--krumm-success
--krumm-warning
--krumm-danger
```

2. Revisar responsive para 1366×768, 1440×900, 1920×1080.
3. Evitar overlays sobre objetivos de juego.
4. Capturar screenshots manuales.
5. Ajustar contraste y tipografía.

## Criterios de éxito

- El demo se entiende sin explicación técnica.
- El HUD no molesta al juego.
- El reporte se ve presentable para una reunión.

---

# Fase J — Verificación, ensayo y documentación

**Estado:** [ ] Por implementar  
**Prioridad:** 10  
**Objetivo:** asegurar estabilidad para demo real.

## Archivos

- Crear: `docs/demo/postulation-demo-runbook.md`
- Crear: `docs/demo/postulation-demo-manual-smoke.md`
- Modificar: `docs/reference-guide.md` cuando la implementación exista.

## Comandos mínimos

```bash
npx oxlint src/postulation-demo src/telemetry src/assessment
NODE_ENV=test npx vitest run src/postulation-demo --pool=forks --maxWorkers=1
NODE_ENV=test npx vitest run src/tasks/gameRerenderStability.test.jsx src/assessment/FinalReportPanel.test.jsx --pool=forks --maxWorkers=1
npm run build
npm audit --audit-level=high --omit=dev
```

## Manual smoke requerido

1. Abrir `/postulaciones-demo`.
2. Iniciar cámara.
3. Confirmar readiness.
4. Jugar batería completa.
5. Confirmar HUD en esquina.
6. Generar reporte.
7. Descargar bundle.
8. Repetir con cámara denegada.
9. Probar `?fixture=1`.
10. Revisar consola del navegador.

---

## 8. Testing strategy

### Unit tests

- `postulationDemoConfig.test.js`: orden, duraciones, labels, skills.
- `postulationDemoGameAdapters.test.js`: eventos normalizados, sin raw pointer path.
- `BackgroundSignalOrchestrator.test.jsx`: render sin Worker en jsdom, estados idle/pending.
- `BehindTheScenesMiniHud.test.jsx`: no muestra raw data ni claims peligrosos.
- `PostulationReportScreen.test.jsx`: render de summary + governance.

### Integration tests

- `PostulationDemoApp.test.jsx`: landing → setup → gameplay mock → report.
- `postulationDemoSessionBuilder.test.js`: final payload privacy-safe.
- `postulationDemoFallback.test.jsx`: fixture etiquetada como sintética.

### Regression tests

- Existing `gameRerenderStability.test.jsx` must remain green.
- Existing final-report tests must remain green.
- Build must remain green.

---

## 9. Privacy and governance rules

Hard rules:

- No raw video persistence.
- No frame persistence.
- No raw landmarks persistence.
- No raw pointer paths persistence.
- No raw game event dump in final payload.
- No automated hiring recommendation.
- No personality, clinical, or truth/falsehood claims.
- Every report must state “revisión humana”.
- Every camera failure must become a caveat, not a fabricated signal.

Payload must pass:

```js
validateFinalAssessmentPayload(payload).ok === true
```

---

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Importing `Test` games breaks CSS/layout | Start with stable `test-mpfl` games; port visual games later behind adapters. |
| Telemetry re-renders restart games | Use refs for parent callbacks; keep game event handlers stable; run `gameRerenderStability.test.jsx`. |
| Camera/MoveNet fails in meeting | `?fixture=1`, explicit caveats, fallback report. |
| Demo becomes too technical | Technical data only in mini HUD/drawer; no dashboard by default. |
| Report looks too raw | Build polished summary screen first; technical report behind drawer/export. |
| Data clocks desync | Use `performance.now()` everywhere. |
| Privacy regression | Automated scans + final payload validator + no raw key traversal. |
| Over-scoping into product backend | Keep MVP local-only unless separately approved. |

---

## 11. Open decisions before implementation

1. Should v1 use only current `test-mpfl` stable games, or should one attractive `Test` game be ported immediately?
   - Recommendation: stable games first; port GridFlow/Laser after v1 is green.
2. Should the route be `/postulaciones-demo` or `/demo-postulacion`?
   - Recommendation: `/postulaciones-demo` to match the existing `Test` candidate route language.
3. Should camera be required or optional?
   - Recommendation: optional with caveats for demo resilience; required only for “full signal” badge.
4. Should report be candidate-facing, recruiter-facing, or both?
   - Recommendation: candidate-facing completion plus recruiter-style technical drawer.
5. Should the final report be saved to local history automatically?
   - Recommendation: yes, but labeled local/demo and with clear delete/reset action.

---

## 12. Implementation order summary

Recommended sequence:

```text
A. Separate product shell route
B. Consent/setup + background signal orchestrator
C. Fullscreen game stage with stable current games
D. Real synchronized session + final payload/report
E. Mini HUD / behind-the-scenes drawer
F. Polished report screen
G. Fixture/fallback mode
H. Optional port of attractive Test games
I. Visual polish pass
J. Manual smoke + docs
```

Do not start with game porting. First prove the separate demo can run stable with real synchronized telemetry and a real final report.

---

## 13. Definition of done for MVP demo

The demo is MVP-ready when:

- `/postulaciones-demo` opens independently.
- Candidate can complete the demo without seeing the technical dashboard.
- Camera/FaceMesh/MoveNet processing runs in the background when permitted.
- Games emit synchronized `game_event_v1` events.
- Final report is generated from real aggregate telemetry.
- HUD shows processing status in a corner without blocking gameplay.
- Fallback fixture exists and is clearly labeled synthetic.
- Build, focal tests, audit, and privacy scans pass.
- Manual browser smoke is documented.
