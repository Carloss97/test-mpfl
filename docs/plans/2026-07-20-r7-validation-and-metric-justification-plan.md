# KRUMM R-7 Validation and Metric Justification Plan

> **For Hermes:** Ejecutar secuencialmente con evidencia real, sin commit/push. R-7 no cambia el default de batería; define y prueba el protocolo para decidir si la batería original, estable o mixta avanza.

**Goal:** Validar comparativamente la batería `stable_dg` y la batería `original_games`, con trazabilidad explícita entre cada entrada agregada, su métrica, el constructo que pretende informar y la evidencia requerida antes de cualquier uso decisional.

**Architecture:** R-7 se apoya en R-6: `original_game_feature_vector_v1` y `krumm_workbook_talent_framework_v1` son artefactos provisionales. El protocolo separa QA técnica, usabilidad, validez de contenido, confiabilidad, validez convergente/discriminante, validez de criterio, fairness/invariancia y decisión de producto. Ningún score R-6 se convierte en percentil, corte o recomendación de contratación.

**Tech Stack:** Markdown técnico, React/Vite/Vitest/Playwright, artefactos aggregate-only, análisis estadístico futuro fuera del browser y revisión psicométrica/I-O.

---

## 1. Principios de R-7

1. **No validar contra intuición:** un juego “parece medir” algo solo si la cadena constructo→tarea→feature→criterio está documentada y evaluada.
2. **Separar QA de validez:** que una ruta funcione sin errores no implica validez psicométrica.
3. **Separar señal técnica de inferencia:** cámara/biometría solo informa calidad/contexto, nunca talento.
4. **Faltante ≠ bajo:** ausencia de evidencia se codifica como `not_observed`, `insufficient` o `not_measured`.
5. **Sin normas no hay ranking:** no hay percentiles, cortes, fortalezas/áreas de atención ni decisión automática.
6. **Reversibilidad:** `stable_dg` sigue default/fallback hasta decisión explícita.

---

## 2. Matriz input → métrica → justificación

