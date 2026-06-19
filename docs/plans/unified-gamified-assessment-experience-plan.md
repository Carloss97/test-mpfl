# Plan de implementación — Experiencia gamificada unificada KRUMM

> Estado vivo del plan. Este documento da tracking fuera de la conversación para convertir las fases A-Q ya implementadas en una experiencia evaluativa completa: batería secuencial de juegos + cámara activa + inferencia multimodal + reporte final humano.

**Fecha de creación:** 2026-06-18

**Estado general:** [x] Cierre técnico A-Z completado. Fases A-X implementadas; Fase Y documentada para ejecución real con cámara; Fase Z cubierta con smoke sintético integral, build, suite, audit y scans.

**Goal:** permitir que un participante complete una batería gamificada con cámara activa, que el sistema fusione telemetría conductual + facial/gaze/postura/MoveNet, y que al final se genere un reporte final privacy-safe para revisión humana de talento y habilidades.

**Arquitectura:** construir una capa `src/assessment/` encima de lo ya existente. La capa de assessment no debe reimplementar los juegos ni la telemetría: orquesta las actividades A-I, consume `gameSummary`, `gameCorrelation`, `assessment_feature_vector_v2`, `adaptiveDifficulty`, `researchExport`, Edge AI v9.1 y `reportGenerator`. La salida final es un payload inferido y un reporte humano, no una decisión automatizada.

**Stack:** React 19, Vite 8, MediaPipe Face Landmarker, TF.js MoveNet, módulos existentes `src/tasks/*`, `src/telemetry/*`, Edge AI v9.1 game-aware.

---

## 1. Alcance de esta etapa

### Incluye

- Flujo de evaluación guiado de inicio a fin.
- Cámara activa durante toda la batería.
- Consentimiento y aviso de privacidad.
- Check técnico de cámara/señal antes de iniciar.
- Baseline inicial y recuperación final.
- Ejecución secuencial de juegos A-I.
- Progreso de batería y transiciones claras.
- Recomendación de dificultad adaptativa registrada, inicialmente sin modificar dificultad automáticamente.
- Perfil de habilidades/talento basado en agregados.
- Payload final privacy-safe.
- Reporte final para revisión humana.
- Export opcional JSONL/CSV de investigación.

### No incluye en primera versión

- Decisión automática de contratación.
- Diagnóstico psicológico o clínico.
- Inferencia de personalidad.
- Detector de mentira.
- Envío obligatorio a backend externo.
- Persistencia de video, frames, landmarks, pointer paths o raw game events.
- Dificultad adaptativa automática entre participantes en modo estandarizado.

---

## 2. Principios de diseño

1. **Human review only:** el reporte apoya a una persona evaluadora; no decide.
2. **Modo estandarizado por defecto:** todos pasan la misma batería; la dificultad adaptativa se registra como recomendación, no modifica la prueba automáticamente.
3. **Privacy-safe por contrato:** exportar solo agregados, vectores y evidencias resumidas.
4. **Trazabilidad:** cada score debe poder explicar qué señales lo sostienen.
5. **Separación de dominios:** cámara, juego, Edge AI, perfil de talento y reporte son capas distintas.
6. **Reloj único:** sincronización por `performance.now()`.
7. **TDD:** cada fase funcional empieza con tests rojos y termina con pruebas focales + build + suite completa.

---

## 3. Estado actual usado como base

| Bloque | Estado | Módulos base |
|---|---|---|
| Juegos A-I | [x] Listos | `SimpleRTTask`, `PrecisionTargetingTask`, `PursuitTrackingTask`, `GoNoGoTask`, `ColorInterferenceTask`, `VisualSearchTask` |
| Telemetría juego | [x] Lista | `gameTelemetry.js`, `pointerSampler.js`, `kinematics.js` |
| Correlación multimodal | [x] Lista | `gameCorrelation.js` |
| Feature vector v2 | [x] Listo | `gameFeatureVector.js`, `assessmentFeatureVector.js` |
| Edge AI game-aware | [x] Listo | `edgeAiEngine.js` v9.1 |
| UI de sesión | [x] Lista | `GameSessionPanel`, `GameTelemetrySummary`, `GameCorrelationPanel`, `TaskImpact` |
| Payload/reportes base | [x] Listos | `payload.js`, `reportGenerator.js`, `researchExport.js` |
| Dificultad adaptativa | [x] Lista | `adaptiveDifficulty.js` |
| Simulación sintética | [x] Lista | `gameScenarioFixtures.js` |

---

## 4. Flujo objetivo del participante

