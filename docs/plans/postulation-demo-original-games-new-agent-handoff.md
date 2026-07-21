# Handoff nueva sesión — KRUMM Postulation Demo + Original Games

**Fecha:** 2026-07-15  
**Repo principal:** `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl`  
**Repo fuente visual/original:** `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test`  
**Ruta demo:** `/postulaciones-demo`  
**Fixture:** `/postulaciones-demo?fixture=1`  
**Estado producto:** listo para pruebas internas, con modo original mejorado para presentación interna.
**Estado reemplazo juegos originales:** R-0 a R-6/R-6b completadas técnicamente; R-7 pendiente con datos/participantes. Laser y Passenger tienen progresión producto-final de 3 niveles/circuitos, Balloon calibración básica y `team_coordination` cubre liderazgo/comunicación/adaptabilidad con brief estructurado.

---

## 1. Resumen ejecutivo para el nuevo agente

La demo KRUMM `/postulaciones-demo` está funcional y marcada como **lista para pruebas internas**. La batería estable actual **no debe romperse** y queda como fallback:

1. `precision_targeting` — Ruta de precisión adaptativa.
2. `go_nogo` — Semáforo de impulso.
3. `color_interference` — Tarjetas de color.
4. `visual_search` — Panel de búsqueda activa.

El usuario quiere reemplazar progresivamente esos juegos por juegos preparados en la página original del repo `Test/`, pero sin perder privacidad ni rigor psicométrico:

1. Laser Puzzle.
2. Balloon Risk.
3. Optimización de rutas para pasajeros.
4. Brief de coordinación de equipo.

Se portaron **Laser Puzzle**, **Balloon Risk** y **Passenger Routes**; además se agregó **Team Coordination / Brief de equipo** como micro-simulación propia para cubrir capacidades que no estaban medidas por tareas individuales. R-5 activó la batería interna seleccionable y R-6/R-6b agregó feature vector/framework provisional, reporte HR conservador y cobertura completa de demo para liderazgo, comunicación y adaptabilidad. La batería DG continúa siendo el default/fallback; no hubo reemplazo irreversible. El foco posterior es R-7: QA comparativa, validación con participantes y calibración de dificultad.

---

## 2. Reglas no negociables

### Privacidad

No persistir ni exportar:

- video crudo;
- frames;
- screenshots;
- landmarks;
- keypoints;
- face samples crudos;
- pointer samples;
- rutas reconstructivas de puntero;
- raw DOM events;
- raw game events/logs;
- grillas/rutas completas si permiten reconstruir interacción exacta;
- texto libre, conversación, secuencia de choices o eventos crudos del brief.

Permitido:

- métricas agregadas por trial/juego;
- conteos;
- tiempos agregados;
- scores;
- ratios de eficiencia;
- caveats;
- flags de calidad;
- `gameCorrelation.aggregate`;
- `assessment_feature_vector_v2`.

### Contratos que deben mantenerse

```text
game_event_v1
stimulus_shown / response / game_end
gameCorrelation.aggregate
assessment_feature_vector_v2
?fixture=1
human-review-only language
```

### Runtime / entorno

Usar siempre:

```bash
NODE_ENV=test npx vitest run ...
NODE_ENV=development npx vite --host 127.0.0.1 --port 5173
npm run build
npm audit --audit-level=high --omit=dev
```

Evitar Vite con `NODE_ENV=production`; puede causar pantalla blanca con `$RefreshSig$ is not defined`.

No hacer commit ni push salvo instrucción explícita del usuario.

---

## 3. Skills a cargar al iniciar la nueva sesión

Cargar de inmediato con `skill_view`:

```text
krumm-edge-ai
krumm-talent-assessment-development
react-responsive-game-layouts
software-delivery-workflows
writing-plans
```

Opcionales según tarea:

```text
subagent-driven-development   # si se delegan fases grandes
github-workflows              # solo si el usuario pide commit/PR/push
web-design-prototyping        # si se hace iteración visual fuerte
```

