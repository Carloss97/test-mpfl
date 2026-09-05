# KRUMM — Estudio técnico de mapeo entre perfiles de talento, indicadores conductuales y juegos

**Estado:** R-6 / documento técnico inicial.  
**Fuente revisada:** `/mnt/c/Users/sarlo/Downloads/Mapeo de Perfiles de Talento e Indicadores de Comportamiento - KRUMM.xlsx`  
**SHA-256 registrado:** `c25077d6f4b23bb590d00cb2a695bbdecc6d1feece1fe761e1b5972615a72b02`  
**Hoja/rango:** `Hoja1!A1:I9` — 8 perfiles, 9 columnas, 81 celdas pobladas, sin fórmulas ni vínculos.

---

## 1. Propósito

El archivo Excel no es todavía una batería psicométrica validada. Es una matriz de hipótesis que intenta conectar:

1. perfiles de talento deseados por KRUMM;
2. definiciones bibliográficas o de negocio;
3. correlatos observables propuestos: micro-comportamientos, telemetría y FACS;
4. relevancia de producto;
5. juegos candidatos;
6. una justificación inicial de por qué cada juego podría elicitar conductas relacionadas.

La meta de R-6 no es declarar validez predictiva. La meta correcta es convertir esa matriz en un contrato técnico auditable:

```text
constructo → demanda de tarea → conducta observable → telemetría agregada → feature versionada → regla provisional → disponibilidad/confianza/caveats → narrativa para revisión humana
```

Todo uso HR debe permanecer como soporte descriptivo para revisión humana, sin decisión automatizada y sin inferencias de personalidad, emoción, salud, estrés, sinceridad o contratación.

---

## 2. Transcripción estructural de la matriz fuente

| Celda | Perfil | Definición resumida | Correlatos propuestos | Juegos sugeridos | Lectura R-6 |
|---|---|---|---|---|---|
| A2:I3 | Toma de decisiones | Tendencia a elegir estrategias bajo tareas complejas. | Latencia, espera, trayectoria mouse, AU4. | Balloon Game; Electron Rush. | `descriptive_only`; Balloon produce índice de estrategia/riesgo, no “mejor/peor decisión” normativa. |
| A4:I4 | Resolución de problemas | Transformar estados de problema en metas mediante estrategias. | Intentos fallidos, uso de herramientas, AU4. | Laser & Mirrors; Relic Hunt. | `provisional_score` solo con Laser + Passenger completos. |
| A5:I5 | Asunción de riesgo y tolerancia a la frustración | Decidir bajo incertidumbre y persistir ante obstáculos. | Presión mouse/touch, rPPG/HRV, AUs de frustración/ira. | Balloon Game. | Riesgo/feedback `descriptive_only`; tolerancia a frustración `not_measured`. |
| A6:I6 | Planificación | Anticipar, organizar acciones, monitorear metas y actualizar planes. | Monitoreo, uso de recursos, sorpresa ante cambios. | Grid Flow; Virus Slayer. | `provisional_score` desde Passenger Routes si válido. |
| A7:I7 | Adaptabilidad/flexibilidad cognitiva | Reestructurar conocimiento ante demandas cambiantes. | Rendimiento tras cambios, cambio de herramientas, AU4 persistente. | Virus Slayer; Rat Catch. | `insufficient` con batería actual; no se infiere desde un único cambio o AU4. |
| A8:I8 | Pensamiento analítico | Usar lógica y descomponer datos complejos. | Tiempo en figuras/cálculos, hotkeys, AU4. | Grid Flow; AOC. | `provisional_score` solo como desempeño lógico/planificación Laser+Passenger, no rasgo general. |
| A9:I9 | Liderazgo | Tomar mando, dirigir, alinear visión. | Roles en multiplayer, AU6+AU12, acciones tras diálogo grupal. | Role-play/simulation. | `not_measured` en tareas individuales actuales. |
| A10:I10 | Comunicación | Transmitir información, feedback, estilo asertivo/pasivo/agresivo. | Elección textual, señales no verbales avatar, AU12. | AOC; CADyFACE. | `not_measured` en batería actual; requiere tarea social/comunicativa diseñada. |

---

## 3. Entradas, salidas y límites de datos

### 3.1 Entradas permitidas para R-6

R-6 solo puede consumir agregados por juego ya sanitizados:

- `laser_puzzle`: `score`, `completed`, `levelCount`, `solvedLevels`, `moveCount`, `reconfigurationCount`, `hintCount`, `timeMs`, `solutionEfficiency`, `ruleViolationCount`, `aggregateOnly`.
- `balloon_risk`: `score`, `completed`, `roundsCompleted`, `totalRounds`, `averagePumps`, `cashoutCount`, `popCount`, `postPopAdjustment`, `postPopAdjustmentCount`, `riskEfficiency`, `timeMs`, `aggregateOnly`.
- `passenger_routes`: `score`, `completed`, `passengersDelivered`, `destinationCount`, `routeEfficiency`, `movementAttemptCount`, `replanCount`, `stationUseCount`, `constraintViolationCount`, `satisfactionScore`, `timeMs`, `aggregateOnly`.

### 3.2 Entradas prohibidas

No se puede usar ni persistir:

- video, frames, screenshots o imágenes;
- landmarks, keypoints, face samples, blendshapes crudos;
- ventanas crudas de correlación;
- DOM events, PointerEvents, MouseEvents;
- rutas/celdas visitadas, trayectorias de puntero, secuencias de clicks/bombeos/movimientos;
- raw game logs o trials detallados.

### 3.3 Salidas técnicas nuevas

R-6 agrega dos artefactos separados:

1. `original_game_feature_vector_v1`: vector fijo, agregado, con `featureOrder`, `featureArray` finito, `observedMask`, `featureAvailability`, `gameAvailability`, unidades, flags de calidad y privacidad.
2. `krumm_workbook_talent_framework_v1`: framework interpretativo provisional en el orden del Excel, con `score`, `availability`, `confidence`, `confidenceCeiling`, evidencia, caveats y clasificación deshabilitada sin normas.

`assessment_feature_vector_v2` se mantiene intacto para compatibilidad del pipeline existente.

---

## 4. Definiciones operacionales por juego

### 4.1 Laser Puzzle

**Demanda de tarea:** manipular reflectores bajo reglas explícitas para hacer llegar un haz a antenas.  
**Conductas observables:** resolución de niveles, eficiencia de solución, número de movimientos/reconfiguraciones, cumplimiento de reglas.  
**Features R-6:**

- `laser.completion`: 1 si completado.
- `laser.solvedRate`: `solvedLevels / levelCount` si ambos válidos.
- `laser.solutionEfficiency`: ratio agregado ya normalizado.
- `laser.ruleCompliance`: `1 - normalized(ruleViolationCount)`.
- `laser.moveCount`: conteo agregado; no trayectoria.
- `laser.timeMs`: duración agregada.

**Interpretación permitida:** evidencia de desempeño en razonamiento espacial, reglas y resolución de problema de baja fidelidad contextual.  
**Interpretación prohibida:** inteligencia general, personalidad, tolerancia a presión, liderazgo o “capacidad laboral” como diagnóstico.

### 4.2 Balloon Risk

**Demanda de tarea:** acumular recompensa bajo incertidumbre con riesgo de pérdida.  
**Conductas observables:** pumps promedio, cashouts, pops, ajuste agregado posterior a pérdida.  
**Features R-6:**

- `balloon.completion`.
- `balloon.riskEfficiency`.
- `balloon.cashoutRate`.
- `balloon.popRate`.
- `balloon.averagePumpsNormalized`.
- `balloon.postLossAdjustment`.
- `balloon.postLossAdjustmentObserved`.
- `balloon.timeMs`.

**Interpretación permitida:** perfil descriptivo de estrategia riesgo/recompensa y ajuste ante feedback dentro del juego.  
**Interpretación prohibida:** tolerancia a la frustración, impulsividad clínica, personalidad, estrés o calidad de toma de decisiones sin criterio externo.

### 4.3 Passenger Routes

**Demanda de tarea:** recoger pasajeros y entregarlos a destino bajo costos, presupuesto y paradas.  
**Conductas observables:** eficiencia de ruta, entregas, restricciones, uso de estaciones, replanificaciones.  
**Features R-6:**

- `passenger.completion`.
- `passenger.deliveryRate`.
- `passenger.routeEfficiency`.
- `passenger.constraintCompliance`.
- `passenger.replanRate`.
- `passenger.stationUseCount`.
- `passenger.satisfactionNormalized`.
- `passenger.timeMs`.

**Interpretación permitida:** planificación bajo restricciones y manejo de recursos en una tarea gamificada específica.  
**Interpretación prohibida:** liderazgo logístico real, desempeño laboral real, adaptabilidad general sin cambios controlados.

### 4.4 Diccionario implementado input → métrica

El diccionario técnico vivo está en `src/assessment/originalGameFeatureVector.js` como `ORIGINAL_GAME_FEATURE_DEFINITIONS`. Cada feature declara:

```text
sourceGame
aggregateInputs
metricFormula
metricRationale
constructRelevance
limitations
```

Esto fuerza que una métrica no aparezca en el vector si no existe una justificación explícita entre entrada agregada y medición. Ejemplos críticos:

- `laser.solutionEfficiency` usa `solutionEfficiency` y `moveCount` porque la relación con el constructo no es “hacer clicks”, sino eficiencia agregada frente al par/solución esperada de un problema con reglas. La métrica no conserva qué piezas se movieron.
- `balloon.postLossAdjustment` usa `postPopAdjustment` solo cuando `postPopAdjustmentCount > 0`; así un ajuste real de cero no se confunde con ausencia de oportunidad post-pérdida.
- `passenger.constraintCompliance` usa `constraintViolationCount / movementAttemptCount`; contar violaciones sin denominador sobrecastiga sesiones con más actividad y no justifica comparar candidatos.
- `passenger.routeEfficiency` usa un agregado tipo `minimumCost / actualCost`; la relación con planificación depende de que el solver y el nivel sean válidos, no de una ruta cruda.

Las pruebas en `src/assessment/originalGameFeatureVector.test.js` exigen que cada feature tenga entradas, fórmula, racional, relevancia y límites, y que esas entradas no sean campos reconstructivos.

### 4.5 Tabla teórica señal → métrica → justificación bibliográfica

Esta tabla es una guía de trazabilidad, no una validación normativa. Cada fila conecta una señal agregada con una métrica implementada y con el tipo de evidencia bibliográfica que permite justificar su uso provisional o, cuando corresponde, limitarlo. Las referencias clave se verificaron por DOI/título/año antes de consolidar la tabla.

| Constructo hipotético | Juego / señal agregada permitida | Métrica implementada | Demanda de tarea que elicita la conducta | Justificación bibliográfica verificada | Límite explícito para HR |
|---|---|---|---|---|---|
| Resolución de problemas | Laser: `completed`, `solvedLevels`, `levelCount` | `laser.solvedRate` | Convertir un estado inicial en meta bajo reglas explícitas de reflectores. | Evidence-Centered Design exige separar constructo, acción observable y evidencia antes de inferir (Almond et al., 2015, DOI `10.1007/978-1-4939-2125-6_2`). Shute & Ventura (2013, DOI `10.7551/mitpress/9589.001.0001`) apoyan instrumentar evidencia en juegos, pero mediante modelo explícito. | No es inteligencia general ni desempeño laboral; requiere niveles equivalentes y validación R-7. |
| Resolución de problemas / pensamiento analítico | Laser: `solutionEfficiency`, `moveCount` | `laser.solutionEfficiency` | Buscar una configuración parsimoniosa respecto del par autorado. | La evidencia de juegos/simulaciones debe analizarse psicométricamente antes de usarla como assessment (de Klerk et al., 2015, DOI `10.1016/j.compedu.2014.12.020`). | Depende del par y authoring; `laser.level-authoring-review` controla esto solo para demo interna. |
| Cumplimiento de reglas / comprensión | Laser: `ruleViolationCount`, `levelCount` | `laser.ruleCompliance` | Respetar restricciones explícitas del puzzle. | ECD separa observación de interpretación; una violación puede ser evidencia de regla, interfaz o comprensión, no solo del constructo (Almond et al., 2015). | Si `candidateInstructionCheck` marca riesgo alto, excluir temporalmente del mapeo provisional. |
| Estrategia riesgo/recompensa | Balloon: `riskEfficiency`, `cashoutCount`, `popCount` | `balloon.riskEfficiency`, `cashoutRate`, `popRate` | Decidir cuánto acumular antes de asegurar bajo riesgo secuencial. | BART fue propuesto como medida conductual de toma de riesgo (Lejuez et al., 2002, DOI `10.1037/1076-898X.8.2.75`). Pleskac (2008, DOI `10.1037/0278-7393.34.1.167`) muestra que el riesgo secuencial mezcla decisión y aprendizaje. | Solo `descriptive_only`; no personalidad, impulsividad clínica, tolerancia a frustración ni calidad normativa de decisión. |
| Ajuste ante feedback | Balloon: `postPopAdjustment`, `postPopAdjustmentCount` | `balloon.postLossAdjustment`, `postLossAdjustmentObserved` | Cambiar conducta agregada tras una pérdida observada. | La relación BART–rasgos existe pero es moderada y requiere análisis meta-analítico/contextual (Lauriola et al., 2014, DOI `10.1002/bdm.1784`). | Si `postPopAdjustmentCount = 0`, la señal es desconocida; no se imputa bajo ajuste. |
| Calibración de dificultad | Balloon: configuración global de rondas, no candidato | `balloon.threshold-calibration-review` | Balancear rondas de riesgo alto/medio/bajo para que la tarea no sea puro azar ni trivial. | Juegos/simulaciones necesitan evidencia de dificultad y estructura antes de inferir atributos (de Klerk et al., 2015). | El drawer técnico muestra QA de configuración; no se exportan thresholds por ronda ni secuencia de infladas. |
| Planificación bajo restricciones | Passenger: `passengersDelivered`, `destinationCount`, `routeEfficiency` | `deliveryRate`, `routeEfficiency` | Coordinar metas, costos, recargas y entrega bajo presupuesto. | Shallice (1982, DOI `10.1098/rstb.1982.0082`) fundamenta tareas de planificación no rutinaria; Diamond (2013, DOI `10.1146/annurev-psych-113011-143750`) ubica planificación dentro de funciones ejecutivas relacionadas pero separables. | No prueba logística laboral ni liderazgo; depende del solver y nivel autorado. |
| Cumplimiento de restricciones | Passenger: `constraintViolationCount`, `movementAttemptCount` | `passenger.constraintCompliance` | Operar dentro de paredes/presupuesto/costos evitando violaciones por intento. | Miyake et al. (2000, DOI `10.1006/cogp.1999.0734`) apoya no colapsar funciones ejecutivas distintas en un único score; el denominador evita sobreinterpretar conteos brutos. | Violaciones pueden indicar instrucciones/controles; usar `candidateInstructionCheck` antes de interpretar. |
| Replanificación / uso de recursos | Passenger: `replanCount`, `stationUseCount` | `replanRate`, `stationUseCount` | Revisar plan y usar paradas cuando el nivel lo demanda. | La planificación no rutinaria requiere monitoreo y ajuste de medios a metas (Shallice, 1982); su dirección normativa depende del contexto. | Replanificar o usar paradas puede ser óptimo o ineficiente; no puntuar dirección sin validación. |
| Calidad/contexto no inferencial | Cámara/gaze/postura agregados de calidad | `qualitySummary` / caveats | Verificar disponibilidad y calidad de señal durante la sesión. | Barrett et al. (2019, DOI `10.1177/1529100619832930`) advierten contra inferir estados internos desde movimientos faciales. SIOP (2018, DOI `10.1017/iop.2018.195`) exige validez y documentación para selección. | La cámara no aporta talento/persona/emoción/estrés; solo contexto de calidad y caveats. |
| Campos no medidos | Liderazgo, comunicación, adaptabilidad robusta | `score: null`, `not_measured` / `insufficient` | La batería actual no incluye interacción social ni cambios controlados suficientes. | Las funciones ejecutivas son separables (Miyake et al., 2000; Diamond, 2013) y las herramientas de selección requieren evidencia específica por constructo (SIOP, 2018). | Mantener `No medido`; no generar fortalezas/watch areas ni score neutral. |