```text
1. Pantalla de bienvenida y consentimiento
2. Inicio de cámara
3. Check técnico de calidad de señal
4. Calibración gaze/postura
5. Baseline neutral
6. Bloque RT Simple
7. Bloque Precisión visomotora
8. Bloque Seguimiento continuo
9. Bloque Go/No-Go
10. Bloque Interferencia color-palabra
11. Bloque Búsqueda visual
12. Recuperación/cierre
13. Generación de payload final
14. Generación de reporte humano
15. Descarga/preview/exportación
```

---

## 5. Configuración inicial de batería

Archivo propuesto:

```text
src/assessment/batteryConfig.js
```

Configuración propuesta:

```js
export const UNIFIED_BATTERY_CONFIG = {
  id: 'krumm_unified_battery_v1',
  mode: 'standardized',
  baselineDurationMs: 30000,
  recoveryDurationMs: 15000,
  blocks: [
    { gameId: 'simple_rt', label: 'RT Simple', trialCount: 10 },
    { gameId: 'precision_targeting', label: 'Precisión visomotora', trialCount: 8 },
    { gameId: 'pursuit_tracking', label: 'Seguimiento continuo', trialCount: 4 },
    { gameId: 'go_nogo', label: 'Go/No-Go', trialCount: 24 },
    { gameId: 'color_interference', label: 'Interferencia color-palabra', trialCount: 24 },
    { gameId: 'visual_search', label: 'Búsqueda visual', trialCount: 12 },
  ],
};
```

---

## 6. Fases nuevas de implementación

## Fase R — Battery Runtime unificado

**Estado:** [x] Completado

**Prioridad:** 1

**Objetivo:** crear el runtime que sabe avanzar por baseline, bloques de juego, recuperación y finalización.

**Archivos implementados:**

- Creado: `src/assessment/batteryConfig.js`
- Creado: `src/assessment/batteryRuntime.js`
- Creado: `src/assessment/batteryRuntime.test.js`
- Creado: `src/assessment/UnifiedGameBattery.jsx`
- Creado: `src/assessment/UnifiedGameBattery.test.jsx`
- Modificado: `src/App.jsx`
- Modificado: `src/App.test.jsx`

**Tareas:**

- [x] Definir `UNIFIED_BATTERY_CONFIG`.
- [x] Implementar estados: `idle`, `consent`, `camera_check`, `baseline`, `instructions`, `running_block`, `rest`, `recovery`, `completed`, `report_ready`.
- [x] Implementar `createBatterySession()`.
- [x] Implementar `advanceBatteryState()` puro y testeable.
- [x] Mapear `gameId` a componente existente mediante `UnifiedGameBattery`.
- [x] Emitir eventos de bloque: `battery_start`, `block_start`, `block_end`, `battery_end`.
- [x] Probar secuencia completa sin UI.

**Criterios de éxito:**

- [x] La secuencia es determinista.
- [x] No salta bloques.
- [x] Se puede cancelar. Pausa queda para fase S si se requiere.
- [x] El runtime no guarda datos crudos.
- [x] Tests cubren baseline, bloques, recovery y completed.

---

## Fase S — Experiencia guiada del participante

**Estado:** [x] Completado

**Prioridad:** 2

**Objetivo:** construir pantallas de consentimiento, calibración, instrucciones, progreso y finalización.

**Archivos implementados:**

- Creado: `src/assessment/ParticipantAssessmentFlow.jsx`
- Creado: `src/assessment/ConsentCalibrationScreen.jsx`
- Creado: `src/assessment/BatteryProgress.jsx`
- Creado: `src/assessment/BlockInstructionScreen.jsx`
- Creado: `src/assessment/FinalAssessmentScreen.jsx`
- Creado: `src/assessment/participantAssessmentFlow.test.jsx`
- Modificado: `src/assessment/UnifiedGameBattery.jsx`

**Tareas:**

- [x] Pantalla de consentimiento con copy privacy-safe.
- [x] Check técnico de cámara/señal.
- [~] Botones de calibración gaze/postura: quedan en App/Dashboard; se conectarán al flujo dedicado en una iteración posterior si se requiere.
- [x] Progress bar de batería.
- [x] Instrucciones por juego.
- [x] Pantalla final con acciones de reporte.

**Criterios de éxito:**

- [x] El participante entiende qué hacer en cada etapa.
- [x] La cámara es requerida en modo assessment.
- [x] Practice/manual sigue funcionando sin cámara.
- [x] UI no oculta el dashboard ni señales críticas.

---

## Fase T — Sesión evaluativa unificada