No hace falta cargar `hermes-agent` salvo que la tarea sea configurar o depurar Hermes mismo.

---

## 4. Herramientas y modo de trabajo recomendado

El usuario prefiere trabajo hands-on, en español y con evidencia real.

Orden recomendado:

1. Plan breve.
2. Leer archivos relevantes.
3. Tests RED.
4. Implementación mínima.
5. Tests GREEN.
6. Lint/build/audit/scans.
7. Smoke browser si cambia UI visible.
8. Resumen con comandos reales.

Herramientas preferidas:

```text
read_file       # leer archivos, no usar cat/head/tail
search_files    # buscar archivos/contenido, no usar grep/find/ls
patch           # editar archivos existentes, preferido V4A patch
write_file      # crear archivos nuevos o reescribir completos
terminal        # tests, build, audit, git, Vite, Playwright
browser_*       # solo para QA visual/interactiva real
vision_analyze  # si el usuario adjunta screenshots
```

No usar `sed/awk` para editar código. No usar `cat` para leer archivos. No tocar `.env` o secretos.

---

## 5. Documentos clave actuales

Leer primero:

```text
docs/plans/postulation-demo-original-games-integration-plan.md
docs/plans/postulation-demo-original-games-new-agent-handoff.md
docs/demo/postulation-demo-qa-smoke-template.md
src/postulation-demo/originalGameBlueprints.js
src/postulation-demo/PostulationGameStage.jsx
src/tasks/original-games/LaserPuzzlePostulationTask.jsx
src/tasks/original-games/BalloonRiskPostulationTask.jsx
src/tasks/original-games/TeamCoordinationPostulationTask.jsx
src/tasks/gameRerenderStability.test.jsx
```

Después, para la siguiente fase:

```text
/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/GridFlowGame.jsx
/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/GridFlowGame.test.jsx
/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/GridFlowSolvability.test.jsx
/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/components/demo/CollectPeopleGame.jsx
```

---

## 6. Estado por fases

### R-0 — Congelar baseline pruebas internas

**Estado:** completado.

El usuario indicó que ya hizo pruebas y marcaría la demo como lista para pruebas internas. Quedó registrado en:

```text
docs/demo/postulation-demo-qa-smoke-template.md
```

### R-1 — Blueprints y adaptador privacy-safe

**Estado:** R-1a completado.

Archivos:

```text
src/postulation-demo/originalGameBlueprints.js
src/postulation-demo/originalGameBlueprints.test.js
```

Define:

```text
laser_puzzle      → ported_hidden
balloon_risk      → ported_hidden
passenger_routes  → ported_hidden
team_coordination → controlled_active
```

Campos prohibidos generales:

```text
rawPointerPath
pointerSamples
rawGameEvents
frames
landmarks
keypoints
domEvent
screenshot
fullRoute
routeTrace
clickTrace
eventLog
```

El builder `buildOriginalGamePostulationBlocks()` devuelve bloques `visible: false` para que no cambien la batería estable hasta la Fase R-5.

### R-2 — Laser Puzzle

**Estado:** port inicial completado y progresión producto-final implementada para modo original.

Archivos:

```text
src/tasks/original-games/LaserPuzzlePostulationTask.jsx
src/tasks/original-games/LaserPuzzlePostulationTask.test.jsx
src/tasks/original-games/laserPuzzleTelemetry.js
src/tasks/original-games/laserPuzzleTelemetry.test.js
src/tasks/original-games/laserPuzzleFeedback.js
src/tasks/original-games/laserPuzzleFeedback.test.js
src/tasks/original-games/laserPuzzleAuthoringReview.js
src/tasks/original-games/laserPuzzleAuthoringReview.test.js
```

Progresión actual:

```text
1. Calibración orbital — intro · una antena.
2. Corredor de meteoritos — planning · corredor bloqueado.
3. Red dual de comunicaciones — advanced · bifurcación / dos antenas.
```

Integrado oculto en:

```text
src/postulation-demo/PostulationGameStage.jsx
```

