# T.6 — Documento de posiciones teóricas: qué se afirma en público vs qué queda interno

**Fecha:** 2026-09-03 (fase T, cierre).
**Entrada:**
- **T.1** (2026-08-27): matriz de trazabilidad v2, 66 métricas, §10 de `docs/research/krumm-talent-game-behavior-mapping-technical-study.md`. Distribución 3 directa / 22 adyacente / 14 ambigua-no resuelta / 27 interna. Cero métricas faciales "directa".
- **T.2** (2026-08-27): auditoría de sincronización local, sin bugs activos.
- **T.4** (2026-09-01, `t_9d0c7e7f`): 14 veredictos por métrica en `docs/research/krumm-t4-metric-verdicts-2026-09-01.md`.
- **T.5** (2026-09-03, `t_910c0a2d`, verificado en disco): mappings versionados + aplicados (labels, `descriptive_only`, canales renombrados con alias) + compatibilidad `assessment_feature_vector_v2`.
**Salida:** este documento — posiciones teóricas, superficies públicas vs internas, y lenguaje de reporte observacional/confidence-aware ya implementado. Nueve archivos de código y 5 superficies de producto verificadas en el working tree como evidencia.

---

## 1. Objetivo y alcance

T.6 cierra la cadena de decisiones de la fase T declarando, por escrito y de forma auditable:

1. **Qué afirmamos ante una persona postulante, un evaluador HR o un cliente-demo** (superficie pública) frente a **qué se queda como conocimiento interno** (documentación técnica, investigación, intención de constructo no respaldada).
2. **El lenguaje de reporte que usamos**: observacional, confidence-aware, `descriptive_only` por defecto, sin baremos, sin percentiles ni ranking.
3. **La regla no negociable**: una señal agregada puede ser *contexto técnico* (cámara, biométrica, canales faciales) o *evidencia de tarea* (desempeño en juegos), pero **ninguna se convierte por sí misma en inferencia de talento, personalidad, emoción, estrés, frustración o decisión de contratación** mientras no exista validación normativa (R-7).

Este documento no introduce claims nuevos. Codifica lo que ya está implementado en `originalGameTalentMapping.js`, `talentReportGenerator.js`, `PostulationReportScreen.jsx`, `PostulationReportSummary.js`, el HR dashboard y el FAQ de demo, y lo contrasta con el estudio técnico T.1 y los veredictos T.4.

---

## 2. Superficies públicas vs superficies internas

### 2.1 Superficies públicas (lo que una persona-línea externa puede ver)

