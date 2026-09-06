# Plan de mejora multimodal de algoritmos KRUMM Edge Fusion

> Estado vivo del plan. Actualizar después de cada fase implementada.

**Objetivo:** mejorar la interpretación de AUs/FACS/blendshapes, emociones, métricas, Edge AI, gaze, head pose y tronco superior usando una capa multimodal común.

**Arquitectura propuesta:** centralizar todas las señales disponibles en `multimodalFeatures.js`, después hacer que emociones, métricas y Edge AI consuman esa misma estructura en vez de leer señales aisladas. Las mejoras se harán en fases pequeñas, con tests y build en cada fase.

**Estado general:** Fases A-G completadas.

---

## Leyenda de estado

- `[x] Completado`: implementado, probado y documentado.
- `[~] En trabajo`: implementación iniciada, aún no completamente verificada o integrada.
- `[ ] Por implementar`: pendiente.
- `[!] Riesgo/decisión`: requiere evaluación o validación específica.

---

## Fase A — Capa común de features multimodales

**Estado:** [x] Completado

**Objetivo:** crear una estructura única que reúna AUs, features temporales, gaze, postura facial, MoveNet, tarea y calidad de captura.

**Archivos implementados:**
- Creado: `src/telemetry/multimodalFeatures.js`
- Creado: `src/telemetry/multimodalFeatures.test.js`
- Modificado: `src/telemetry/edgeAiEngine.js`
- Modificado: `src/App.jsx`

**Tareas:**
- [x] Crear `buildMultimodalFeatures()`.
- [x] Incluir AUs crudas y AUs procesadas.
- [x] Incluir `gaze`, `posture`, `upperBody`, `task`, `quality`.
- [x] Mantener compatibilidad con `edgeAiEngine.js` actual.
- [x] Tests unitarios con datos sintéticos.
- [x] Build y test focal.

**Resultado implementado:** `edgeAiEngine` usa `buildMultimodalFeatures()` como capa de entrada común y añade `multimodal` al output sin romper el contrato `edge_ai_model_output_v8`.

---

## Fase B — EmotionClassifier v2

**Estado:** [x] Completado

**Objetivo:** reducir falsos positivos y oscilación emocional con neutral gate, reglas FACS mínimas e histéresis temporal.

**Archivos implementados:**
- Modificado: `src/telemetry/emotionClassifier.js`
- Modificado: `src/telemetry/emotionClassifier.regression.test.js`
- Creado: `src/telemetry/emotionTemporalSmoother.js`
- Creado: `src/telemetry/emotionTemporalSmoother.test.js`
- Modificado: `src/App.jsx`

**Tareas:**
- [x] Agregar `expressionEnergy`/neutral gate antes del softmax.
- [x] Si energía < umbral: devolver neutral.
- [x] Agregar reglas mínimas por emoción.
- [x] Agregar histéresis temporal opcional.
- [x] Tests: reposo, AU4 leve, AU4 aislado, sonrisa, enojo combinado, sorpresa, spike temporal, cambio estable, timestamp duplicado.

**Resultado implementado:** el clasificador conserva `neutral` dominante con baja evidencia, penaliza emociones imposibles por una sola AU y exige combinaciones FACS mínimas. La histéresis vive fuera del clasificador puro (`emotionTemporalSmoother`) y se resetea al iniciar una nueva sesión de cámara.

---

## Fase C — Métricas v3 multimodales

**Estado:** [x] Completado

**Objetivo:** recalcular atención, fatiga, estrés, calma y engagement usando gaze + postura + MoveNet + tarea, no solo AUs.

**Archivos implementados:**
- Modificado: `src/telemetry/insightMetrics.js`
- Creado: `src/telemetry/insightMetrics.multimodal.test.js`
- Modificado: `src/App.jsx`

**Tareas:**
- [x] Atención = gaze focus + postura + blink + presencia.
- [x] Fatiga = blink/cierre ocular + headForward + gaze instability.
- [x] Estrés = tensión facial + postura + gaze instability + task error.
- [x] Calma = inversa ponderada de estrés/fatiga/inestabilidad.
- [x] Engagement = gaze + atención + postura + simetría de hombros.

**Resultado implementado:** `computeInsightsFromAUs()` ahora acepta contexto multimodal opcional. Si no se entrega contexto, conserva modo `au_only_v2`; si hay gaze/postura/MoveNet, devuelve `provenance: multimodal_v3` y usa esas señales en métricas cognitivas.

