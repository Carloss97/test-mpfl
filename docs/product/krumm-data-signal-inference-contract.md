# KRUMM — contrato de entradas, salidas, elementos, indicadores, señales e inferencia

**Fecha:** 2026-07-20  
**Producto/ruta:** `/postulaciones-demo`  
**Versión documental:** `product_contract_v1`  
**Estado:** contrato técnico para transición de demo a producto piloto; no es validación psicométrica.

---

## 1. Alcance

Este documento define qué entra al sistema, qué se procesa, qué indicadores se calculan, qué sale al reporte y qué inferencias están permitidas o prohibidas en KRUMM Postulación.

El contrato cubre dos baterías:

| Batería | Uso actual | Estado |
|---|---|---|
| `stable_dg` | Fallback/default estable de la demo. | Conservado para continuidad. |
| `original_games` | Batería interna controlada con Laser, Balloon y Passenger. | Avanzada para demo interna; aún requiere R-7 antes de uso decisional. |

Cadena obligatoria:

```text
constructo hipotético
→ demanda de tarea
→ conducta observable
→ telemetría agregada
→ feature versionada
→ regla provisional
→ disponibilidad/confianza/caveats
→ narrativa para revisión humana
```

---

## 2. Elementos del producto

| Elemento | Descripción | Estado de desarrollo | Archivos fuente principales |
|---|---|---|---|
| Flujo candidato `/postulaciones-demo` | Experiencia de postulación con batería, progreso, juegos, generación de reporte y fixture. | Implementado para demo; falta hardening producto/piloto. | `src/postulation-demo/PostulationDemoApp.jsx`, `PostulationGameStage.jsx`, `postulationDemoConfig.js` |
| Batería estable `stable_dg` | Tareas estables/diagnósticas del runtime existente. | Default/fallback. | `src/postulation-demo/postulationDemoConfig.js`, `src/tasks` |
| Batería original `original_games` | Laser, Balloon, Passenger productizados para demo interna. | Controlado por query/batería; requiere R-7. | `src/postulation-demo/originalGameBlueprints.js`, `src/tasks/original-games/*` |
| Reporte HR | Vista ejecutiva con métricas agregadas, No medido, caveats y revisión humana. | Implementado para demo; falta workflow real recruiter. | `PostulationReportScreen.jsx`, `PostulationReportSummary.js` |
| Drawer técnico | Expone QA, descargas y gobernanza sin saturar la vista HR. | Implementado. | `PostulationReportTechnicalDrawer.jsx` |
| Feature vector original | Vector fijo de juegos originales. | Implementado como R-6. | `src/assessment/originalGameFeatureVector.js` |
| Framework talento workbook | Mapeo provisional de 8 constructos del Excel KRUMM. | Implementado con caveats. | `src/assessment/originalGameTalentMapping.js` |
| Validadores/sanitización | Evitan raw data y campos reconstructivos en payloads. | Implementados en rutas principales; requiere auditoría de producto. | `assessmentSession.js`, `finalAssessmentPayload.js`, `originalGameBlueprints.js` |
| Smoke browser | Verifica rutas, fixture, overflow, consola, request failures y ausencia de campos crudos visibles. | Implementado para demo. | `scripts/smoke-postulation-feedback.mjs` |

---

## 3. Entradas permitidas

### 3.1 Entradas operacionales de sesión

| Entrada | Fuente | Uso permitido | Persistencia |
|---|---|---|---|
| Consentimiento de cámara | UI candidato | Activar/caveatear señales de calidad. | Estado/flag, no video. |
| Selección de batería | Config/query/session lock | Elegir `stable_dg` u `original_games`. | ID de batería y versión. |
| Estado de juegos | Runtime de batería | Orquestar progreso y completitud. | Resumen por bloque. |
| Fixture | Query `?fixture=1` | QA y demo determinística. | Solo entorno demo/controlado. |
| Metadata técnica | Navegador/runtime/build | Diagnóstico y reproducibilidad. | Metadata no sensible. |

### 3.2 Entradas agregadas por juego original