| Superficie | Archivo | Tipo de claim permitido | Estado actual (verificado en working tree) |
|---|---|---|---|
| Landing postulación | `src/postulation-demo/postulationDemoCopy.js` + `PostulationLanding.jsx` | "Juegos breves, procesamiento local y reporte para revisión humana". Cámara **opcional**; sin ella no se reduce desempeño y la ausencia solo queda como observación de calidad. Sin medir/revelar/descubrir talento. | Coherente. "No se usa para inferir talento por sí sola." |
| Reporte de sesión/demo | `PostulationReportScreen.jsx`, `PostulationReportSummary.js` | Lectura **observacional**; scores de demo, "Sin baremos · no comparable"; chip "DEMO PROVISIONAL"; "no decisión automatizada"; per-constructo `availabilityLabel` + `caveats` + `demoExplanation`. | Coherente (labels aplicados por T.5). |
| Resumen ejecutivo HR | `getPostulationExecutiveSummary` (`PostulationReportSummary.js`) | Batería original → "lectura preliminar controlada"; "validar antes de comparar"; "no ranking automático ni decisión de selección"; cámara = calidad/contexto. | Coherente. |
| Dashboard HR | `PostulationHrDashboard.jsx` + `hrDashboardData.js` | Datos **sintéticos** (banner "Datos sintéticos"), "Score provisional · no percentil", caveats visibles, "Solo revisión humana", "Orden cronológico, no ranking", prompts de entrevista (no recomendación). | Coherente. El label de constructo en el dashboard hereda el nombre corto (p.ej. "Adaptabilidad") y el caveat por candidato aclara la lectura (p.ej. "Liderazgo observado en escenarios estructurados, no en interacción grupal real"). |
| Reporte exportable (Markdown/HTML/JSON) | `talentReportGenerator.js` | "Mapa de evidencia KRUMM — batería original": por constructo `Estado | Score | Confianza | Narrativa`; nota "No hay percentiles, normas, cortes ni ranking"; gobernanza human-review-only; apéndice con versiones y Edge AI. | Coherente. |
| FAQ de demo / runbook / guion | `docs/demo/demo-faq.md`, `postulation-demo-runbook.md` | Q&A explícito: "No decide", "señales observacionales/proxies", "sin cámara se caveatea", "precisión poblacional requiere piloto". Guion de cierre: "no aumentar claims, sino validar con usuarios reales". | Coherente. |
| Guía de referencia técnica (laboratorio) | `docs/reference-guide.md` | Documento interno de arquitectura Edge (canales, emociones, métricas) con caveats técnicos. | Interno; puede conservar lenguaje técnico (v2 del clasificador, "estrés proxy de tensión") con los caveats ya presentes. **Recomendación T.6:** alinear los nombres del glosario interno con los nombres de canal post-T.5 (`tensionSignal`, `recoveryContext`) para no re-introducir semántica prohibida en futuras citas. |

### 2.2 Superficies internas (conocimiento técnico/científico, NO exportable a persona-línea)

| Superficie | Archivo | Para qué sirve | Restricción |
|---|---|---|---|
| Estudio técnico de mapeo | `docs/research/krumm-talent-game-behavior-mapping-technical-study.md` | Trazabilidad constructo→demanda→conducta→telemetría→feature→regla→disponibilidad→narrativa; clasificación de evidencia por métrica; verificaciones bibliográficas. | Es **procedencia**, no validación. No citar sus hipótesis como hechos ante clientes. |
| Veredictos T.4 | `krumm-t4-metric-verdicts-2026-09-01.md` | Decisiones de disponibilidad/wording por métrica. | Alimenta el código; no es claim de producto. |
| Auditoría de sincronización | `local-signal-sync-audit.md` | Verificación de reloj/ventana (T.2). | QA técnico interno. |
| Matriz de validez de contenido R-7B | `krumm-r7b-content-validity-matrix.md` | Preparación del protocolo de validación. | Pre-validación; no publicado. |
| Código de mapeo/composites | `src/assessment/originalGameTalentMapping.js`, `talentProfile.js`, feature vectors | Fórmulas, ceiling de confianza, evidencia, caveats. | Implementación; la narrativa pública deriva de esta lógica, no al revés. |

---

## 3. Posiciones por constructo (público vs interno)

Cadena obligatoria (contrato R-6): `constructo → demanda de tarea → conducta observable → telemetría agregada → feature versionada → regla provisional → disponibilidad/confianza/caveats → narrativa para revisión humana`.

Columnas:
- **Public =** texto que el producto muestra (reporte/dashboard) y que podemos sostener ante un evaluador/cliente hoy.
- **Internal =** la intención de constructo o la limitación científica que **no** se traduce en la puntuación pública y no debe exportarse como hecho.

