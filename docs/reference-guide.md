# Guía de referencia — KRUMM Edge Fusion

Documento sincronizado con la arquitectura multimodal actual.

## Edge AI v9.1 multimodal + game-aware

El pipeline sigue exportando `edge_ai_model_output_v8` para compatibilidad, pero el modelo interno es `krumm-edge-ai-v9.1.0-game-aware`.

| Etapa | Módulo | Descripción |
|---|---|---|
| Features comunes | `multimodalFeatures.js` | Une temporal features, AUs, emociones, gaze, postura, MoveNet, tarea y calidad. |
| AUs crudas | `gestureInsights.js` | Mapeo MediaPipe blendshapes → FACS/AUs proxy. |
| AUs procesadas | `auProcessor.js` | Baseline subtraction 60% + ganancia adaptativa; sin double boost. |
| Canales | `edgeAiEngine.js` | Bayes AU + `visualAttention` + `postureQuality` + canales game-aware explícitos. |
| Composite | `edgeAiEngine.js` | Promedio ponderado con polaridad negativa para carga cognitiva, fatiga y estrés. |

## Canales Edge AI

| Canal | Inputs principales | Caveat |
|---|---|---|
| Carga Cognitiva | AU4, AU7, AU23 + gaze/posture/task penalty | Alto reduce composite. |
| Valencia Emocional | AU6/AU12 vs AU4/AU15/AU9 | Proxy circumplex Russell. |
| Control Motor | Simetría AU L/R | Facial proxy, no motor clínico. |
| Engagement | AUs + visualAttention + postureQuality | Depende de gaze. |
| Estrés | AU4/AU23/AU9 + postura + gaze instability | Alto reduce composite. |
| Fatiga | AU45/AU43/AU7 + headForward + gaze instability | Alto reduce composite. |
| Atención Visual | gaze lookingAtScreen + confidence | Si gaze no está calibrado, baja confianza. |
| Calidad Postural | postureScore + MoveNet shoulder symmetry | MoveNet requiere hombros visibles. |
| Rendimiento | Accuracy, RT, completion | Solo cuando hay tarea. |
| Control inhibitorio | commission/omission error + post-error slowing | Solo con actividad Go/No-Go o equivalente. |
| Precisión visomotora | Fitts throughput + path efficiency + tracking loss | Separa precisión de RT simple. |
| Eficiencia búsqueda visual | searchEfficiency + errorRate + setSize | Depende de tarea Visual Search. |
| Resiliencia adaptativa | accuracy + completion + errores + deltas de correlación | Resume estabilidad bajo tarea. |

## Emociones básicas v2

| Emoción | Regla principal | Control anti-falso positivo |
|---|---|---|
| Neutral | Dominante si energía AU es baja | Evita forzar una emoción débil. |
| Alegría | AU12 requerido; AU6 refuerza | AU12 bajo penaliza felicidad. |
| Enojo | AU4 + AU7/AU23 | AU4 aislado no basta. |
| Sorpresa | AU1/AU2 + AU5/AU26 | Ojos o cejas aisladas se penalizan. |
| Miedo | Upper face + AU20/AU26 | AU5/AU4 aislados se penalizan. |
| Disgusto | AU9 dominante | Sin AU9 se reduce probabilidad. |
| Temporal | `emotionTemporalSmoother.js` | Exige frames estables antes de cambiar emoción. |

## Métricas v3 multimodales

Si no hay contexto multimodal, `computeInsightsFromAUs()` conserva fallback `au_only_v2`. Si hay gaze/postura/MoveNet, devuelve `provenance: multimodal_v3`.

| Métrica | Inputs | Interpretación |
|---|---|---|
| Atención | gaze focus + postura + AU45/AU5 + presencia | >60%: atención sostenida. |
| Fatiga | AU45/AU43/AU7 + headForward + gaze instability | Más alto = mayor fatiga observable. |
| Estrés | AU4/AU23/AU9/AU27 + postura + gaze + task error | Proxy de tensión, no diagnóstico. |
| Calma | Inversa ponderada de tensión/estrés/fatiga/postura | Más alto = menor tensión observable. |
| Engagement | atención + gaze + postura + shoulder symmetry | Más alto = más involucramiento visible. |
| Boredom | Inverso engagement + blink + gaze off-screen | Más alto = menor foco/actividad. |

## Gaze Tracking y calibración

| Componente | Método | Caveat |
|---|---|---|
| Baseline | Primeros 60 frames o botón “Calibrar mirada centro” | Debe mirar al centro durante calibración. |
| Coordenadas | delta iris-nose × SCALE=30 | No es eye tracker absoluto. |
| Suavizado | EMA α=0.12 | Reduce jitter, añade latencia leve. |
| Métricas | lookingAtScreen, confidence, distractionScore | Usado por atención/engagement. |

