# Handoff nueva sesión — KRUMM Postulation Demo MVP

**Fecha:** 2026-07-09  
**Repo:** `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl`  
**Ruta demo:** `/postulaciones-demo`  
**Estado actual:** Dv2 implementada — correlación/vector específicos de la ruta de postulaciones.
**Próximo foco recomendado:** Fase F/E — pantalla de reporte productizada y HUD/drawer refinado.

---

## 1. Objetivo de la nueva sesión

Retomar el trabajo de la demo separada para postulaciones, tipo producto MVP:

- juegos al frente;
- cámara, FaceMesh, AUs/FACS, gaze, postura, MoveNet y Edge AI corriendo en segundo plano;
- HUD discreto “lo que pasa detrás”;
- reporte final real, privacy-safe y para revisión humana;
- sin dashboard técnico como superficie principal;
- sin video, frames, landmarks crudos, eventos crudos ni trayectorias de puntero persistidas/exportadas.

El siguiente agente debe continuar desde **Fase Dv2 completada** hacia la productización de descargas/reporte visual.

---

## 2. Estado implementado

### Fase A — Shell producto

Implementado:

- `src/main.jsx` enruta `/postulaciones-demo` hacia `PostulationDemoApp`.
- `src/postulation-demo/PostulationDemoApp.jsx`
- `src/postulation-demo/PostulationLanding.jsx`
- `src/postulation-demo/postulationDemoCopy.js`
- `src/postulation-demo/postulationDemoRoute.js`
- `src/postulation-demo/postulationDemo.css`
- `src/postulation-demo/PostulationDemoApp.test.jsx`

La app técnica principal sigue en `/`.

### Fase B — Consentimiento, cámara y readiness productizado

Implementado:

- `src/postulation-demo/PostulationConsentSetup.jsx`
- `src/postulation-demo/BackgroundSignalOrchestrator.jsx`
- `src/postulation-demo/BehindTheScenesMiniHud.jsx`
- `src/postulation-demo/BehindTheScenesMiniHud.test.jsx`
- `src/postulation-demo/BackgroundSignalOrchestrator.test.jsx`

Capacidades:

- botón explícito `Activar cámara local`;
- `requestCameraWithFallback()`;
- `useFaceLandmarkerWorker()`;
- `useMoveNet()` bajo FPS;
- snapshot compacto:
  - Cámara;
  - Rostro;
  - Señal;
  - Eventos;
  - Reporte;
- caveat `MoveNet sin hombros visibles` cuando aplica;
- sin dashboard técnico ni mesh visible por defecto.

### Fase C — Stage fullscreen de juegos

Implementado:

- `src/postulation-demo/postulationDemoConfig.js`
- `src/postulation-demo/postulationDemoConfig.test.js`
- `src/postulation-demo/PostulationProgressHeader.jsx`
- `src/postulation-demo/PostulationGameStage.jsx`
- `src/postulation-demo/PostulationGameStage.test.jsx`

Secuencia actual:

```text
simple_rt              → warmup oculto/no destacado
precision_targeting    → primer juego visible
go_nogo
color_interference
visual_search
```

El stage:

- muestra progreso `Juego 1 de 4`;
- monta un juego a la vez;
- mantiene HUD en esquina;
- emite `game_event_v1` con `performance.now()`;
- acepta `gameComponents` inyectables para tests.

### Fase D v1 — Sesión, payload y reporte real desde agregados

Implementado:

- `src/postulation-demo/postulationDemoSessionBuilder.js`
- `src/postulation-demo/postulationDemoSessionBuilder.test.js`
- integración en `src/postulation-demo/PostulationDemoApp.jsx`

Al terminar juegos, genera:

```text
gameSummary
assessmentSession
talentProfile
finalPayload
reports
bundle
```

Contratos:

```text
krumm_unified_assessment_session_v1
krumm_talent_profile_v1
krumm_final_assessment_payload_v1
krumm_talent_report_v1
krumm_report_delivery_bundle_v1
```

D v1 usa Edge summary agregado/caveated:

```text
krumm-postulation-demo-aggregate-v0.1
```

### Fase D v2 — Correlación/vector route-specific

Implementado:

- `BackgroundSignalOrchestrator` mantiene histories bounded específicas de `/postulaciones-demo` para face samples sanitizadas, gaze, postura y upperBody/MoveNet.
- `PostulationDemoApp` recibe un `signalContext` en ref para evitar re-render loops y lo entrega al builder final.
- `postulationDemoSessionBuilder.js` construye `gameCorrelation.aggregate` real vía `correlateGameWithMultimodalSignals()` cuando existen pares `stimulus_shown`/`response`.
- Construye `assessment_feature_vector_v2` vía `buildGameFeatureVectorV2()` y lo sanitiza para que la sesión/payload final no exponga flags o campos raw.
- Usa `runEdgeAIInference()` v9.1 cuando hay face samples suficientes; si no, conserva fallback agregado/caveated sin inventar señal.
- La salida final sigue exportando solo agregados: `assessmentSession.gameCorrelation.aggregate`, `payload.behavioral.gameCorrelationAggregate` y `featureVectorV2` sin `windows`, eventos crudos, landmarks, keypoints ni samples crudos.