| Juego | Entradas permitidas | Uso |
|---|---|---|
| Laser Puzzle | `score`, `completed`, `levelCount`, `solvedLevels`, `moveCount`, `reconfigurationCount`, `hintCount`, `timeMs`, `solutionEfficiency`, `ruleViolationCount`, `aggregateOnly` | Resolución de niveles, eficiencia, cumplimiento de reglas y contexto temporal. |
| Balloon Risk | `score`, `completed`, `roundsCompleted`, `totalRounds`, `averagePumps`, `cashoutCount`, `popCount`, `postPopAdjustment`, `postPopAdjustmentCount`, `riskEfficiency`, `timeMs`, `aggregateOnly` | Estrategia descriptiva riesgo/recompensa y oportunidades de feedback. |
| Passenger Routes | `score`, `completed`, `passengersDelivered`, `destinationCount`, `routeEfficiency`, `movementAttemptCount`, `replanCount`, `stationUseCount`, `constraintViolationCount`, `satisfactionScore`, `timeMs`, `aggregateOnly` | Planificación bajo restricciones, uso de recursos, cumplimiento de reglas y eficiencia agregada. |

### 3.3 Señales técnicas permitidas como calidad/contexto

| Señal | Uso permitido | Uso prohibido |
|---|---|---|
| Calidad facial agregada | Disponibilidad, confianza, caveats de captura. | Inferir personalidad, emoción, estrés, fatiga, sinceridad o talento. |
| Gaze agregado | Calidad/contexto técnico si existe en agregados. | Diagnosticar atención laboral o intención. |
| Postura/MoveNet agregado | Calidad/contexto técnico; no inferencia de talento. | Inferir liderazgo, energía, motivación o salud. |
| Correlación temporal agregada por trial | Contexto de alineación tarea-señal. | Reconstruir eventos, acciones o secuencias. |

---

## 4. Entradas prohibidas

Nunca deben persistirse, exportarse ni enviarse al reporte final:

| Categoría | Campos/ejemplos prohibidos |
|---|---|
| Imagen/video | video, frames, screenshots, base64 image data. |
| Biometría cruda | landmarks, keypoints, face samples, blendshapes crudos, ventanas crudas. |
| Puntero/DOM | PointerEvents, MouseEvents, DOM events, rawPointerPath, pointerSamples, clickTrace. |
| Juego reconstructivo | fullRoute, routeTrace, visitedCells, stepByStepPath, beamCells, pumpSequence, rawGameEvents, trials detallados. |
| Inferencia prohibida | hire/no-hire, apto/no apto, ranking automático, percentil sin normas, personalidad, emoción interna, estrés, fatiga, sinceridad. |

---

## 5. Señales telemétricas e indicadores implementados

### 5.1 Laser Puzzle

| Señal agregada | Indicador | Fórmula/contrato | Inferencia permitida | Caveat |
|---|---|---|---|---|
| `completed` | `laser.completion` | `completed ? 1 : 0` | Disponibilidad de evidencia de tarea. | No mide habilidad por sí solo. |
| `solvedLevels`, `levelCount` | `laser.solvedRate` | `solvedLevels / levelCount` | Metas resueltas bajo reglas explícitas. | Sensible a cantidad/dificultad de niveles. |
| `solutionEfficiency`, `moveCount` | `laser.solutionEfficiency` | agregado upstream, conceptualmente par/movimientos | Eficiencia frente a solución esperada. | Depende de authoring/par. |
| `ruleViolationCount`, `levelCount` | `laser.ruleCompliance` | `1 - min(1, violations / levels)` | Cumplimiento observable de reglas. | Puede reflejar instrucción/UX, no capacidad. |
| `moveCount` | `laser.moveCount` | conteo no negativo | Contexto de esfuerzo. | No se interpreta sin nivel. |
| `timeMs` | `laser.timeMs` | duración agregada | Contexto temporal. | No es velocidad normada. |

### 5.2 Balloon Risk

| Señal agregada | Indicador | Fórmula/contrato | Inferencia permitida | Caveat |
|---|---|---|---|---|
| `completed` | `balloon.completion` | `completed ? 1 : 0` | Disponibilidad de secuencia riesgo/recompensa. | No es score de calidad. |
| `riskEfficiency`, `score` | `balloon.riskEfficiency` | ratio `[0,1]` | Estrategia descriptiva de recompensa/pérdida. | No mide personalidad ni frustración. |
| `cashoutCount`, `totalRounds` | `balloon.cashoutRate` | `cashoutCount / totalRounds` | Frecuencia de asegurar recompensa. | Alto/bajo no tiene valencia sin criterio. |
| `popCount`, `totalRounds` | `balloon.popRate` | `popCount / totalRounds` | Exposición a pérdidas. | Depende de thresholds/azar. |
| `averagePumps` | `balloon.averagePumpsNormalized` | `min(1, averagePumps / 12)` | Intensidad promedio de acumulación. | Cap provisional. |
| `postPopAdjustment`, `postPopAdjustmentCount` | `balloon.postLossAdjustment` | solo si `postPopAdjustmentCount > 0` | Ajuste agregado post-pérdida. | Ausencia de oportunidad = desconocido. |
| `postPopAdjustmentCount` | `balloon.postLossAdjustmentObserved` | `count > 0 ? 1 : 0` | Máscara de disponibilidad. | No puntúa calidad. |
| `timeMs` | `balloon.timeMs` | duración agregada | Contexto temporal. | No es norma. |

