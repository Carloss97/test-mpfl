# KRUMM Edge Fusion PoC

Implementación separada para validar la tarea del PDF `Creación de Empresa HR-Tech con IA - Google Gemini.pdf` antes de integrarla en el proyecto HR principal.

## Qué valida

1. MediaPipe Face Landmarker en navegador con blendshapes FACS.
2. Procesamiento en Web Worker para no bloquear el hilo principal del juego.
3. Captura de telemetría de mouse cada ~16ms.
4. Cálculo de cinemática: velocidad, aceleración, eficiencia de trayectoria y desviación RMS.
5. Calibración local inicial de microgestos con banderas de calidad.
6. Tres tareas instrumentadas para asociar resultados con expresiones:
   - `precision_targeting`: precisión visomotora con objetivo móvil.
   - `color_interference`: tarea tipo Stroop; responder color de tinta, no palabra.
   - `response_inhibition`: Go/No-Go para errores de comisión/omisión e inhibición motora.
7. Correlación tarea-señal: `task_shown` -> `task_response`, reaction time, resultado, ventana pre-tarea, respuesta y post-evento.
8. Agregación por tarea, por outcome (`correct`, `incorrect`, `commission_error`, etc.) y ajuste post-error.
9. `assessment_feature_vector_v1`: vector numérico privacy-safe para modelos ONNX/TFJS.
10. `edge_runtime_input_v1`: contrato de tensor estable para adaptadores `onnxruntime-web` o TensorFlow.js.
11. Modelo Edge local explainable-rules PoC con salida `edge_local_model_output_v1`.
12. Exportación de un JSON compacto con agregados únicamente.

## Privacidad

La PoC no guarda:

- video crudo;
- frames/base64;
- landmarks faciales completos;
- trayectoria cruda del mouse;
- eventos DOM crudos;
- nodos DOM o pantalla del usuario.

El payload conserva agregados, conteos, métricas resumidas, caveats, feature vectors numéricos y banderas de calidad. La salida del modelo está marcada como `humanReviewOnly`, `noAutomatedHiringDecision` y `observationalSignalsOnly`.

## Tareas instrumentadas

### Precisión visomotora

El usuario hace clic en un objetivo móvil. Se mide:

- reaction time por trial;
- eficiencia de trayectoria;
- desviación RMS;
- aceleración máxima;
- delta de microgestos durante la respuesta.

### Interferencia color-palabra

El usuario debe elegir el color de la tinta, ignorando la palabra escrita. Se mide:

- acierto/error;
- reaction time;
- microgestos durante conflicto cognitivo;
- contraste de expresiones entre respuestas correctas e incorrectas.

### Go/No-Go inhibición motora

El usuario pulsa solo ante estímulos GO y debe inhibirse en NO-GO. Se mide:

- acierto GO;
- inhibición correcta NO-GO;
- errores de comisión (`commission_error`);
- errores de omisión (`omission_error`);
- secuencias post-error para estimar ajuste posterior.

## Modelo Edge local actual

El modelo actual es deliberadamente explicable y conservador:

- `microgesture_window_v1`: agrega proxies de ceja, mandíbula, ojos y presión de boca.
- `microgesture_calibration_v1`: baseline local de los primeros segundos de cámara.
- `task_signal_correlation_v1`: cruza eventos de tarea con deltas faciales, resultados y cinemática de mouse.
- `aggregate.byTask`: resumen por tarea.
- `aggregate.byOutcome`: resumen por resultado (`correct`, `incorrect`, `commission_error`, `correct_withhold`, etc.).
- `aggregate.postErrorAdjustment`: compara el trial posterior a un error contra el trial fallido.
- `assessment_feature_vector_v1`: feature order estable + `featureArray` para modelos calibrados.
- `edge_runtime_input_v1`: puente para ONNX/TFJS con tensor `float32`, dims `[1, N]` y guardas de privacidad.
- `edge_local_model_output_v1`: genera señales auditables:
  - activación acoplada a tarea;
  - estabilidad de input;
  - confianza/caveats.

No es un modelo psicométricamente calibrado ni toma decisiones de contratación. Es una capa de validación técnica para después reemplazar o complementar con ONNX/TFJS calibrado offline.

## Comandos

```bash
npm install
npm test
npm run build
npm run dev -- --host 127.0.0.1
```

Luego abre `http://127.0.0.1:5173/`.

## Uso manual

1. Selecciona una cámara en el selector `Cámara` si tienes más de una. Usa `Actualizar cámaras` después de conceder permisos para ver nombres reales.
2. Pulsa `Iniciar cámara` y concede permiso.
3. Espera a que el estado de MediaPipe pase a `ready`.
4. En `Tareas instrumentadas`:
   - haz clic varias veces en el objetivo de precisión;
   - responde varios ensayos de interferencia color-palabra;
   - en Go/No-Go pulsa solo en `GO`; en `NO-GO` no pulses nada y deja que el timeout registre la inhibición.
5. Pulsa `Recalcular modelo` si quieres forzar actualización inmediata.
6. Revisa `Modelo Edge local`, especialmente `Asociación resultado ↔ expresiones`, `Post-error adjustment` y `Feature vector`.
7. Revisa el panel JSON o pulsa `Exportar JSON`.
8. En consola también se imprime un payload agregado cada 5 segundos y otro en cada interacción.

## Notas técnicas

- El modelo usado es `MediaPipe Face Landmarker` vía `@mediapipe/tasks-vision`.
- Los WASM de MediaPipe se sirven localmente desde `public/mediapipe/wasm` para evitar fallos de bootstrap tipo `ModuleFactory not set` por CDN/worker.
- La PoC usa delegado CPU por defecto dentro del Web Worker, más estable entre navegadores; se puede reactivar GPU luego como opción experimental.
- Los blendshapes de ojo (`eyeWide*`, `eyeSquint*`, `eyeBlink*`) se usan como proxies oculares. MediaPipe no expone una métrica literal llamada "tensión de pupila".
- La correlación con tareas usa eventos metadata-only (`task_shown`, `task_response`) y no conserva eventos DOM crudos.
- `src/telemetry/edgeRuntimeAdapter.js` deja listo el contrato para enchufar `onnxruntime-web` o TensorFlow.js sin cambiar el feature vector.
- Para integrarlo después en KRUMM, el payload generado puede mapearse al esquema de telemetría segura del proyecto principal sin enviar video ni landmarks.
