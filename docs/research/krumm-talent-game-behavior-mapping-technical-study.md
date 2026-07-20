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