Caveat: si no hay cámara/muestras, no inventa calidad; genera reporte con:

```text
camera_not_enabled_or_no_samples
low_sample_count
low_face_presence
low_face_confidence
```

---

## 3. Próximo trabajo: Dv2

Objetivo Dv2:

1. Añadir histories bounded específicas de `/postulaciones-demo` para:
   - face samples sanitizadas;
   - gaze;
   - postura;
   - upperBody/MoveNet;
   - eventos de juego normalizados.
2. Construir `gameCorrelation.aggregate` real para esta ruta usando `src/telemetry/gameCorrelation.js`.
3. Construir `assessment_feature_vector_v2` usando `src/telemetry/gameFeatureVector.js`.
4. Reemplazar o enriquecer el Edge summary D v1 con una salida más alineada a `edgeAiEngine.js`, sin inventar señal.
5. Integrar el vector/correlación en `postulationDemoSessionBuilder.js`.
6. Añadir tests RED/GREEN:
   - `postulationDemoSessionBuilder.test.js` debe exigir `gameCorrelation.aggregate` y `featureVectorV2` cuando hay datos suficientes;
   - test con cámara ausente debe seguir pasando con caveats;
   - privacidad: no `video`, `frames`, `landmarks`, `faceSamples`, `pointerSamples`, `rawGameEvents`, `windows` exportadas.
7. Luego avanzar a productized downloads / Fase E HUD refinado.

---

## 4. Archivos clave para leer primero

Antes de tocar código, el nuevo agente debe leer:

```text
docs/plans/postulation-demo-mvp-product-plan.md
docs/plans/postulation-demo-new-session-handoff.md
src/postulation-demo/PostulationDemoApp.jsx
src/postulation-demo/BackgroundSignalOrchestrator.jsx
src/postulation-demo/PostulationGameStage.jsx
src/postulation-demo/postulationDemoSessionBuilder.js
src/postulation-demo/postulationDemoSessionBuilder.test.js
src/telemetry/gameCorrelation.js
src/telemetry/gameFeatureVector.js
src/telemetry/gameTelemetry.js
src/assessment/assessmentSession.js
src/assessment/finalAssessmentPayload.js
src/assessment/talentProfile.js
src/assessment/talentReportGenerator.js
```

Si se toca UI/guía, también leer:

```text
src/components/ReferenceGuide.jsx
docs/reference-guide.md
```

---

## 5. Skills que debe cargar la nueva sesión

Cargar explícitamente al inicio:

```text
hermes-agent
krumm-edge-ai
krumm-talent-assessment-development
software-delivery-workflows
web-design-prototyping
react-responsive-game-layouts
```

Razón:

- `hermes-agent`: entender toolsets/config y limitaciones del runtime.
- `krumm-edge-ai`: reglas específicas de KRUMM, MoveNet, privacy-safe, postulation demo A-D.
- `krumm-talent-assessment-development`: producto candidato/revisión humana/privacy.
- `software-delivery-workflows`: TDD y verificación.
- `web-design-prototyping`: demo pulida/product UI.
- `react-responsive-game-layouts`: stage fullscreen y viewport.

---

## 6. Toolsets/capacidades recomendadas para nueva sesión

En esta sesión se verificó:

```text
Hermes Agent v0.18.2
web toolset: enabled en config
browser toolset: enabled en config
terminal/file/code_execution/vision/delegation/cronjob/session_search: enabled
```

Pero las tools web/browser no estuvieron expuestas directamente en la conversación actual. Como los cambios de toolsets toman efecto en nueva sesión, iniciar una sesión nueva debería ayudar.

### Comando recomendado para iniciar Hermes desde el repo

```bash
cd /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl
hermes -s hermes-agent -s krumm-edge-ai -s krumm-talent-assessment-development -s software-delivery-workflows -s web-design-prototyping -s react-responsive-game-layouts
```

Si se quiere forzar toolsets desde CLI:

```bash
cd /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl
hermes chat \
  -s hermes-agent \
  -s krumm-edge-ai \
  -s krumm-talent-assessment-development \
  -s software-delivery-workflows \
  -s web-design-prototyping \
  -s react-responsive-game-layouts \
  -t terminal,file,code_execution,skills,memory,session_search,delegation,cronjob,web,browser,vision,todo
```

Si el TUI ya está abierto, opción simple:

```text
/reset
```

y luego pedir al agente que cargue las skills anteriores.

---

## 7. Herramientas reales del entorno verificadas

### Git

Disponible:

```text
/usr/bin/git
git version 2.53.0
branch: main
remote: Test-camara -> https://github.com/Carloss97/test-mpfl.git
```

