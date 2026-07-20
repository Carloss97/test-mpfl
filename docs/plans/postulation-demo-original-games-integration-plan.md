# Original Games Integration Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Reemplazar progresivamente los juegos actuales de `/postulaciones-demo` por los juegos preparados en la página original: Laser Puzzle, Balloon y optimización de rutas/pasajeros, manteniendo la demo estable para pruebas internas.

**Architecture:** La demo actual queda como baseline estable. Los juegos del repo `Test/` se portan por capas: primero blueprints/contratos privacy-safe, luego cada juego como componente aislado en `test-mpfl/src/tasks/original-games/`, finalmente se conectan al runtime de `/postulaciones-demo`, reporte y fixture. Ningún juego puede exportar rutas de puntero, DOM events crudos, snapshots, frames, landmarks, keypoints ni raw game logs.

**Tech Stack:** React 19, Vite 8, Vitest, Playwright, CSS responsive, `game_event_v1`, `gameCorrelation.aggregate`, `assessment_feature_vector_v2`.

---

## Estado de baseline

**Estado actual:** `[x] Listo para pruebas internas`

La batería estable actual queda congelada como fallback funcional:

1. `precision_targeting` — Ruta de precisión adaptativa.
2. `go_nogo` — Semáforo de impulso.
3. `color_interference` — Tarjetas de color.
4. `visual_search` — Panel de búsqueda activa.

Los reemplazos originales se introducirán detrás de contratos y pruebas antes de activar el nuevo orden visible.

---

## Fuentes revisadas en repo original `Test/`

| Juego objetivo | Fuente principal | Fuente alternativa | Rol propuesto |
|---|---|---|---|
| Laser Puzzle | `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/LaserPuzzleGame.jsx` | `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/components/demo/LaserReflectGame.jsx` | Razonamiento espacial, planificación, seguimiento de reglas. |
| Balloon | `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/BalloonGame.jsx` | `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/components/demo/BalloonGame.jsx` | Riesgo/recompensa, ajuste por feedback, persistencia. |
| Rutas pasajeros | `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/GridFlowGame.jsx` | `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/components/demo/CollectPeopleGame.jsx` | Planificación bajo restricciones, optimización de rutas, eficiencia. |

Decisión inicial: usar `GridFlowGame.jsx` como base robusta para rutas/pasajeros y retematizar a pasajeros/destinos; `CollectPeopleGame.jsx` queda como referencia visual simple.

---

## Contratos no negociables

- Mantener `game_event_v1`.
- Mantener pares o equivalentes `stimulus_shown` / `response` para correlación temporal.
- Mantener `gameCorrelation.aggregate`.
- Mantener `assessment_feature_vector_v2`.
- Mantener fixture `?fixture=1`.
- Mantener lenguaje de `revisión humana`, sin decisión automática.
- No persistir/exportar:
  - video crudo;
  - frames;
  - screenshots;
  - landmarks;
  - keypoints;
  - raw DOM/pointer events;
  - rutas de puntero reconstructivas;
  - raw game logs;
  - layouts completos reconstruibles si no son necesarios para agregados.

---

## Fase R-0 — Congelar baseline de pruebas internas

**Estado:** `[x] Completado`

**Prioridad:** Alta.

**Objetivo:** Marcar la demo actual como lista para pruebas internas antes de introducir reemplazos.

**Archivos:**

- Modificado: `docs/demo/postulation-demo-qa-smoke-template.md`

**Tareas:**

- [x] Marcar QA final como `Listo para demo interna`.
- [x] Marcar Go/No-Go manual como validado.
- [x] Registrar que el próximo bloque es planificar juegos originales.

**Criterios de éxito:**

- QA documenta explícitamente que la demo está lista para pruebas internas.
- La batería actual sigue siendo el fallback estable.

---

## Fase R-1 — Blueprints y adaptador privacy-safe

**Estado:** `[~] En trabajo — R-1a completado`

**Prioridad:** Alta.

**Objetivo:** Crear un inventario técnico ejecutable de los tres juegos originales y una capa de contrato para validar que cada juego puede emitir eventos agregados sin raw data.

**Archivos:**

- Crear: `src/postulation-demo/originalGameBlueprints.js`
- Crear: `src/postulation-demo/originalGameBlueprints.test.js`
- Modificar: `docs/plans/postulation-demo-original-games-integration-plan.md`