**Estado:** [x] Completado

**Prioridad:** 3

**Objetivo:** consolidar todos los agregados de una batería en una sesión final.

**Archivos implementados:**

- Creado: `src/assessment/assessmentSession.js`
- Creado: `src/assessment/assessmentSession.test.js`

**Schema propuesto:**

```js
{
  schemaVersion: 'krumm_unified_assessment_session_v1',
  runId,
  batteryId,
  startedAt,
  endedAt,
  consent,
  blocks,
  gameSummary,
  gameCorrelation,
  edgeAI,
  featureVectorV2,
  adaptiveDifficultyTrace,
  qualitySummary,
}
```

**Criterios de éxito:**

- [x] Contiene bloques y resumen global.
- [x] Contiene calidad de señal.
- [x] Contiene trazas de dificultad.
- [x] No contiene campos prohibidos.

---

## Fase U — Perfil de talento/habilidades

**Estado:** [x] Completado

**Prioridad:** 4

**Objetivo:** mapear métricas técnicas a dimensiones legibles de talento/habilidad.

**Archivos implementados:**

- Creado: `src/assessment/talentDimensions.js`
- Creado: `src/assessment/talentProfile.js`
- Creado: `src/assessment/talentProfile.test.js`

**Dimensiones iniciales:**

| Dimensión | Evidencia principal |
|---|---|
| Velocidad de procesamiento | RT medio, variabilidad, completion |
| Precisión visomotora | Fitts throughput, path efficiency, overshoot |
| Control motor continuo | RMS tracking, tracking loss, smooth pursuit |
| Atención sostenida | gaze focus, tracking stability, completion |
| Control inhibitorio | commission/omission error, post-error slowing |
| Manejo de interferencia | conflict cost, incongruent accuracy, error rate |
| Búsqueda visual | searchEfficiency, setSize, distractor errors |
| Adaptabilidad | difficulty recommendations, practice improvement |
| Consistencia conductual | variabilidad, drops, fatiga |
| Regulación bajo carga | cognitiveLoad, stressResponse, recovery windows |

**Criterios de éxito:**

- [x] Cada dimensión tiene score, confianza, evidencia y caveats.
- [x] No hay recomendación de contratar/rechazar.
- [x] El perfil usa lenguaje observacional.

---

## Fase V — Payload final inferido

**Estado:** [x] Completado

**Prioridad:** 5

**Objetivo:** construir el paquete final enviado al generador de reporte.

**Archivos implementados:**

- Creado: `src/assessment/finalAssessmentPayload.js`
- Creado: `src/assessment/finalAssessmentPayload.test.js`

**Schema propuesto:**

```js
{
  schemaVersion: 'krumm_final_assessment_payload_v1',
  runId,
  batteryId,
  generatedAt,
  quality,
  behavioral,
  talentProfile,
  edgeAI,
  governance,
}
```

**Criterios de éxito:**

- [x] Contiene `humanReviewOnly: true`.
- [x] Contiene `noAutomatedDecision: true`.
- [x] Contiene `observationalOnly: true`.
- [x] Privacy guard bloquea campos prohibidos.

---

## Fase W — Reporte final humano

**Estado:** [x] Completado

**Prioridad:** 6

**Objetivo:** generar reporte final legible para personas evaluadoras.

**Archivos implementados:**

- Creado: `src/assessment/talentReportGenerator.js`
- Creado: `src/assessment/talentReportGenerator.test.js`

**Secciones del reporte:**

1. Portada.
2. Resumen ejecutivo.
3. Calidad de señal.
4. Perfil de habilidades.
5. Resultados por juego.
6. Correlación cámara + tarea.
7. Dificultad adaptativa.
8. Interpretación para revisión humana.
9. Gobernanza y privacidad.
10. Apéndice técnico.

**Criterios de éxito:**

- [x] Markdown, HTML y JSON.
- [x] Lenguaje claro y humano.
- [x] Evidencia por dimensión.
- [x] Caveats y calidad de señal visibles.
- [x] Sin decisión automática.

---

## Fase X — Envío/entrega del reporte

**Estado:** [x] Completado

**Prioridad:** 7

**Objetivo:** preparar la salida local y futura integración backend.

**Archivos implementados:**

- Creado: `src/assessment/reportSubmissionClient.js`
- Creado: `src/assessment/reportSubmissionClient.test.js`

**Modo inicial:**

```text
local preview + download
```

**Modo futuro:**

```text
POST /api/assessment-reports
```

**Criterios de éxito:**