| Juego | Entrada agregada | Métrica R-6 | Fórmula | Relación técnica | Riesgo de sobreinterpretación | Evidencia R-7 requerida |
|---|---|---|---|---|---|---|
| Laser | `completed` | `laser.completion` | `completed ? 1 : 0` | Confirma que la tarea alcanzó estado final y que sus métricas de eficiencia son interpretables. | Completion no equivale a habilidad general. | Validez de contenido: expertos confirman que el nivel requiere reglas/planificación y no solo exploración trivial. |
| Laser | `solvedLevels`, `levelCount` | `laser.solvedRate` | `solvedLevels / levelCount` | Proporción de metas resueltas bajo reglas explícitas; no conserva caminos. | Con pocos niveles es inestable y sensible a práctica. | Confiabilidad por formas paralelas y análisis de dificultad por nivel. |
| Laser | `solutionEfficiency`, `moveCount` | `laser.solutionEfficiency` | agregado upstream, conceptualmente `par / movimientos` | Relaciona proximidad a solución parsimoniosa con eficiencia de manipulación de reglas. | El `par` debe estar bien autorado; no prueba inteligencia. | Validación de niveles con solver/experto y correlación convergente con pruebas de razonamiento/planificación. |
| Laser | `ruleViolationCount`, `levelCount` | `laser.ruleCompliance` | `1 - min(1, violations / levelCount)` | Normaliza salidas contra restricciones explícitas; indica adherencia observable a reglas. | Violaciones pueden reflejar mala comprensión/UX. | Entrevistas cognitivas y análisis de errores por instrucción/dispositivo. |
| Balloon | `riskEfficiency`, `score` | `balloon.riskEfficiency` | ratio agregado `[0,1]` | Resume recompensa capturada vs pérdidas dentro de una tarea de riesgo secuencial. | No implica personalidad, impulsividad clínica, frustración ni “mejor decisión”. | Comparar con BART/medidas de riesgo si se pretende convergencia; definir criterio externo antes de dirección normativa. |
| Balloon | `cashoutCount`, `totalRounds` | `balloon.cashoutRate` | `cashoutCount / totalRounds` | Frecuencia de asegurar recompensa antes de pérdida; estrategia descriptiva. | Alto/bajo no tiene valencia sin criterio. | Modelado de estrategia y estabilidad test–retest. |
| Balloon | `popCount`, `totalRounds` | `balloon.popRate` | `popCount / totalRounds` | Exposición a pérdida durante la secuencia. | Pop no es fracaso moral ni baja tolerancia. | Revisar distribución por thresholds y azar; calibración de niveles. |
| Balloon | `averagePumps` | `balloon.averagePumpsNormalized` | `min(1, averagePumps / 12)` | Intensidad media de acumulación; acotada para vector estable. | Cap provisional; oculta adaptación ronda a ronda. | Justificación empírica del cap o reemplazo por modelo validado. |
| Balloon | `postPopAdjustment`, `postPopAdjustmentCount` | `balloon.postLossAdjustment` | valor solo si count > 0 | Ajuste agregado tras una pérdida observada; diferencia 0 real vs faltante mediante mask. | No mide tolerancia a frustración ni adaptabilidad general. | Asegurar suficientes oportunidades post-pérdida y estimar confiabilidad. |
| Passenger | `passengersDelivered`, `destinationCount` | `passenger.deliveryRate` | `delivered / destinationCount` | Proporción de metas logísticas completadas bajo restricciones; no guarda ruta. | Pocos destinos; completion puede depender de controles. | Validación de niveles y análisis de dificultad. |
| Passenger | `routeEfficiency` | `passenger.routeEfficiency` | `minimumCost / actualCost` upstream | Compara costo agregado de ruta contra solución mínima calculada por solver. | Depende de solver y diseño del mapa. | Auditoría de solver y revisión de expertos en task design. |
| Passenger | `constraintViolationCount`, `movementAttemptCount` | `passenger.constraintCompliance` | `1 - min(1, violations / attempts)` | Relaciona violaciones con intentos totales, evitando castigar conteos absolutos sin exposición. | Violaciones pueden ser problema de UI o comprensión. | Entrevistas cognitivas, logs agregados de errores y pruebas de accesibilidad/dispositivo. |
| Passenger | `replanCount`, `movementAttemptCount` | `passenger.replanRate` | `min(1, replans / attempts)` | Frecuencia de uso explícito de revisión/planificación respecto a actividad total. | Replanificar puede ser adaptativo o ineficiente; no tiene dirección normativa sola. | Relacionar con eficiencia y criterios externos antes de puntuar. |
| Passenger | `stationUseCount` | `passenger.stationUseCount` | conteo no negativo | Uso de recursos/paradas bajo restricción. | Puede ser óptimo en algunos niveles. | Interpretar con nivel y solución mínima. |
| Passenger | `satisfactionScore` | `passenger.satisfactionNormalized` | `score / 100` | Resumen agregado de cumplimiento/eficiencia del juego. | No es satisfacción real del usuario/cliente. | Validar fórmula interna y sensibilidad. |

---

## 3. Fases de R-7

### Fase R-7A — QA técnica comparativa

**Objetivo:** demostrar que ambas baterías se ejecutan sin regresiones técnicas.

**Entradas:** `stable_dg`, `original_games`, fixtures, cámara permitida/denegada, desktop/mobile.  
**Salidas:** matriz PASS/FAIL con consola, page errors, request failures, overflow, descargas, payload privacy.  
**Condición de éxito:** 0 errores bloqueantes y 0 overflow horizontal en rutas obligatorias.

### Fase R-7B — Validez de contenido

**Objetivo:** evaluar si cada tarea representa razonablemente el constructo hipotético.

**Entradas:** documento R-6, niveles, reglas, features, fórmulas y reportes.  
**Método:** revisión por 2+ expertos I-O/psicometría/producto; calificar relevancia, claridad, contaminación y omisiones.  
**Salidas:** matriz constructo×tarea×feature con `aceptar`, `revisar`, `rechazar`, comentarios y severidad.  
**Condición de avance:** ningún constructo puntuado puede tener “rechazar” en relevancia o contaminación crítica.