### 5.3 Passenger Routes

| Señal agregada | Indicador | Fórmula/contrato | Inferencia permitida | Caveat |
|---|---|---|---|---|
| `completed` | `passenger.completion` | `completed ? 1 : 0` | Disponibilidad de evidencia de ruta. | No mide calidad por sí solo. |
| `passengersDelivered`, `destinationCount` | `passenger.deliveryRate` | `delivered / destinationCount` | Cumplimiento de metas logísticas. | Pocos destinos, sensible a controles. |
| `routeEfficiency` | `passenger.routeEfficiency` | `minimumCost / actualCost` upstream | Eficiencia agregada bajo restricciones. | Depende de solver y authoring. |
| `constraintViolationCount`, `movementAttemptCount` | `passenger.constraintCompliance` | `1 - min(1, violations / attempts)` | Cumplimiento de restricciones proporcional a exposición. | Violaciones pueden ser comprensión/UX. |
| `replanCount`, `movementAttemptCount` | `passenger.replanRate` | `min(1, replans / attempts)` | Contexto de replanificación. | Replanificar puede ser adaptativo o ineficiente. |
| `stationUseCount` | `passenger.stationUseCount` | conteo no negativo | Uso de recursos/paradas. | Puede ser óptimo según nivel. |
| `satisfactionScore` | `passenger.satisfactionNormalized` | `score / 100` | Resumen de outcome del juego. | No es satisfacción real del usuario/cliente. |
| `timeMs` | `passenger.timeMs` | duración agregada | Contexto temporal. | No es norma. |

---

## 6. Artefactos de salida

| Artefacto | Tipo/schema | Estado | Contenido | Consumidor |
|---|---|---|---|---|
| `assessment_feature_vector_v2` | vector stable existente | Conservado | Features de batería estable y señales agregadas. | Pipeline existente. |
| `original_game_feature_vector_v1` | vector original juegos | Implementado R-6 | `featureOrder`, `featureArray`, `featureMap`, `observedMask`, `featureAvailability`, `gameAvailability`, privacy flags. | Framework provisional, QA, investigación. |
| `krumm_workbook_talent_framework_v1` | framework provisional | Implementado R-6 | 8 constructos del Excel con score/null, availability, confidence, caveats, narrative. | Reporte HR y revisión técnica. |
| Game feedback cards | UI/report object | Implementado | Categoría, hint y caveat por Laser/Balloon/Passenger. | Candidato/revisor. |
| Authoring/QA summaries | drawer técnico | Implementado | Laser authoring, Balloon calibration, Passenger authoring, instruction check. | Equipo KRUMM interno. |
| Final payload/report bundle | JSON/MD/HTML | Implementado demo | Reporte y payload sanitizado. | Revisión humana, descarga técnica. |

---

## 7. Inferencia permitida y prohibida

### 7.1 Estados de inferencia permitidos

| Estado | Significado | Uso permitido |
|---|---|---|
| `measured_complete` | Juego/feature completado y válido. | Puede alimentar métricas provisionales. |
| `observed` | Feature agregada disponible. | Puede mostrarse como evidencia. |
| `descriptive_only` | Hay señal de tarea pero sin dirección normativa. | Describir estrategia/contexto; no puntuar talento. |
| `provisional_score` | Índice técnico calculado con caveats. | Solo revisión humana e investigación R-7. |
| `insufficient` | Evidencia incompleta. | Mostrar No medido/insuficiente. |
| `not_measured` | Constructo no cubierto por batería. | Mostrar No medido; no imputar 0 ni 50. |
| `invalid` / `not_observed` | Dato ausente, inconsistente o contaminado. | Bloquear o caveatear inferencia. |