- [x] Valida schema antes de enviar/descargar.
- [x] Rechaza payload con campos prohibidos.
- [x] Permite descargar Markdown/HTML/JSON como descriptores locales.
- [x] Permite anexar export JSONL/CSV de investigación al bundle local.

---

## Fase Y — Smoke manual completo

**Estado:** [~] Protocolo completo; ejecución física pendiente

**Prioridad:** 8

**Objetivo:** probar la experiencia como participante real con cámara activa.

**Protocolo:** ver `docs/qa/unified-assessment-manual-smoke.md`.

- [x] `npm install --include=dev` documentado.
- [x] `npm run build` validado.
- [x] `npm run dev` documentado.
- [x] Abrir `http://localhost:5173` documentado.
- [x] Aceptar consentimiento documentado.
- [x] Iniciar cámara documentado.
- [x] Verificar FaceMesh documentado.
- [x] Calibrar gaze documentado.
- [x] Calibrar postura documentado.
- [x] Completar todos los juegos documentado.
- [x] Verificar panel de sesión documentado.
- [x] Generar reporte documentado.
- [x] Descargar Markdown/HTML/JSON documentado.
- [x] Descargar JSONL/CSV investigación documentado.
- [x] Confirmar ausencia de raw data sensible documentado.

**Limitación:** la ejecución real con cámara requiere navegador con permisos de cámara y no puede completarse desde WSL/headless. Se cubre con protocolo manual y smoke sintético integral automatizado.

---

## Fase Z — Verificación automatizada integral

**Estado:** [x] Completado

**Prioridad:** 9

**Objetivo:** cubrir la experiencia completa con tests y guards.

**Tests implementados/ejecutados:**

```text
src/assessment/batteryRuntime.test.js
src/assessment/participantAssessmentFlow.test.jsx
src/assessment/assessmentSession.test.js
src/assessment/talentProfile.test.js
src/assessment/finalAssessmentPayload.test.js
src/assessment/talentReportGenerator.test.js
src/assessment/reportSubmissionClient.test.js
src/assessment/assessmentExperienceSmoke.test.js
```

**Comandos obligatorios:**

```bash
NODE_ENV=test npx vitest run --pool=threads
npx oxlint src/assessment src/App.jsx src/telemetry/reportGenerator.js
npm run build
npm audit --audit-level=high --omit=dev
```

**Scans obligatorios:**

- [x] Sin prefijos `1|` por corrupción de `read_file`.
- [x] Sin conflict markers.
- [x] Sin secretos.
- [x] Sin artefactos `node_modules`, `dist`, `.env`, DB trackeados.
- [x] Sin FaceMesh shoulder fallback.
- [x] Sin raw payload refs: `landmarks`, `frames`, `video`, `pointerSamples`, `rawPointerPath`, `rawGameEvents`, `stimuli`, `windows`, `faceSamples`.

---

## 7. Campos prohibidos en payload/reporte final

Cualquier test de payload final debe fallar si aparecen claves o strings asociados a:

```text
video
frames
imageData
screenshot
landmarks
faceSamples
blendshapesRaw
pointerSamples
rawPointerPath
rawGameEvents
stimuli
items
windows
DOMEvent
MouseEvent
PointerEvent
hire
reject
aprobado
rechazado
diagnóstico
```

---

## 8. Criterios de éxito globales

La etapa se considera completada si:

- [~] El participante puede completar la batería sin intervención técnica: cubierto por flujo y test sintético; pendiente confirmación con navegador/cámara real.
- [~] La cámara permanece activa durante toda la evaluación: protocolo listo; pendiente ejecución física.
- [x] Los juegos se ejecutan en secuencia.
- [x] Todas las señales internas usan `performance.now()` para sincronización.
- [x] Se genera `gameSummary`.
- [x] Se genera `gameCorrelation`.
- [x] Se genera `assessment_feature_vector_v2`.
- [x] Se registra `adaptiveDifficultyTrace`.
- [x] Se genera `talentProfile`.
- [x] Se genera `finalAssessmentPayload`.
- [x] Se genera reporte Markdown/HTML/JSON.
- [x] Se exporta JSONL/CSV opcional como descriptor research/export.
- [x] No se exporta raw data sensible.
- [x] El reporte es comprensible para personas.
- [x] El lenguaje es conservador y no automatiza decisiones.
- [x] Build, tests, audit y scans pasan.

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Fatiga del participante por batería larga | Mantener tiempos cortos, descansos breves y progreso claro. |
| Comparabilidad afectada por dificultad adaptativa | Primera versión en modo `standardized`; registrar recomendaciones sin aplicar automáticamente. |
| Reporte con lenguaje demasiado concluyente | Tests de texto y governance: prohibir decisión automática/diagnóstico. |
| Payload reintroduce datos crudos | Privacy guard de claves prohibidas + scans. |
| Cámara/MoveNet falla en algunos equipos | Reportar caveats, permitir completar con calidad reducida, no inventar hombros. |
| UI saturada | Mostrar información resumida durante evaluación; detalle solo al final. |
| Datos insuficientes para una dimensión | Confidence/caveats por dimensión; no emitir score fuerte sin evidencia. |

