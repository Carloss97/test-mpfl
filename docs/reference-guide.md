# Guía de referencia — KRUMM Edge Fusion

Documentación de todos los indicadores con sus fuentes académicas y fórmulas de cálculo.

---

## Edge AI v8 — Pipeline bayesiano

El pipeline procesa AUs en 4 etapas. Cada etapa tiene un módulo independiente.

| Etapa | Módulo | Descripción |
|-------|--------|-------------|
| 1. AUs crudas | `gestureInsights.js` | `computeAUs()`: promedia blendshapes de MediaPipe sobre muestras con rostro |
| 2. Procesamiento | `auProcessor.js` | `processAllAUs()`: resta baseline (80%) + ganancia adaptativa (1.5-3.0×) |
| 3. Canales | `edgeAiEngine.js` | Bayesian scoring: log-likelihood por AU → sigmoide (k=8) → score 0-100% |
| 4. Emociones | `emotionClassifier.js` | Naive Bayes con softmax sobre 8 clases |

---

## Canales Edge AI

7 canales. Cada uno estima una dimensión cognitiva/emocional usando AUs específicas.

| Canal | AUs principales (ratio) | Referencia |
|-------|------------------------|------------|
| Carga Cognitiva | AU4 (3×), AU7 (3×), AU23 (2×) | Palinko et al. (2010) |
| Valencia Emocional | AU6 (4×), AU12 (4×) positivo; AU4 (0.2×) negativo | Russell (1980) |
| Control Motor | Simetría AU L/R | Fitts (1954) |
| Engagement | AU5 (4×), AU1 (2×), AU45 (0.15×) | D'Mello & Graesser (2012) |
| Estrés | AU23 (4×), AU4 (2.5×), AU9 (2.5×) | Giannakakis et al. (2017) |
| Fatiga | AU45 (5×), AU43 (3.5×), AU7 (2.5×) | Dinges et al. (1998) |
| Rendimiento | Accuracy, RT, completion (datos reales) | Posner (1978) |

---

## Emociones básicas

Clasificador Naive Bayes con softmax. 8 clases (7 emociones + neutral). Referencia: Ekman & Friesen (1978), Ekman (1992).

| Emoción | AUs principales (ratio) |
|---------|------------------------|
| Alegría | AU6 (6×), AU12 (6×) |
| Tristeza | AU15 (4.5×), AU4 (4×), AU1 (3×) |
| Sorpresa | AU5 (4×), AU1 (3.5×), AU2 (3.5×), AU26 (3.5×) |
| Miedo | AU5 (3×), AU20 (3×), AU1 (2.5×), AU7 (2.5×), AU4 (2×), AU2 (2.5×), AU26 (2×) |
| Enojo | AU4 (5×), AU23 (4×), AU7 (3.5×), AU5 (2×) |
| Disgusto | AU9 (7×), AU15 (3×), AU17 (3×) |
| Desprecio | Asimetría AU12 L/R, AU14 L/R |

---

## Métricas

Todas las métricas van de 0 (mínimo) a 1 (máximo). Calculadas desde AUs procesadas por `auProcessor.js`.

| Métrica | AUs usadas | Interpretación |
|---------|-----------|----------------|
| Carga Cognitiva | AU4, AU7, AU5, AU23 | >50%: esfuerzo mental elevado (Palinko 2010) |
| Tensión | AU4, AU7, AU23 | >50%: estrés o concentración forzada |
| Atención | AU45, AU5, presencia | >60%: atención sostenida (bajo parpadeo) |
| Fatiga (PERCLOS) | AU45, AU7, AU43 | >30%: detectable (Dinges 1998, Ji 2004) |
| Estrés | AU4, AU23, AU9, AU27 | >40%: elevado (Giannakakis 2017) |
| Calma | Inversa de tensión+estrés | >70%: estado relajado |
| Engagement | AU45, presencia, atención | >60%: comprometido (D'Mello 2012) |
| Aburrimiento | Engagement, AU45, presencia | >40%: posible aburrimiento |
| Valencia | AU6+12 vs AU4+15+9 | >0.5: positiva (Russell 1980) |
| Arousal | AU1, AU2, AU5, AU26 | >0.5: alta excitación (Mehrabian 1974) |

---

## Gaze Tracking

Estimación de dirección de mirada usando iris landmarks (índices 468-477).

| Componente | Descripción |
|-----------|-------------|
| Método | Centroide del iris vs centroide del ojo → vector de mirada |
| Suavizado | EMA (α=0.15) para reducir jitter |
| Precisión | ~2-5° error angular con webcam estándar |
| Métricas | screenFocusRatio, gazeStability, attentionScore |
| Visualización | Círculo amarillo/gris en el FaceMesh |

---

## Body Pose

Detección de postura corporal con MediaPipe Pose Landmarker (33 landmarks).

| Componente | Descripción |
|-----------|-------------|
| Modelo | pose_landmarker_lite.task (~5MB). GPU delegate |
| Métricas | postureScore, shoulderAngle, headForward, bodyStability |
| Visualización | Silueta corporal con 33 puntos + conexiones anatómicas |
| Referencia | MediaPipe Pose (Google Research, 2020) |

---

## Normalización

| Técnica | Módulo | Referencia |
|---------|--------|------------|
| Z-score | edgeCalibration.js | Welford (1962) |
| EMA suavizado | auEnhancer.js | Roberts (1959). α=0.35 |
| Platt Scaling | plattScaling.js | Platt (1999) |
| Lighting Adapter | lightingAdapter.js | Calibración 2-6s |
| Welford's Algorithm | temporalFeatures.js | Single-pass O(n) |

---

## Tecnologías

MediaPipe Face Landmarker (Google, 2023) · 478 landmarks + 52 blendshapes + iris tracking · React 19 + Vite 8 · Web Workers · IndexedDB · auProcessor + emotionClassifier (Naive Bayes) · edgeCalibration (z-scores) · MediaPipe Pose Landmarker