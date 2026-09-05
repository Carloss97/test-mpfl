# Plan de implementación — Tangram EXP-TANGRAM-001 (Ensamblaje Geométrico)

**Fecha:** 2026-09-04
**Repo:** `/home/sarlock/krumm/test-mpfl`
**Fuente:** `DOCUMENTO_1_ESPECIFICACION_TECNICA_Y_PSICOMETRICA_Tangram.pdf` + `DOCUMENTO_2_DISENO_Y_CONTENIDO_UI-UX_Y_REGLAS_Tangram.pdf`

## Objetivo

Implementar el módulo psicométrico **Tangram Modular** (EXP-TANGRAM-001) como nueva
experiencia gamificada en la batería original de `/postulaciones-demo`, siguiendo el
patrón de juegos originales existente (LaserPuzzle/Balloon/Passenger), con TDD
(RED→GREEN→gates), agregados con allowlist-only, y copia ES/EN según las plantillas.

## Referencia rápida de la especificación

- **Dominio:** Planificación ejecutiva, flexibilidad cognitiva, tolerancia a frustración/presión temporal.
- **Base teórica:** Tangram Spatial Task / Mental Rotation (Shepard & Metzler).
- **Interacción:** arrastrar + rotar (45°/paso) + snap-to-grid (±8px) + reset (doble clic).
- **Segmentos:** Nivel 0 tutorial (is_tutorial:true, sin puntaje) + Niveles 1-4 evaluativos.
- **Matriz de dificultad:**
  | Nivel | Piezas | Tiempo | Movimientos | Propósito |
  |-------|--------|--------|-------------|-----------|
  | 1 Calibración | 4 | 60s | ∞ | línea base motora |
  | 2 Planificación | 5 | 45s | óptimo+2 | planificación vs impulsividad |
  | 3 Presión tiempo | 6 | 30s | ∞ | tolerancia frustración / jitter |
  | 4 Carga crítica | 7 | 35s | óptimo+3 | priorización ejecutiva |

- **Metricas conductuales:** initial_latency_ms, trajectory_efficiency_ratio, hesitation_time_ms,
  move_overhead_count, jitter_index_last_10s. Biométricas (edge AI) consolidadas aparte.
- **Eventos crudos (parciales):** LEVEL_START, INPUT_POINTER_DOWN, INPUT_ROTATE, PIECE_SNAP_SUCCESS.

## Enfoque de privacidad / agregados

- NO persistir rutas crudas, raw pointer paths, snapshots, posiciones por evento ni secuencias
  acción-por-acción. Solo métricas agregadas por nivel y por sesión.
- Eventos crudos solo en `raw_series` efímero de diagnóstico local, no persistido ni exportado.
- Agregado allowlist: `tangramModel` aggregate schema v1.
- Abstracción de niveles en polígonos: la "silueta" = conjunto de polígonos objetivo;
  la validación de encaje usa snapping por vértice dentro de tolerancia (motor geometry-lite,
  sin depender de bibliotecas externas).

## Tareas

1. **Telemetría/tipos**: `src/tasks/original-games/tangramTelemetry.js` + tests
   - buildTangramLevels, buildTangramGeometries, sanitizeTangramPayload,
   - validateSnap / checkPieceOverlap / computeTangramMetrics,
   - agregado por nivel y por sesión (métricas conductuales).
2. **Feedback/verificación**: `tangramFeedback.js` + tests (verde/ámbar/rojo HUD, snap flash).
3. **Componente**: `TangramPostulationTask.jsx` + tests
   - bobina de interacción (select/drag/rotate/reset), tutorial N0, niveles 1-4,
     HUD (level, moves, time, coverage %), modals transición/resultado, SFX, gameClock.
4. **Blueprint y batería**: registrar `tangram_exp001` en `originalGameBlueprints.js` +
   `postulationDemoConfig.js` + `PostulationGameStage.jsx` + `postulationDemoFixture.js`.
5. **Gates**: vitest focales + oxlint + `npm run build` + `git diff --check`.
6. **Landing + docs**: integrar en landing (copy de módulo) y actualizar plan/handoff.

## Gates de salida
- Vitest focales Tangram verde (telemetry, feedback, component, fixture, blueprint).
- oxlint sin errores en archivos tocados.
- `npm run build` exitoso.
- Sin fields prohibidos en agregado final (regex privacy).