**Tareas:**

- [x] Declarar blueprints para `laser_puzzle`, `balloon_risk` y `passenger_routes`.
- [x] Registrar rutas fuente del repo `Test/`.
- [x] Definir dimensiones observacionales y reemplazo/posición propuesta.
- [x] Definir campos agregados permitidos por juego.
- [x] Definir lista de campos prohibidos.
- [x] Agregar tests de contrato para blueprint, bloques planificados y sanitización de agregados.
- [ ] Integrar los blueprints con report summary y UI de roadmap técnico.

**Criterios de éxito:**

- Tests verifican que existen exactamente tres juegos originales.
- Tests verifican que cada blueprint tiene fuente, target, métricas agregadas y campos prohibidos.
- Tests verifican que el adaptador rechaza o elimina campos reconstructivos.

**Avance ejecutado:**

```text
2026-07-15: creado `originalGameBlueprints.js` + tests. Focal GREEN: 1 file passed, 6 tests passed.
```

---

## Fase R-2 — Portar Laser Puzzle como primer juego original

**Estado:** `[x] Port inicial oculto completado`

**Prioridad:** Alta.

**Objetivo:** Crear una versión candidata de Laser Puzzle dentro de `test-mpfl`, con UI adaptada a `/postulaciones-demo` y telemetry agregada.

**Archivos implementados:**

- Creado: `src/tasks/original-games/LaserPuzzlePostulationTask.jsx`
- Creado: `src/tasks/original-games/LaserPuzzlePostulationTask.test.jsx`
- Creado: `src/tasks/original-games/laserPuzzleTelemetry.js`
- Creado: `src/tasks/original-games/laserPuzzleTelemetry.test.js`
- Modificado: `src/postulation-demo/PostulationGameStage.jsx`
- Modificado: `src/tasks/gameRerenderStability.test.jsx`
- Modificado: `src/postulation-demo/postulationDemo.css`

**Tareas:**

1. [x] Extraer helpers puros mínimos desde `LaserPuzzleGame.jsx`: dirección, reflectores, bifurcadores, resolución de ruta y score.
2. [x] Escribir tests RED para ruta resuelta, sanitización y layout compacto.
3. [x] Implementar dos niveles cortos para demo interna, no los 9 mapas completos.
4. [x] Emitir eventos:
   - `stimulus_shown`: nivel iniciado, dificultad, piezas móviles, límite de tiempo.
   - `response`: solución enviada, éxito, movimientos, tiempo, eficiencia agregada.
   - `game_end`: score agregado.
5. [x] Adaptar UI a stage compacto 1366×768/1280×720.
6. [ ] Smoke browser con fixture y sin cámara cuando se active batería original completa.

**Criterios de éxito:**

- Laser cabe en el recuadro sin scroll horizontal.
- No exporta grilla completa ni secuencia cruda de clicks/puntero.
- Reporte muestra métricas agregadas: éxito, movimientos, eficiencia, tiempo y reintentos.

**Avance ejecutado:**

```text
2026-07-15: Laser Puzzle portado como componente oculto disponible para `PostulationGameStage`. Focal GREEN: helpers/component/stage/estabilidad.
```

---

## Fase R-3 — Portar Balloon Risk

**Estado:** `[x] Port inicial oculto completado`

**Prioridad:** Media-alta.

**Objetivo:** Portar el juego de globo como tarea de riesgo/recompensa con interpretación conservadora.

**Archivos implementados:**

- Creado: `src/tasks/original-games/BalloonRiskPostulationTask.jsx`
- Creado: `src/tasks/original-games/BalloonRiskPostulationTask.test.jsx`
- Creado: `src/tasks/original-games/balloonRiskTelemetry.js`
- Creado: `src/tasks/original-games/balloonRiskTelemetry.test.js`
- Modificado: `src/postulation-demo/PostulationGameStage.jsx`
- Modificado: `src/tasks/gameRerenderStability.test.jsx`
- Modificado: `src/postulation-demo/postulationDemo.css`

**Telemetry agregada permitida:**

- rondas completadas;
- pumps promedio por ronda;
- cashouts;
- pops;
- score normalizado `[0, 1]` y eficiencia de riesgo;
- ajuste post-pop;
- tiempo por ronda.