Las referencias bibliográficas no transforman estas métricas en validadas. Su rol en R-6 es justificar la plausibilidad de la demanda de tarea y delimitar qué inferencias están prohibidas hasta R-7.

---

## 5. Reglas provisionales R-6

Las reglas son deliberadamente conservadoras y no normativas.

```text
L = 0.55·laser.solutionEfficiency + 0.30·laser.solvedRate + 0.15·laser.ruleCompliance
P = 0.50·passenger.routeEfficiency + 0.30·passenger.deliveryRate + 0.20·passenger.constraintCompliance
B = balloon.riskEfficiency
```

| Constructo Excel | Regla R-6 | Disponibilidad | Confianza máxima | Justificación |
|---|---:|---|---:|---|
| Toma de decisiones | `score: null` | `descriptive_only` | 0.20 | Balloon/Passenger describen estrategia, pero sin criterio externo no hay dirección normativa. |
| Resolución de problemas | `0.65·L + 0.35·P` | `provisional_score` | 0.50 | Laser + Passenger demandan transformación de estado inicial a meta bajo reglas. |
| Riesgo/feedback | `score: null` | `descriptive_only` | 0.20 | Balloon describe riesgo/recompensa, no rasgo ni calidad universal. |
| Planificación | `P` | `provisional_score` | 0.50 | Passenger exige anticipación de ruta, presupuesto y destinos. |
| Adaptabilidad | `score: null` | `insufficient` | 0.00 | Falta manipulación controlada de cambio de regla y repetición suficiente. |
| Pensamiento analítico | `0.50·L + 0.50·P` | `provisional_score` | 0.45 | Evidencia adyacente de análisis lógico de reglas/recursos. |
| Liderazgo | `score: null` | `not_measured` | 0.00 | Requiere contexto social/multijugador/roles. |
| Comunicación | `score: null` | `not_measured` | 0.00 | Requiere tarea verbal/social diseñada y criterios de codificación. |

No se generan `strengths`, `watchAreas`, ranking ni percentiles porque no existen normas, muestras ni criterios validados.

---

## 6. Requisitos y condiciones de decisión

### 6.1 Requisitos mínimos para puntuar provisionalmente

- `problemSolving`: Laser y Passenger deben estar `measured_complete` y con features válidos.
- `planning`: Passenger debe estar `measured_complete` y válido.
- `analyticalThinking`: Laser y Passenger deben estar `measured_complete` y con features válidos.
- `decisionMaking` y `riskFeedback`: siempre descriptivos hasta definir criterio externo.
- `adaptability`: insuficiente hasta implementar cambios controlados de regla/entorno.
- `leadership` y `communication`: no medidos hasta incorporar tareas sociales/comunicativas.

### 6.2 Condiciones de invalidación

Un juego o feature se marca `invalid` o `not_observed` si:

- conteos son negativos o no finitos;
- ratios quedan fuera de `[0, 1]`;
- `solvedLevels > levelCount`, `roundsCompleted > totalRounds` o `passengersDelivered > destinationCount`;
- falta el juego requerido;
- el agregado no declara `aggregateOnly: true`;
- aparece cualquier campo reconstructivo.

No se corrige silenciosamente un dato inválido para hacerlo parecer medible.

---

## 7. Evidencia bibliográfica y clasificación

| Tema | Fuente verificada | DOI/URL | Soporte para KRUMM | Clasificación |
|---|---|---|---|---|
| Diseño basado en evidencia | Almond, Mislevy, Steinberg, Yan & Williamson (2015), “An Introduction to Evidence-Centered Design”. | https://doi.org/10.1007/978-1-4939-2125-6_2 | Fundamenta separar constructo, evidencia y tarea antes de inferir. | Directa metodológica |
| Serious games y soft skills | Altomari, Altomari & Iazzolino (2023), “Gamification and Soft Skills Assessment in the Development of a Serious Game”. | https://doi.org/10.2196/45436 | Apoya el uso exploratorio de serious games para soft skills; no valida KRUMM. | Adyacente |
| Stealth/game-based assessment | Shute & Ventura (2013), “Stealth Assessment”. | https://doi.org/10.7551/mitpress/9589.001.0001 | Apoya instrumentar desempeño en juegos con modelos de evidencia. | Directa metodológica |
| Simulación/juegos y psicometría | de Klerk, Veldkamp & Eggen (2015). | https://doi.org/10.1016/j.compedu.2014.12.020 | Advierte que performance data de simulación requiere análisis psicométrico. | Directa metodológica |
| VR game-based cognitive assessment | Weiner & Sanchez (2020). | https://doi.org/10.1111/ijsa.12295 | Muestra que juegos pueden aportar validez convergente parcial, pero requieren validación. | Adyacente |
| Riesgo BART | Lejuez et al. (2002). | https://doi.org/10.1037/1076-898X.8.2.75 | Balloon se inspira en riesgo/recompensa; aplica solo como conducta de tarea. | Directa para tarea de riesgo |
| Riesgo secuencial y aprendizaje | Pleskac (2008). | https://doi.org/10.1037/0278-7393.34.1.167 | Muestra que riesgo secuencial mezcla aprendizaje y decisión; evita interpretación simple. | Directa para caveat |
| BART y personalidad | Lauriola, Panno, Levin & Lejuez (2013). | https://doi.org/10.1002/bdm.1784 | Relaciones con sensation seeking/impulsividad son pequeñas/moderadas; no basta para inferir rasgos. | Directa para límite |
| Planificación | Shallice (1982). | https://doi.org/10.1098/rstb.1982.0082 | Fundamenta tareas no rutinarias y planificación, pero no valida Passenger para empleo. | Adyacente constructo |
| Funciones ejecutivas | Diamond (2013). | https://doi.org/10.1146/annurev-psych-113011-143750 | Define inhibición, memoria de trabajo y flexibilidad cognitiva como funciones separables. | Directa conceptual |
| Unidad/diversidad EF | Miyake et al. (2000). | https://doi.org/10.1006/cogp.1999.0734 | Apoya no colapsar planificación, inhibición y flexibilidad en un único score. | Directa conceptual |
| Mouse tracking | Freeman & Ambady (2010). | https://doi.org/10.3758/BRM.42.1.226 | Apoya el mouse tracking como método de procesamiento temporal; KRUMM no debe guardar trazas crudas. | Adyacente |
| Mouse tracking cognitivo-social | Stillman, Shen & Ferguson (2018). | https://doi.org/10.1016/j.tics.2018.03.012 | Apoya valor temporal de movimientos, no inferencia HR directa. | Adyacente |
| Telemetría en serious games | Chung (2015). | https://doi.org/10.1007/978-3-319-05834-4_3 | Apoya diseño de telemetry/analytics, no score de talento por sí solo. | Directa técnica |
| Selección de personal | SIOP (2018), “Principles for the Validation and Use of Personnel Selection Procedures”. | https://doi.org/10.1017/iop.2018.195 | Exige evidencia de validez, documentación y uso responsable para selección. | Directa normativa |
| Métodos de selección | Schmidt & Hunter (1998). | https://doi.org/10.1037/0033-2909.124.2.262 | Contextualiza validez predictiva de métodos; KRUMM necesita estudio propio. | Adyacente normativa |
| Assessment centers | Arthur et al. (2003). | https://doi.org/10.1111/j.1744-6570.2003.tb00146.x | Liderazgo/comunicación suelen requerir ejercicios/interacción, no juegos individuales. | Adyacente |
| New talent signals | Chamorro-Premuzic et al. (2016). | https://doi.org/10.1017/iop.2016.6 | Advierte que señales digitales nuevas requieren evidencia científica. | Directa para gobernanza |
| FACS/emoción | Barrett et al. (2019). | https://doi.org/10.1177/1529100619832930 | Advierte contra inferir emoción interna directamente desde movimientos faciales. | Directa para límite |
| rPPG | Verkruysse, Svaasand & Nelson (2008). | https://doi.org/10.1364/OE.16.021434 | rPPG es medición fisiológica posible, pero no implementada ni válida para talento aquí. | Técnica/limitante |
| HRV estrés | Kim et al. (2018). | https://doi.org/10.30773/pi.2017.08.17 | HRV puede relacionarse con estrés, pero no se usa para inferir talento o frustración. | Adyacente/limitante |
| Sesgo en hiring algorítmico | Raghavan, Barocas, Kleinberg & Levy (2020). | https://doi.org/10.1145/3351095.3372828 | Requiere mitigación, auditoría y cuidado en herramientas de contratación. | Directa gobernanza |
| Comunicación/4Cs | Thornhill-Miller et al. (2023). | https://doi.org/10.3390/jintelligence11030054 | Comunicación es constructo amplio; batería actual no lo mide. | Adyacente |
| Presión PointerEvent | MDN Web Docs, `PointerEvent.pressure`. | https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pressure | En mouse sin presión, el valor activo suele ser 0.5; no sirve como presión real universal. | Técnica/limitante |

Referencias ambiguas del Excel como `Pedersen et al. (2020)`, `Riemer (2020)`, `Lu et al. (2025)`, `Mostefai et al. (2019)`, `Behera et al. (2020)`, `Valacich et al. (2025)`, `Malik et al. (2025)`, `Martin-Kowal et al. (2021)`, `D’Acri et al. (2026)`, `Medvedeva et al. (2022)`, `Szajnberg (2022)`, `Witherow et al. (2024)`, `AOC` y `CADyFACE` no deben usarse como evidencia fuerte mientras no exista título/DOI/URL exacto validado.

---

## 8. Protocolo R-7 requerido antes de uso decisional

1. **Validez de contenido:** revisión por psicometría/I-O psychology; matriz constructo→tarea→feature; evaluación de representatividad y contaminación de constructo.
2. **Entrevistas cognitivas/usabilidad:** confirmar que candidatos entienden reglas; registrar problemas de accesibilidad/dispositivo.
3. **Confiabilidad:** consistencia interna donde aplique, formas paralelas, test–retest, sensibilidad a práctica.
4. **Validez convergente/discriminante:** comparar con instrumentos establecidos de resolución de problemas, planificación y funciones ejecutivas.
5. **Validez de criterio:** relacionar scores con criterios laborales relevantes y definidos antes del estudio; evitar circularidad con CV o etiquetas producidas por IA.
6. **Fairness e invariancia:** analizar subgrupos, dispositivos, navegadores, accesibilidad, experiencia previa en juegos y condiciones de cámara.
7. **Calibración y normas:** solo tras muestra suficiente; documentar percentiles si existieran, no antes.
8. **Drift y monitoreo:** versionado de batería, features, mapping, umbrales, navegador/modelo, cambios de UI.
9. **Privacidad/retención:** mantener solo agregados; definir retención, eliminación, auditoría y trazabilidad.
10. **Power analysis:** definir tamaño muestral antes de prometer validación normativa o predictiva.

Plan operativo detallado creado en:

```text
docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md
```

Ese plan convierte esta sección en fases ejecutables: QA técnica, validez de contenido, entrevistas cognitivas, confiabilidad, validez convergente/discriminante, validez de criterio, fairness/device effects y decisión de producto.

---

## 9. Conclusión técnica