---

## Fase D — Edge AI v9 multimodal

**Estado:** [x] Completado

**Objetivo:** convertir Edge AI de AU-driven a multimodal, agregando canales `visualAttention` y `postureQuality`.

**Archivos implementados parcialmente:**
- Modificado: `src/telemetry/edgeAiEngine.js`
- Modificado: `src/telemetry/edgeAiEngine.test.js`

**Tareas:**
- [x] Agregar canales `visualAttention`, `postureQuality`.
- [x] Incorporar gaze/postura/MoveNet en engagement/fatigue/stress.
- [x] Recalcular `composite` con pesos explícitos por objetivo.
- [x] Agregar `confidence` y `caveats` por canal.
- [x] Mantener governance / human review only.

**Resultado implementado:** Edge AI v8.1 mantiene el schema `edge_ai_model_output_v8`, agrega canales multimodales, ajusta engagement/fatigue/stress cuando hay gaze/postura/MoveNet y usa composite ponderado donde carga cognitiva/fatiga/estrés tienen polaridad negativa. La migración nominal completa a v9 queda pendiente para una actualización coordinada de guía/payload/UI.

---

## Fase E — Calibración UX

**Estado:** [x] Completado

**Objetivo:** permitir calibración explícita de mirada al centro y postura erguida.

**Archivos implementados:**
- Modificado: `src/App.jsx`
- Modificado: `src/components/Dashboard.jsx`
- Modificado: `src/telemetry/gazeEstimator.js`
- Creado: `src/telemetry/gazeEstimator.test.js`
- Modificado: `src/telemetry/upperBodyPosture.js`
- Modificado: `src/telemetry/upperBodyPosture.test.js`

**Tareas:**
- [x] Botón “Calibrar mirada al centro”.
- [x] Botón “Calibrar postura erguida”.
- [x] Guardar calidad/estado de calibración en UI mediante `manualCalStatus`.
- [x] Mostrar feedback si no hay landmarks suficientes.

**Resultado implementado:** el usuario puede recalibrar mirada y postura sin recargar cámara. Gaze fija la relación iris-nariz actual como centro; postura fija el AR actual como baseline erguido.

---

## Fase F — MoveNet / tronco superior refinado

**Estado:** [x] Completado

**Objetivo:** mejorar detección real de hombros/codos/muñecas y usarla en postura y Edge AI.

**Archivos implementados:**
- Modificado: `src/telemetry/useMoveNet.js`
- Modificado: `src/telemetry/multimodalFeatures.js`
- Modificado: `src/telemetry/FaceMeshOverlay.js`
- Modificado: `src/components/Dashboard.jsx`
- Modificado: `src/components/Dashboard.signalVisibility.test.jsx`

**Tareas:**
- [x] Mejorar overlay de hombros/brazos.
- [x] Agregar `upperBodyCoverage` y `armActivity` al feature multimodal.
- [x] Usar `shoulderSymmetry` en la calidad postural de Edge AI.
- [x] Mostrar instrucción si MoveNet no detecta hombros: “aléjate hasta que ambos hombros entren en cuadro”.

**Resultado implementado:** MoveNet expone cobertura de tronco, brazos visibles y actividad de brazos. Dashboard muestra cobertura/brazos/actividad cuando detecta y guía de encuadre cuando no detecta hombros. La postura multimodal usa simetría de hombros vía `postureQuality`.

---

## Fase G — Guía y documentación

**Estado:** [x] Completado

**Objetivo:** mantener UI y documentación sincronizadas con los algoritmos reales.

**Archivos implementados:**
- Modificado: `src/components/ReferenceGuide.jsx`
- Modificado: `docs/reference-guide.md`
- Modificado: `docs/plans/multimodal-algorithm-improvement-plan.md`

**Tareas:**
- [x] Actualizar fórmulas reales.
- [x] Agregar caveats por proxy.
- [x] Documentar diferencias entre señales reales y estimadas.

**Resultado implementado:** la guía ya documenta Edge AI v8.1 multimodal, emociones v2, métricas v3, calibración gaze/postura, MoveNet real sin fallback geométrico y privacidad/payload compacto.

---

## Orden de prioridad

1. Fase A — capa multimodal común.
2. Fase B — EmotionClassifier v2.
3. Fase C — métricas multimodales.
4. Fase D — Edge AI v9.
5. Fase E — calibración UX.
6. Fase F — MoveNet refinado.
7. Fase G — documentación final.