Cubierto por:

```text
src/postulation-demo/PostulationGameStage.test.jsx
src/tasks/gameRerenderStability.test.jsx
```

Agregados permitidos:

```text
score
completed
levelCount
solvedLevels
moveCount
reconfigurationCount
hintCount
timeMs
solutionEfficiency
ruleViolationCount
aggregateOnly
```

No exporta:

```text
beamCells
fullRoute
rawPointerPath
pointerSamples
rawGameEvents
clickTrace
```

Authoring QA:

```text
levelAuthoringStatus: valid_for_internal_demo
totalLevels: 3
solvedByAuthoredPlacements: 3
multiObjectiveLevels: 1
parCalibratedLevels: 3
```

### R-3 — Balloon Risk

**Estado:** port inicial oculto completado.

Archivos:

```text
src/tasks/original-games/BalloonRiskPostulationTask.jsx
src/tasks/original-games/BalloonRiskPostulationTask.test.jsx
src/tasks/original-games/balloonRiskTelemetry.js
src/tasks/original-games/balloonRiskTelemetry.test.js
```

Integrado oculto en:

```text
src/postulation-demo/PostulationGameStage.jsx
```

Agregados permitidos:

```text
score
completed
roundsCompleted
totalRounds
averagePumps
cashoutCount
popCount
postPopAdjustment
riskEfficiency
timeMs
aggregateOnly
```

No exporta:

```text
pumpSequence
rawGameEvents
clickTrace
pointerSamples
```

### R-4 — Passenger Routes / GridFlow

**Estado:** port inicial completado y progresión producto-final implementada para modo original.

Objetivo:

Retematizar GridFlow como optimización de rutas de pasajeros.

Fuente principal:

```text
/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/GridFlowGame.jsx
```

Fuente alternativa visual simple:

```text
/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/components/demo/CollectPeopleGame.jsx
```

Archivos implementados:

```text
src/tasks/original-games/PassengerRouteOptimizationTask.jsx
src/tasks/original-games/PassengerRouteOptimizationTask.test.jsx
src/tasks/original-games/passengerRouteTelemetry.js
src/tasks/original-games/passengerRouteTelemetry.test.js
src/tasks/original-games/passengerRouteSolvability.test.js
src/tasks/original-games/passengerRouteFeedback.js
src/tasks/original-games/passengerRouteFeedback.test.js
src/tasks/original-games/passengerRouteAuthoringReview.js
src/tasks/original-games/passengerRouteAuthoringReview.test.js
src/postulation-demo/PostulationGameStage.jsx
src/postulation-demo/PostulationGameStage.test.jsx
src/postulation-demo/originalGameBlueprints.js
src/postulation-demo/originalGameBlueprints.test.js
src/tasks/gameRerenderStability.test.jsx
src/postulation-demo/postulationDemo.css
```

Retematización:

```text
paquetes       → pasajeros
drop zones     → destinos
stations       → paradas / recarga / replanificación
energy         → tiempo / combustible operativo / presupuesto de ruta
satisfaction   → satisfacción agregada / cumplimiento de destino
```

Progresión actual:

```text
1. Centro: primera entrega — intro · una entrega.
2. Conexión intermodal — planning · dos entregas y una parada.
3. Hora punta: red crítica — advanced · dos entregas, dos recargas y presupuesto ajustado.
```

Agregados permitidos propuestos:

```text
score
completed
passengersDelivered
destinationCount
routeEfficiency
replanCount
stationUseCount
constraintViolationCount
satisfactionScore
timeMs
aggregateOnly
```

Prohibido:

```text
fullRoute
routeTrace
visitedCells
stepByStepPath
rawPointerPath
pointerSamples
rawGameEvents
```

Cobertura R-4 implementada:

