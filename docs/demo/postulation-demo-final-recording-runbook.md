# Runbook final de grabación — KRUMM Postulaciones

**Objetivo:** grabar una demo de 7–9 minutos clara para stakeholders, mostrando experiencia candidato, medición gamificada, reporte y revisión HR sin sobreafirmar validez.

## 1. Preparación

1. Cerrar otros Vite y confirmar que 5173 está libre.
2. Iniciar:

```bash
cd /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl
NODE_ENV=development npx vite --host 127.0.0.1 --port 5173 --strictPort
```

3. Abrir en pestañas, en este orden:
   - `http://127.0.0.1:5173/postulaciones-demo?battery=original`
   - `http://127.0.0.1:5173/postulaciones-demo?fixture=1&battery=original`
   - `http://127.0.0.1:5173/postulaciones-demo/hr`
4. Usar navegador a 100%, sin DevTools visibles en la captura.
5. Si se mostrará cámara: conceder permiso y seleccionar el dispositivo antes de grabar el gameplay.

## 2. Recorrido recomendado

### 0:00–0:50 — Propuesta y privacidad

Ruta: candidato original.

Mostrar:

- `KRUMM Postulaciones`.
- Duración `10–12 min`.
- Juegos primero, procesamiento local y reporte humano.
- Cámara opcional; sin decisión automática.

Narración sugerida:

> “KRUMM convierte la evaluación en una experiencia breve y gamificada. Cada actividad aporta métricas agregadas y el resultado se presenta como apoyo para revisión humana, no como una decisión automática.”

### 0:50–1:30 — Preparación de sesión

Click `Comenzar demo de postulación`.

Mostrar:

- cámara opcional;
- procesamiento local;
- posibilidad de continuar sin cámara;
- `Ver qué pasa detrás` brevemente y volver a cerrarlo.

Narración sugerida:

> “La cámara es opcional y se utiliza solo para calidad de captura y contexto. No se usa por sí sola para inferir talento y no se guarda video.”

Si falla: usar `Reintentar cámara` una vez; si persiste, continuar sin cámara y explicar el caveat.

### 1:30–4:50 — Cuatro juegos

No es necesario completar la batería entera durante la grabación. Mostrar la dinámica principal de cada juego y luego usar el fixture para el reporte.

1. **Puzzle láser** — planificación espacial, reglas y progresión de tres niveles.
2. **Globo de riesgo** — trade-off riesgo/recompensa y feedback inmediato.
3. **Rutas de pasajeros** — planificación bajo restricciones, energía y recursos.
4. **Brief de equipo** — coordinación estructurada, comunicación, liderazgo y adaptación; destacar el panel “Trabajo por detrás”.

Narración sugerida:

> “Cada juego mide conductas observables dentro de una tarea concreta. KRUMM conserva agregados como eficiencia, completitud y ajuste; no guarda la secuencia cruda de interacción.”

Para cambiar rápido de juego durante la grabación, usar un corte de edición. No modificar el runtime ni usar consola para saltar estados.

### 4:50–6:30 — Reporte final

Cambiar a la pestaña fixture original.

Mostrar:

- banner de datos sintéticos;
- `Integridad de archivos verificada · no implica validez psicométrica`;
- entorno de demostración colapsado, con métricas explícitamente no personales;
- resumen ejecutivo HR;
- ocho constructos con distintivo `Demo provisional`, scores y confianza;
- advertencia visible de scores no validados, sin baremos y no comparables entre personas;
- resultados de los cuatro juegos;
- observaciones de alcance y revisión humana;
- drawer técnico solo unos segundos.

Narración sugerida:

> “El reporte transforma métricas agregadas en una lectura preliminar y explicable. Los ocho constructos tienen cobertura de demo, pero requieren validación R-7 antes de comparar candidatos o establecer normas.”

No decir:

- “predice desempeño laboral”;
- “detecta personalidad/emoción/estrés”;
- “selecciona al mejor candidato”;
- “tiene validez psicométrica comprobada”.

### 6:30–8:00 — Dashboard HR

Cambiar a `/postulaciones-demo/hr`.

Mostrar:

- KPIs y filtros;
- cola cronológica sin ranking;
- selección de un perfil completo;
- ocho constructos, resultados por juego y preguntas de entrevista;
- perfil en progreso con métricas `Pendiente`.

Narración sugerida:

> “RR.HH. recibe una vista simple para revisar evidencia, caveats y preguntas de entrevista. Los perfiles no se ordenan por score y el sistema no recomienda contratar o rechazar.”

### 8:00–8:30 — Cierre

> “Esta versión demuestra el flujo completo y la arquitectura privacy-safe. El paso siguiente es validar contenido, confiabilidad y criterios externos con participantes reales antes de un piloto decisional.”

## 3. Fallbacks

- Cámara falla: continuar sin cámara; no reiniciar toda la demo.
- Gameplay toma demasiado: cortar tras mostrar una mecánica y usar fixture.
- Reporte real no disponible: usar exclusivamente `?fixture=1&battery=original` y mencionar que es sintético.
- Vite muestra cambios stale: detener el proceso completo, matar el child listener en 5173 y reiniciar con `--strictPort`.
- Nunca usar el HTML histórico de Downloads como fuente de verdad.

## 4. Checklist de cinco minutos antes de REC

- [ ] Vite único en 5173.
- [ ] Tres pestañas abiertas y precargadas.
- [ ] Fixture muestra cuatro juegos y ocho constructos.
- [ ] Dashboard abre con perfil completo seleccionado.
- [ ] Sin errores visuales, overlays ni scroll horizontal.
- [ ] Cámara/fallback probado.
- [ ] Grabador captura resolución y audio correctos.
- [ ] Notificaciones del sistema silenciadas.
