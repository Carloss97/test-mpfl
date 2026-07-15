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
- puntos totales;
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

**Estado:** `[ ] Por implementar`

**Prioridad:** Alta, pero después de Laser/Balloon.

**Objetivo:** Reconvertir GridFlow en una tarea de planificación de rutas para pasajeros/destinos.

**Archivos previstos:**

- Crear: `src/tasks/original-games/PassengerRouteOptimizationTask.jsx`
- Crear: `src/tasks/original-games/passengerRouteOptimization.test.jsx`
- Crear: `src/tasks/original-games/passengerRouteTelemetry.js`
- Crear: `src/tasks/original-games/passengerRouteTelemetry.test.js`
- Crear: `src/tasks/original-games/passengerRouteSolvability.test.js`
- Modificar: `src/postulation-demo/postulationDemo.css`

**Tareas:**

1. Reusar ideas de `GridFlowGame.jsx`: grilla, pickups/drop zones, energía/tiempo, estaciones.
2. Retematizar:
   - paquetes → pasajeros;
   - drop zones → destinos;
   - estaciones → paradas/recarga/replanificación;
   - energía → tiempo/combustible operativo.
3. Verificar solvencia por BFS/Dijkstra antes de activar niveles.
4. Emitir agregados:
   - pasajeros entregados;
   - distancia eficiente vs distancia mínima;
   - replanificaciones;
   - uso de estaciones;
   - tiempo;
   - satisfacción agregada;
   - errores de ruta.

**Criterios de éxito:**

- Todos los niveles demo son resolubles.
- La tarea cabe en 1366×768.
- No exporta ruta completa ni cada coordenada visitada.

---

## Fase R-5 — Integración de batería nueva y modo fallback

**Estado:** `[ ] Por implementar`

**Prioridad:** Alta.

**Objetivo:** Activar la nueva batería original manteniendo la batería DG actual como fallback.

**Archivos previstos:**

- Modificar: `src/postulation-demo/postulationDemoConfig.js`
- Modificar: `src/postulation-demo/PostulationGameStage.jsx`
- Modificar: `src/postulation-demo/PostulationDemoApp.jsx`
- Modificar: `src/postulation-demo/postulationDemoFixture.js`
- Modificar tests de app/config/fixture.

**Estrategia:**

Agregar modo controlado por config, no reemplazo irreversible:

```text
POSTULATION_DEMO_BATTERY_STABLE_DG
POSTULATION_DEMO_BATTERY_ORIGINAL_GAMES
```

Inicialmente usar original games solo detrás de flag interna o constante explícita.

**Criterios de éxito:**

- Se puede volver a batería DG estable sin tocar código profundo.
- Fixture tiene versión con juegos originales.
- Smoke valida ambas rutas o al menos fallback estable + original en modo test.

---

## Fase R-6 — Reporte, feature vector y narrativa HR

**Estado:** `[ ] Por implementar`

**Prioridad:** Alta.

**Objetivo:** Actualizar reporte final para que los nuevos juegos aporten dimensiones claras y conservadoras.

**Dimensiones propuestas:**

| Juego | Dimensión observable | Lenguaje permitido |
|---|---|---|
| Laser | Razonamiento espacial y planificación de reglas | `patrones de resolución`, `eficiencia de configuración`, `requiere revisión humana` |
| Balloon | Ajuste ante riesgo/feedback | `estrategia de acumulación`, `ajuste post-pérdida`, no `personalidad` |
| Rutas pasajeros | Planificación bajo restricciones | `eficiencia de ruta`, `manejo de restricciones`, `replanificación` |

**Criterios de éxito:**

- Reporte no sobrepromete.
- `assessment_feature_vector_v2` sigue estable o se extiende con versionado explícito si hace falta.
- Descargas siguen bloqueadas si validation no es OK.

---

## Fase R-7 — QA interna y decisión de reemplazo

**Estado:** `[ ] Por implementar`

**Prioridad:** Alta.

**Objetivo:** Hacer prueba interna comparando batería DG actual vs batería original.

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
```