1. [x] Telemetry sanitiza y elimina `fullRoute`, `routeTrace`, `visitedCells`, `stepByStepPath`, `rawGameEvents`, `rawPointerPath` y `pointerSamples`.
2. [x] Solvability usa Dijkstra/costo uniforme con movimiento horizontal 1, vertical 2 y recarga física en paradas.
3. [x] Layout metrics caben en 606×338 con celdas jugables y sin scroll propio del tablero.
4. [x] Componente renderiza instrucciones, grilla compacta, controles y retheming pasajeros/destinos/presupuesto/paradas.
5. [x] Resolver una ruta emite `stimulus_shown`, `response`, `game_end` aggregate-only.
6. [x] Re-render stability: parent `onGameEvent` no reinicia nivel activo.
7. [x] `PostulationGameStage` puede resolver `passenger_routes` por bloque explícito, pero `visible: false` conserva la batería DG.

Authoring QA actual:

```text
routeAuthoringStatus: valid_for_internal_demo
totalLevels: 3
solvableLevels: 3
minimumStationUseLevels: 2
boardFitLevels: 3
```

Resultado focal integrado R-4:

```text
10 files passed
42 tests passed
Oxlint: 0 warnings, 0 errors
```

### R-5 — Activar batería nueva + fallback

**Estado:** completada con modo controlado.

Contratos runtime:

```text
POSTULATION_DEMO_BATTERY_STABLE_DG
POSTULATION_DEMO_BATTERY_ORIGINAL_GAMES
POSTULATION_DEMO_DEFAULT_BATTERY_MODE = stable_dg
```

Rutas:

```text
/postulaciones-demo                             → stable_dg
/postulaciones-demo?battery=original            → original_games
/postulaciones-demo?fixture=1                   → fixture stable_dg
/postulaciones-demo?fixture=1&battery=original  → fixture original_games
```

El modo se fija al iniciar sesión; un valor desconocido vuelve a `stable_dg`. Los blueprints conservan `ported_hidden`, mientras la config runtime genera bloques activos allowlist sin `sourceGame`.

Backtrack R-5 relevante para retomar:

- Stage dejó de duplicar `game_start`/`game_end`.
- `gameCorrelation` empareja por `gameId + trialId`.
- Scores de los tres juegos originales son ratios `[0, 1]`.
- Balloon incluye la última ronda; Laser separa reloj de juego y reloj de nivel.
- Sesión/payload eliminan `trials`, rutas, trazas, keypoints, secuencias y raw logs.
- `behavioral.gameResults` conserva agregados por juego para backend.
- El bundle de submission incluye el payload estructurado además de reportes.
- Sin señal no se fabrican canales biométricos; quedan neutrales con caveat.
- Hasta R-6, batería original produce dimensiones neutrales (`50`) y confianza máxima `0.25`, evitando claims sin mapping validado.
- Consentimiento de cámara y calidad/disponibilidad de señal son conceptos separados.
- Buffer de señal/eventos acotado sin copia de arrays en cada muestra.
- Reporte responsive corregido tras repro Playwright de overflow a 390×844.

### R-6/R-6b — Reporte, feature vector, narrativa HR y brief de equipo

**Estado:** completada técnicamente con cobertura completa de demo; próximo foco R-7 QA comparativa y validación.

Documento técnico fuente:

```text
docs/research/krumm-talent-game-behavior-mapping-technical-study.md
```

Archivos R-6 creados:

```text
src/assessment/originalGameFeatureVector.js
src/assessment/originalGameFeatureVector.test.js
src/assessment/originalGameTalentMapping.js
src/assessment/originalGameTalentMapping.test.js
src/tasks/original-games/TeamCoordinationPostulationTask.jsx
src/tasks/original-games/TeamCoordinationPostulationTask.test.jsx
src/tasks/original-games/teamCoordinationTelemetry.js
src/tasks/original-games/teamCoordinationTelemetry.test.js
src/tasks/original-games/teamCoordinationFeedback.js
scripts/smoke-original-games-playability.mjs
```

Archivos R-6 modificados:

```text
src/tasks/original-games/laserPuzzleTelemetry.js
src/tasks/original-games/balloonRiskTelemetry.js
src/tasks/original-games/passengerRouteTelemetry.js
src/tasks/original-games/PassengerRouteOptimizationTask.jsx
src/postulation-demo/originalGameBlueprints.js
src/postulation-demo/postulationDemoFixture.js
src/postulation-demo/postulationDemoSessionBuilder.js
src/postulation-demo/postulationDemoSessionBuilder.test.js
src/postulation-demo/PostulationReportSummary.js
src/postulation-demo/PostulationReportScreen.jsx
src/postulation-demo/PostulationReportScreen.test.jsx
src/assessment/assessmentSession.js
src/assessment/finalAssessmentPayload.js
src/assessment/talentProfile.js
src/assessment/talentReportGenerator.js
```

Implementado:

- `original_game_feature_vector_v1` separado de `assessment_feature_vector_v2`.
- `ORIGINAL_GAME_FEATURE_DEFINITIONS` documenta input agregado → fórmula → racional → constructo → limitaciones para cada métrica.
- `krumm_workbook_talent_framework_v1` provisional e independiente del perfil DG.
- Allowlist estricta de agregados originales antes de sesión/payload.
- `stable_dg` no recibe framework original.
- Original mode expone `originalGameFeatureVector` y `talentFramework` en sesión/payload/reporte.
- UI/reportes muestran `No medido`, `descriptive_only`, `insufficient`, `not_measured` y no generan fortalezas/watch areas del framework sin normas.
- En modo original, `team_coordination` permite que liderazgo, comunicación y adaptabilidad salgan con score provisional/caveats en vez de quedar como `No medido`; si falta evidencia agregada vuelven a null/caveat.
- El brief muestra un panel visible “Trabajo por detrás” con constructos activos, pero solo persiste scores, conteos y tiempos agregados.
- Ajuste posterior R-6c: el Markdown/HTML técnico de `original_games` no debe mostrar el perfil DG legacy global de 25% ni una tabla de “Perfil de habilidades” con score `No medido`; debe usar solo el mapa de evidencia original y métricas por juego relevantes.
- Ajuste posterior R-6c: Laser tiene distractores ópticos en niveles 2/3, Passenger tiene menor margen de energía en circuitos 2/3 y Team Coordination tiene misión/barra visible de coordinación ≥75%.
- Cámara/biometría se mantiene como contexto/calidad; no afecta scores/confianza de mapping.

Dimensiones R-6:

| Juego | Dimensión observable | Lenguaje permitido |
|---|---|---|
| Laser | Razonamiento espacial / planificación de reglas | patrones de resolución, eficiencia de configuración, revisión humana |
| Balloon | Ajuste ante feedback/riesgo | estrategia de acumulación, ajuste post-pérdida, no personalidad |
| Rutas | Planificación bajo restricciones | eficiencia de ruta, replanificación, manejo de restricciones |
| Brief de equipo | Liderazgo, comunicación, adaptabilidad y decisión contextual | elecciones estructuradas, claridad de roles, uso de feedback, sin texto libre |

Estados obligatorios del framework:

```text
decisionMaking       -> provisional_score si Team + Passenger aportan evidencia; Balloon no define personalidad/frustración
problemSolving       -> provisional_score si Laser + Passenger completos
riskFeedbackProfile  -> score null / descriptive_only / frustration_tolerance_not_measured
planning             -> provisional_score si Passenger completo
adaptability         -> provisional_score si Team completo; null/caveat si falta evidencia
analyticalThinking   -> provisional_score si Laser + Passenger completos
leadership           -> provisional_score si Team completo; null/caveat si falta evidencia
communication        -> provisional_score si Team completo; null/caveat si falta evidencia
```

Verificación final R-6/R-6b:

```text
R-6/R-6b assessment/report focal: PostulationReportScreen + originalGameFeatureVector + originalGameTalentMapping + teamCoordinationTelemetry PASS
Original-games regression focal: 29 files / 125 tests PASS
Oxlint focal: 0 warnings / 0 errors
Suite completa: 92 files / 385 tests PASS
Build: 1392 módulos, OK en 2.77s
Audit producción: 0 vulnerabilidades
git diff --check: OK
Smoke Playwright original completo: desktop 1280×720 PASS y móvil 390×844 PASS; console/page errors 0; overflow horizontal 0; Vite fresco en http://127.0.0.1:5173/.
```