El mapeo del Excel es útil como mapa de producto e hipótesis. Para KRUMM Edge debe implementarse como un framework versionado, auditable y conservador. La evidencia actual permite reportar algunos índices de desempeño de tarea y disponibilidad de evidencia, no inferencias fuertes de talento laboral. R-6 debe mejorar trazabilidad y lenguaje; R-7 debe producir evidencia psicométrica antes de cualquier uso decisional.

---

## 10. Matriz de trazabilidad v2 (T.1, 2026-08-27)

Esta sección materializa T.1: una matriz de trazabilidad por métrica para los cuatro juegos (Laser, Balloon, Passenger, Team/Faro), los canales faciales (Edge AI) y los composite/feature vectors. Cada celda de métrica documenta: (1) constructo pretendido, (2) demanda de tarea, (3) conducta observable, (4) fórmula exacta en código con archivo:línea, (5) fuente bibliográfica con estado de verificación y (6) clasificación de evidencia: `directa | adyacente | ambigua/no resuelta | interna`.

**Cadena obligatoria aplicada a cada métrica** (dos tablas por subsección: Tabla A = constructo→fórmula→fuente→clasificación; Tabla B = telemetría agregada → feature versionada → regla provisional → disponibilidad/confianza/caveats → narrativa para revisión humana).