### 7.2 Constructos KRUMM workbook

| Constructo | Estado actual | Fuente principal | Uso permitido |
|---|---|---|---|
| Toma de decisiones | `descriptive_only` | Balloon/Passenger como estrategia observada. | Narrativa, no score normativo. |
| Resolución de problemas | `provisional_score` si Laser+Passenger completos | Laser + Passenger. | Índice técnico con confianza acotada. |
| Asunción de riesgo / feedback | `descriptive_only` | Balloon. | Estrategia riesgo/recompensa; no rasgo. |
| Planificación | `provisional_score` si Passenger completo | Passenger. | Planificación bajo restricciones del juego. |
| Adaptabilidad/flexibilidad | `insufficient` | No hay cambios controlados suficientes. | No medir. |
| Pensamiento analítico | `provisional_score` si Laser+Passenger completos | Laser + Passenger. | Índice técnico, no rasgo validado. |
| Liderazgo | `not_measured` | No hay tarea social/multijugador. | No medir. |
| Comunicación | `not_measured` | No hay tarea comunicativa codificada. | No medir. |

---

## 8. Módulos de QA/feedback implementados

| Módulo | Estado | Función | Visibilidad |
|---|---|---|---|
| `laser.failure-explanation` | Implementado | Feedback de solución/reglas/esfuerzo sin beam path. | Reporte visible. |
| `laser.level-authoring-review` | Implementado | Verifica solvencia, par, multiobjetivo y layout. | Drawer técnico. |
| `balloon.feedback-comprehension` | Implementado | Explica cashout/pérdida/feedback sin pump sequence. | Reporte visible. |
| `balloon.threshold-calibration-review` | Implementado | Revisa distribución alto/medio/bajo de rondas. | Drawer técnico. |
| `passenger.constraint-feedback` | Implementado | Explica restricciones, recursos y ruta agregada. | Reporte visible. |
| `passenger.route-authoring-review` | Implementado | Verifica solver, presupuesto, paradas y dificultad. | Drawer técnico. |
| `shared.candidate-instruction-check` | Implementado | Separa riesgo de comprensión/instrucciones de desempeño. | Drawer técnico. |
| `shared.mobile-accessibility-qa` | Planificado | QA de viewport/touch/copy largo. | Próxima fase. |

---

## 9. Reglas de privacidad y sanitización

1. Todo bloque de juego debe declarar `aggregateOnly: true`.
2. Cualquier campo reconstructivo debe invalidar o bloquear el consumo del bloque.
3. La validación debe ocurrir en cada frontera: bloque de juego, feature vector, assessment session, final payload y reporte.
4. Las descargas técnicas pueden incluir JSON/Markdown/HTML sanitizados, no raw logs.
5. Las señales de cámara no se usan para inferencia directa de talento.
6. Los scores 0–100 no son percentiles, normas ni cortes.
7. `null` significa no medido/no disponible; nunca debe transformarse a cero o 50 neutral.

---

## 10. Requisitos para evolucionar el contrato a producto real

Para que este contrato sea apto para piloto/producto debe agregarse:

| Requisito | Motivo | Prioridad |
|---|---|---|
| Esquemas versionados persistentes | Evitar drift y romper reportes históricos. | Alta |
| Backend de sesiones aggregate-only | Producto real necesita invitación, guardado, revisión y auditoría. | Alta |
| Retención/eliminación de datos | Cumplimiento privacidad y confianza empresarial. | Alta |
| Auditoría de payloads en CI | Evitar regresiones de datos crudos. | Alta |
| QA multi-dispositivo real | Reducir sesgo por hardware/navegador. | Alta |
| Protocolo R-7 con participantes | Sustentar cualquier comparación entre personas. | Alta |
| Panel recruiter separado | Diferenciar candidato, HR, técnico y científico. | Media |
| Manual de interpretación HR | Evitar sobreuso comercial del reporte. | Media |

---

## 11. Referencias internas

- `src/assessment/originalGameFeatureVector.js`
- `src/assessment/originalGameTalentMapping.js`
- `src/tasks/original-games/originalGameImprovementModules.js`
- `src/postulation-demo/PostulationReportSummary.js`
- `src/postulation-demo/PostulationReportTechnicalDrawer.jsx`
- `docs/research/krumm-talent-game-behavior-mapping-technical-study.md`
- `docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md`
