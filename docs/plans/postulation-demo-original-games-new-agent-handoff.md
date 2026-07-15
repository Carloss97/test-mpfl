# Handoff nueva sesión — KRUMM Postulation Demo + Original Games

**Fecha:** 2026-07-15  
**Repo principal:** `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl`  
**Repo fuente visual/original:** `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test`  
**Ruta demo:** `/postulaciones-demo`  
**Fixture:** `/postulaciones-demo?fixture=1`  
**Estado producto:** listo para pruebas internas.  
**Estado reemplazo juegos originales:** R-0/R-1/R-2/R-3/R-4 avanzadas; próximo foco R-5 integración controlada de batería y fallback.

---

## 1. Resumen ejecutivo para el nuevo agente

La demo KRUMM `/postulaciones-demo` está funcional y marcada como **lista para pruebas internas**. La batería estable actual **no debe romperse** y queda como fallback:

1. `precision_targeting` — Ruta de precisión adaptativa.
2. `go_nogo` — Semáforo de impulso.
3. `color_interference` — Tarjetas de color.
4. `visual_search` — Panel de búsqueda activa.

El usuario quiere reemplazar progresivamente esos juegos por juegos preparados en la página original del repo `Test/`:

1. Laser Puzzle.
2. Balloon Risk.
3. Optimización de rutas para pasajeros.

Ya se creó el plan por fases y se portaron **Laser Puzzle**, **Balloon Risk** y **Passenger Routes** como componentes ocultos disponibles para `PostulationGameStage`; todavía **no se activó la batería nueva por defecto**. El próximo trabajo técnico es **R-5 — integración controlada de batería original + fallback DG**.

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
- grillas/rutas completas si permiten reconstruir interacción exacta.

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

**Estado:** port inicial oculto completado.

Archivos:

```text
src/tasks/original-games/LaserPuzzlePostulationTask.jsx
src/tasks/original-games/LaserPuzzlePostulationTask.test.jsx
src/tasks/original-games/laserPuzzleTelemetry.js
src/tasks/original-games/laserPuzzleTelemetry.test.js
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

**Estado:** port inicial oculto completado.

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

Resultado focal integrado R-4:

```text
10 files passed
42 tests passed
Oxlint: 0 warnings, 0 errors
```

### R-5 — Activar batería nueva + fallback

Pendiente. R-4 ya está completada; no activar sin implementar el modo controlado y validar fallback.

Estrategia recomendada:

```text
POSTULATION_DEMO_BATTERY_STABLE_DG
POSTULATION_DEMO_BATTERY_ORIGINAL_GAMES
```

Mantener fallback estable DG. Inicialmente activar original games por flag/constante interna o solo en test.

### R-6 — Reporte, feature vector y narrativa HR

Pendiente.

Actualizar reporte para mostrar dimensiones:

| Juego | Dimensión observable | Lenguaje permitido |
|---|---|---|
| Laser | Razonamiento espacial / planificación de reglas | patrones de resolución, eficiencia de configuración, revisión humana |
| Balloon | Ajuste ante feedback/riesgo | estrategia de acumulación, ajuste post-pérdida, no personalidad |
| Rutas | Planificación bajo restricciones | eficiencia de ruta, replanificación, manejo de restricciones |

### R-7 — QA interna comparativa

Pendiente.

Validar batería DG estable vs batería original o batería mixta.

---

## 7. Verificación más reciente antes de este handoff

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

## 8. Estado git/puertos al crear este handoff

Al iniciar esta documentación, `git status --short --branch --untracked-files=all` mostró:

```text
## main...Test-camara/main
```

Es decir, el working tree se observó limpio antes de escribir este handoff.

Puertos Vite:

```text
5173/5174 sin listener
```

Después de crear este documento y el prompt asociado, habrá cambios documentales nuevos.

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
src/tasks/original-games/LaserPuzzlePostulationTask.jsx
src/tasks/original-games/BalloonRiskPostulationTask.jsx
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
```

---

## 10. Prompt recomendado para nueva conversación

El prompt completo está también en:

```text
docs/prompts/krumm-postulation-original-games-next-agent-prompt.md
```

Usarlo al iniciar una conversación nueva con un agente/modelo nuevo.
