# Guía de referencia — KRUMM Edge Fusion

Documento sincronizado con la arquitectura multimodal actual.

## Edge AI v8.1 multimodal

El pipeline sigue exportando `edge_ai_model_output_v8`, pero el modelo interno es `krumm-edge-ai-v8.1.0-multimodal`.

| Etapa | Módulo | Descripción |
|---|---|---|
| Features comunes | `multimodalFeatures.js` | Une temporal features, AUs, emociones, gaze, postura, MoveNet, tarea y calidad. |
| AUs crudas | `gestureInsights.js` | Mapeo MediaPipe blendshapes → FACS/AUs proxy. |
| AUs procesadas | `auProcessor.js` | Baseline subtraction 60% + ganancia adaptativa; sin double boost. |
| Canales | `edgeAiEngine.js` | Bayes AU + `visualAttention` + `postureQuality` + ajustes gaze/postura/MoveNet. |
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
