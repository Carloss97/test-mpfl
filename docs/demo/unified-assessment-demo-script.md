# KRUMM Unified Assessment Demo Script

**Objetivo:** presentar la demo local de KRUMM como una experiencia browser-local de evaluación gamificada asistida por señales observacionales, con reporte final para revisión humana.

**Duración sugerida:** 15-20 minutos.  
**Modo recomendado:** Demo rápida.  
**Ruta de producto:** cámara → signal readiness → consentimiento → batería demo → reporte final → historial local.

---

## 1. Principios de comunicación

### Decir siempre

- KRUMM combina desempeño en tareas gamificadas con señales observacionales de cámara local.
- Las señales son auxiliares y dependen de calidad de captura, iluminación, encuadre y cobertura.
- El reporte final resume evidencia agregada y caveats para revisión humana.
- La demo trabaja localmente en el navegador y no persiste crudos reconstructivos.
- El sistema no toma decisiones automáticas.

### No decir

- No decir que KRUMM reemplaza a una persona evaluadora.
- No decir que el sistema determina personalidad, salud, intención interna o verdad/falsedad.
- No prometer precisión poblacional sin estudio piloto y calibración con datos reales.
- No presentar emociones, estrés, fatiga, postura o mirada como verdades internas; son proxies observacionales con confianza y caveats.

---

## 2. Apertura en 60 segundos

Guion sugerido:

> “KRUMM es una prueba de concepto de evaluación gamificada local. La persona completa una batería breve de tareas cognitivas y visuomotoras, mientras el navegador estima señales observacionales como AUs/FACS, mirada, postura y hombros con MoveNet. El resultado no es una decisión automática; es un reporte estructurado para revisión humana, con calidad de señal, evidencia por juego y caveats.”

Puntos a mostrar:

1. Header de la app.
2. Controles de cámara.
3. Selector “Demo rápida / Evaluación estándar”.
4. Panel de Signal readiness.

---

## 3. Privacidad antes de iniciar

Guion sugerido:

> “La demo está diseñada con privacidad por construcción. No guardamos video, frames, landmarks crudos ni trayectorias de puntero. Lo que se usa para reporte son agregados: conteos, ratios, medias, métricas por juego, ventanas resumidas y calidad de señal.”

Mostrar:

- Copy de consentimiento.
- Fila “Privacidad” del Signal readiness panel.
- Si se abre el reporte final, sección de gobernanza/privacy.

---

## 4. Flujo paso a paso

### Paso 1 — Preparar cámara

1. Clic en `Iniciar cámara`.
2. Esperar 2-3 segundos.
3. Verificar FaceMesh y métricas.
4. Ajustar iluminación y encuadre.

Qué decir:

> “Primero verificamos captura. El sistema no inventa datos si falta una señal; lo reporta como pendiente, caveat o error.”

### Paso 2 — Elegir modo demo

1. En la batería unificada, seleccionar `Demo rápida`.
2. Explicar que conserva los mismos seis juegos, pero reduce duración y trials.

Qué decir:

> “El modo demo mantiene el orden de la batería estándar, pero acorta baseline, descansos, recovery y trials para reuniones.”

### Paso 3 — Signal readiness

Revisar:

- Cámara.
- FaceMesh.
- Rostro.
- Confianza facial.
- AUs/FACS.
- Gaze.
- Postura.
- MoveNet.
- Privacidad.

Qué decir si MoveNet no detecta hombros:

> “MoveNet necesita que ambos hombros entren en cuadro. Si no están visibles, continuamos con caveat; no se inventa la señal.”

### Paso 4 — Consentimiento

1. Clic en `Preparar evaluación`.
2. Leer el consentimiento corto.
3. Clic en `Acepto condiciones`.

Qué decir:

> “Este consentimiento resume el alcance de demo: cámara local, agregados privacy-safe y reporte para revisión humana.”

### Paso 5 — Baseline

1. Clic en `Iniciar baseline`.
2. Mantener postura estable.
3. Mirar al centro.
4. Clic en `Completar baseline`.

Qué decir:

> “El baseline ayuda a interpretar señales personales de reposo. Aun así, la sesión conserva caveats si la calidad no es suficiente.”

---

## 5. Qué decir en cada juego

| Juego | Qué evalúa operacionalmente | Frase sugerida |
|---|---|---|
| RT Simple | velocidad de respuesta básica | “Aquí medimos tiempo de reacción ante un estímulo simple.” |
| Precisión visomotora | precisión, trayectoria y control motor fino | “Esta tarea incorpora distancia, tamaño de objetivo y eficiencia de trayectoria.” |
| Seguimiento continuo | control visuomotor sostenido | “Aquí importa mantener seguimiento, no solo reaccionar rápido.” |
| Go/No-Go | inhibición de respuesta | “La clave es responder a GO y retener respuesta en NO-GO; una retención correcta ocurre por timeout, no por botón.” |
| Interferencia color-palabra | manejo de conflicto tipo Stroop | “La tarea separa lectura automática de respuesta por color.” |
| Búsqueda visual | atención selectiva y eficiencia de búsqueda | “Se observa cómo cambia desempeño con distractores y tamaño de conjunto.” |

---

## 6. Reporte final

Al terminar la batería:

1. Clic en generar reporte final.
2. Mostrar `FinalReportPanel`.
3. Cambiar tabs Markdown/HTML/JSON.
4. Mostrar botones de descarga.
5. Mostrar historial local.

Qué decir:

> “El reporte agrupa calidad de señal, resultados por juego, correlación cámara+tarea, perfil de habilidades observacionales y gobernanza. La lectura correcta es comparativa y humana, no automática.”

Secciones a señalar:

- Resumen ejecutivo.
- Calidad de señal.
- Perfil de habilidades.
- Resultados por juego.
- Correlación cámara+tarea.
- Gobernanza/privacidad.

---

## 7. Plan B si algo falla

### Cámara no inicia

1. Revisar permisos del navegador.
2. Cambiar dispositivo de cámara.
3. Recargar la página.
4. Mostrar reporte/historial local si existe.
5. Explicar que el smoke manual requiere navegador real con permisos.

### FaceMesh no detecta rostro

1. Mejorar iluminación frontal.
2. Centrar rostro.
3. Esperar 2-3 segundos.
4. Continuar solo con caveat si el objetivo de la reunión es mostrar flujo.

### MoveNet no detecta hombros

1. Alejarse de la cámara.
2. Asegurar hombros visibles.
3. Evitar encuadres demasiado cerrados.
4. Continuar con caveat si no es crítico para la reunión.

### Juegos toman demasiado tiempo

1. Confirmar `Demo rápida`.
2. Explicar que la batería estándar conserva mayor comparabilidad.
3. Avanzar al reporte si ya hay suficiente flujo demostrado.

---

## 8. Cierre de demo

Guion sugerido:

> “Lo que acabamos de ver es el flujo local end-to-end: readiness de señal, consentimiento, batería gamificada, reporte final y persistencia local. El siguiente paso para piloto no es aumentar claims, sino validar con usuarios reales, calibrar métricas, definir protocolo, revisar privacidad/legal y medir confiabilidad por dispositivo.”

Próximos pasos a mencionar:

- Ensayo manual en navegador real.
- Sesión sintética de fallback.
- Piloto controlado.
- Revisión legal/privacy.
- Validación psicométrica y de usabilidad.
