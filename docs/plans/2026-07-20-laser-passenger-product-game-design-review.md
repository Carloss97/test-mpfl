# Laser + Passenger Product-Ready Game Design Review

> **For Hermes:** Mantener este documento sincronizado cada vez que cambien niveles, reglas, feedback o telemetría de `laser_puzzle` y `passenger_routes`.

**Goal:** Convertir Laser Puzzle y Passenger Routes desde ports de demo a juegos separados con progresión, sentido de producto, engagement, dificultad razonable y métricas agregadas interpretables.

**Architecture:** Cada juego mantiene un componente React independiente, niveles autorados en helpers puros, tests de solvencia/layout, feedback modular y telemetría aggregate-only. El diseño de juego se separa de la interpretación de talento: el juego debe ser divertido/resoluble por sí mismo; el reporte conserva caveats y revisión humana.

**Tech Stack:** React 19, Vite 8, Vitest, Playwright smoke, helpers puros en `src/tasks/original-games/*Telemetry.js` y módulos de feedback/authoring.

---

## 1. Principios de diseño final aplicados

1. **Juego con sentido propio, no solo prueba.** Cada nivel tiene objetivo de usuario, progresión y reto legible.
2. **Dificultad incremental.** Introducción → planificación → desafío avanzado, sin saltos abruptos.
3. **Resolvible y verificable.** Todo nivel tiene solución probada por tests o por `solutionPlacements` autoradas.
4. **Engagement con propósito.** El jugador entiende por qué una acción importa: activar red, entregar pasajeros, administrar recursos.
5. **Métricas agregadas, no reconstructivas.** Nada de rutas, celdas visitadas, beam cells, secuencias o eventos crudos en payload/reporte.
6. **Separación de authoring vs desempeño.** Si un nivel está mal calibrado, eso se detecta como problema de diseño, no como bajo desempeño del candidato.

---

## 2. Laser Puzzle — diseño final separado

### 2.1 Intención de producto

Laser deja de ser “mover espejos” genérico y pasa a ser un juego de red óptica espacial:

```text
Rol del jugador: técnico/a de comunicaciones orbitales.
Meta: restablecer enlaces láser hacia antenas críticas.
Acción central: mover piezas ópticas y comprobar si el haz activa todos los objetivos.
Reto cognitivo: representación espacial, reglas de reflexión, planificación previa y verificación.
```

### 2.2 Progresión actual implementada

Archivo principal:

```text
src/tasks/original-games/laserPuzzleTelemetry.js
```

Niveles:

| Nivel | Nombre | Dificultad | Objetivo | Reto |
|---|---|---|---|---|
| 1 | Calibración orbital | intro · una antena | Reconectar una antena aislada usando reflectores mínimos. | Aprender reflexión sin múltiples objetivos. |
| 2 | Corredor de meteoritos | planning · corredor bloqueado | Redirigir el haz alrededor de obstáculos. | Planificar orden espacial de piezas antes de mover. |
| 3 | Red dual de comunicaciones | advanced · bifurcación | Dividir el haz para alimentar dos antenas. | Coordinar bifurcación fija y dos reflectores móviles. |

### 2.3 Qué significa “producto final” para Laser

- Tiene narrativa clara: reparación de comunicaciones orbitales.
- El jugador ve objetivo específico por nivel, no solo instrucciones genéricas.
- El nivel 3 introduce una mecánica distinta (`bifurcator`) para evitar repetición.
- El feedback de reporte distingue:
  - solución clara;
  - reglas a revisar;
  - objetivo incompleto;
  - solución con alto esfuerzo.
- El nivel no exporta beam path ni solución paso a paso.

### 2.4 Entradas y salidas

Entradas agregadas permitidas:

```text
completed
levelCount
solvedLevels
moveCount
reconfigurationCount
hintCount
solutionEfficiency
ruleViolationCount
timeMs
aggregateOnly
```

Salidas visibles:

```text
feedbackCategory/displayCategoryLabel
candidateHint
reviewerCaveat
nextDesignProbe
```

Campos prohibidos:

```text
beamCells
fullRoute
routeTrace
rawPointerPath
pointerSamples
rawGameEvents
clickTrace
```

### 2.5 Authoring review actual

Módulo:

```text
src/tasks/original-games/laserPuzzleAuthoringReview.js
```

Estado actual:

```text
levelAuthoringStatus: valid_for_internal_demo
totalLevels: 3
solvedByAuthoredPlacements: 3
multiObjectiveLevels: 1
parCalibratedLevels: 3
recommendedLevelAction: keep_current_levels_for_internal_demo
```

Interpretación:

- La secuencia Laser ya no es solo demo: tiene introducción, corredor bloqueado y bifurcación multiobjetivo.
- Cada nivel inicia no resuelto y se resuelve con `solutionPlacements` autoradas.
- El par se considera calibrado para presentación interna; aún no es norma psicométrica ni benchmark poblacional.
- La revisión aparece en el drawer técnico como QA de authoring, separada del feedback del candidato.

### 2.6 Tests relevantes

```text
src/tasks/original-games/laserPuzzleTelemetry.test.js
src/tasks/original-games/LaserPuzzlePostulationTask.test.jsx
src/tasks/original-games/laserPuzzleFeedback.test.js
src/tasks/original-games/laserPuzzleAuthoringReview.test.js
```

Verifican:

- 3 niveles progresivos.
- inicio no resuelto;
- solución autorada resuelve cada nivel;
- tablero cabe en 606×338;
- respuesta y feedback son aggregate-only;
- la batería controlada completa los 3 niveles.

---