**Método de verificación (2026-08-27):**
- *Anclajes de código:* re-verificados contra el working tree actual (HEAD `c2e6eee` + cambios no commiteados de la ola G, que no se tocaron) leyendo: `src/tasks/original-games/{laserPuzzleTelemetry,balloonRiskTelemetry,passengerRouteTelemetry,teamCoordinationTelemetry}.js`, `src/assessment/{originalGameFeatureVector,originalGameTalentMapping}.js`, `src/telemetry/{edgeAiEngine,insightMetrics,emotionClassifier}.js`.
- *Citas reutilizadas sin re-verificar* (ya verificadas por DOI/título/año en R-6 — tabla §7 — y en el transcript `deleg_575a929f`): Almond et al. 2015; Shute & Ventura 2013; de Klerk et al. 2015; Lejuez et al. 2002; Pleskac 2008; Lauriola et al. 2013; Shallice 1982; Diamond 2013; Miyake et al. 2000; Arthur et al. 2003; Altomari et al. 2023; Coovert et al. 2017; Ekman & Friesen 1978; Russell 1980; Zhu & Ji 2004; Bartlett et al. 2006; Giannakakis et al. 2017; Barrett et al. 2019; Kim et al. 2018; SIOP 2018; Thornhill-Miller et al. 2023; Freeman & Ambady 2010; Stillman et al. 2018; Chung 2015; Schmidt & Hunter 1998; Chamorro-Premuzic et al. 2016; Raghavan et al. 2020; MDN PointerEvent.pressure.
- *Citas verificadas vía web el 2026-08-27* (dos búsquedas): Dinges & Grace 1998 (PERCLOS, DOI `10.21949/1502740`) y Palinko et al. 2010 (ETRA'10, ACM, DOI `10.1145/1743666.1743701`; primer apellido confirmado además por el encabezado de `insightMetrics.js:14`).
- *Citas con verificación pendiente* (declara­das explícitamente, válidas por regla académica; no son ancla primario de ninguna clasificación): D'Mello & Graesser (2012) y Cohn et al. (2007) — ver §10.7.2.
- *Criterio de clasificación:* **directa** = la fuente sustenta la relación constructo↔tarea↔evidencia de la métrica; **adyacente** = la fuente sustenta un constructo o método relacionado (contexto distinto, otra modalidad o límite de inferencia) sin validar esta tarea; **ambigua/no resuelta** = tensión sin dirección normativa resuelta (pendiente T.4); **interna** = definición operacional propia del repo (XLSX hipótesis, plan R-6, diccionario del feature vector), que es procedencia, no evidencia externa de validación.

### 10.1 Laser (`laser_puzzle`)

Telemetría de origen: `buildLaserResponseAggregate` (`src/tasks/original-games/laserPuzzleTelemetry.js:323-351`); 3 niveles autorados con `par` 4/5/6 (`buildLaserDemoLevels`, `laserPuzzleTelemetry.js:71-203`). Extracción al vector: `addLaserFeatures` (`src/assessment/originalGameFeatureVector.js:449-477`).

**Tabla A — constructo, demanda, conducta, fórmula, fuente, clasificación**

| Métrica | Constructo pretendido | Demanda de tarea | Conducta observable | Fórmula exacta (archivo:línea) | Fuente bibliográfica (estado) | Clasificación |
|---|---|---|---|---|---|---|
| `laser.completion` | Completitud de tarea (prerrequisito de disponibilidad; no es constructo por sí) | Alcanzar el objetivo de cada nivel bajo reglas explícitas de reflectores/relés/antenas | Completar 3/3 niveles | `completed ? 1 : 0` (`originalGameFeatureVector.js:78`; extracción `:471`) | Interna: diccionario R-6 §4.1. Metodología: Almond et al. 2015, ECD (verificada §7, DOI `10.1007/978-1-4939-2125-6_2`) | interna |
| `laser.solvedRate` | Resolución de problemas | Convertir un estado inicial en meta bajo reglas explícitas | Niveles resueltos sobre niveles administrados | `solvedLevels / levelCount` (`originalGameFeatureVector.js:86`; `:472`; clamp upstream `laserPuzzleTelemetry.js:335`) | Almond et al. 2015 (verificada §7); Shute & Ventura 2013, Stealth Assessment (verificada §7, DOI `10.7551/mitpress/9589.001.0001`) | directa |
| `laser.solutionEfficiency` | Resolución de problemas / pensamiento analítico | Buscar configuración parsimoniosa respecto del par autorado | Movimientos agregados relativos al par (sin trayectoria) | `min(1, par / moves)`, con `par` = par total (`laserPuzzleTelemetry.js:317-321`; feature `originalGameFeatureVector.js:94`, `:473`) | de Klerk et al. 2015, análisis psicométrico de simulaciones/juegos (verificada §7, DOI `10.1016/j.compedu.2014.12.020`) | adyacente |
| `laser.ruleCompliance` | Comprensión/cumplimiento de reglas | Respetar restricciones explícitas (haz, muros, relés encendidos) | Violaciones de regla por nivel | `1 - min(1, ruleViolationCount / max(1, levelCount))` (`originalGameFeatureVector.js:102`; `:474`) | Almond et al. 2015 (verificada §7): la violación es evidencia de regla/interfaz/comprensión, no del constructo; separar observación de interpretación | directa |
| `laser.moveCount` | Ninguno (contexto diagnóstico; no se puntúa como talento) | Esfuerzo de reconfiguración | Conteo no negativo de movimientos | conteo agregado (`laserPuzzleTelemetry.js:343`; `originalGameFeatureVector.js:110`; `:475`) | Freeman & Ambady 2010, MouseTracker (verificada §7, DOI `10.3758/BRM.42.1.226`): movimiento como señal temporal; KRUMM no guarda trazas crudas | interna |
| `laser.timeMs` | Ninguno (contexto) | Duración total del bloque de juego | Tiempo transcurrido sin log de acciones | `timeMs` (`laserPuzzleTelemetry.js:346`; `originalGameFeatureVector.js:118`; `:476`) | Interna: diccionario R-6 §4.1 | interna |
| `laser.score` (agregado de juego) | Desempeño de tarea descriptivo | Combinar eficiencia, éxito y penalización por violaciones | Score 0–1 del bloque | `max(0, 0.65·solutionEfficiency + 0.35·solvedRate − min(0.35, ruleViolationCount·0.05))` (`laserPuzzleTelemetry.js:336-339`) | Interna: pesos del plan R-6; sin validación externa | interna |
| `solutionEfficiency` (agregado upstream) | Idem a `laser.solutionEfficiency` | par/moves acotado en 1 | Ratio par/movimientos | `getLaserEfficiency({moves, par}) → round(min(1, par/moves))` (`laserPuzzleTelemetry.js:317-321`; llamada en `:334`) | Interna: fórmula del repo; calidad del par = authoring (`laser.level-authoring-review`, §4.5) | interna |

**Tabla B — cadena de trazabilidad**

| Métrica | Telemetría agregada | Feature versionada (`original_game_feature_vector_v1`) | Regla provisional | Disponibilidad / confianza / caveats | Narrativa para revisión humana |
|---|---|---|---|---|---|
| `laser.completion` | `laser_puzzle` aggregate `completed` (`laserPuzzleTelemetry.js:340`) | `laser.completion` (`originalGameFeatureVector.js:471`) | — (prerrequisito de `measured_complete`, `:470`) | `measured_complete`/`measured_partial`; caveat: binaria, afectada por instrucciones/dispositivo (def. `:81`) | "El candidato alcanzó (o no) el objetivo; prerrequisito para interpretar el resto de métricas." |
| `laser.solvedRate` | `solvedLevels/levelCount` (`:341-342`) | `laser.solvedRate` (`:472`) | `L = 0.55·eff + 0.30·solved + 0.15·rules` (`originalGameTalentMapping.js:150-152`) | ceiling 0.6 vía problemSolving; solo 3 niveles, no es norma (def. `:89`) | "X de 3 niveles resueltos; indicador de bajo alcance de consecución de metas bajo reglas." |
| `laser.solutionEfficiency` | `solutionEfficiency` (`:347`) | `laser.solutionEfficiency` (`:473`) | 0.55·eff en `L`; `0.65·L+0.35·P` (problemSolving) | depende de la calidad del par autorado (def. `:97`); no prueba inteligencia general ni desempeño laboral | "Configuración parsimoniosa frente al par; no es capacidad general." |
| `laser.ruleCompliance` | `ruleViolationCount` (`:348`) | `laser.ruleCompliance` (`:474`) | 0.15·rules en `L` | una violación puede reflejar malentendido de instrucciones (def. `:105`); revisar `candidateInstructionCheck` | "Cumplimiento de restricciones explícitas; verificar comprensión de instrucciones antes de interpretar." |
| `laser.moveCount` | `moveCount` (`:343`) | `laser.moveCount` (`:475`) | — (contexto) | sin contexto de nivel, más no es peor (def. `:113`) | "Esfuerzo de reconfiguración; no se puntúa como constructo." |
| `laser.timeMs` | `timeMs` (`:346`) | `laser.timeMs` (`:476`) | — (contexto) | no es norma de velocidad (def. `:121`) | "Contexto temporal del bloque; covariada futura en R-7." |
| `laser.score` | `score` (`:339`) | no está en el vector (allowlist §3.1) | alimenta `L` indirectamente vía sus componentes | descriptivo 0–1; no percentil ni norma | "Resumen de juego para QA; no entra directamente al framework." |
| `solutionEfficiency` (upstream) | `:334` | idem `laser.solutionEfficiency` | idem | idem | idem |

### 10.2 Balloon (`balloon_risk`)

Telemetría de origen: `buildBalloonResponseAggregate` (`src/tasks/original-games/balloonRiskTelemetry.js:56-86`); 8 rondas con umbrales fijos `[7,10,8,12,9,11,13,8]` y `pointValue` 10–14 (`BALLOON_THRESHOLDS`, `:1`; `buildBalloonRiskRounds`, `:31-39`). Extracción al vector: `addBalloonFeatures` (`originalGameFeatureVector.js:479-514`).

**Tabla A — constructo, demanda, conducta, fórmula, fuente, clasificación**

| Métrica | Constructo pretendido | Demanda de tarea | Conducta observable | Fórmula exacta (archivo:línea) | Fuente bibliográfica (estado) | Clasificación |
|---|---|---|---|---|---|---|
| `balloon.completion` | Completitud de tarea (prerrequisito) | Completar la secuencia completa de rondas de riesgo/recompensa | Rondas completadas = total | `completed ? 1 : 0` (`originalGameFeatureVector.js:126`; extracción `:504`; upstream `completed = roundsCompleted >= total`, `balloonRiskTelemetry.js:74`) | Interna: diccionario R-6 §4.2 | interna |
| `balloon.riskEfficiency` (= `score` del juego) | Estrategia de riesgo/recompensa bajo incertidumbre (conducta de tarea, no rasgo) | Acumular recompensa bombeando bajo riesgo de pérdida, decidir cashout vs. seguir | Puntos capturados vs. pérdidas por pops | `(points / max(1, total·100)) · (1 − min(0.6, popCount·0.12))` (`balloonRiskTelemetry.js:70`; `score` idem `:73`; feature validación `[0,1]` `originalGameFeatureVector.js:134`, `:505`) | Lejuez et al. 2002, BART como medida conductual de toma de riesgo (verificada §7, DOI `10.1037/1076-898X.8.2.75`); Pleskac 2008, riesgo secuencial mezcla decisión y aprendizaje (verificada §7, DOI `10.1037/0278-7393.34.1.167`) | directa |
| `balloon.cashoutRate` | Estrategia de aseguramiento (descriptiva) | Decidir asegurar la recompensa acumulada antes de perderla | Cashouts sobre rondas totales | `cashoutCount / totalRounds` (`originalGameFeatureVector.js:142`; `:506`) | Lejuez et al. 2002 (verificada §7); Pleskac 2008 (verificada §7): dirección normativa abierta según aprendizaje | adyacente |
| `balloon.popRate` | Exposición a pérdida (descriptiva) | Seguir bombeando pese al riesgo creciente | Pops sobre rondas totales | `popCount / totalRounds` (`originalGameFeatureVector.js:150`; `:507`) | Lejuez et al. 2002 (verificada §7); Pleskac 2008 (verificada §7): el conteo de pérdidas solo no implica impulsividad (def. `:153`) | adyacente |
| `balloon.averagePumpsNormalized` | Intensidad de acumulación (descriptiva) | Dosis promedio de riesgo por ronda | Promedio de pumps normalizado | `min(1, averagePumps / 12)`, con `averagePumps = mean(pumpCounts)` (`balloonRiskTelemetry.js:68`; `originalGameFeatureVector.js:158`; `:509`) | Lejuez et al. 2002 (verificada §7): nº de elecciones de riesgo es la métrica BART canónica; cap 12 provisional (def. `:161`) | adyacente |
| `balloon.postLossAdjustment` | Ajuste ante feedback de pérdida (descriptivo) | Cambiar la conducta de riesgo tras una pérdida observada | Cambio agregado de pumps post-pop (solo si hubo oportunidad) | `postPopAdjustment` (media de ajustes) **solo cuando** `postPopAdjustmentCount > 0` (`balloonRiskTelemetry.js:80-81`; `originalGameFeatureVector.js:166`; `:512`) | Lauriola et al. 2013, meta-análisis BART–rasgos (verificada §7, DOI `10.1002/bdm.1784`): correlaciones pequeñas/moderadas; Pleskac 2008 (verificada §7): ajuste = aprendizaje, no estabilidad de rasgo | adyacente |
| `balloon.postLossAdjustmentObserved` | Control de disponibilidad de la señal de ajuste | Existencia de transición pérdida→elección siguiente | Flag binario de oportunidad observada | `postPopAdjustmentCount > 0 ? 1 : 0` (`originalGameFeatureVector.js:174`; `:511`) | Interna: convención R-6 "señal ausente = desconocida, nunca desempeño bajo" (contrato §1/AGENTS) | interna |
| `balloon.timeMs` | Ninguno (contexto) | Duración del bloque de riesgo | Tiempo transcurrido sin log por acción | `timeMs` (`balloonRiskTelemetry.js:83`; `originalGameFeatureVector.js:182`; `:513`) | Interna: diccionario R-6 §4.2 | interna |

**Tabla B — cadena de trazabilidad**

| Métrica | Telemetría agregada | Feature versionada (`original_game_feature_vector_v1`) | Regla provisional | Disponibilidad / confianza / caveats | Narrativa para revisión humana |
|---|---|---|---|---|---|
| `balloon.completion` | `balloon_risk` aggregate `completed` (`balloonRiskTelemetry.js:74`) | `balloon.completion` (`originalGameFeatureVector.js:504`) | — (prerrequisito) | `measured_complete`/`measured_partial` (`:503`); caveat: dropout/instrucciones (def. `:129`) | "Se administró la secuencia completa; habilita interpretación descriptiva." |
| `balloon.riskEfficiency` | `riskEfficiency`/`score` (`:70-73`) | `balloon.riskEfficiency` (`:505`) | `B = balloon.riskEfficiency` (doc. §5); entra en `decisionMaking` solo como evidencia descriptiva (`originalGameTalentMapping.js:236-237`) y en `riskFeedbackProfile` con peso 0.35 (`:280`) | `provisional_score` ceiling 0.55 si Balloon completo y 4 features observadas (`originalGameTalentMapping.js:275-277`); caveats `descriptive_only`, no personalidad ni tolerancia a frustración (def. `:137`) | "Estrategia riesgo/recompensa dentro de Balloon; descriptiva, sin dirección normativa." |
| `balloon.cashoutRate` | `cashoutCount/totalRounds` (`:78`) | `balloon.cashoutRate` (`:506`) | peso 0.25 en `riskFeedbackProfile` (`originalGameTalentMapping.js:281`) | sin dirección normativa sin criterio externo (def. `:145`) | "Frecuencia de aseguramiento; contexto para el revisor." |
| `balloon.popRate` | `popCount/totalRounds` (`:79`) | `balloon.popRate` (`:507`) | peso 0.25 como `lossManagement = 1 − popRate` (`:278`, `:282`) | el conteo de pérdidas no implica impulsividad ni mal desempeño (def. `:153`) | "Exposición a eventos de pérdida; no es rasgo." |
| `balloon.averagePumpsNormalized` | `averagePumps` (`:68`) | `balloon.averagePumpsNormalized` (`:509`) | peso 0.15 vía `balancedExploration = 1 − min(1, |avg−0.5|/0.5)` (`:279`, `:283`) | cap 12 provisional y no normado; oculta adaptación por ronda (def. `:161`) | "Intensidad media de acumulación; exploración balanceada descriptiva." |
| `balloon.postLossAdjustment` | `postPopAdjustment(+Count)` (`:80-81`) | `balloon.postLossAdjustment` (`:512`) | evidencia de `riskFeedbackProfile` (`:267-269`) | si `count = 0` la señal es desconocida, no se imputa ajuste bajo (def. `:169`) | "Cambio agregado tras pérdida; solo si hubo oportunidad observada." |
| `balloon.postLossAdjustmentObserved` | `postPopAdjustmentCount` (`:81`) | `balloon.postLossAdjustmentObserved` (`:511`) | control de disponibilidad de la fila anterior | depende de que hubiera pérdida (def. `:177`) | "Flag de disponibilidad; distingue cero real de ausencia de oportunidad." |
| `balloon.timeMs` | `timeMs` (`:83`) | `balloon.timeMs` (`:513`) | — (contexto) | no es medida de velocidad normada (def. `:185`) | "Contexto temporal del bloque de riesgo." |

### 10.3 Passenger (`passenger_routes`)

Telemetría de origen: `buildPassengerRouteResponseAggregate` (`src/tasks/original-games/passengerRouteTelemetry.js:330-377`); solver de ruta óptima por estados `(x, y, budget, onboard, deliveredMask)` (`solvePassengerRouteLevel`, `:197-301`) que produce `minimumCost/minimumMoves/minimumStationUses` usados para calibrar `routeEfficiency`. 3 niveles autorados (`buildPassengerRouteDemoLevels`, `:60-160`). Extracción al vector: `addPassengerFeatures` (`originalGameFeatureVector.js:516-553`).

**Tabla A — constructo, demanda, conducta, fórmula, fuente, clasificación**

| Métrica | Constructo pretendido | Demanda de tarea | Conducta observable | Fórmula exacta (archivo:línea) | Fuente bibliográfica (estado) | Clasificación |
|---|---|---|---|---|---|---|
| `passenger.completion` | Completitud de tarea (prerrequisito) | Alcanzar todos los objetivos de ruta bajo restricciones | Entregas completadas sobre destinos requeridos | `completed ? 1 : 0` (`originalGameFeatureVector.js:190`; extracción `:545`) | Interna: diccionario R-6 §4.3 | interna |
| `passenger.deliveryRate` | Resolución de problemas / consecución de metas | Coordinar recogida y entrega de pasajeros bajo presupuesto de energía | Pasajeros entregados sobre destinos | `passengersDelivered / destinationCount` (`originalGameFeatureVector.js:198`; `:546`; clamp de delivered `:522`) | Shallice 1982, planificación y metas (verificada §7, DOI `10.1098/rstb.1982.0082`) | adyacente |
| `passenger.routeEfficiency` | Planificación bajo restricciones | Minimizar costo de ruta vs. óptimo del solver bajo presupuesto y recargas | Costo real vs. costo mínimo | `routeEfficiency = clamp(minimumCost / actualCost, 0, 1)` (upstream `passengerRouteTelemetry.js:347`; feature `originalGameFeatureVector.js:206`; `:547`) | Shallice 1982 (verificada §7, DOI `10.1098/rstb.1982.0082`); Diamond 2013, funciones ejecutivas (verificada §7, DOI `10.1146/annurev-psych-113011-143750`) | adyacente |
| `passenger.constraintCompliance` | Cumplimiento de restricciones | Operar dentro de paredes/presupuesto/costos evitando violaciones | Violaciones sobre intentos de movimiento | `1 − min(1, constraintViolationCount / max(1, movementAttemptCount))` (`originalGameFeatureVector.js:214`; `:548`) | Miyake et al. 2000, funciones ejecutivas separables (verificada §7, DOI `10.1006/cogp.1999.0734`): no colapsar constricciones distintas; el denominador evita sobreinterpretar conteos brutos (doc. §4.5) | adyacente |
| `passenger.replanRate` | Monitoreo/actualización del plan (sin dirección normativa resuelta) | Revisar y ajustar el plan de ruta durante la ejecución | Replanes sobre intentos de movimiento | `min(1, replanCount / max(1, movementAttemptCount))` (`originalGameFeatureVector.js:222`; `:549`) | Shallice 1982 (verificada §7): la planificación requiere monitoreo de medios a metas, pero la dirección normativa (replanificar = bueno/malo) no está resuelta en la literatura aplicada a esta tarea (def. `:225`) | ambigua/no resuelta |
| `passenger.stationUseCount` | Ninguno (contexto de gestión de recursos) | Usar paradas de recarga cuando el nivel lo demanda | Conteo de usos de estación | conteo agregado no negativo (`originalGameFeatureVector.js:230`; `:550`) | Interna: diccionario R-6 §4.3; puede ser óptimo según nivel (def. `:233`) | interna |
| `passenger.satisfactionNormalized` | Calidad de resultado de ruta (score de juego; NO es satisfacción del candidato ni rasgo de servicio) | Sintetizar completitud/eficiencia del resultado | Score de satisfacción del juego normalizado | `satisfactionScore / 100` (`originalGameFeatureVector.js:238`; `:551`; clamp 0–100 upstream `passengerRouteTelemetry.js:348`) | Interna: derivado del diseño de puntuación del juego (def. `:241`) | interna |
| `passenger.score` (agregado de juego) | Desempeño de tarea descriptivo | Combinar completitud, eficiencia, satisfacción y penalizaciones | Score 0–1 del bloque | `clamp(0.40·completionRate + 0.35·routeEfficiency + 0.25·(satisfaction/100) − 0.02·violations − 0.005·replans, 0, 1)` (`passengerRouteTelemetry.js:352-360`) | Interna: pesos del plan R-6; sin validación externa | interna |
| `passenger.timeMs` | Ninguno (contexto) | Duración del bloque de rutas | Tiempo transcurrido sin log de ruta | `timeMs` (`passengerRouteTelemetry.js:374`; `originalGameFeatureVector.js:246`; `:552`) | Interna: diccionario R-6 §4.3 | interna |

Nota de anclaje: el DOI de Shallice 1982 es `10.1098/rstb.1982.0082` (Phil. Trans. R. Soc. Lond. B), idéntico al registrado en §7.

**Tabla B — cadena de trazabilidad**

| Métrica | Telemetría agregada | Feature versionada (`original_game_feature_vector_v1`) | Regla provisional | Disponibilidad / confianza / caveats | Narrativa para revisión humana |
|---|---|---|---|---|---|
| `passenger.completion` | `passenger_routes` aggregate `completed` (`passengerRouteTelemetry.js:365`) | `passenger.completion` (`originalGameFeatureVector.js:545`) | — (prerrequisito) | `measured_complete`/`measured_partial` (`:544`); caveat: límite de tiempo/dispositivo (def. `:193`) | "Se alcanzó el objetivo de ruta; prerrequisito de interpretación." |
| `passenger.deliveryRate` | `passengersDelivered/destinationCount` (`:366-367`) | `passenger.deliveryRate` (`:546`) | `P = 0.50·route + 0.30·delivery + 0.20·constraint` (`originalGameTalentMapping.js:161-163`) | ceiling 0.6 vía planning; pocos destinos, sin ruta cruda (def. `:201`) | "Consecución de metas de entrega bajo restricciones." |
| `passenger.routeEfficiency` | `routeEfficiency` (`:368`) | `passenger.routeEfficiency` (`:547`) | componente principal de `P`; `planning = P` (ceiling 0.6, `:202-206`); entra en problemSolving (0.35·P) y analyticalThinking (0.50·P) | depende de solver y level authoring (def. `:209`); no es evidencia de logística real | "Eficiencia de ruta vs. óptimo del solver; planificación bajo restricciones." |
| `passenger.constraintCompliance` | `constraintViolationCount`/`movementAttemptCount` (`:372`, `:369`) | `passenger.constraintCompliance` (`:548`) | 0.20 en `P` | violaciones pueden reflejar malentendido de UI (def. `:217`); usar `candidateInstructionCheck` | "Cumplimiento de restricciones por intento; verificar comprensión primero." |
| `passenger.replanRate` | `replanCount`/`movementAttemptCount` (`:370`, `:369`) | `passenger.replanRate` (`:549`) | — (contexto descriptivo; no entra en reglas R-6) | replanificar puede ser adaptativo o ineficiente según contexto (def. `:225`); sin dirección normativa | "Frecuencia de revisión de plan; no se puntúa dirección." |
| `passenger.stationUseCount` | `stationUseCount` (`:371`) | `passenger.stationUseCount` (`:550`) | — (contexto) | puede ser óptimo según nivel (def. `:233`) | "Uso de paradas de apoyo; contexto de gestión de recursos." |
| `passenger.satisfactionNormalized` | `satisfactionScore` (`:373`) | `passenger.satisfactionNormalized` (`:551`) | — (contexto) | derivado del score del juego, no un rasgo (def. `:241`) | "Calidad sintética del resultado; no es satisfacción real." |
| `passenger.score` | `score` (`:364`) | no está en el vector (allowlist §3.1) | alimenta `P` indirectamente vía sus componentes | descriptivo 0–1; no percentil | "Resumen de juego para QA." |
| `passenger.timeMs` | `timeMs` (`:374`) | `passenger.timeMs` (`:552`) | — (contexto) | no es norma de velocidad (def. `:249`) | "Contexto temporal del bloque de rutas." |

### 10.4 Team/Faro (`team_coordination`)

Telemetría de origen: `buildTeamCoordinationResponseAggregate` (`src/tasks/original-games/teamCoordinationTelemetry.js:284-321`); 4 escenarios estructurados de juicio social en equipo ("Faro", sala de mando: inicio de turno, cambio de prioridad, feedback, imprevisto de recurso) con opciones de múltiple opción puntadas en 8 dimensiones (`buildTeamCoordinationScenarios`, `:69-268`; `scoreBundle`, `:56-67`). Privacidad: `FORBIDDEN_TEAM_COORDINATION_KEYS` prohíbe `freeText`, `choiceSequence`, `rawChoices`, etc. (`:19-35`; validación `:345-361`). Extracción al vector: `addTeamCoordinationFeatures` (`originalGameFeatureVector.js:555-591`).

**Tensión registrada (regla R-6 obligatoria):** el contrato R-6 declara liderazgo/comunicación `not_measured` en tareas individuales y adaptabilidad `insufficient` con la batería actual; sin embargo, el framework (ola G) puntúa estos constructos a partir de los scores estructurados de Faro. **No se resuelve aquí: se registra como `ambigua/no resuelta — pendiente T.4`** en las filas afectadas.

**Tabla A — constructo, demanda, conducta, fórmula, fuente, clasificación**

| Métrica | Constructo pretendido | Demanda de tarea | Conducta observable | Fórmula exacta (archivo:línea) | Fuente bibliográfica (estado) | Clasificación |
|---|---|---|---|---|---|---|
| `team.completion` | Completitud del bloque estructurado (prerrequisito) | Completar los 4 escenarios de brief | Escenarios completados = total | `completed ? 1 : 0` (`originalGameFeatureVector.js:254`; extracción `:581`; upstream `completed && completedScenarioCount >= scenarioCount`, `teamCoordinationTelemetry.js:307`) | Interna: diccionario R-6 (ola G) | interna |
| `team.leadershipScore` | Liderazgo (evidencia estructurada; tensión con contrato R-6) | Clarificar objetivo, asignar roles y trade-offs en micro-situaciones de brief | Media de scores `leadership` de las opciones elegidas | `mean(clamp01(scores.leadership))` (`teamCoordinationTelemetry.js:295`; feature `originalGameFeatureVector.js:262`; `:582`) | Arthur et al. 2003, meta-análisis assessment centers (verificada §7, DOI `10.1111/j.1744-6570.2003.tb00146.x`): el liderazgo se valida en ejercicios con interacción, no en opciones estructuradas individuales; Coovert et al. 2017, serious games para team research (verificada en transcript `deleg_575a929f`, IJSG) | ambigua/no resuelta |
| `team.communicationScore` | Comunicación estructurada (tensión con contrato R-6) | Explicar contexto, próximos pasos y bucles de aclaración sin texto libre | Media de scores `communication` de las opciones elegidas | `mean(clamp01(scores.communication))` (`teamCoordinationTelemetry.js:296`; feature `originalGameFeatureVector.js:270`; `:583`) | Arthur et al. 2003 (verificada §7); Thornhill-Miller et al. 2023, assessment 4Cs (verificada §7, DOI `10.3390/jintelligence11030054`): la comunicación es constructo amplio no cubierto por opciones cerradas | ambigua/no resuelta |
| `team.adaptabilityScore` | Adaptabilidad (tensión: R-6 la marca `insufficient`) | Responder a cambios de prioridad, recursos faltantes y feedback en escenarios controlados | Media de scores `adaptability` de las opciones elegidas | `mean(clamp01(scores.adaptability))` (`teamCoordinationTelemetry.js:297`; feature `originalGameFeatureVector.js:278`; `:584`) | Miyake et al. 2000 (verificada §7, DOI `10.1006/cogp.1999.0734`): la flexibilidad cognitiva es separable de otras EF y requiere tareas de cambio controlado, no una sesión de escenarios | ambigua/no resuelta |
| `team.decisionQualityScore` | Calidad de decisión estructurada (descriptiva) | Hacer trade-offs acotados y accionables bajo restricciones | Media de scores `decision` de las opciones elegidas | `mean(clamp01(scores.decision))` (`teamCoordinationTelemetry.js:298`; feature `originalGameFeatureVector.js:286`; `:585`) | Almond et al. 2015 (verificada §7, ECD): evidencia de tarea estructurada no implica calidad de decisión normativa; no hay fuente de validación para el score de opciones | adyacente |
| `team.alignmentScore` | Alineación objetivo/prioridad/acción (contextual) | Alinear objetivo, prioridad y siguiente acción en el brief simulado | Media de scores `alignment` | `mean(clamp01(scores.alignment))` (`teamCoordinationTelemetry.js:299`; feature `originalGameFeatureVector.js:294`; `:586`, fallback → `communicationScore`) | Interna: feature contextual (def. `:297`); sin fuente externa específica | interna |
| `team.roleClarityScore` | Claridad de roles (contextual) | Asignar/clarificar responsabilidades en el flujo de equipo simulado | Media de scores `roleClarity` | `mean(clamp01(scores.roleClarity))` (`teamCoordinationTelemetry.js:300`; feature `originalGameFeatureVector.js:302`; `:587`, fallback → `leadershipScore`) | Interna: no observa delegación real (def. `:305`) | interna |
| `team.feedbackUseScore` | Uso de feedback (contextual) | Integrar feedback del equipo en aclaración y replanificación | Media de scores `feedbackUse` | `mean(clamp01(scores.feedbackUse))` (`teamCoordinationTelemetry.js:301`; feature `originalGameFeatureVector.js:310`; `:588`, fallback → `communicationScore`) | Interna: no es medida de regulación emocional (def. `:313`) | interna |
| `team.changeResponseScore` | Respuesta al cambio (contextual; tensión con adaptabilidad) | Actualizar prioridades/responsabilidades cuando cambian las restricciones | Media de scores `changeResponse` | `mean(clamp01(scores.changeResponse))` (`teamCoordinationTelemetry.js:302`; feature `originalGameFeatureVector.js:318`; `:589`, fallback → `adaptabilityScore`) | Interna: señal de sesión única, sin estabilidad longitudinal (def. `:321`); misma tensión adaptabilidad T.4 | ambigua/no resuelta |
| `team.timeMs` | Ninguno (contexto) | Duración del bloque de decisiones estructuradas | Tiempo transcurrido sin streams de clicks | `timeMs` (`teamCoordinationTelemetry.js:318`; `originalGameFeatureVector.js:326`; `:590`) | Interna: diccionario R-6 (ola G) | interna |
| `team.score` (global agregado) | Desempeño global descriptivo del bloque | Combinar los 4 constructos principales | Media simple de 4 scores | `mean([leadershipScore, communicationScore, adaptabilityScore, decisionQualityScore])` (`teamCoordinationTelemetry.js:303`) | Miyake et al. 2000 (verificada §7): no colapsar funciones separables en un único score; la media global no tiene justificación psicométrica aquí | ambigua/no resuelta |

**Tabla B — cadena de trazabilidad**

| Métrica | Telemetría agregada | Feature versionada (`original_game_feature_vector_v1`) | Regla provisional | Disponibilidad / confianza / caveats | Narrativa para revisión humana |
|---|---|---|---|---|---|
| `team.completion` | `team_coordination` aggregate `completed` (`teamCoordinationTelemetry.js:307`) | `team.completion` (`originalGameFeatureVector.js:581`) | — (prerrequisito) | `measured_complete`/`measured_partial` (`:580`); caveat: escenarios ≠ evaluación laboral (def. `:257`) | "Se administró el bloque de briefs; habilita interpretación de los scores estructurados." |
| `team.leadershipScore` | `leadershipScore` (`:310`) | `team.leadershipScore` (`:582`) | `leadership = 0.50·T.leadership + 0.30·T.roleClarity + 0.20·T.alignment` (`originalGameTalentMapping.js:330`) solo si T presente; si no, `not_measured` (`:323-329`) | ceiling 0.55; caveats `structured_scenario_not_group_interaction` (`:340`); tensión R-6 vs. ola G → **ambigua/no resuelta — pendiente T.4** | "Juicio social estructurado en micro-situaciones; no reemplaza evaluación grupal real." |
| `team.communicationScore` | `communicationScore` (`:311`) | `team.communicationScore` (`:583`) | `communication = 0.55·T.communication + 0.25·T.feedbackUse + 0.20·T.alignment` (`originalGameTalentMapping.js:354`); si no, `not_measured` (`:347-352`) | ceiling 0.55; caveats `structured_choices_no_free_text_or_live_speech` (`:364`); **ambigua/no resuelta — pendiente T.4** | "Comunicación estructurada (claridad/contexto/pasos); no evalúa habla ni texto libre." |
| `team.adaptabilityScore` | `adaptabilityScore` (`:312`) | `team.adaptabilityScore` (`:584`) | `adaptability = 0.70·T.adaptability + 0.30·T.changeResponse` (`originalGameTalentMapping.js:307`); si no hay T, `insufficient` (`:299-305`) | ceiling 0.55; caveat `structured_scenario_requires_validation` (`:316`); tensión R-6 (`insufficient` con batería actual) → **ambigua/no resuelta — pendiente T.4** | "Adaptación a cambios controlados en el brief; requiere validación antes de comparar candidatos." |
| `team.decisionQualityScore` | `decisionQualityScore` (`:313`) | `team.decisionQualityScore` (`:585`) | `decisionMaking = 0.60·T.decision + 0.25·P + 0.15·T.alignment` (`originalGameTalentMapping.js:241`) solo si T y P; si no, `descriptive_only` confidence 0.2 (`:254-256`) | caveats `structured_scenario_requires_validation`, `no_automated_decision` (`:249`); sin corte normativo (def. `:289`) | "Trade-offs explícitos del brief; no es ranking ni criterio de selección." |
| `team.alignmentScore` | `alignmentScore` (`:314`) | `team.alignmentScore` (`:586`) | entra en decisionMaking (0.15), leadership (0.20), communication (0.20) | fallback → `communicationScore` (`:586`); feature contextual (def. `:297`) | "Alineación objetivo/acción en el brief simulado." |
| `team.roleClarityScore` | `roleClarityScore` (`:315`) | `team.roleClarityScore` (`:587`) | entra en leadership (0.30) | fallback → `leadershipScore` (`:587`); no observa delegación real (def. `:305`) | "Claridad de responsabilidades en el flujo simulado." |
| `team.feedbackUseScore` | `feedbackUseScore` (`:316`) | `team.feedbackUseScore` (`:588`) | entra en communication (0.25) | fallback → `communicationScore` (`:588`); no es regulación emocional (def. `:313`) | "Integración de feedback en aclaración/replanificación." |
| `team.changeResponseScore` | `changeResponseScore` (`:317`) | `team.changeResponseScore` (`:589`) | entra en adaptability (0.30) | fallback → `adaptabilityScore` (`:589`); sesión única (def. `:321`); **ambigua/no resuelta — pendiente T.4** (misma tensión adaptabilidad) | "Actualización de prioridades ante cambio de restricciones." |
| `team.timeMs` | `timeMs` (`:318`) | `team.timeMs` (`:590`) | — (contexto) | no es norma de velocidad de comunicación (def. `:329`) | "Contexto temporal del bloque." |
| `team.score` (global) | `score` (`:303-306`) | no está en el vector (allowlist §3.1) | no entra en ninguna regla R-6 | media de 4 funciones que Miyake et al. 2000 (verificada §7) advierte no colapsar → **ambigua/no resuelta — pendiente T.4** | "Score global descriptivo del bloque; no usar para comparar candidatos." |

### 10.5 Canales faciales / Edge AI v8

Motor: `src/telemetry/edgeAiEngine.js` (377 líneas) — "Edge AI Engine v9.1, pipeline lineal multimodal + game-aware" (`:1-14`), `MODEL_VERSION = 'krumm-edge-ai-v9.1.0-game-aware'` (`:19`), `schemaVersion: 'edge_ai_model_output_v8'` (`:343`). Pipeline: `buildMultimodalFeatures` → `auProcessor` (AUs baseline+gain) → puntuación bayesiana por canal con likelihood ratios (`bayesianChannelScore`, `:62-81`) → `emotionClassifier` (Naive Bayes 8 clases) → confianza y composite. **Anclaje vs. contexto:** el contexto T.1 describía "7 canales bayesianos incl. taskPerformance"; el código actual tiene **6 canales bayesianos por AUs** (`CHANNEL_LIKELIHOODS`, `:53-60`: `cognitiveLoad`, `emotionalValence`, `motorControl`, `engagement`, `stressResponse`, `fatigueIndex`) + `taskPerformance` explícito sobre telemetría de juego (`:84-95`) + 6 canales multimodales/game-aware añadidos en v9.1 (`visualAttention`, `postureQuality`, `inhibitionControl`, `visuomotorPrecision`, `visualSearchEfficiency`, `adaptiveResilience`, `:102-170`).

**Regla dura de gobernanza (aplica a TODAS las filas):** la cámara/facial es contexto y calidad de captura, **nunca** inferencia directa de talento, personalidad, emoción, estrés, fatiga o contratación (AGENTS; §3; `governance` en `edgeAiEngine.js:347`: `humanReviewOnly`, `noAutomatedHiringDecision`, `observationalSignalsOnly`). Ningún canal facial entra en `original_game_feature_vector_v1` ni en `assessment_feature_vector_v2`.

**Tabla A — constructo, demanda, conducta, fórmula, fuente, clasificación**

| Canal/métrica | Constructo pretendido | Demanda de tarea | Conducta observable | Fórmula exacta (archivo:línea) | Fuente bibliográfica (estado) | Clasificación |
|---|---|---|---|---|---|---|
| `cognitiveLoad` (bayesiano AU) | Carga cognitiva (contexto observacional; no es talento) | Mantener atención sostenida durante juegos con reglas | Ceño (AU4/AU7), interior de ceño (AU23); reducción de sonrisa (AU6/AU12) y ojos entrecerrados (AU5) | likelihood ratios `AU4:3.0, AU7:3.0, AU23:2.0, AU1:1.2, AU2:1.2, AU5:0.5, AU6:0.5, AU12:0.5` (`edgeAiEngine.js:54`); `logOdds += log(lh)·intensity`; `score = 1/(1+exp(−logOdds·1.5))` → `toPercent(k=8)` (`:62-81`, `:26-29`); modificador game-aware `0.55·AU + 0.45·gameLoad` con `gameLoad = 0.40·conflictCost/600 + 0.25·errorRate + 0.20·max(inh) + 0.15·mrt/1500` (`:191-202`) | Palinko et al. 2010, "Estimating cognitive load using remote eye tracking in a driving simulator" (verificada vía web 2026-08-27; ETRA'10, ACM, DOI `10.1145/1743666.1743701`; primer apellido confirmado por encabezado `insightMetrics.js:14`): otra modalidad (ojo, no rostro); Almond et al. 2015 (verificada §7): evidencia de tarea ≠ constructo | adyacente |
| `emotionalValence` (bayesiano AU) | Valencia afectiva (modelado circumplejo; **prohibido inferir estado interno para HR**) | Presencia facial durante la batería | Sonrisa (AU6+AU12) vs. ceño/lag (AU4/AU15) | likelihood ratios `AU6:4.0, AU12:4.0, AU4:0.2, AU15:0.2, AU9:0.3, AU7:0.5` (`edgeAiEngine.js:55`); scoring bayesiano `:62-81` | Russell 1980, "A circumplex model of affect" (verificada en transcript `deleg_575a929f`, J. Pers. Soc. Psychol. 39(6):1161-1178); Barrett et al. 2019, "Challenges to Inferring Emotion From Human Facial Movements" (verificada §7, DOI `10.1177/1529100619832930`): una configuración facial no determina un estado interno | adyacente |
| `motorControl` (bayesiano AU) | Control motor facial + visomotriz (contexto) | Estabilidad facial/precisión durante manipulación | Asimetrías labiales (AU12 L/R), lag mandibular (AU14 L/R) | likelihood ratios `AU_L12:0.5, AU_R12:0.5, AU_L14:0.5, AU_R14:0.5, default:0.7` (`edgeAiEngine.js:56`); modificador `0.45·AU + 0.55·motorRaw` con `motorRaw = 0.35·path + 0.25·pursuit + 0.15·lowLoss + 0.15·lowOvershoot + 0.10·lowJerk` (`:203-213`) | Ekman & Friesen 1978, FACS (verificada en transcript `deleg_575a929f`, DOI `10.1037/t27734-000`): método de definición de AUs; Freeman & Ambady 2010 (verificada §7, DOI `10.3758/BRM.42.1.226`): movimiento como señal temporal | adyacente |
| `engagement` (bayesiano AU) | Engagement en tarea (contexto; no es motivación de rasgo) | Participación sostenida en juegos | Entrecierro (AU5), ceño (AU1/AU2), sonrisa (AU6/AU12); baja en bostezo (AU45) | likelihood ratios `AU5:4.0, AU45:0.15, AU43:0.3, AU1:2.0, AU2:1.8, AU6:1.5, AU12:1.3` (`edgeAiEngine.js:57`); modificador `0.55·AU + 0.30·visualAttention + 0.15·postureQuality` (`:179-182`) | Altomari et al. 2023, serious games y soft skills (verificada §7, DOI `10.2196/45436`): uso exploratorio, no valida engagement como rasgo; Coovert et al. 2017 (verificada en transcript, IJSG): juegos serios para investigación de equipo | adyacente |
| `stressResponse` (bayesiano AU) | Respuesta al estrés (prohibido inferir estrés para HR; solo observacional) | Demanda sostenida con cambios de prioridad (Faro) y pérdidas (Balloon) | Ceño (AU4/AU23), fruncido (AU9), lag (AU15); reducción de sonrisa | likelihood ratios `AU4:2.5, AU23:4.0, AU9:2.5, AU7:2.0, AU15:1.5, AU6:0.3, AU12:0.3` (`edgeAiEngine.js:58`); modificador `0.75·AU + 0.15·posturePenalty + 0.10·gazeInstability` (`:187-190`) | Giannakakis et al. 2017, detección de estrés/ansiedad por cues faciales (verificada en transcript `deleg_575a929f`, Biomed. Signal Process. Control 31): otra tarea; Kim et al. 2018 (verificada §7, DOI `10.30773/pi.2017.08.17`): HRV-estrés, no implementada aquí; Barrett et al. 2019 (verificada §7): límite de inferencia | ambigua/no resuelta |
| `fatigueIndex` (bayesiano AU) | Fatiga/alerta (contexto de calidad; prohibido inferir fatiga clínica) | Sesión larga de batería | Bostezo (AU45), caída de párpado (AU7/AU43), entrecierro bajo (AU5) | likelihood ratios `AU45:5.0, AU7:2.5, AU43:3.5, AU5:0.2, AU1:0.4, AU6:0.4, AU12:0.5` (`edgeAiEngine.js:59`); modificador `0.70·AU + 0.20·headForward + 0.10·gazeInstability` (`:183-186`) | Dinges & Grace 1998, "PERCLOS: A Valid Psychophysiological Measure of Alertness As Assessed by Psychomotor Vigilance" (verificada vía web 2026-08-27, DOT report, DOI `10.21949/1502740`): PERCLOS/alerta en conducción, no en juegos; Zhu & Ji 2004, "Real-Time Nonintrusive Monitoring and Prediction of Driver Fatigue" (verificada en transcript, Nov. 2004) | adyacente |
| `taskPerformance` (explícito, telemetría de juego) | Desempeño de tarea agregado (no es señal facial) | Completar trials del juego con aciertos y rapidez | Precisión, tiempo medio de reacción, trials completados | `raw = acc·0.30 + meanScore·0.20 + (1−mrt/2000)·0.30 + completedRatio·0.20` → `toPercent` (`edgeAiEngine.js:84-95`); `source: 'game_telemetry'` si juego disponible | Interna: consume agregados de juego (no rostro); Almond et al. 2015 (verificada §7) como marco ECD de evidencia de tarea | interna |
| `visualAttention` (explícito, gaze) | Atención visual (contexto de calidad) | Mirada a pantalla durante la sesión | `lookingAtScreen` y confianza del gaze | `raw = focus·0.80 + (1−distractionScore)·0.20`, con `focus = lookingAtScreen ? gaze.confidence : 0` (`edgeAiEngine.js:102-110`); si no disponible → 0.5 con caveat `gaze_unavailable` | Interna: contexto/quality-only (AGENTS); no hay fuente externa validada para este uso | interna |
| `postureQuality` (explícito, postura/MoveNet) | Calidad postural (contexto de calidad) | Postura estable frente a cámara | `postureScore`, `headForward`, simetría de hombros | `raw = postureScore·0.55 + shoulderSymmetry·upperConfidence·0.30 + (1−headForward)·0.15` (`edgeAiEngine.js:112-124`); MoveNet real o caveat (AGENTS: no fallback FaceMesh para hombros) | Interna: contexto/quality-only; sin fuente externa validada aquí | interna |
| `inhibitionControl` (explícito, juego) | Control inhibitorio (contexto; EF separable) | Tareas con errores de comisión/omisión (p. ej. go/no-go tipo) | Tasas de error de comisión/omisión, desaceleración post-error | `raw = 1 − (commission·0.45 + omission·0.35 + postErrorSlowing/800·0.20)` (`edgeAiEngine.js:126-134`) | Diamond 2013, "Executive Functions" (verificada §7, DOI `10.1146/annurev-psych-113011-143750`): inhibición como EF separable; no valida este canal | adyacente |
| `visuomotorPrecision` (explícito, juego) | Precisión visomotora (contexto) | Seguir/transportar objetivos con el puntero | Eficiencia de trayectoria, pursuit suave, pérdida de tracking, overshoot, throughput de Fitts | `raw = path·0.30 + pursuit·0.22 + lowLoss·0.18 + lowOvershoot·0.15 + (meanThroughput/5)·0.15` (`edgeAiEngine.js:136-147`) | Freeman & Ambady 2010 (verificada §7, DOI `10.3758/BRM.42.1.226`): mouse tracking como método de procesamiento temporal; Stillman et al. 2018 (verificada §7, DOI `10.1016/j.tics.2018.03.012`): valor de la señal, no inferencia HR | adyacente |
| `visualSearchEfficiency` (explícito, juego) | Eficiencia de búsqueda visual (contexto) | Buscar objetos en displays de juego | Eficiencia de búsqueda, tasa de error, tamaño de set | `raw = efficiency·0.65 + lowError·0.25 + (meanSetSize/20)·0.10` (`edgeAiEngine.js:149-157`) | No hay fuente verificada específica para este canal en esta revisión | ambigua/no resuelta |
| `adaptiveResilience` (explícito, juego + correlación) | Resiliencia adaptativa (contexto; tensión con adaptabilidad R-6) | Mantener rendimiento tras errores y cambios | Precisión, ratio completado, errores bajos, estabilidad de postura/rostro en reacciones | `raw = acc·0.35 + completedRatio·0.25 + lowErrors·0.20 + postureStable·0.10 + faceStable·0.10` (`edgeAiEngine.js:159-170`) | No hay fuente verificada específica; Miyake et al. 2000 (verificada §7) advierte que la flexibilidad no se colapsa con otras funciones | ambigua/no resuelta |
| PERCLOS (insight, citado) | Alerta/fatiga (no es talento) | Cierre de párpados prolongado durante la sesión | Proporción de tiempo con ojos cerrados ≥ umbral | **No implementada en el código**: solo referencia en encabezado `insightMetrics.js:12` ("Dinges et al. (1998). PERCLOS"); ninguna función en `src/` calcula PERCLOS (búsqueda 2026-08-27) | Dinges & Grace 1998 (verificada vía web 2026-08-27, DOI `10.21949/1502740`) | adyacente |
| `valence` / `arousal` / `dominance` (insights) | Dimensiones afectivas (contexto; prohibido inferir emoción interna) | Presencia facial durante la batería | AUs de sonrisa vs. ceño/lag; AUs de activación; AUs de tensión | `valence = (posSignal − negSignal + 1)/2`, `posSignal = (AU6+AU12)/2`, `negSignal = (AU4+AU15+AU9)/3`; `arousal = (AU1+AU2+AU5+AU26)/4`; `dominance = ((1−AU4)+(1−AU15)+(1−AU20))/3` (`insightMetrics.js:116-120`) | Russell 1980 (verificada en transcript: circumplex valence-arousal); Ekman & Friesen 1978 (verificada en transcript, FACS); Barrett et al. 2019 (verificada §7): límite de inferencia de estados internos | adyacente |
| Emociones NB 8 clases (`emotionClassifier`) | Clasificación de expresión (contexto observacional; **no estado emocional del candidato**) | Presencia facial con expresión espontánea | AUs espontáneos con intensidad | 8 clases `happiness/sadness/surprise/fear/anger/disgust/contempt/neutral`; `EMOTION_LIKELIHOODS` (`emotionClassifier.js:30-59`) + gates FACS `facsRuleMultiplier` (`:75-119`) + masa de evidencia `nonNeutralMass = clamp((evidenceMass−0.03)/1.25, 0, 0.92)` (`:135-139`) + softmax sobre log-likelihoods (`:170-188`); `classifyEmotions` (`:127-211`) | Ekman & Friesen 1978 (verificada en transcript, FACS, DOI `10.1037/t27734-000`); Cohn et al. 2007 (verificación pendiente — PDF "Observer-Based Measurement of Facial Expression With the Facial Action Coding System" visto en transcript); D'Mello & Graesser 2012 (verificación pendiente — citada en encabezado `insightMetrics.js:10` como "Dynamics of affective states during learning"); Barrett et al. 2019 (verificada §7): la clasificación facial no justifica inferir estado interno | ambigua/no resuelta |
| Composite Edge AI (`composite`) | Resumen objetivo de canales (contexto de calidad) | Sesión completa con captura | Media ponderada de 13 canales con polaridad | `effectiveScore = 100 − score` si polaridad negativa (`cognitiveLoad`, `fatigueIndex`, `stressResponse`); `score = round(Σ effective·weight / Σ weight)` con `COMPOSITE_WEIGHTS` (`edgeAiEngine.js:216-230`, `232-246`) | Interna: pesos propios del repo; sin validación externa del composite | interna |

**Tabla B — cadena de trazabilidad (canal → salida → gobernanza)**

| Canal/métrica | Telemetría agregada de origen | Feature versionada | Regla provisional | Disponibilidad / confianza / caveats | Narrativa para revisión humana |
|---|---|---|---|---|---|
| 6 canales bayesianos AU (`cognitiveLoad`, `emotionalValence`, `motorControl`, `engagement`, `stressResponse`, `fatigueIndex`) | AUs procesados (baseline+gain) por `auProcessor` dentro de `buildMultimodalFeatures` (`edgeAiEngine.js:275-287`) | **No entran** en `original_game_feature_vector_v1` ni en `assessment_feature_vector_v2` (allowlist §3.1; FORBIDDEN_KEYS `originalGameFeatureVector.js:333-371`) | Ninguna regla R-6 consume canales faciales; el framework solo agrega el caveat `camera_signal_context_not_used_for_talent_mapping` cuando `signalQuality.sampleCount = 0` (`originalGameTalentMapping.js:370-376`) | `confidence` por canal = base `clamp((facePresenceRatio+meanConfidence)/2)·(0.7+captureQuality/100·0.3)` (`edgeAiEngine.js:314-327`); caveat `low_capture_confidence` si < 0.5 (`:248-261`); `governance: humanReviewOnly/noAutomatedHiringDecision/observationalSignalsOnly` (`:347`); caveats fijos `:365-374` | "Señal observacional de captura facial para revisión humana; nunca inferencia de talento, emoción, estrés, fatiga o contratación (Barrett 2019; contrato R-6)." |
| `taskPerformance` | resumen de juego (accuracy, mrt, trials, meanScore) vía `buildMultimodalFeatures` (`edgeAiEngine.js:84-95`) | idem: fuera de los feature vectors | Ninguna (el framework puntúa constructos desde los agregados de juego propios, no desde este canal) | `source: 'game_telemetry'` o `'task'`; confianza base de captura | "Rendimiento de tarea agregado del juego; redundante con los scores de juego ya trazados en §10.1–10.4." |
| Canales game-aware v9.1 (`visualAttention`, `postureQuality`, `inhibitionControl`, `visuomotorPrecision`, `visualSearchEfficiency`, `adaptiveResilience`) | gaze/postura/MoveNet + `gameSummary` + `gameCorrelation` (`edgeAiEngine.js:102-170`) | idem: fuera de los feature vectors | Ninguna | `confidence: 0` y caveat `*_unavailable` cuando falta la fuente (`:104-105`, `:115-116`, `:127`); MoveNet real o caveat para hombros (AGENTS) | "Contexto multimodal de calidad y desempeño; sin inferencia HR." |
| PERCLOS | (no se calcula) | — | — | Métrica no implementada; solo citada (`insightMetrics.js:12`) → "no disponible", no "ausente de señal" | "Si se implementa en R-7, validar contra Dinges & Grace 1998 (DOI 10.21949/1502740) en contexto de conducción." |
| VAD insights | AUs (`insightMetrics.js:116-120`), provenance `multimodal_v3`/`au_only_v2` (`:140`) | Fuera de feature vectors | Ninguna | caveats de confianza de captura; `frustrationTolerance = 1 − tension` (`:114`) es insight descriptivo, **no** la tolerancia a la frustración del contrato R-6 (que sigue `not_measured`) | "Dimensiones de expresión para contexto; no inferir estado afectivo (Russell 1980; Barrett 2019)." |
| Emociones NB 8 clases | AUs (`emotionClassifier.js:127-211`) | Fuera de feature vectors | Ninguna | `confidence` por dominancia/margen (`:199-203`); `neutral` por defecto con evidencia débil (`:131-151`) | "Clasificación de expresión espontánea con gates FACS; nunca 'el candidato sintió X'." |
| Composite Edge AI | 13 canales (`edgeAiEngine.js:232-246`) | Fuera de feature vectors | Ninguna | pesos del repo; polaridad negativa para load/fatiga/estrés | "Resumen objetivo de la calidad/estado de captura para revisión humana." |

### 10.6 Composite + feature vector v2

Capa de composites y framework: `src/assessment/originalGameTalentMapping.js` (425 líneas). `buildOriginalGameTalentFramework` (`:378-425`) produce `krumm_workbook_talent_framework_v1` en el orden del Excel (`WORKBOOK_TALENT_CONSTRUCT_ORDER`, `:4-13`, con `workbookRow` 3–10). Rounding de scores a 0–100 con clamp `[0,1]` (`roundScore`, `:74-78`).

**Tabla A — constructo, demanda, conducta, fórmula, fuente, clasificación**

| Métrica | Constructo pretendido | Demanda de tarea | Conducta observable | Fórmula exacta (archivo:línea) | Fuente bibliográfica (estado) | Clasificación |
|---|---|---|---|---|---|---|
| `L` (laserComposite) | Sub-índice de desempeño Laser | Tareas con reglas explícitas y par | Eficiencia de solución + tasa de resolución + cumplimiento | `0.55·laser.solutionEfficiency + 0.30·laser.solvedRate + 0.15·laser.ruleCompliance` (`originalGameTalentMapping.js:150-152`); requiere `measured_complete` y 3 features observadas (`:144-149`) | Interna: pesos del plan R-6 (doc. §5); Almond et al. 2015 (verificada §7) como marco de ponderación de evidencia | interna |
| `P` (passengerComposite) | Sub-índice de desempeño Passenger | Planificación bajo restricciones | Eficiencia de ruta + entregas + cumplimiento | `0.50·passenger.routeEfficiency + 0.30·passenger.deliveryRate + 0.20·passenger.constraintCompliance` (`originalGameTalentMapping.js:161-163`); precondición `:155-160` | Interna: pesos R-6 (doc. §5); Shallice 1982 (verificada §7) como marco de la demanda | interna |
| `T` (teamComposite) | Sub-índice de desempeño Faro | Juicio social estructurado en equipo | Scores de opciones en 4 briefs | requiere observadas `team.leadershipScore/communicationScore/adaptabilityScore/decisionQualityScore` (`originalGameTalentMapping.js:166-172`); devuelve bundle con fallbacks `alignment→communication`, `roleClarity→leadership`, `feedbackUse→communication`, `changeResponse→adaptability` (`:173-182`) | Interna: fallbacks propios; Arthur et al. 2003 (verificada §7) advierte que el liderazgo/comunicación se validan con interacción real, no opciones estructuradas | interna |
| `problemSolving` = `0.65·L + 0.35·P` | Resolución de problemas | Transformar estados en metas bajo reglas (Laser) + restricciones (Passenger) | Desempeño combinado de ambos juegos | `(0.65 * L) + (0.35 * P)` (`originalGameTalentMapping.js:187`); `scoredConstruct` ceiling 0.6 (`:188-190`); evidencia 4 features + fórmula (`:191-196`) | Almond et al. 2015 (verificada §7, ECD: modelo de evidencia explícito); de Klerk et al. 2015 (verificada §7: el desempeño en juegos/simulaciones requiere análisis psicométrico antes de uso assessment) | adyacente |
| `planning` = `P` | Planificación | Anticipar, organizar y monitorear rutas bajo presupuesto | Eficiencia/entregas/cumplimiento Passenger | `scoreValue = P` (`originalGameTalentMapping.js:202-206`); ceiling 0.6; evidencia 3 features Passenger + fórmula (`:207-212`) | Shallice 1982 (verificada §7, DOI `10.1098/rstb.1982.0082`): planificación no rutinaria; Diamond 2013 (verificada §7): EF separables — no valida Passenger como test de planificación | adyacente |
| `analyticalThinking` = `0.50·L + 0.50·P` | Pensamiento analítico | Descomponer reglas, recursos y caminos | Desempeño combinado Laser+Passenger | `(0.50 * L) + (0.50 * P)` (`originalGameTalentMapping.js:220`); ceiling 0.6 (`:221-223`); evidencia 2 features + fórmula (`:224-228`) | Miyake et al. 2000 (verificada §7, DOI `10.1006/cogp.1999.0734`): no colapsar EF distintas; la mezcla L+P no es evidencia de capacidad analítica general (narrativa `:229-231`) | adyacente |
| `decisionMaking` = `0.60·T.decision + 0.25·P + 0.15·T.alignment` (o descriptivo) | Toma de decisiones | Trade-offs explícitos del brief + planificación de rutas | Decisiones estructuradas en Faro + eficiencia de ruta | si `T !== null && P !== null`: `(0.60 * T.decision) + (0.25 * P) + (0.15 * T.alignment)` (`originalGameTalentMapping.js:241`), ceiling 0.6; si no: `availability: 'descriptive_only'`, confidence 0.2 si hay evidencia (`:254-258`); evidencia incluye `balloon.riskEfficiency` solo como descriptivo (`:236-237`) | Tensión: doc. §6.1 fija "decisionMaking y riskFeedback: siempre descriptivos hasta definir criterio externo"; el framework (ola G) puntúa si hay T∧P → no resuelta. Almond et al. 2015 (verificada §7) | ambigua/no resuelta |
| `riskFeedbackProfile` = `0.35·riskEff + 0.25·cashout + 0.25·(1−popRate) + 0.15·balancedExploration` | Estrategia riesgo/feedback (descriptiva) | Acumular/asegurar bajo riesgo de pérdida | Eficiencia de riesgo, cashouts, pops, ajuste post-pérdida | `lossManagement = 1 − popRate` (`:278`); `balancedExploration = 1 − min(1, |averagePumps − 0.5|/0.5)` (`:279`); valor `0.35·riskEfficiency + 0.25·cashoutRate + 0.25·lossManagement + 0.15·balancedExploration` (`:280-283`); ceiling 0.55; exige 4 features Balloon (`:271-277`) | Lejuez et al. 2002 (verificada §7, BART); Lauriola et al. 2013 (verificada §7, DOI `10.1002/bdm.1784`): correlaciones BART–rasgos pequeñas/moderadas; caveat explícito `frustration_tolerance_not_measured` (`:292`) | adyacente |
| `adaptability` = `0.70·T.adaptability + 0.30·T.changeResponse` (o `insufficient`) | Adaptabilidad/flexibilidad cognitiva | Cambios controlados de prioridad/recurso en el brief | Respuesta a cambio en escenarios | si `T === null`: `insufficient` (`originalGameTalentMapping.js:299-305`); si no: `(0.70 * T.adaptability) + (0.30 * T.changeResponse)` (`:307`), ceiling 0.55 | Tensión: contrato R-6 = `insufficient` con batería actual; el framework puntúa desde escenarios de sesión única. Miyake et al. 2000 (verificada §7): la flexibilidad requiere tareas de cambio controlado → **ambigua/no resuelta — pendiente T.4** | ambigua/no resuelta |
| `leadership` = `0.50·T.leadership + 0.30·T.roleClarity + 0.20·T.alignment` (o `not_measured`) | Liderazgo | Dirección social en micro-situaciones estructuradas | Roles/claridad/alineación en opciones del brief | si `T === null`: `not_measured` (`originalGameTalentMapping.js:323-329`); si no: `(0.50 * T.leadership) + (0.30 * T.roleClarity) + (0.20 * T.alignment)` (`:330`), ceiling 0.55 | Tensión: contrato R-6 = `not_measured` en tareas individuales; Arthur et al. 2003 (verificada §7, DOI `10.1111/j.1744-6570.2003.tb00146.x`): la validez del liderazgo se establece en ejercicios con interacción → **ambigua/no resuelta — pendiente T.4** | ambigua/no resuelta |
| `communication` = `0.55·T.communication + 0.25·T.feedbackUse + 0.20·T.alignment` (o `not_measured`) | Comunicación | Formulación/entrega de información estructurada | Claridad/contexto/pasos en opciones del brief | si `T === null`: `not_measured` (`originalGameTalentMapping.js:347-352`); si no: `(0.55 * T.communication) + (0.25 * T.feedbackUse) + (0.20 * T.alignment)` (`:354`), ceiling 0.55 | Tensión: contrato R-6 = `not_measured`; Thornhill-Miller et al. 2023 (verificada §7, DOI `10.3390/jintelligence11030054`): comunicación = constructo amplio (4Cs) → **ambigua/no resuelta — pendiente T.4** | ambigua/no resuelta |
| `original_game_feature_vector_v1` | Vector fijo agregado privado | 4 juegos completados | 32 features con orden fijo | `buildOriginalGameFeatureVector` (`originalGameFeatureVector.js:611-653`): `featureOrder` (32 claves, `:4-37`), `featureArray` con `missingValue: 0` + `observedMask` (`:618-622`, `:635-638`), `gameAvailability` por juego (`:419-424`), `FORBIDDEN_KEYS` (37 claves reconstructivas prohibidas, `:333-371`), `privacy` (`:641-647`), validación `privacyValidation` (`:593-609`, llamada `:651`) | Interna: diseño R-6 (doc. §3.3); SIOP 2018 (verificada §7, DOI `10.1017/iop.2018.195`): documentación de evidencia como requisito normativo | interna |
| `assessment_feature_vector_v2` + gobernanza | Compatibilidad del pipeline existente | (no se modifica en R-6) | — | `assessment_feature_vector_v2` intacto (doc. §3.3); flags del framework: `humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true` (`originalGameTalentMapping.js:418-423`); `classification: {strengths: null, watchAreas: null, availability: 'not_available_without_norms'}` (`:413-417`); status `'provisional'` (`:405`) | Interna: contrato R-6; SIOP 2018 (verificada §7): sin normas/validación no hay clasificación de fortalezas ni decisiones | interna |

**Tabla B — cadena de trazabilidad (features → reglas → disponibilidad → narrativa)**

| Métrica | Telemetría agregada | Feature versionada | Regla provisional | Disponibilidad / confianza / caveats | Narrativa para revisión humana |
|---|---|---|---|---|---|
| `L` | agregado `laser_puzzle` | 3 features `laser.*` observadas | base de problemSolving/analyticalThinking | null si juego no `measured_complete` o falta feature (`originalGameTalentMapping.js:144-149`) | "Sub-índice de desempeño Laser; no es capacidad general." |
| `P` | agregado `passenger_routes` | 3 features `passenger.*` observadas | base de planning/problemSolving/analyticalThinking/decisionMaking | null si falta (`:155-160`) | "Sub-índice de desempeño Passenger." |
| `T` | agregado `team_coordination` | 4 features `team.*` obligatorias + 4 contextuales con fallback | base de decisionMaking/adaptability/leadership/communication | null si faltan las 4 obligatorias (`:166-172`); fallbacks declarados en `:178-181` | "Sub-índice de juicio social estructurado (Faro)." |
| `problemSolving` | Laser + Passenger | `laser.*`, `passenger.*` | `0.65·L + 0.35·P` | `provisional_score`, ceiling 0.6, score 0–100 no normado (`:188-190`); caveat `provisional_mapping_requires_validation` (`:129`) | "Índice provisional de desempeño en resolución de problemas dentro de tareas con reglas explícitas y planificación de restricciones" (narrativa del código `:197`). |
| `planning` | Passenger | `passenger.*` | `P` | `provisional_score`, ceiling 0.6 (`:204-206`) | "Índice provisional de planificación bajo restricciones dentro de Passenger Routes" (`:213`). |
| `analyticalThinking` | Laser + Passenger | `laser.*`, `passenger.*` | `0.50·L + 0.50·P` | `provisional_score`, ceiling 0.6 (`:221-223`) | "No equivale a capacidad analítica laboral validada" (`:230`). |
| `decisionMaking` | Faro + Passenger (+ Balloon descriptivo) | `team.decisionQualityScore`, `passengerComposite`, `balloon.riskEfficiency` | `0.60·T.decision + 0.25·P + 0.15·T.alignment` (si T∧P); si no `descriptive_only` confidence 0.2 | caveats `structured_scenario_requires_validation`, `no_automated_decision` (`:249`); **tensión con §6.1 — pendiente T.4** | "No es ranking ni criterio de selección" (`:251`). |
| `riskFeedbackProfile` | Balloon | 4 features `balloon.*` obligatorias | `0.35·riskEff + 0.25·cashout + 0.25·lossMgmt + 0.15·balancedExpl` | `provisional_score`, ceiling 0.55 (`:284-286`); caveats `frustration_tolerance_not_measured`, `risk_index_not_personality_trait`, `game_strategy_score_not_normative_trait` (`:292`) | "No mide personalidad ni tolerancia a la frustración" (`:294`). |
| `adaptability` | Faro | `team.adaptabilityScore`, `team.changeResponseScore` | `0.70·adapt + 0.30·changeResponse` (si T); si no `insufficient` | `insufficient` (caveats `adaptability_requires_controlled_rule_or_context_changes`, `:302`) o `provisional_score` ceiling 0.55; **tensión R-6 — pendiente T.4** | "Requiere validación antes de comparar candidatos" (`:317`). |
| `leadership` | Faro | `team.leadershipScore`, `team.roleClarityScore`, `team.alignmentScore` | `0.50·leadership + 0.30·roleClarity + 0.20·alignment` (si T); si no `not_measured` con `score: null` (`:111`) | `not_measured` (cero features → score null, no 0 ni 50) o `provisional_score` ceiling 0.55; **tensión R-6 — pendiente T.4** | "No reemplaza evaluación grupal real" (`:342`). |
| `communication` | Faro | `team.communicationScore`, `team.feedbackUseScore`, `team.alignmentScore` | `0.55·communication + 0.25·feedbackUse + 0.20·alignment` (si T); si no `not_measured` | idem liderazgo; **tensión R-6 — pendiente T.4** | "Sin texto libre ni habla en vivo" (`:366`). |
| `original_game_feature_vector_v1` | 4 agregados sanitizados (allowlist §3.1) | 32 features + mask + availability | entrada única del framework | `invalid`/`not_observed` por condiciones §6.2 (validaciones `:458-465`, `:489-498`, `:529-538`, `:566-575`); flags de privacidad `:641-647` | "Vector fijo, agregado, sin campos reconstructivos; faltante = 0 + mask 0, nunca imputación." |
| `assessment_feature_vector_v2` + flags | pipeline existente | intacto (compatibilidad) | — | `humanReviewOnly/noAutomatedDecision/observationalOnly/privacySafe` (`originalGameTalentMapping.js:418-423`); `strengths/watchAreas = null` (`:413-417`) | "Soporte descriptivo para revisión humana; sin decisión automatizada ni clasificación normativa." |

### 10.7 Distribución de clasificaciones

**10.7.1 Distribución por sección (filas clasificadas de las Tablas A)**

| Sección | Métricas | directa | adyacente | ambigua/no resuelta | interna |
|---|---:|---:|---:|---:|---:|
| 10.1 Laser (`laser_puzzle`) | 8 | 2 | 1 | 0 | 5 |
| 10.2 Balloon (`balloon_risk`) | 8 | 1 | 4 | 0 | 3 |
| 10.3 Passenger (`passenger_routes`) | 9 | 0 | 3 | 1 | 5 |
| 10.4 Team/Faro (`team_coordination`) | 11 | 0 | 1 | 5 | 5 |
| 10.5 Canales faciales / Edge AI v8 | 17 | 0 | 9 | 4 | 4 |
| 10.6 Composite + feature vector v2 | 13 | 0 | 4 | 4 | 5 |
| **Total** | **66** | **3** | **22** | **14** | **27** |

Lectura: el 33% de las celdas (22/66) se apoya en evidencia **adyacente** (metodología o contexto relacionado, no validación de esta tarea); el 21% (14/66) queda **ambigua/no resuelta** (tensiones R-6 vs. ola G en Faro, y canales faciales sin fuente validada — pendientes T.4); el 41% (27/66) es **interna** (definiciones operacionales del repo, procedencia ≠ validación); solo el 5% (3/66) es **directa** (ECD/BART como ancla metodológico-conductual). Ninguna métrica facial clasifica `directa`: la cámara es contexto/quality-only.

**10.7.2 Estado de verificación de citas usadas en §10**

| Fuente | Estado | Origen de verificación |
|---|---|---|
| Almond, Mislevy, Steinberg, Yan & Williamson (2015), "An Introduction to Evidence-Centered Design" | verificada | §7 (DOI `10.1007/978-1-4939-2125-6_2`) + transcript `deleg_575a929f` |
| Shute & Ventura (2013), "Stealth Assessment" | verificada | §7 (DOI `10.7551/mitpress/9589.001.0001`) + transcript |
| de Klerk, Veldkamp & Eggen (2015) | verificada | §7 (DOI `10.1016/j.compedu.2014.12.020`) |
| Lejuez et al. (2002), BART | verificada | §7 (DOI `10.1037/1076-898X.8.2.75`) + transcript (PsycNET) |
| Pleskac (2008) | verificada | §7 (DOI `10.1037/0278-7393.34.1.167`) + transcript (PsycNET) |
| Lauriola et al. (2013), meta-análisis BART | verificada | §7 (DOI `10.1002/bdm.1784`) + transcript (PsycNET, 2014) |
| Shallice (1982), "Specific impairment of planning" | verificada | §7 (DOI `10.1098/rstb.1982.0082`) + transcript (citado en PMC11140914) |
| Diamond (2013), "Executive Functions" | verificada | §7 (DOI `10.1146/annurev-psych-113011-143750`) + transcript (Annual Reviews, Vol. 64:135-168) |
| Miyake et al. (2000) | verificada | §7 (DOI `10.1006/cogp.1999.0734`) |
| Arthur et al. (2003), meta-análisis assessment centers | verificada | §7 (DOI `10.1111/j.1744-6570.2003.tb00146.x`) + transcript (Wiley) |
| Altomari et al. (2023) | verificada | §7 (DOI `10.2196/45436`) + transcript (JMIR Serious Games) |
| Coovert et al. (2017), "Serious Games are a Serious Tool for Team Research" | verificada | transcript `deleg_575a929f` (IJSG, MD Coovert 2017) |
| Ekman & Friesen (1978), FACS | verificada | transcript `deleg_575a929f` (PsycNET, DOI `10.1037/t27734-000`) |
| Russell (1980), "A circumplex model of affect" | verificada | transcript `deleg_575a929f` (J. Pers. Soc. Psychol. 39(6):1161-1178) |
| Zhu & Ji (2004), driver fatigue monitoring | verificada | transcript `deleg_575a929f` (ResearchGate, Nov. 2004) |
| Bartlett et al. (2006), "Automatic recognition of facial actions in spontaneous expressions" | verificada | transcript `deleg_575a929f` (2006, Vol. 1, No. 6, pp. 22-35) |
| Giannakakis et al. (2017), "Stress and anxiety detection using facial cues from videos" | verificada | transcript `deleg_575a929f` (BSPC 31) |
| Barrett et al. (2019) | verificada | §7 (DOI `10.1177/1529100619832930`) + transcript (PubMed 31313636) |
| Kim et al. (2018) | verificada | §7 (DOI `10.30773/pi.2017.08.17`) |
| SIOP (2018) | verificada | §7 (DOI `10.1017/iop.2018.195`) + transcript (PsycNET) |
| Thornhill-Miller et al. (2023) | verificada | §7 (DOI `10.3390/jintelligence11030054`) + transcript (PubMed 36976147) |
| Freeman & Ambady (2010), MouseTracker | verificada | §7 (DOI `10.3758/BRM.42.1.226`) + transcript (Springer) |
| Stillman, Shen & Ferguson (2018) | verificada | §7 (DOI `10.1016/j.tics.2018.03.012`) + transcript (PubMed 29731415) |
| Chung (2015) | verificada | §7 (DOI `10.1007/978-3-319-05834-4_3`) + transcript (ResearchGate) |
| Schmidt & Hunter (1998) | verificada | §7 (DOI `10.1037/0033-2909.124.2.262`) + transcript (web_extract PsycNET) |
| Chamorro-Premuzic et al. (2016) | verificada | §7 (DOI `10.1017/iop.2016.6`) + transcript (Cambridge) |
| Dinges & Grace (1998), "PERCLOS: A Valid Psychophysiological Measure of Alertness As Assessed by Psychomotor Vigilance" | verificada | **web 2026-08-27** (DOT report 1998-10-01; DOI `10.21949/1502740`; Semantic Scholar) |
| Palinko et al. (2010), "Estimating cognitive load using remote eye tracking in a driving simulator" | verificada | **web 2026-08-27** (ETRA'10, ACM, 141-144; DOI `10.1145/1743666.1743701`; primer apellido confirmado por encabezado `insightMetrics.js:14`) |
| D'Mello & Graesser (2012), "Dynamics of affective states during complex learning" | **verificada** | web 2026-09-04 (ScienceDirect + ResearchGate): *Learning and Instruction* 22(2), 145–157; DOI `10.1016/j.learninstruc.2011.10.001` | 
| Cohn, Ambadar & Ekman (2007), "Observer-Based Measurement of Facial Expression With the Facial Action Coding System" | **verificada** | web 2026-09-04 (APA PsycNet 2007-08864-013 + OUP): cap. 13 en Coan & Allen (Eds.), *Handbook of emotion elicitation and assessment*, OUP, pp. 203–221 |

Nota: las dos citas que estaban con verificación pendiente (soporte secundario del canal de emociones 10.5) quedaron verificadas el 2026-09-04; ninguna clasificación de §10 dependía exclusivamente de ellas.

**10.7.3 Discrepancias de anclajes (contexto T.1 vs. código actual, 2026-08-27)**

| Anclaje del contexto | Estado |
|---|---|
| `originalGameTalentMapping.js` L102-142 (baseConstruct/CONSTRUCT_DEFINITIONS), L220 (`0.50·L+0.50·P`), L241 (`0.60·T.decision+0.25·P+0.15·T.alignment`), L255 (`descriptive_only`), L378-425 (framework, `0.65·L+0.35·P`) | **confirmado** contra el código actual (las 425 líneas leídas; `CONSTRUCT_DEFINITIONS` está en `:15-72`, `baseConstruct` en `:102-120`) |
| `laserPuzzleTelemetry.js` L317-351 (getLaserEfficiency; score `0.65·eff+0.35·solved−min(0.35,viol·0.05)`) | **confirmado** — pero la ruta real es `src/tasks/original-games/laserPuzzleTelemetry.js` (el contexto no indicaba la carpeta; `src/telemetry/` no contiene estos archivos) |
| `passengerRouteTelemetry.js` L330-377 (`minimumCost/actualCost` clamp; score `0.40·comp+0.35·eff+0.25·sat−0.02·viol−0.005·replans`) | **confirmado** en `src/tasks/original-games/passengerRouteTelemetry.js` |
| `balloonRiskTelemetry.js` L56-86 (`riskEfficiency = (points/(total·100))·(1−min(0.6,pops·0.12))`) | **confirmado** en `src/tasks/original-games/balloonRiskTelemetry.js` |
| `teamCoordinationTelemetry.js` (promedios por constructo; score global = media de 4) | **confirmado** en `src/tasks/original-games/teamCoordinationTelemetry.js:284-321` (media global `:303`) |
| Edge AI "7 canales bayesianos: cognitiveLoad, emotionalValence, motorControl, engagement, stressResponse, fatigueIndex, taskPerformance" | **parcialmente obsoleto**: el código actual (`edgeAiEngine.js`) tiene **6** canales bayesianos por AUs (`CHANNEL_LIKELIHOODS` `:53-60`); `taskPerformance` es un canal explícito sobre telemetría de juego (`:84-95`), no bayesiano; y el motor v9.1 añade 6 canales game-aware (`:102-170`). El esquema de salida sigue siendo `edge_ai_model_output_v8` (`:343`) |
| "insightMetrics.js (PERCLOS, valence/arousal/dominance)" | **parcialmente obsoleto**: `insightMetrics.js` (142 líneas) calcula VAD (`:116-120`) pero **no calcula PERCLOS**; PERCLOS solo aparece como referencia bibliográfica en el encabezado (`:12`). Ninguna función de `src/` la implementa (búsqueda 2026-08-27) |
| `normalizeGameEvent` L107-111 y `gameCorrelation.js` (271 líneas, v3) | **no re-leídos** en esta tarea (anclajes de intentos previos); ninguna celda clasificada de §10 depende de ellos, por lo que no se citan con línea exacta |
| Reglas R-6 del doc. §5 (decisionMaking `score:null`/descriptive; adaptabilidad `insufficient`; leadership/communication `not_measured`) | **en tensión con el código actual** (ola G, no commiteada): `originalGameTalentMapping.js` puntúa decisionMaking/adaptability/leadership/communication cuando `team_coordination` (Faro) está presente. Registrado como **ambigua/no resuelta — pendiente T.4** (no resuelto aquí, por instrucción) |

**Criterio de done T.1 (verificado 2026-08-27):** §10 existe en disco con las 7 subsecciones; cubre los 4 juegos (8+8+9+11 métricas), canales faciales/Edge AI (17 filas) y composite/feature vector (13 filas) = 66 métricas clasificadas, sin celdas vacías; toda cita tiene estado explícito (verificada / verificada-vía-web / verificación pendiente); cadenas constructo→demanda→conducta→telemetría→feature→regla→disponibilidad→narrativa presentes en las Tablas A+B de cada subsección.