**Campos prohibidos:**

- timing crudo por click;
- path/pointer raw;
- todos los eventos de bomba individual si permiten reconstruir secuencia exacta.

**Criterios de éxito:**

- Juego se entiende sin explicación externa.
- No se interpreta como diagnóstico de personalidad/riesgo.
- Reporte usa lenguaje: `ajuste ante feedback`, `estrategia observada`, `requiere revisión humana`.

**Avance ejecutado:**

```text
2026-07-15: Balloon Risk portado como componente oculto disponible para `PostulationGameStage`. Telemetry agregada: pumps promedio, cashouts, pops, ajuste post-pop y eficiencia de riesgo. Focal GREEN.
```

---

## Fase R-4 — Portar rutas/pasajeros desde GridFlow

**Estado:** `[x] Port inicial oculto completado`

**Prioridad:** Alta, pero después de Laser/Balloon.

**Objetivo:** Reconvertir GridFlow en una tarea de planificación de rutas para pasajeros/destinos.

**Archivos implementados:**

- Crear: `src/tasks/original-games/PassengerRouteOptimizationTask.jsx`
- Crear: `src/tasks/original-games/PassengerRouteOptimizationTask.test.jsx`
- Crear: `src/tasks/original-games/passengerRouteTelemetry.js`
- Crear: `src/tasks/original-games/passengerRouteTelemetry.test.js`
- Crear: `src/tasks/original-games/passengerRouteSolvability.test.js`
- Modificar: `src/postulation-demo/PostulationGameStage.jsx`
- Modificar: `src/postulation-demo/PostulationGameStage.test.jsx`
- Modificar: `src/postulation-demo/originalGameBlueprints.js`
- Modificar: `src/postulation-demo/originalGameBlueprints.test.js`
- Modificar: `src/tasks/gameRerenderStability.test.jsx`
- Modificar: `src/postulation-demo/postulationDemo.css`

**Tareas:**

1. [x] Reusar ideas de `GridFlowGame.jsx`: grilla, pickups/drop zones, presupuesto operativo y estaciones.
2. [x] Retematizar:
   - paquetes → pasajeros;
   - drop zones → destinos;
   - estaciones → paradas/recarga/replanificación;
   - energía → tiempo/combustible operativo/presupuesto de ruta;
   - satisfacción → satisfacción agregada/cumplimiento.
3. [x] Verificar solvencia con Dijkstra de costo uniforme y estado de presupuesto, pasajero a bordo, entregas y recargas.
4. [x] Emitir agregados:
   - pasajeros entregados;
   - distancia eficiente vs distancia mínima;
   - replanificaciones;
   - uso de estaciones;
   - tiempo;
   - satisfacción agregada;
   - errores de ruta.
5. [x] Integrar `passenger_routes` en el component map de `PostulationGameStage` sin activarlo en la batería visible.
6. [x] Mantener callbacks externos en refs y cubrir re-render stability.

**Criterios de éxito:**

- Todos los niveles demo son resolubles.
- La tarea cabe en 1366×768.
- No exporta ruta completa ni cada coordenada visitada.

**Agregados implementados:**

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

**Campos eliminados por sanitizer:**

```text
fullRoute
routeTrace
visitedCells
stepByStepPath
rawPointerPath
pointerSamples
rawGameEvents
```

**Avance ejecutado:**

```text
2026-07-15: Passenger Routes portado como componente oculto disponible para `PostulationGameStage`; batería DG estable sin cambios. RED verificado por módulos inexistentes. Focal GREEN integrado: 10 files / 42 tests. Suite completa: 80 files / 320 tests. Oxlint: 0 warnings, 0 errors. Build: OK en 5.94s con warnings no bloqueantes de chunks/PLUGIN_TIMINGS. Audit: 0 vulnerabilidades. `git diff --check`: OK.
```

---

## Fase R-5 — Integración de batería nueva y modo fallback

**Estado:** `[x] Completada con activación controlada`

**Prioridad:** Alta.

**Objetivo:** Activar la nueva batería original manteniendo la batería DG actual como fallback.

**Contrato implementado:**