## Postura, cabeza y MoveNet

| Señal | Método | Uso |
|---|---|---|
| Head tilt | Ángulo oreja-oreja 234→454 | Inclinación lateral. |
| Head forward | AR baseline máximo; botón “Calibrar postura erguida” | Penaliza postura/fatiga. |
| Posture score | `1 - tilt*0.32 - forward*0.42 - asym*0.20 - instability*0.12` | Proxy facial de postura. |
| MoveNet | COCO17: hombros, codos, muñecas | shoulder symmetry, upperBodyCoverage, armsVisible, armActivity. |
| Sin fallback | No se estiman hombros con FaceMesh | Si no detecta: aléjate hasta ver ambos hombros. |

## Normalización y privacidad

| Técnica | Módulo | Estado |
|---|---|---|
| Z-score rolling | `edgeCalibration.js` | Normaliza canales. |
| Welford O(n) | `temporalFeatures.js` | Features temporales eficientes. |
| Sanitización | `samplePrivacy.js` | No guarda video/frames/landmarks crudos. |
| Payload compacto | `payload.js` | Omite bloque multimodal live. |

## Tecnologías

React 19 · Vite 8 · MediaPipe Face Landmarker · TF.js MoveNet Lightning · Web Workers para FaceLandmarker · IndexedDB · FACS/AUs proxy · Edge AI bayesiano multimodal local.

## Apéndice gamificado O-Q: dificultad, validación y exportación

Las fases O-Q cierran el ciclo experimental: la app ya no solo mide desempeño, sino que puede recomendar dificultad, validar escenarios sintéticos y exportar datasets agregados para análisis offline.

| Fase | Módulo | Algoritmo | Salida |
|---|---|---|---|
| O — Dificultad adaptativa | `tasks/adaptiveDifficulty.js` | Reglas monotónicas con evidencia `up/down` sobre accuracy, RT, completion, motor, inhibición, interferencia, búsqueda visual y carga cognitiva. | `adaptive_difficulty_recommendation_v1` con `previousLevel`, `nextLevel`, `direction`, `reasonCodes`, `snapshot`, `trace`. |
| P — Simulación | `telemetry/gameScenarioFixtures.js` | Fixtures deterministas: buen control motor, fatiga, estrés/error, distracción y mejora por práctica; cada escenario alimenta Edge AI + vector v2 + dificultad. | Validación direccional de canales (`cognitiveLoad`, `fatigueIndex`, `visualAttention`, `visuomotorPrecision`) y recomendación adaptativa. |
| Q — Export investigación | `telemetry/researchExport.js` | Construcción de registros por trial a partir de `gameCorrelation.trials` + `assessment_feature_vector_v2`; IDs de trial se hashean. | Dataset `krumm_research_export_v1`, JSONL y CSV con columnas `feature.*`. |

## Algoritmos y fórmulas O-Q

| Algoritmo | Fórmula / regla | Justificación |
|---|---|---|
| Subir dificultad | `up >= down + 2`, con evidencia por `accuracy >= 0.85`, `completion >= 0.90`, RT rápido, motor estable, baja inhibición, baja carga. | Evita subir por una sola señal aislada; exige convergencia de desempeño y control. |
| Bajar dificultad | `down >= up + 2`, con evidencia por `accuracy <= 0.55`, completion baja, RT lento, motor débil, errores inhibitorios/interferencia alta, `cognitiveLoad >= 75`. | Reduce dificultad cuando el desempeño cae o aparece sobrecarga observable. |
| Mantener dificultad | Si no hay margen de 2 puntos entre evidencia `up/down`. | Control anti-oscilación; equivale a histéresis discreta. |
| Validación sintética | Comparar dirección esperada por escenario: buen control debe subir; estrés/error debe subir carga y bajar inhibición; distracción baja atención; práctica mejora vector. | Prueba de sanidad antes de usar datos reales; reduce riesgo de fórmulas invertidas. |
| Export JSONL/CSV | Un registro por trial: `runId`, `trialIndex`, `gameId`, `outcome`, `correct`, `reactionTimeMs`, `feature.*`. | Compatible con análisis offline sin reconstruir cursor, rostro o estímulos. |

## Referencias metodológicas O-Q