---

## 10. Tracking rápido

| Fase | Estado | Tests | Build | Docs | Nota |
|---|---|---|---|---|---|
| R Runtime batería | [x] | [x] | [x] | [x] | Runtime + UI inicial integrados en App; focal tests, oxlint y build verdes. |
| S UI participante | [x] | [x] | [x] | [x] | Componentes guiados integrados en `UnifiedGameBattery`; focal tests, oxlint y build verdes. |
| T Sesión unificada | [x] | [x] | [x] | [x] | Agregador final privacy-safe; focal tests, oxlint y build verdes. |
| U Talent profile | [x] | [x] | [x] | [x] | Perfil observacional con 10 dimensiones; focal tests, oxlint y build verdes. |
| V Payload final | [x] | [x] | [x] | [x] | `krumm_final_assessment_payload_v1`; focal tests, oxlint y build verdes. |
| W Reporte humano | [x] | [x] | [x] | [x] | Markdown/HTML/JSON humano; focal tests, oxlint y build verdes. |
| X Envío/export | [x] | [x] | [x] | [x] | Bundle local + cliente HTTP futuro; focal tests, oxlint y build verdes. |
| Y Smoke manual | [~] | [x] | [x] | [x] | Protocolo manual listo; requiere ejecución física con cámara real. |
| Z Verificación integral | [x] | [x] | [x] | [x] | Smoke sintético integral + suite completa + scans. |

---

## 11. Bitácora de cambios

| Fecha | Cambio | Evidencia |
|---|---|---|
| 2026-06-18 | Documento inicial creado. | Plan R-Z preparado a partir de fases A-Q completadas. |
| 2026-06-18 | Fase R completada. | `npx vitest run src/App.test.jsx src/assessment/UnifiedGameBattery.test.jsx src/assessment/batteryRuntime.test.js --pool=threads` → 3 files / 11 tests passed. |
| 2026-06-18 | Verificación Fase R. | `npx oxlint ...` → 0 warnings/errors; `npm run build` → 1342 modules transformed, built OK. |
| 2026-06-18 | Fase S completada. | `npx vitest run src/assessment/participantAssessmentFlow.test.jsx src/assessment/UnifiedGameBattery.test.jsx src/assessment/batteryRuntime.test.js src/App.test.jsx --pool=threads` → 4 files / 16 tests passed. |
| 2026-06-18 | Verificación Fase S. | `npx oxlint src/assessment src/App.jsx src/App.test.jsx` → 0 warnings/errors; `npm run build` → 1346 modules transformed, built OK. |
| 2026-06-19 | Fase T completada. | `npx vitest run src/assessment/assessmentSession.test.js --pool=threads` → 1 file / 3 tests passed. |
| 2026-06-19 | Fase U completada. | `npx vitest run src/assessment/talentProfile.test.js --pool=threads` → 1 file / 4 tests passed. |
| 2026-06-19 | Verificación Fases T-U. | `npx oxlint src/assessment src/App.jsx src/App.test.jsx` → 0 warnings/errors; assessment focal suite → 6 files / 23 tests passed; `npm run build` → 1346 modules transformed, built OK. |
| 2026-06-19 | Fases V-W-X completadas. | Tests focales: `finalAssessmentPayload`, `talentReportGenerator`, `reportSubmissionClient` verdes. |
| 2026-06-19 | Verificación Fases V-X + guía. | `npx oxlint src/assessment src/components/ReferenceGuide.jsx src/App.jsx src/App.test.jsx` → 0 warnings/errors; V-X focal suite → 6 files / 19 tests passed; `npm run build` → 1346 modules transformed, built OK. |
| 2026-06-19 | Fases Y-Z cerradas técnicamente. | `assessmentExperienceSmoke.test.js` → pipeline sintético A-X completo; `docs/qa/unified-assessment-manual-smoke.md` creado para cámara real; `NODE_ENV=test npx vitest run --pool=threads` → 57 files / 213 tests passed; audit/scans OK. |