### R-7 — QA interna comparativa

Plan técnico detallado creado en:

```text
docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md
```

Revisión de estado, gráfico I/O, riesgos y módulos separados de mejora:

```text
docs/plans/2026-07-20-current-state-io-graph-and-risk-review.md
docs/plans/2026-07-20-laser-passenger-product-game-design-review.md
src/tasks/original-games/originalGameImprovementModules.js
src/tasks/original-games/originalGameImprovementModules.test.js
src/tasks/original-games/laserPuzzleFeedback.js
src/tasks/original-games/laserPuzzleFeedback.test.js
src/tasks/original-games/laserPuzzleAuthoringReview.js
src/tasks/original-games/laserPuzzleAuthoringReview.test.js
src/tasks/original-games/balloonRiskFeedback.js
src/tasks/original-games/balloonRiskFeedback.test.js
src/tasks/original-games/balloonThresholdCalibrationReview.js
src/tasks/original-games/balloonThresholdCalibrationReview.test.js
src/tasks/original-games/candidateInstructionCheck.js
src/tasks/original-games/candidateInstructionCheck.test.js
src/tasks/original-games/passengerRouteFeedback.js
src/tasks/original-games/passengerRouteFeedback.test.js
src/tasks/original-games/passengerRouteAuthoringReview.js
src/tasks/original-games/passengerRouteAuthoringReview.test.js
```

Los tres feedback modules se consumen desde `PostulationReportSummary.js` y se muestran en `PostulationReportScreen.jsx` con etiquetas humanas; no usan rutas, secuencias, beam cells, pump sequences ni raw events. `laserPuzzleAuthoringReview.js` y `passengerRouteAuthoringReview.js` se consumen desde `PostulationReportTechnicalDrawer.jsx` para mostrar QA de authoring en modo original.

`balloonThresholdCalibrationReview.js` también se consume en el drawer técnico como `Calibration Balloon: valid_for_internal_demo`; resume 3 rondas alto / 2 medio / 3 bajo sin exportar thresholds por ronda ni secuencias de infladas.

`candidateInstructionCheck.js` se consume en el drawer técnico como `Instruction check: low/review/high`; usa solo agregados por juego para separar riesgo de comprensión/instrucciones de desempeño. Si marca `high`, debe caveatearse o excluirse el mapeo provisional.

La tabla teórica señal→métrica→bibliografía está actualizada en `docs/research/krumm-talent-game-behavior-mapping-technical-study.md` §4.5. Las referencias clave fueron verificadas por DOI/título/año vía Crossref; no usar referencias ambiguas del Excel como evidencia fuerte sin metadata exacta.

Paquete documental de transición a producto real regenerado en:

```text
docs/product/README.md
docs/product/krumm-data-signal-inference-contract.md
docs/product/krumm-development-state-report.md
docs/product/krumm-productization-roadmap.md
```

Este paquete consolida entradas, salidas, elementos, indicadores, señales telemétricas, inferencia, estado de desarrollo y línea de tiempo para pasar de demo a producto piloto/comercial sin claims psicométricos no validados.

El reporte HR ahora incluye un resumen ejecutivo con cuatro bloques: qué se observó, cómo usarlo, qué no mide y siguiente paso. El copy visible incluye `No ranking automático` y `Contrastar con entrevista`; no debe transformarse en decisión automática ni ranking de candidatos.

Smoke de feedback visible:

```text
scripts/smoke-postulation-feedback.mjs
BASE_URL=http://127.0.0.1:5177 node scripts/smoke-postulation-feedback.mjs
Resultado: 2 viewports × 4 rutas, PASS; feedback visible, Authoring Laser/Passenger visible y sin overflow/errores.
Suite completa posterior: 88 files / 365 tests PASS; build PASS; audit high prod 0 vulnerabilidades; oxlint 0 warnings/0 errors; git diff --check OK.
```