```text
stable_dg       → fallback predeterminado, 4 juegos DG
original_games  → modo interno controlado, 3 juegos originales
```

Seleccionar sin cambiar código:

```text
/postulaciones-demo                         → stable_dg
/postulaciones-demo?battery=original        → original_games
/postulaciones-demo?fixture=1               → fixture stable_dg
/postulaciones-demo?fixture=1&battery=original → fixture original_games
```

**Constantes y reversibilidad:**

```text
POSTULATION_DEMO_BATTERY_STABLE_DG
POSTULATION_DEMO_BATTERY_ORIGINAL_GAMES
POSTULATION_DEMO_DEFAULT_BATTERY_MODE = stable_dg
krumm_postulation_demo_stable_dg_v1
krumm_postulation_demo_original_games_v1
```

La selección queda fijada al inicio de la sesión. Valores de query desconocidos vuelven de forma segura a `stable_dg`. Los blueprints fuente continúan `ported_hidden`; la config runtime crea copias allowlist sin `sourceGame` ni rutas locales.

**Backtrack técnico realizado:**

1. Eliminados eventos lifecycle duplicados del stage; cada juego conserva un único `game_start`/`game_end` mediante `GameRuntime`.
2. Correlación trial-aware exige `gameId + trialId` para evitar cruces entre juegos que reutilicen IDs.
3. Scores de Laser/Balloon/Passenger quedan en escala `[0, 1]`; el reporte tolera payloads históricos sin mostrar porcentajes absurdos.
4. Corregido Balloon Risk para incluir el score de la última ronda y Laser para separar reloj total de reloj por nivel.
5. Passenger y Laser tienen cobertura de finalización de todos los niveles autorados.
6. La lista global de campos prohibidos incluye rutas, keypoints, trazas, secuencias y resultados por trial; `trials` nunca entra a sesión/payload final.
7. El payload final incluye `behavioral.gameResults` aggregate-only y el bundle HTTP contiene el payload estructurado requerido por backend.
8. Sin señal biométrica no se fabrican estrés, fatiga o atención: esos canales quedan neutrales con caveat.
9. Mientras R-6 no tenga mappings validados, la batería original neutraliza dimensiones no soportadas y limita confianza a `0.25`; preserva métricas por juego sin sobreinterpretarlas.
10. Buffers de señales/eventos son acotados in-place para evitar copias crecientes en el hot path.
11. Consentimiento de cámara se separó de disponibilidad/calidad de muestras.
12. Smoke móvil detectó y corrigió overflow del reporte mediante tracks `minmax(0, 1fr)` y `min-width: 0`.

**Criterios de éxito:**

- [x] Se vuelve a batería DG estable sin tocar código.
- [x] Fixture tiene versión con juegos originales.
- [x] Smoke valida stable/original y sus fixtures en 1280×720 y 390×844.
- [x] Default DG permanece intacto.
- [x] Consola, page errors, requests fallidos y overflow horizontal: cero en el smoke automatizado.

**Verificación final R-5 (2026-07-15):**

```text
Focal original-games: 10 files / 44 tests
Focal R-5/pipeline: 12 files / 52 tests
Suite completa: 80 files / 331 tests
Build: 1380 modules, OK en 3.12s
Audit producción: 0 vulnerabilidades
Smoke Playwright: 2 viewports × 4 rutas, PASS
```

---

## Fase R-6 — Reporte, feature vector y narrativa HR

**Estado:** `[x] Completada`

**Prioridad:** Alta.

**Objetivo:** Actualizar reporte final para que los nuevos juegos aporten dimensiones claras y conservadoras.

**Dimensiones propuestas:**

| Juego | Dimensión observable | Lenguaje permitido |
|---|---|---|
| Laser | Razonamiento espacial y planificación de reglas | `patrones de resolución`, `eficiencia de configuración`, `requiere revisión humana` |
| Balloon | Ajuste ante riesgo/feedback | `estrategia de acumulación`, `ajuste post-pérdida`, no `personalidad` |
| Rutas pasajeros | Planificación bajo restricciones | `eficiencia de ruta`, `manejo de restricciones`, `replanificación` |

**Implementado R-6:**