| Tema | Referencia | Uso en KRUMM |
|---|---|---|
| Dificultad adaptativa | Flow theory / challenge-skill balance (Csikszentmihalyi) + computerized adaptive testing | Subir dificultad solo cuando habilidad observada supera la demanda; bajar ante sobrecarga. |
| Control inhibitorio | Go/No-Go y post-error slowing en psicología cognitiva | `commissionErrorRate`, `omissionErrorRate`, `postErrorSlowingMs`. |
| Precisión visomotora | Fitts, P. M. (1954), speed-accuracy tradeoff | `ID = log2(D/W + 1)` y throughput para Precision Targeting. |
| Búsqueda visual | Treisman & Gelade (1980), Feature Integration Theory | `setSize`, distractores y `searchEfficiency`. |
| Tracking continuo | Smooth pursuit / visuomotor tracking | RMS error, pérdida de seguimiento y smooth pursuit score. |
| Export privacy-safe | Data minimization / privacy by design | Exportar agregados y feature vectors, nunca video, frames, landmarks, raw events ni pointer paths. |

## Experiencia evaluativa unificada R-X

Las fases R-X convierten las mediciones A-Q en una experiencia completa: batería guiada, sesión consolidada, perfil de talento, payload final, reporte humano y entrega local/futura.

| Fase | Módulo principal | Función | Privacidad/gobernanza |
|---|---|---|---|
| R — Runtime batería | `assessment/batteryRuntime.js` | Orquesta consentimiento, cámara, baseline, bloques, descansos, recovery y finalización. | No almacena señales crudas; solo timeline de estados. |
| S — Flujo participante | `assessment/UnifiedGameBattery.jsx` | Muestra progreso, instrucciones, consentimiento y estados finales sin reemplazar el selector manual. | Modo assessment requiere cámara; modo manual sigue disponible. |
| T — Sesión unificada | `assessment/assessmentSession.js` | Consolida batería, `gameSummary`, `gameCorrelation.aggregate`, Edge AI, vector v2, dificultad y calidad. | Valida ausencia de video, frames, landmarks, pointer paths y raw events. |
| U — Perfil talento | `assessment/talentProfile.js` | Mapea agregados a 10 habilidades observacionales con score, confianza, evidencia y caveats. | Solo revisión humana; sin decisión automática. |
| V — Payload final | `assessment/finalAssessmentPayload.js` | Empaqueta quality, behavioral, talentProfile y Edge AI para reporte. | `humanReviewOnly`, `noAutomatedDecision`, `privacySafe`. |
| W — Reporte humano | `assessment/talentReportGenerator.js` | Genera Markdown, HTML y JSON con portada, resumen, habilidades, caveats y apéndice. | Lenguaje observacional; no recomienda contratar/rechazar. |
| X — Entrega | `assessment/reportSubmissionClient.js` | Crea bundle local y cliente HTTP futuro para enviar/describir reportes. | Valida payload antes de descargar o enviar. |

## Reporte final y lectura humana

El reporte final está diseñado para personas evaluadoras: resume evidencia, limita inferencias y explicita calidad de señal.

| Sección | Contenido | Uso recomendado |
|---|---|---|
| Resumen ejecutivo | Fortalezas, áreas a revisar y confianza global. | Primera lectura rápida, siempre con caveats. |
| Calidad de señal | Muestras, presencia facial, confianza, trials correlacionados. | Determina si la sesión es interpretable. |
| Perfil de habilidades | 10 dimensiones: velocidad, precisión, atención, inhibición, interferencia, búsqueda, adaptabilidad, consistencia y regulación. | Comparar evidencia, no usar como dictamen automático. |
| Resultados por juego | Accuracy, RT, score, search efficiency y métricas conductuales. | Ubicar qué actividad sostiene cada conclusión. |
| Correlación cámara+tarea | Deltas agregados de reacción/postura/presencia facial. | Contextualizar desempeño bajo tarea sin raw windows. |
| Gobernanza | Declaración de revisión humana, sin decisión automática y sin export crudo. | Marco de uso responsable y privacy-by-design. |

## Revisión retroactiva A-X

Resumen del avance acumulado: la app pasó de medir AUs/FACS y señales multimodales a una batería evaluativa completa con reporte final privacy-safe.

| Bloque | Estado | Resultado práctico |
|---|---|---|
| A-I Juegos | Completado | RT, precisión/Fitts, tracking, Go/No-Go, Stroop y Visual Search accesibles manualmente. |
| J-K Correlación/vector | Completado | Ventanas pre/reaction/post/recovery y `assessment_feature_vector_v2`. |
| L Edge AI | Completado | Canales game-aware v9.1: inhibición, precisión visomotora, búsqueda visual y resiliencia. |
| M-N UI/payload | Completado | Panel de sesión, baseline/delta y reportes base agregados. |
| O-Q Validación/export | Completado | Dificultad adaptativa, escenarios sintéticos y export JSONL/CSV de investigación. |
| R-X Assessment final | Completado | Batería guiada, sesión unificada, perfil de talento, payload final, reporte y bundle de entrega. |
