# Passenger Routes / GridFlow R-4 Implementation Plan

> **For Hermes:** Ejecutar este plan de forma secuencial con TDD RED → GREEN → refactor. No hacer commit ni push sin instrucción explícita.

**Goal:** Portar GridFlow como `passenger_routes`, una tarea compacta de planificación de rutas para pasajeros, disponible de forma oculta en `PostulationGameStage` sin cambiar la batería DG estable.

**Architecture:** El port separará helpers puros y el límite de privacidad en `passengerRouteTelemetry.js`; los niveles demo se validarán mediante búsqueda de costo uniforme/Dijkstra sobre posición, presupuesto operativo, pasajero a bordo y destinos completados. El componente React emitirá únicamente `game_event_v1` con `stimulus_shown`, `response` y `game_end`, mantendrá callbacks externos en refs y nunca emitirá rutas, celdas visitadas ni eventos crudos.

**Tech Stack:** React 19, Vite 8, Vitest 4, Testing Library, CSS responsive, `performance.now()`, `GameRuntime`/`game_event_v1`.

---

## 1. Contrato RED de telemetría y privacidad

**Files:**
- Create: `src/tasks/original-games/passengerRouteTelemetry.test.js`
- Create later: `src/tasks/original-games/passengerRouteTelemetry.js`

**Steps:**
1. Escribir tests para agregados normalizados (`score`, `completed`, `passengersDelivered`, `destinationCount`, `routeEfficiency`, `replanCount`, `stationUseCount`, `constraintViolationCount`, `satisfactionScore`, `timeMs`, `aggregateOnly`).
2. Inyectar todos los campos prohibidos: `fullRoute`, `routeTrace`, `visitedCells`, `stepByStepPath`, `rawPointerPath`, `pointerSamples`, `rawGameEvents`.
3. Exigir que el sanitizer conserve solo escalares permitidos y no mute el input.
4. Ejecutar el test focal y confirmar RED por módulo inexistente.

## 2. Contrato RED de niveles, solvencia y layout

**Files:**
- Create: `src/tasks/original-games/passengerRouteSolvability.test.js`
- Create later: `src/tasks/original-games/passengerRouteTelemetry.js`

**Steps:**
1. Exigir dos niveles demo deterministas con pasajeros, destinos y al menos una parada en la progresión.
2. Probar reachability y presupuesto operativo mediante Dijkstra/costo uniforme; horizontal = 1, vertical = 2 y parada = recarga al presupuesto máximo.
3. Probar un nivel imposible por muros/presupuesto para evitar falsos positivos.
4. Exigir métricas de tablero dentro de `606×338`, con celda jugable y sin scroll horizontal.
5. Ejecutar ambos tests y conservar evidencia RED.

## 3. Contrato RED del componente y estabilidad

**Files:**
- Create: `src/tasks/original-games/PassengerRouteOptimizationTask.test.jsx`
- Modify: `src/tasks/gameRerenderStability.test.jsx`
- Create later: `src/tasks/original-games/PassengerRouteOptimizationTask.jsx`

**Steps:**
1. Probar render de instrucciones retematizadas, tablero compacto, presupuesto operativo, pasajeros, destinos, paradas y controles accesibles.
2. Completar el primer nivel con una secuencia determinista y exigir `stimulus_shown`, `response`, `game_end` y `onComplete` aggregate-only.
3. Serializar eventos/completion y rechazar todos los nombres de campos reconstructivos.
4. Agregar el caso central de estabilidad: un re-render del padre causado por telemetría no reinicia posición/nivel ni duplica `stimulus_shown`.
5. Ejecutar focal y confirmar RED.

## 4. GREEN mínimo: helpers, Dijkstra y componente

**Files:**
- Create: `src/tasks/original-games/passengerRouteTelemetry.js`
- Create: `src/tasks/original-games/PassengerRouteOptimizationTask.jsx`
- Modify: `src/postulation-demo/postulationDemo.css`

**Steps:**
1. Implementar niveles compactos y helpers puros sin rutas retornadas/exportadas.
2. Implementar Dijkstra con estado finito `{posición, presupuesto, pasajero, máscara de entregas}` y resultado escalar `{solvable, minimumCost, minimumMoves}`.
3. Implementar aggregate builder y sanitizers con allowlist explícita.
4. Implementar interacción por flechas/botones, recogida/entrega automática, paradas de apoyo y restricciones.
5. Usar exclusivamente `performance.now()` con fallback de test y refs para `emit`/`onComplete`.
6. Aplicar layout derivado del helper y estilos compactos/alto contraste.
7. Ejecutar los tests focales hasta GREEN y refactorizar sin ampliar alcance.

## 5. Integración oculta y contratos de blueprint/stage

**Files:**
- Modify: `src/postulation-demo/PostulationGameStage.jsx`
- Modify: `src/postulation-demo/PostulationGameStage.test.jsx`
- Modify: `src/postulation-demo/originalGameBlueprints.js`
- Modify: `src/postulation-demo/originalGameBlueprints.test.js`

**Steps:**
1. Registrar `passenger_routes` en el component map por defecto.
2. Mantener `visible: false`; no modificar `postulationDemoConfig.js` ni activar batería original.
3. Cambiar activation de blueprint a `ported_hidden`, fase `R-4`.
4. Extender forbidden keys generales con `visitedCells` y `stepByStepPath`.
5. Probar render oculto explícito vía bloque pasado al stage y que el fallback DG no cambia.

## 6. Documentación y verificación

**Files:**
- Modify: `docs/plans/postulation-demo-original-games-integration-plan.md`
- Modify: `docs/plans/postulation-demo-original-games-new-agent-handoff.md`

**Steps:**
1. Marcar R-4 como port inicial oculto completado solo después de GREEN.
2. Documentar archivos, agregados, campos prohibidos y evidencia real.
3. Ejecutar exactamente:
   - `NODE_ENV=test npx vitest run src/tasks/original-games src/postulation-demo/originalGameBlueprints.test.js src/postulation-demo/PostulationGameStage.test.jsx src/tasks/gameRerenderStability.test.jsx --pool=forks --maxWorkers=1 --reporter=default`
   - `npx oxlint src/postulation-demo src/tasks src/main.jsx`
   - `npm run build`
   - `npm audit --audit-level=high --omit=dev`
   - `git diff --check`
4. Ejecutar suite completa `NODE_ENV=test npx vitest run --pool=threads` para proteger la batería DG.
5. Revisar diff, conflictos, prefijos numéricos accidentales y secretos. No hacer smoke browser porque el componente queda oculto y no se activa ninguna ruta/modo visible; si esto cambia durante implementación, ejecutar smoke real de ambas URLs.
