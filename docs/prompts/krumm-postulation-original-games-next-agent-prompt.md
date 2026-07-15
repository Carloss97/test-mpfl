# Prompt nueva conversación — KRUMM Postulation Original Games

Copia y pega este prompt en una conversación nueva con Hermes Agent u otro agente de código.

```text
Eres un agente de código senior trabajando en WSL dentro del repo KRUMM Edge/test-mpfl.

Idioma: español.
Workdir principal: /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl
Repo fuente visual/original: /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test
Ruta demo: /postulaciones-demo
Fixture: /postulaciones-demo?fixture=1

Primero carga estas skills si estás en Hermes:
- krumm-edge-ai
- krumm-talent-assessment-development
- react-responsive-game-layouts
- software-delivery-workflows
- writing-plans
Opcionales: subagent-driven-development si delegas fases grandes; github-workflows solo si se pide commit/PR/push.

Contexto crítico:
- La demo /postulaciones-demo está lista para pruebas internas.
- La batería estable actual NO debe romperse y queda como fallback:
  1) precision_targeting — Ruta de precisión adaptativa
  2) go_nogo — Semáforo de impulso
  3) color_interference — Tarjetas de color
  4) visual_search — Panel de búsqueda activa
- El usuario quiere reemplazar progresivamente esos juegos por los juegos originales del repo Test:
  1) Laser Puzzle
  2) Balloon Risk
  3) Optimización de rutas/pasajeros
- R-0/R-1/R-2/R-3 ya avanzaron:
  - originalGameBlueprints existe.
  - Laser Puzzle está portado como componente oculto en src/tasks/original-games/ y disponible en PostulationGameStage cuando se pasa un bloque laser_puzzle.
  - Balloon Risk está portado como componente oculto en src/tasks/original-games/ y disponible en PostulationGameStage cuando se pasa un bloque balloon_risk.
  - La batería estable DG aún no fue reemplazada por defecto.
- Próximo foco recomendado: R-4 — Passenger Routes/GridFlow.

Antes de tocar código, lee estos archivos:
- docs/plans/postulation-demo-original-games-integration-plan.md
- docs/plans/postulation-demo-original-games-new-agent-handoff.md
- docs/demo/postulation-demo-qa-smoke-template.md
- src/postulation-demo/originalGameBlueprints.js
- src/postulation-demo/PostulationGameStage.jsx
- src/tasks/original-games/LaserPuzzlePostulationTask.jsx
- src/tasks/original-games/BalloonRiskPostulationTask.jsx
- src/tasks/gameRerenderStability.test.jsx

Luego revisa las fuentes del repo original Test para R-4:
- /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/GridFlowGame.jsx
- /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/GridFlowGame.test.jsx
- /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/GridFlowSolvability.test.jsx
- /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/components/demo/CollectPeopleGame.jsx

Reglas obligatorias:
- No hacer commit ni push salvo instrucción explícita.
- Mantener privacidad estricta: no video crudo, frames, screenshots, landmarks, keypoints, face samples crudos, pointer samples, rutas reconstructivas, raw DOM events, raw game events/logs ni grillas/rutas completas reconstructivas.
- Mantener game_event_v1, stimulus_shown/response/game_end, gameCorrelation.aggregate, assessment_feature_vector_v2 y fixture ?fixture=1.
- Usar performance.now() para timestamps internos de juego.
- Usar refs para callbacks onGameEvent/onComplete en efectos/timeouts; no provocar restart por re-render del padre. Actualizar src/tasks/gameRerenderStability.test.jsx para cada juego nuevo.
- Mantener lenguaje de reporte human-review-only; no diagnóstico, no personalidad, no decisión automatizada.
- Usar TDD: RED → GREEN → refactor.
- Usar patch/write_file para editar; no sed/awk en JSX.
- Usar read_file/search_files para inspección; no cat/grep/find/ls desde terminal salvo que una herramienta lo requiera.

Estado técnico más reciente documentado:
- Focal integrado Laser+Balloon+Stage+estabilidad: 7 files passed, 31 tests passed.
- Regresión postulation/original-games: 15 files passed, 59 tests passed.
- Lint: 0 warnings, 0 errors.
- Build: OK, warning chunks/PLUGIN_TIMINGS no bloqueante.
- Audit: found 0 vulnerabilities.
- Suite completa: 77 files passed, 309 tests passed.
- Warnings conocidos: HTMLCanvasElement.getContext en jsdom y React act warnings existentes en App.test.jsx.
- Puertos 5173/5174 estaban sin listener.

Tu tarea ahora:
1. Verifica estado actual con:
   git status --short --branch --untracked-files=all
2. Relee los documentos/archivos arriba.
3. Continúa con Fase R-4: Passenger Routes / GridFlow.
4. Crea tests RED para:
   - passengerRouteTelemetry sanitize aggregate-only;
   - passengerRouteSolvability con BFS/Dijkstra o equivalente;
   - PassengerRouteOptimizationTask render/complete/emit aggregate-only;
   - rerender stability.
5. Implementa archivos esperados:
   - src/tasks/original-games/passengerRouteTelemetry.js
   - src/tasks/original-games/passengerRouteTelemetry.test.js
   - src/tasks/original-games/passengerRouteSolvability.test.js
   - src/tasks/original-games/PassengerRouteOptimizationTask.jsx
   - src/tasks/original-games/PassengerRouteOptimizationTask.test.jsx
6. Retematiza GridFlow así:
   - paquetes → pasajeros
   - drop zones → destinos
   - stations → paradas/recarga/replanificación
   - energy → tiempo/combustible operativo/presupuesto de ruta
   - satisfaction → satisfacción agregada/cumplimiento
7. Agregados permitidos propuestos:
   - score
   - completed
   - passengersDelivered
   - destinationCount
   - routeEfficiency
   - replanCount
   - stationUseCount
   - constraintViolationCount
   - satisfactionScore
   - timeMs
   - aggregateOnly
8. Campos prohibidos:
   - fullRoute
   - routeTrace
   - visitedCells
   - stepByStepPath
   - rawPointerPath
   - pointerSamples
   - rawGameEvents
9. No actives todavía la batería original por defecto. Integra passenger_routes al PostulationGameStage como componente disponible oculto, igual que laser_puzzle y balloon_risk.
10. Al finalizar, actualiza docs/plans/postulation-demo-original-games-integration-plan.md y, si cambia el handoff, docs/plans/postulation-demo-original-games-new-agent-handoff.md.
11. Verifica con comandos focales y gates:
   NODE_ENV=test npx vitest run src/tasks/original-games src/postulation-demo/originalGameBlueprints.test.js src/postulation-demo/PostulationGameStage.test.jsx src/tasks/gameRerenderStability.test.jsx --pool=forks --maxWorkers=1 --reporter=default
   npx oxlint src/postulation-demo src/tasks src/main.jsx
   npm run build
   npm audit --audit-level=high --omit=dev
   git diff --check
12. Si cambias UI visible o activas una ruta/mode original, smoke con:
   NODE_ENV=development npx vite --host 127.0.0.1 --port 5173
   y Playwright/browser sobre /postulaciones-demo y /postulaciones-demo?fixture=1.
13. Reporta resultados con evidencia real de comandos. No digas “funciona” sin tests/build/smoke cuando aplique.
```
