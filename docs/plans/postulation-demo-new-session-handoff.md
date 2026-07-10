# Handoff nueva sesión — KRUMM Postulation Demo MVP

**Fecha:** 2026-07-09  
**Repo:** `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl`  
**Ruta demo:** `/postulaciones-demo`  
**Estado actual:** Fases E/F/G implementadas — HUD/drawer vivo, reporte productizado, descargas locales y fixture sintético `?fixture=1`.
**Próximo foco recomendado:** Fase J/I — smoke manual completo, QA visual responsive y preparación de demo piloto.

---

## 1. Objetivo de la nueva sesión

Retomar el trabajo de la demo separada para postulaciones, tipo producto MVP:

- juegos al frente;
- cámara, FaceMesh, AUs/FACS, gaze, postura, MoveNet y Edge AI corriendo en segundo plano;
- HUD discreto “lo que pasa detrás”;
- reporte final real, privacy-safe y para revisión humana;
- sin dashboard técnico como superficie principal;
- sin video, frames, landmarks crudos, eventos crudos ni trayectorias de puntero persistidas/exportadas.

El siguiente agente debe continuar desde **Fase E/G completadas** hacia smoke manual, QA visual y endurecimiento de demo piloto.

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

### Fase F — Report screen productizado

Implementado:

- `src/postulation-demo/PostulationReportScreen.jsx`
- `src/postulation-demo/PostulationReportSummary.js`
- `src/postulation-demo/PostulationReportTechnicalDrawer.jsx`
- `src/postulation-demo/PostulationReportScreen.test.jsx`
- integración en `src/postulation-demo/PostulationDemoApp.jsx`

Capacidades:

- pantalla “Reporte listo para revisión humana” en vez de preview Markdown crudo;
- cards de calidad/validación, perfil de capacidades y resultados por juego;
- drawer “Qué se procesó en segundo plano” con inferencia local, correlación, feature vector y gobernanza;
- descargas locales: reporte Markdown, HTML, JSON, payload, manifiesto y bundle técnico;
- descargas bloqueadas si validación no es OK;
- lenguaje conservador: revisión humana, sin decisión automatizada, sin selección automática ni diagnóstico.

### Fase E — HUD/drawer vivo

Implementado:

- `src/postulation-demo/BehindTheScenesMiniHud.jsx`
- `src/postulation-demo/BehindTheScenesDrawer.jsx`
- `src/postulation-demo/BehindTheScenesMiniHud.test.jsx`

Capacidades:

- HUD compacto en gameplay con cámara, rostro, señal, eventos y reporte;
- botón `Ver qué pasa detrás` que abre drawer en vivo;
- pipeline explícito: `performance.now()` → `LOCAL INFERENCE` → `gameCorrelation.aggregate` → `assessment_feature_vector_v2` → reporte para revisión humana;
- mensaje `No contiene datos reconstructivos` y sin labels de datos crudos/reconstructivos.

### Fase G — Fixture sintético

Implementado:

- `src/postulation-demo/postulationDemoFixture.js`
- `src/postulation-demo/postulationDemoFixture.test.js`
- integración `?fixture=1` en `PostulationDemoApp`
- banner sintético en `PostulationReportScreen`

Capacidades:

- `/postulaciones-demo?fixture=1` abre directo la pantalla de reporte;
- fixture deterministic local con cuatro juegos completos, correlación agregada, `assessment_feature_vector_v2`, reportes y bundle;
- aviso visual `Datos sintéticos de demostración` / `Fixture local privacy-safe`;
- no se mezcla con sesión real sin etiqueta visual.

Caveat: si no hay cámara/muestras, no inventa calidad; genera reporte con:

```text
camera_not_enabled_or_no_samples
low_sample_count
low_face_presence
low_face_confidence
```

---

## 3. Próximo trabajo: Fase J/I

Objetivo recomendado:

1. Ejecutar smoke manual con cámara permitida, cámara denegada, gameplay completo, drawer vivo, reporte final y descargas.
2. Capturar QA visual en 1366×768, 1440×900 y 1920×1080 para landing/setup/gameplay/reporte/fixture.
3. Ajustar responsive si HUD o reporte compiten con el juego.
4. Preparar checklist de demo piloto y script final de reunión.
5. Seguir posponiendo backend/LLM/dashboard HR hasta tener contrato de datos y aprobación de alcance.

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