Gráfico PDF de presentación:

```text
exports/krumm-r6-r7-current-flow.pdf
docs/demo/krumm-r6-r7-current-flow.html
scripts/render-r6-r7-current-flow-pdf.mjs
```

Pendiente de ejecución con datos/participantes y revisión experta. R-7 debe evaluar QA técnica, validez de contenido, entrevistas cognitivas, confiabilidad, validez convergente/discriminante, validez de criterio, fairness/device effects y decisión de producto.

Validar batería DG estable vs batería original o batería mixta.

---

## 7. Verificación más reciente antes de este handoff

### Verificación final R-5 — batería controlada + backtrack

```text
Focal original-games/fallback (forks, 1 worker): 10 files / 44 tests
Focal R-5/pipeline (threads): 12 files / 52 tests
Suite completa (threads): 80 files / 331 tests
Build: 1380 módulos, 3.12s, OK
Audit producción: found 0 vulnerabilities
```

Warnings conocidos de suite completa, sin regresión:

```text
HTMLCanvasElement.getContext() no implementado en jsdom
React act(...) warnings existentes en App.test.jsx
```

Smoke Playwright real con Vite development:

```text
Viewports: 1280×720 y 390×844
Rutas por viewport: stable landing, original gameplay, stable fixture, original fixture
Resultado: 8/8 rutas PASS
Console errors: 0
Page errors: 0
Request failures: 0
Horizontal overflow: 0
```

El primer smoke móvil detectó `scrollWidth=399` con `clientWidth=390` en el fixture original. Se corrigió el track raíz del reporte con `minmax(0, 1fr)` y `min-width: 0`; el smoke completo posterior quedó verde.

El lint focal de los directorios tocados se mantiene como gate. Una exploración deliberadamente más amplia de todo `src/telemetry` expone warnings históricos fuera del diff de R-5; no deben confundirse con regresiones de esta fase.

### Verificación final R-4 — Passenger Routes

Focal integrado solicitado:

```bash
NODE_ENV=test npx vitest run src/tasks/original-games src/postulation-demo/originalGameBlueprints.test.js src/postulation-demo/PostulationGameStage.test.jsx src/tasks/gameRerenderStability.test.jsx --pool=forks --maxWorkers=1 --reporter=default
```

```text
10 files passed
42 tests passed
```

Gates:

```text
npx oxlint src/postulation-demo src/tasks src/main.jsx
→ 0 warnings, 0 errors

npm run build
→ 1379 modules transformed; built in 5.94s
→ warnings no bloqueantes: PLUGIN_TIMINGS y chunks >500 kB

npm audit --audit-level=high --omit=dev
→ found 0 vulnerabilities

git diff --check
→ OK
```

Suite completa:

```bash
NODE_ENV=test npx vitest run --pool=threads
```

```text
80 files passed
320 tests passed
```

Warnings conocidos observados, sin regresión:

```text
HTMLCanvasElement.getContext() no implementado en jsdom
React act(...) warnings existentes en App.test.jsx
```

Smoke browser no ejecutado para R-4: `passenger_routes` quedó `visible: false` y no se activó ninguna batería/ruta/modo visible. El build y la regresión completa sí fueron ejecutados.

### Verificación histórica tras Laser + Balloon

Última verificación completa reportada tras Laser + Balloon:

### Focal integrado

```bash
NODE_ENV=test npx vitest run \
  src/tasks/original-games/laserPuzzleTelemetry.test.js \
  src/tasks/original-games/LaserPuzzlePostulationTask.test.jsx \
  src/tasks/original-games/balloonRiskTelemetry.test.js \
  src/tasks/original-games/BalloonRiskPostulationTask.test.jsx \
  src/tasks/gameRerenderStability.test.jsx \
  src/postulation-demo/PostulationGameStage.test.jsx \
  src/postulation-demo/originalGameBlueprints.test.js \
  --pool=forks --maxWorkers=1 --reporter=default
```