No usar commit/push/reset/rebase sin permiso explícito.

### GitHub CLI

No disponible:

```text
gh: command not found
```

Opcional para mejorar PR/CI:

```bash
sudo apt install gh
# o instalador oficial de GitHub CLI
gh auth login
```

### Web desde WSL

Disponible por terminal:

```text
curl example.com -> 200
curl hermes-agent docs -> 200
curl registry.npmjs.org/vite -> 200
```

### Browser automation local

No disponible como comando:

```text
chromium: missing
chromium-browser: missing
google-chrome: missing
microsoft-edge: missing
playwright: missing
```

`npx` sí está disponible.

Para mejorar QA visual del MVP, considerar instalar Playwright:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

No se ejecutó todavía para evitar añadir dependencia sin decisión explícita.

### Python

```text
python3: 3.14.4
pip: missing
uv: installed
```

Si se requieren paquetes Python, usar `uv`.

---

## 8. Verificación última conocida

Última verificación exitosa después de Fases B-C-Dv1:

```bash
NODE_ENV=test npx vitest run src/postulation-demo/postulationDemoConfig.test.js src/postulation-demo/PostulationGameStage.test.jsx src/postulation-demo/BehindTheScenesMiniHud.test.jsx src/postulation-demo/BackgroundSignalOrchestrator.test.jsx src/postulation-demo/postulationDemoSessionBuilder.test.js src/postulation-demo/PostulationDemoApp.test.jsx src/App.test.jsx --pool=forks --maxWorkers=1 --reporter=default
```

Resultado:

```text
7 test files passed
18 tests passed
```

Lint:

```bash
npx oxlint src/postulation-demo src/main.jsx src/components/ReferenceGuide.jsx
```

Resultado:

```text
Found 0 warnings and 0 errors.
```

Build:

```bash
npm run build
```

Resultado:

```text
✓ 1368 modules transformed.
✓ built in 2.84s
```

Audit/scans:

```text
npm audit --audit-level=high --omit=dev -> found 0 vulnerabilities
line_prefix/conflict_markers/secret_hits/unsafe_raw_exports/automated_decision_claims -> []
```

Warnings conocidos no bloqueantes:

```text
HTMLCanvasElement.getContext() not implemented en jsdom
React act(...) warnings en App.test.jsx
Vite chunk size warning > 500 kB
```

---

## 9. Estado Git actual esperado

No hay commits hechos por Hermes.

Archivos modificados/creados relevantes:

```text
M docs/reference-guide.md
M src/components/ReferenceGuide.jsx
M src/main.jsx
?? docs/plans/postulation-demo-mvp-product-plan.md
?? docs/plans/postulation-demo-new-session-handoff.md
?? src/postulation-demo/*
```

Antes de continuar, correr:

```bash
git status --short --untracked-files=all
```

---

## 10. Prompt bootstrap para copiar en la nueva sesión

Copiar/pegar esto al agente nuevo:

```text
Estamos en /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl. Retoma la demo separada KRUMM para postulaciones desde docs/plans/postulation-demo-new-session-handoff.md. Carga primero las skills hermes-agent, krumm-edge-ai, krumm-talent-assessment-development, software-delivery-workflows, web-design-prototyping y react-responsive-game-layouts. Lee el handoff, el plan postulation-demo-mvp-product-plan.md y los archivos clave bajo src/postulation-demo/. No implementes todavía hasta revisar git status y el estado de herramientas. Luego continúa con Dv2: gameCorrelation.aggregate y assessment_feature_vector_v2 específicos de /postulaciones-demo, manteniendo privacy-safe estricto, TDD RED-GREEN, docs actualizadas y verificación real con tests/lint/build/audit/scans. No hagas commit ni push sin permiso.
```

---

## 11. Reglas críticas para Dv2

- Usar `performance.now()` para sincronización.
- No exportar/persistir:
  - video;
  - frames;
  - landmarks;
  - faceSamples;
  - pointerSamples;
  - rawGameEvents;
  - windows crudas;
  - stimuli/items reconstructivos.
- Mantener `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe`.
- No claims de contratación/rechazo/diagnóstico.
- Si cámara no está disponible, reportar caveats; no inventar datos.
- No reintroducir fallback geométrico de hombros; MoveNet real o caveat.
- Juegos deben mantener callbacks estables para evitar `Maximum update depth exceeded`.
- `PostulationDemoApp` debe seguir separada de la app técnica principal.

---

## 12. Posibles mejoras antes de implementar Dv2

Opcional, decidir con el usuario:

1. Instalar Playwright para QA visual:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

2. Instalar GitHub CLI:

```bash
sudo apt install gh
gh auth login
```

3. Si las web/browser tools nativas de Hermes no aparecen en la nueva sesión, revisar:

```bash
hermes tools list
hermes status
```

y reiniciar con `/reset` o iniciar `hermes` de nuevo desde el repo.
