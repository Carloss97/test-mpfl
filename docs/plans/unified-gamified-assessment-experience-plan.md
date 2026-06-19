# Plan de implementación — Experiencia gamificada unificada KRUMM

> Estado vivo del plan. Este documento da tracking fuera de la conversación para convertir las fases A-Q ya implementadas en una experiencia evaluativa completa: batería secuencial de juegos + cámara activa + inferencia multimodal + reporte final humano.

**Fecha de creación:** 2026-06-18

**Estado general:** [ ] Por implementar. Fases A-Q del plan gamificado base ya completadas; este documento inicia la etapa de experiencia unificada.

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

**Estado:** [ ] Por implementar

**Prioridad:** 5

**Objetivo:** construir el paquete final enviado al generador de reporte.

**Archivos:**

- Crear: `src/assessment/finalAssessmentPayload.js`
- Crear: `src/assessment/finalAssessmentPayload.test.js`

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

- [ ] Contiene `humanReviewOnly: true`.
- [ ] Contiene `noAutomatedDecision: true`.
- [ ] Contiene `observationalOnly: true`.
- [ ] Privacy guard bloquea campos prohibidos.

---

## Fase W — Reporte final humano

**Estado:** [ ] Por implementar

**Prioridad:** 6

**Objetivo:** generar reporte final legible para personas evaluadoras.

**Archivos:**

- Crear: `src/assessment/talentReportGenerator.js`
- Crear: `src/assessment/talentReportGenerator.test.js`
- Modificar: `src/telemetry/reportGenerator.js` si conviene reutilizar formato.

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

- [ ] Markdown, HTML y JSON.
- [ ] Lenguaje claro y humano.
- [ ] Evidencia por dimensión.
- [ ] Caveats y calidad de señal visibles.
- [ ] Sin decisión automática.

---

## Fase X — Envío/entrega del reporte

**Estado:** [ ] Por implementar

**Prioridad:** 7

**Objetivo:** preparar la salida local y futura integración backend.

**Archivos:**

- Crear: `src/assessment/reportSubmissionClient.js`
- Crear: `src/assessment/reportSubmissionClient.test.js`

**Modo inicial:**

```text
local preview + download
```

**Modo futuro:**

```text
POST /api/assessment-reports
```

**Criterios de éxito:**

- [ ] Valida schema antes de enviar/descargar.
- [ ] Rechaza payload con campos prohibidos.
- [ ] Permite descargar Markdown/HTML/JSON.
- [ ] Permite export JSONL/CSV de investigación.

---

## Fase Y — Smoke manual completo

**Estado:** [ ] Por implementar

**Prioridad:** 8

**Objetivo:** probar la experiencia como participante real con cámara activa.

**Protocolo:**

- [ ] `npm install --include=dev`.
- [ ] `npm run build`.
- [ ] `npm run dev`.
- [ ] Abrir `http://localhost:5173`.
- [ ] Aceptar consentimiento.
- [ ] Iniciar cámara.
- [ ] Verificar FaceMesh.
- [ ] Calibrar gaze.
- [ ] Calibrar postura.
- [ ] Completar todos los juegos.
- [ ] Verificar panel de sesión.
- [ ] Generar reporte.
- [ ] Descargar Markdown/HTML/JSON.
- [ ] Descargar JSONL/CSV investigación.
- [ ] Confirmar ausencia de raw data sensible.

---

## Fase Z — Verificación automatizada integral

**Estado:** [ ] Por implementar

**Prioridad:** 9

**Objetivo:** cubrir la experiencia completa con tests y guards.

**Tests propuestos:**

```text
src/assessment/batteryRuntime.test.js
src/assessment/participantAssessmentFlow.test.jsx
src/assessment/assessmentSession.test.js
src/assessment/talentProfile.test.js
src/assessment/finalAssessmentPayload.test.js
src/assessment/talentReportGenerator.test.js
src/assessment/reportSubmissionClient.test.js
src/assessment/unifiedAssessmentFlow.test.jsx
```

**Comandos obligatorios:**

```bash
npx oxlint src/assessment src/App.jsx src/telemetry/reportGenerator.js
npm run build
npx vitest run
npm audit --audit-level=high --omit=dev
```

**Scans obligatorios:**

- [ ] Sin prefijos `1|` por corrupción de `read_file`.
- [ ] Sin conflict markers.
- [ ] Sin secretos.
- [ ] Sin artefactos `node_modules`, `dist`, `.env`, DB trackeados.
- [ ] Sin FaceMesh shoulder fallback.
- [ ] Sin raw payload refs: `landmarks`, `frames`, `video`, `pointerSamples`, `rawPointerPath`, `rawGameEvents`, `stimuli`, `windows`, `faceSamples`.

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

- [ ] El participante puede completar la batería sin intervención técnica.
- [ ] La cámara permanece activa durante toda la evaluación.
- [ ] Los juegos se ejecutan en secuencia.
- [ ] Todas las señales usan `performance.now()`.
- [ ] Se genera `gameSummary`.
- [ ] Se genera `gameCorrelation`.
- [ ] Se genera `assessment_feature_vector_v2`.
- [ ] Se registra `adaptiveDifficultyTrace`.
- [ ] Se genera `talentProfile`.
- [ ] Se genera `finalAssessmentPayload`.
- [ ] Se genera reporte Markdown/HTML/JSON.
- [ ] Se exporta JSONL/CSV opcional.
- [ ] No se exporta raw data sensible.
- [ ] El reporte es comprensible para personas.
- [ ] El lenguaje es conservador y no automatiza decisiones.
- [ ] Build, tests, audit y scans pasan.

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
| V Payload final | [ ] | [ ] | [ ] | [ ] | Privacy guard fuerte. |
| W Reporte humano | [ ] | [ ] | [ ] | [ ] | Markdown/HTML/JSON. |
| X Envío/export | [ ] | [ ] | [ ] | [ ] | Local primero, backend después. |
| Y Smoke manual | [ ] | [ ] | [ ] | [ ] | Prueba real con cámara. |
| Z Verificación integral | [ ] | [ ] | [ ] | [ ] | Suite + scans. |

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