Resultado:

```text
7 files passed
31 tests passed
```

### Regresión postulation/original-games

```bash
NODE_ENV=test npx vitest run src/postulation-demo src/tasks/original-games src/tasks/gameRerenderStability.test.jsx --pool=forks --maxWorkers=1 --reporter=default
```

Resultado:

```text
15 files passed
59 tests passed
```

### Lint

```bash
npx oxlint src/postulation-demo src/tasks/original-games src/tasks/gameRerenderStability.test.jsx src/main.jsx
```

Resultado:

```text
0 warnings
0 errors
```

### Build

```bash
npm run build
```

Resultado:

```text
✓ built in 3.16s
```

Warnings no bloqueantes:

```text
PLUGIN_TIMINGS
Some chunks are larger than 500 kB
```

### Audit

```bash
npm audit --audit-level=high --omit=dev
```

Resultado:

```text
found 0 vulnerabilities
```

### Scans

```text
git diff --check: OK
line_prefix_hits: []
conflict_marker_hits: []
secret_hits: []
```

### Suite completa

```bash
NODE_ENV=test npx vitest run --pool=threads
```

Resultado:

```text
77 files passed
309 tests passed
```

Warnings conocidos:

```text
HTMLCanvasElement.getContext() no implementado en jsdom
React act(...) warnings existentes en App.test.jsx
```

---

## 8. Estado git/puertos al actualizar este handoff

Al iniciar R-5, `git status --short --branch --untracked-files=all` mostró:

```text
## main...Test-camara/main
```

El working tree estaba limpio antes de R-5. Ahora contiene únicamente el conjunto de cambios R-5/backtrack sin commit; no se hizo commit ni push.

Puertos Vite:

```text
5173/5174 sin listener
```

El servidor Vite usado para smoke fue detenido al terminar.

---

## 9. Comandos recomendados al retomar

Primero:

```bash
cd /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl
git status --short --branch --untracked-files=all
```

Leer:

```text
docs/plans/postulation-demo-original-games-integration-plan.md
docs/plans/postulation-demo-original-games-new-agent-handoff.md
src/postulation-demo/originalGameBlueprints.js
src/postulation-demo/PostulationGameStage.jsx
src/postulation-demo/postulationDemoConfig.js
src/postulation-demo/PostulationDemoApp.jsx
src/postulation-demo/postulationDemoFixture.js
src/postulation-demo/postulationDemoSessionBuilder.js
src/tasks/original-games/LaserPuzzlePostulationTask.jsx
src/tasks/original-games/BalloonRiskPostulationTask.jsx
src/tasks/original-games/PassengerRouteOptimizationTask.jsx
```

Focal rápido para estado actual:

```bash
NODE_ENV=test npx vitest run src/tasks/original-games src/postulation-demo/originalGameBlueprints.test.js src/postulation-demo/PostulationGameStage.test.jsx src/tasks/gameRerenderStability.test.jsx --pool=forks --maxWorkers=1 --reporter=default
```

Gates antes de handoff:

```bash
npx oxlint src/postulation-demo src/tasks src/main.jsx
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

Suite completa si se cambia código:

```bash
NODE_ENV=test npx vitest run --pool=threads
```

Smoke browser si se activa UI visible:

```bash
NODE_ENV=development npx vite --host 127.0.0.1 --port 5173
```

URLs:

```text
http://127.0.0.1:5173/postulaciones-demo
http://127.0.0.1:5173/postulaciones-demo?fixture=1
http://127.0.0.1:5173/postulaciones-demo?battery=original
http://127.0.0.1:5173/postulaciones-demo?fixture=1&battery=original
```

---

## 10. Prompt recomendado para nueva conversación

El prompt completo está también en:

```text
docs/prompts/krumm-postulation-original-games-next-agent-prompt.md
```

Usarlo al iniciar una conversación nueva con un agente/modelo nuevo.