- Documento técnico exhaustivo creado en `docs/research/krumm-talent-game-behavior-mapping-technical-study.md`.
- Agregados originales extendidos con `aggregateSchemaVersion` y observabilidad mínima no reconstructiva:
  - Balloon: `totalRounds`, `postPopAdjustmentCount`.
  - Passenger: `movementAttemptCount`.
- `original_game_feature_vector_v1` creado como vector separado de `assessment_feature_vector_v2`, con `featureOrder`, `featureArray` finito, `observedMask`, `featureAvailability`, `gameAvailability`, unidades, flags y privacidad.
- `ORIGINAL_GAME_FEATURE_DEFINITIONS` documenta para cada feature: entrada agregada, fórmula, racional métrico, relevancia de constructo y limitaciones.
- `krumm_workbook_talent_framework_v1` creado como framework provisional independiente del perfil DG:
  - `problemSolving`, `planning` y `analyticalThinking` solo puntúan si hay evidencia completa y válida.
  - `decisionMaking` y `riskFeedbackProfile` quedan `descriptive_only`.
  - `adaptability` queda `insufficient`.
  - `leadership` y `communication` quedan `not_measured` con `score: null`.
  - Sin fortalezas/watch areas, percentiles, cortes ni score global.
- `postulationDemoSessionBuilder` usa allowlist estricta de blueprints originales antes de sesión/payload.
- Sesión y payload agregan opcionalmente `originalGameFeatureVector` y `talentFramework` solo en `original_games`; `stable_dg` conserva su flujo sin esos campos.
- Reporte Markdown/HTML/JSON y pantalla de reporte muestran el framework R-6 con semántica `No medido`, `descriptive_only` e `insufficient`, y conservan biometría solo como contexto/calidad.

**Criterios de éxito:**

- [x] Reporte no sobrepromete: constructos no soportados usan `score: null` y disponibilidad explícita.
- [x] `assessment_feature_vector_v2` sigue estable; R-6 usa `original_game_feature_vector_v1` separado.
- [x] Descargas siguen bloqueadas si validation no es OK.
- [x] Batería `stable_dg` no recibe el framework original.
- [x] JSON report contiene `gameSummary`, `gameResults`, `originalGameFeatureVector` y `talentFramework` cuando aplica.

**Verificación final R-6:**

```text
R-6 assessment/report focal: 8 files / 27 tests
Original-games regression: 10 files / 44 tests
Oxlint focal: 0 warnings / 0 errors
Suite completa: 82 files / 339 tests
Build: 1382 módulos, OK en 3.10s
Audit producción: 0 vulnerabilidades
git diff --check: OK
Smoke Playwright: 2 viewports × 4 rutas, PASS; sin console/page/network errors ni overflow final
```

---

## Fase R-7 — QA interna y decisión de reemplazo

**Estado:** `[~] Plan técnico detallado creado; pendiente ejecución con datos/participantes`

**Prioridad:** Alta.

**Objetivo:** Hacer prueba interna comparando batería DG actual vs batería original.

**Plan detallado:**

```text
docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md
```

R-7 debe validar no solo que la app funcione, sino que cada entrada agregada justifique su métrica y cada métrica justifique —o limite— el constructo que pretende informar.

**Checklist:**

- 1366×768, 1440×900, 1920×1080.
- Cámara real permitida/denegada.
- Fixture.
- Drawer abierto/cerrado.
- Descargas.
- Consola/network.
- Duración percibida.
- Claridad de instrucciones.
- Interpretabilidad del reporte.

**Decisión final:**

- `[ ]` Mantener DG estable.
- `[ ]` Reemplazar por juegos originales.
- `[ ]` Usar batería mixta.
- `[ ]` Hacer más iteración visual antes de piloto.

---

## Comandos de verificación por fase

Focales:

```bash
NODE_ENV=test npx vitest run src/postulation-demo/originalGameBlueprints.test.js --pool=forks --maxWorkers=1 --reporter=default
NODE_ENV=test npx vitest run src/tasks/original-games --pool=forks --maxWorkers=1 --reporter=default
```

Regresión postulación:

```bash
NODE_ENV=test npx vitest run src/postulation-demo src/tasks/gameRerenderStability.test.jsx --pool=forks --maxWorkers=1 --reporter=default
```

Gates:

```bash
npx oxlint src/postulation-demo src/tasks src/main.jsx
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

Smoke:

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