| Constructo | Public (reporte/dashboard, vía T.5) | Internal (lo que NO afirmamos) | Estado `availability` (verificado `originalGameTalentMapping.js`) |
|---|---|---|---|
| `problemSolving` | "Índice provisional de desempeño en resolución de problemas dentro de tareas con reglas explícitas y planificación de restricciones." | No es capacidad de resolución de problemas laboral general. | `provisional_score`, ceiling 0.60 |
| `planning` | "Índice provisional de planificación bajo restricciones dentro de Passenger Routes." | No planificación ejecutiva general (funciones separables — Miyake 2000 no colapsa en un score). | `provisional_score`, ceiling 0.60 |
| `analyticalThinking` | "Índice provisional de análisis de reglas, rutas y restricciones; no equivale a capacidad analítica laboral validada." | No inteligencia/razonamiento general. | `provisional_score`, ceiling 0.60 |
| `riskFeedbackProfile` | "Índice provisional de estrategia riesgo/feedback dentro de Balloon… no mide personalidad ni tolerancia a la frustración." | No tolerancia a frustración, no personalidad, no valencia normativa (una mayor exposición al riesgo no es "mejor"). | `provisional_score`, ceiling 0.55; caveats `frustration_tolerance_not_measured`, `risk_index_not_personality_trait` |
| `decisionMaking` | "Se reporta evidencia agregada de decisión estructurada… como lectura descriptiva; una mayor exposición al riesgo o una ruta específica no se convierte en 'mejor' toma de decisiones." | Sin dirección normativa. No punto de corte entre "buena" y "mala" decisión. | `descriptive_only`, score `null`, confianza ≤ 0.20 (T.4 #11) |
| `adaptability` | "Respuesta a cambios controlados en el brief de equipo… señal descriptiva de sesión única; no se puntúa adaptabilidad sin cambios de regla/entorno validados." | `insufficient` por defecto sin Faro; con Faro se degrada a descriptivo (T.4 #4/#12). No flexibilidad cognitiva validada (Miyake 2000). | `insufficient` sin Faro / `descriptive_only` score `null` con Faro (T.4 #4/#12) |
| `leadership` | "Liderazgo (estructurado): índice provisional de juicio social en micro-situaciones… no reemplaza evaluación grupal ni observa dirección social real." | No liderazgo interpersonal/interacción grupal (Arthur et al. 2003 exige interacción real). | `not_measured` sin Faro / `provisional_score` ceiling 0.55 con Faro + caveat `structured_scenario_not_group_interaction` (T.4 #13) |
| `communication` | "Comunicación (estructurada): índice provisional de claridad de contexto, pasos accionables y uso de feedback en opciones estructuradas, sin guardar texto libre ni habla en vivo." | No comunicación expresiva real (Thornhill-Miller et al. 2023: constructo amplio 4Cs). | `not_measured` sin Faro / `provisional_score` ceiling 0.55 con Faro + caveat `structured_choices_no_free_text_or_live_speech` (T.4 #14) |

**Regla de reporting de score:**
- `provisional_score` → muestra el número 0–100 con chip "DEMO PROVISIONAL" + "Sin baremos · no comparable" (verificado `PostulationReportScreen.jsx:74-78`).
- `descriptive_only` → **no numera**; muestra "Descriptivo" / score `null` (verificado `getScoreLabel` en `PostulationReportSummary.js`).
- `insufficient` / `not_measured` → "Evidencia insuficiente" / "No medido", nunca 0 ni 50 neutral (verificado `formatPostulationScore`, `AVAILABILITY_LABELS`).
- `score: null` se renderiza siempre como "No medido"/"No disponible", nunca 0 (regla pitfall #72 / `talentReportGenerator.js` `scoreLabel`).

---

## 4. Posición sobre señales faciales/cámara/biometría

**Posición pública (implementada y verificada):**

1. La cámara es **opcional**; su ausencia no reduce el desempeño de los juegos y solo queda como observación de calidad (`postulationDemoCopy.js`).
2. Las señales faciales/corporales (`AU/FACS`, presencia, confianza de captura, gaze, postura, MoveNet) son **contexto técnico y calidad de captura**, no inferencia directa de talento, personalidad, emoción, estrés, fatiga o sinceridad.
3. `observationalOnly`, `humanReviewOnly`, `noAutomatedDecision`, `privacySafe` en el framework (`originalGameTalentMapping.js` `governance` y final payload).

**Posición interna (no exportada como hecho):**

- Barrett et al. (2019): los movimientos faciales no son inferencia de estado emocional interno; KRUMM los usa solo como **categorización de expresión observada** (clase FACS), con `neutral` de evidencia débil y caveat.
- Los canales faciales del Edge AI son proxies de **tensión facial** y **contexto de recuperación**, nombres ya aplicados en `edgeAiEngine.js` (v9.2.0): `stressResponse → tensionSignal`, `adaptiveResilience → recoveryContext`, con alias de compatibilidad (`:20-21,42-56`). La narrativa: "configuraciones faciales de tensión observadas; no es estrés".
- `insightMetrics.js` menciona PERCLOS en su encabezado pero **no lo implementa** (discrepancia §10.7.3 T.1); ningún canal se presenta como fatiga validada por blink.
- Ninguna métrica facial clasifica evidencia "directa" en T.1; cámara = context/quality-only.

---

## 5. Alineación del glosario interno con las reglas (post-T.5)

Para evitar que material interno re-introduzca semántica prohibida en citas o presentaciones futuras:

| Término interno legacy | Término post-T.5 / recomendado | Regla que resuelve |
|---|---|---|
| `stressResponse` (canal Edge AI) | `tensionSignal` · "Señal de tensión facial" | · Prohibido inferir estrés (Barrett 2019); · T.4 #7 degradó a contextual. |
| `adaptiveResilience` (canal Edge AI) | `recoveryContext` · "Contexto de recuperación" | · Prohibido inferir adaptabilidad (T.4 #9, R-6 `insufficient`). |
| "Resiliencia adaptativa" (dashboard técnico legacy) | "Recuperación tras errores (contexto)" | · Ídem anterior. |
| "Estrés" como canal (guía técnica) | "Tensión facial (proxy, no estrés)" | · Observational; no diagnóstico. |
| "Emoción" (clasificador NB) | "Expresión (clase FACS/observada)" | · Clasificación de expresión ≠ estado interno (Ekman & Friesen 1978; T.4 #10 re-encuadre). |
| `team.score` global | **deprecated / no usado** en reporte ni dashboard | T.4 #6 desactivó el score global del juego (Miyake 2000: no colapsar EF separables en un único score). |
| "Adaptabilidad 78 (confianza 55%)" (reporte legacy) | Estado descriptivo / score `null` con caveat | T.4 #12 + G1-L08 resuelto. |
| "Liderazgo" / "Comunicación" (sin modificador) | "Liderazgo (estructurado)" / "Comunicación (estructurada)" | T.4 #2/#3/#13/#14 + Arthur 2003 / Thornhill-Miller 2023. |

---

## 6. Lenguaje de reporte: reglas reviewables

Estas reglas son el criterio de aceptación para cualquier claim futuro (gates de fase T / R-7 **G**):

1. **Observacional primero**: describir lo que se observó (señal, tarea, calidad), no lo que la persona "es".
2. **Confianza por constructo**, no global, para la batería original (evita mezclar perfil DG legacy con juegos originales — implementado en `talentReportGenerator.js`).
3. **Sin baremos, sin percentiles, sin cortes, sin ranking**: cualquier 0–100 se acompaña de "Demo provisional" + "Sin baremos · no comparable" y la nota "no aptos para comparar personas".
4. **`score: null` ≠ 0**: ausencia de evidencia = `not_measured` / `insufficient` / `descriptive_only`, nunca desempeño bajo.
5. **Cámara/biometría = calidad/contexto**: nunca inferir rasgos desde señal facial/fisiológica.
6. **Sin fortalezas/áreas de atención** para el framework provisional sin normas y criterios validados (`classification.strengths = null`, `watchAreas = null` — verificado `originalGameTalentMapping.js:412-416`).
7. **Decisiones/feedback `descriptive_only`** hasta validación normativa (R-7): una mayor exposición al riesgo o una ruta con más replanteos no es "mejor" ni "peor".
8. **Human-review-only / no automated decision / observationalOnly / privacySafe** presentes en todo reporte final y gobernanza.
9. **Procedencia ≠ validación**: la matriz XLSX y el estudio técnico son contexto metodológico, no evidencia de validez.
10. Para no-técnicos los caveats se explican ("Por qué aparece así / Cómo volverlo medible" — `PostulationReportSummary.js` `CONSTRUCT_DEMO_EXPLANATIONS`).

---

## 7. Qué puede decidirse ya y qué requiere R-7/validación

**Ya decidido y auditable (estado post-T.5, verificado en tests y disco):**
- 4 constructos `provisional_score` con ceiling y narrativa: problemSolving, planning, analyticalThinking, riskFeedbackProfile.
- 2 estructurados con modificador y ceiling 0.55: leadership, communication (solo con Faro).
- 2 `descriptive_only` / score `null`: decisionMaking, adaptability.
- Canales faciales renombrados/alineados (`tensionSignal`, `recoveryContext`).
- `team.score` deprecated.
- Reporte/página con labels, caveats y advertencias de no-baremo/no-comparación.
- Cámara opcional con caveat de calidad; sin ella no se reduce desempeño.

**Se mantiene interno / pendiente de validación (R-7, protocolo `docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md`):**
- Normas, percentiles, cortes, ranking y fortalezas/watch areas.
- Confiabilidad test–retest y formas paralelas (R-7D).
- Validez convergente/discriminante (R-7E) y de criterio (R-7F).
- Fairness/invarianza/dispositivo/browser (R-7G).
- La decisión de batería productiva (R-7H) NO se deriva de T.6.
- Verificación pendiente de 2 citas secundarias (Cohn 2007; D'Mello & Graesser 2012), no bloqueantes (nota §10.7.2 T.1).

---

## 8. Evidencia de verificación (working tree, 2026-09-03)

- `src/assessment/originalGameTalentMapping.js` — labels/availability/narrativas por constructo; `governance` flags; `classification.strengths=null`.
- `src/assessment/talentReportGenerator.js` — mapa de evidencia, sin baremos/ranking, gobernanza, apéndice de versiones.
- `src/postulation-demo/PostulationReportScreen.jsx` — chip "Demo provisional", "Sin baremos · no comparable", caveats, banner batería original en validación.
- `src/postulation-demo/PostulationReportSummary.js` — `AVAILABILITY_LABELS`, `CONSTRUCT_DEMO_EXPLANATIONS`, `getScoreLabel` (descriptive → "Descriptivo", null → "No medido"), resumen ejecutivo.
- `src/postulation-demo/hr-dashboard/PostulationHrDashboard.jsx` + `hrDashboardData.js` — datos sintéticos, "Score provisional · no percentil", prompts de entrevista, no-ranking.
- `src/postulation-demo/postulationDemoCopy.js` — cámara opcional, contexto no inferencia.
- `src/telemetry/edgeAiEngine.js` — `MODEL_VERSION = 'krumm-edge-ai-v9.2.0-game-aware'`; alias `tensionSignal`/`recoveryContext`; caveat `facial_tension_not_stress_inference`.
- `src/assessment/talentProfile.js` — mapeo con alias `channel(edgeAI, 'tensionSignal', 50, 'stressResponse')` (compatibilidad).
- `docs/demo/demo-faq.md` — claims públicos conservadores.
- Gates de la fase: suite T.5 279 tests verdes (confirmado 2026-09-03), oxlint 0, build OK, audit 0 vuln, `git diff --check` limpio. Focales re-verificados hoy: 4 archivos / 21 tests GREEN (originalGameTalentMapping, talentReportGenerator, talentProfile, PostulationReportScreen).

*Generado por el orquestador autónomo KRUMM (fase T, tarea t_33755b79). Codifica estado ya implementado por T.4/T.5; no introduce claims nuevos ni cambios de código.*