## 3. Passenger Routes — diseño final separado

### 3.1 Intención de producto

Passenger deja de ser un grid genérico y pasa a ser una tarea logística con propósito:

```text
Rol del jugador: planificador/a de rutas urbanas.
Meta: recoger pasajeros y entregarlos bajo presupuesto operativo.
Acción central: decidir ruta, cuándo usar paradas y cómo minimizar errores.
Reto cognitivo: planificación bajo restricciones, manejo de recursos, secuencia y replanificación.
```

### 3.2 Progresión actual implementada

Archivo principal:

```text
src/tasks/original-games/passengerRouteTelemetry.js
```

Niveles:

| Nivel | Nombre | Dificultad | Objetivo | Reto |
|---|---|---|---|---|
| 1 | Centro: primera entrega | intro · una entrega | Recoger un pasajero y llevarlo a destino. | Entender costos horizontal/vertical y condición de entrega. |
| 2 | Conexión intermodal | planning · dos entregas | Coordinar dos pasajeros y una parada. | Decidir cuándo recargar sin tratar la parada como error. |
| 3 | Hora punta: red crítica | advanced · secuencia y recargas | Resolver dos entregas encadenadas con presupuesto ajustado. | Priorizar orden, recargas y eficiencia sin ensayo-error. |

### 3.3 Qué significa “producto final” para Passenger

- Tiene una fantasía clara: movilidad urbana/logística de pasajeros.
- El jugador entiende las reglas en lenguaje operacional: presupuesto, paradas, costos y entregas.
- La dificultad escala de 1 entrega a múltiples entregas con recargas obligatorias.
- El uso de paradas no se penaliza automáticamente: puede ser estrategia correcta.
- Existe revisión de authoring para no confundir nivel injusto con bajo desempeño.

### 3.4 Entradas y salidas

Entradas agregadas permitidas:

```text
completed
passengersDelivered
destinationCount
routeEfficiency
movementAttemptCount
replanCount
stationUseCount
constraintViolationCount
satisfactionScore
timeMs
aggregateOnly
```

Salidas visibles:

```text
constraintFeedbackCategory/displayCategoryLabel
candidateHint
reviewerCaveat
nextDesignProbe
```

Salida técnica de authoring:

```text
routeAuthoringStatus
solverConsistency
budgetFairnessNote
recommendedLevelAction
candidateOutcomeReview
levelSummaries no reconstructivos
```

Campos prohibidos:

```text
fullRoute
routeTrace
visitedCells
stepByStepPath
rawPointerPath
pointerSamples
rawGameEvents
walls/passengers/start/destination en salidas de authoring
```

### 3.5 Authoring review actual

Módulo:

```text
src/tasks/original-games/passengerRouteAuthoringReview.js
```

Estado actual:

```text
routeAuthoringStatus: valid_for_internal_demo
totalLevels: 3
solvableLevels: 3
minimumStationUseLevels: 2
boardFitLevels: 3
recommendedLevelAction: keep_current_levels_for_internal_demo
```

Interpretación:

- La secuencia es válida para demo interna y presentación.
- El tercer nivel requiere recargas y tiene dificultad real.
- Cualquier problema candidato en restricciones debe revisarse como comprensión/instrucciones antes de atribuirlo a planificación.

### 3.6 Tests relevantes

```text
src/tasks/original-games/passengerRouteSolvability.test.js
src/tasks/original-games/PassengerRouteOptimizationTask.test.jsx
src/tasks/original-games/passengerRouteFeedback.test.js
src/tasks/original-games/passengerRouteAuthoringReview.test.js
```

Verifican:

- 3 niveles progresivos.
- todos resolubles por solver;
- el tercer nivel requiere al menos 2 recargas según solución mínima;
- tablero cabe en 606×338;
- el componente completa los 3 circuitos con ruta física;
- authoring review no exporta geometría ni rutas.

---

## 4. Cambios de duración y batería

Blueprints actualizados:

```text
laser_puzzle: 3 min, 3 niveles
passenger_routes: 4 min, 3 circuitos
```

La batería estable `stable_dg` sigue siendo default. La batería original sigue controlada por:

```text
/postulaciones-demo?battery=original
/postulaciones-demo?fixture=1&battery=original
```

---

## 5. Qué queda para producto final real

### Laser

1. Añadir formas paralelas para evitar práctica/memorización.
2. Evaluar si la bifurcación necesita onboarding visual antes del nivel 3.
3. Recolectar feedback de comprensión con entrevistas cognitivas.
4. Calibrar par y tiempos con usuarios reales antes de usar comparaciones normativas.

### Passenger

1. Ejecutar QA manual de nivel 3 en desktop/móvil real.
2. Revisar si el presupuesto de 10 en “Hora punta” es justo para usuarios no gamers.
3. Añadir una pantalla breve de reglas antes del primer circuito si los errores de restricción son altos.
4. En R-7, separar error de comprensión, error de controles y planificación real.

---

## 6. Verificación ejecutada

Último bloque de verificación relacionado:

```text
Focal Laser/Passenger/report: 18 files / 72 tests PASS
Build: PASS
Lint: 0 warnings / 0 errors
Audit: 0 vulnerabilities
Smoke feedback/report: 8/8 rutas PASS en desktop y mobile
Suite completa posterior: 88 files / 365 tests PASS
PDF actualizado: exports/krumm-r6-r7-current-flow.pdf, PDF 1.4
```

Warnings conocidos de suite completa:

```text
HTMLCanvasElement.getContext() no implementado en jsdom
React act(...) warnings existentes en App.test.jsx
```