### Fase R-7C — Entrevistas cognitivas y usabilidad

**Objetivo:** confirmar que los candidatos entienden las demandas de tarea como se diseñaron.

**Entradas:** sesión de candidato, guía de entrevista, observaciones no reconstructivas.  
**Salidas:** problemas de comprensión, accesibilidad, dispositivo, fatiga, lenguaje y tiempos.  
**Condición de avance:** instrucciones y controles no deben explicar más varianza que el constructo pretendido.

### Fase R-7D — Confiabilidad

**Objetivo:** medir estabilidad mínima de métricas antes de interpretarlas.

**Métodos posibles:**

- test–retest con intervalo definido;
- formas paralelas de Laser/Passenger;
- estabilidad interna de niveles/rounds cuando el constructo lo permita;
- error estándar de medición preliminar.

**Salidas:** confiabilidad por feature/constructo, intervalos de incertidumbre y flags de baja estabilidad.  
**Condición de avance:** constructos con confiabilidad baja permanecen `descriptive_only` o `insufficient`.

### Fase R-7E — Validez convergente y discriminante

**Objetivo:** verificar si las métricas se relacionan con instrumentos establecidos según hipótesis.

**Ejemplos:**

- Laser/Passenger vs medidas de razonamiento/planificación/función ejecutiva.
- Balloon vs BART o medidas de riesgo, si se decide evaluar convergencia.
- Liderazgo/comunicación deberían permanecer no medidos; no deben correlacionarse forzadamente.

**Condición de avance:** relaciones deben ser pre-registradas; resultados nulos o ambiguos se reportan, no se ocultan.

### Fase R-7F — Validez de criterio

**Objetivo:** evaluar relación con outcomes laborales o de entrenamiento relevantes.

**Requisitos:**

- criterio definido antes de mirar datos;
- evitar circularidad con CV o labels generados por IA;
- controlar experiencia previa en juegos, dispositivo, accesibilidad y contexto;
- analizar utilidad incremental frente a métodos existentes.

**Condición de avance:** sin criterio externo suficiente no hay decisión de reemplazo basada en talento.

### Fase R-7G — Fairness, invariancia y device effects

**Objetivo:** detectar sesgos por subgrupo, dispositivo, navegador, idioma, accesibilidad o calidad de cámara.

**Salidas:** diferencias de disponibilidad, error, completitud, tiempo, distribución de scores y payload quality flags.  
**Condición de avance:** si un subgrupo/dispositivo presenta medición no comparable, el reporte debe caveatear o bloquear inferencia.

### Fase R-7H — Decisión producto

Opciones:

1. mantener `stable_dg`;
2. mantener `original_games` solo interno;
3. usar batería mixta;
4. iterar juegos/instrucciones;
5. avanzar a piloto controlado con disclaimer explícito.

Ninguna opción debe convertir R-6 en herramienta decisional sin evidencia R-7.

---

## 4. Comandos técnicos mínimos por iteración R-7

```bash
NODE_ENV=test npx vitest run src/assessment/originalGameFeatureVector.test.js src/assessment/originalGameTalentMapping.test.js src/postulation-demo/postulationDemoFixture.test.js src/postulation-demo/PostulationReportScreen.test.jsx --pool=threads --reporter=default
NODE_ENV=test npx vitest run --pool=threads --reporter=default
npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

Smoke browser:

```text
/postulaciones-demo
/postulaciones-demo?fixture=1
/postulaciones-demo?battery=original
/postulaciones-demo?fixture=1&battery=original
```

Viewports mínimos:

```text
1280×720
390×844
1366×768
1440×900
1920×1080
```

---

## 5. Decisión de cierre de R-7

R-7 se cierra solo con una tabla que indique para cada constructo:

```text
constructo
→ estado: provisional_score / descriptive_only / insufficient / not_measured / rejected
→ evidencia técnica
→ evidencia psicométrica
→ límites
→ decisión: mantener / revisar / retirar / pilotear
```

Hasta que esa tabla exista, la salida de R-6 debe considerarse documentación técnica y soporte para revisión humana, no inferencia validada.
