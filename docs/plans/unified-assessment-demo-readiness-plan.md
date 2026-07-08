# KRUMM Unified Assessment Demo Readiness Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task when execution begins. Do not skip TDD, privacy guards, build, or manual camera boundaries.

**Goal:** convertir el PoC KRUMM Edge Fusion en una demo local completa, repetible y presentable: modo demo rápido, checklist de señal, reporte final con preview/descarga, historial local y guion operativo.

**Architecture:** extender la capa `src/assessment/` ya existente sin reescribir juegos ni telemetría. La demo debe orquestar `UnifiedGameBattery`, `assessmentSession`, `talentProfile`, `finalAssessmentPayload`, `talentReportGenerator`, `reportSubmissionClient` y `finalAssessmentStorage`, manteniendo todo browser-local y privacy-safe.

**Tech Stack:** React 19, Vite 8, Vitest, MediaPipe Face Landmarker, TF.js MoveNet, IndexedDB/localStorage fallback, módulos `src/tasks/*`, `src/telemetry/*`, `src/assessment/*`.

---

## 0. Estado de partida

**Fecha:** 2026-07-08

### Ya completado

| Fase | Estado | Evidencia |
|---|---|---|
| A-Z | [x] Cierre técnico | Batería, sesiones, perfil, payload, reporte, entrega local/futura, smoke sintético. |
| AA | [x] Smoke real reportado | `docs/qa/unified-assessment-manual-smoke-2026-07-08.md`. |
| AB | [x] Persistencia final | `finalAssessmentStorage.js`, `FinalAssessmentHistoryPanel.jsx`, integración en `App.jsx`. |

### Última verificación conocida posterior a AB

```bash
npx oxlint src/assessment src/App.jsx src/components/ReferenceGuide.jsx
npm run build
NODE_ENV=test npx vitest run --pool=threads
npm audit --audit-level=high --omit=dev
```

Resultados previos:

```text
oxlint: 0 warnings / 0 errors
build: OK, 1354 modules transformed
suite: 60 files / 228 tests passed
audit: 0 vulnerabilities
privacy scans: OK
```

### Restricciones activas

- No guardar video, frames, landmarks crudos, blendshapes crudos, pointer paths, pointerSamples, rawGameEvents, estímulos reconstructivos ni ventanas crudas.
- No usar lenguaje de contratar/rechazar/aprobar/diagnosticar.
- Mantener reporte como apoyo para revisión humana.
- La validación real de cámara debe hacerse en navegador físico; Hermes/WSL solo puede cubrir build/tests/smoke sintético.
- No reintroducir fallback geométrico de hombros con FaceMesh; MoveNet real o estado/error.
- Los juegos deben conservar la resiliencia contra re-renders (`gameRerenderStability.test.jsx`).

---

## 1. Definición de demo completa

La demo se considera lista cuando una persona puede hacer esto sin tocar código ni consola del navegador:

```text
1. Abrir la app local.
2. Elegir “Modo demo rápido” o “Evaluación estándar”.
3. Iniciar cámara.
4. Ver checklist de señal: cámara, rostro, AUs, gaze, postura, MoveNet/estado y privacidad.
5. Aceptar consentimiento.
6. Completar batería corta de demo en menos de 6 minutos.
7. Ver estado “reporte final listo”.
8. Previsualizar reporte Markdown/HTML.
9. Descargar MD/HTML/JSON y payload/manifiesto.
10. Ver historial local de evaluaciones finales.
11. Re-descargar una sesión anterior.
12. Explicar límites éticos y privacidad con un guion claro.
```

### Demo rápida vs evaluación estándar

| Modo | Duración objetivo | Uso |
|---|---:|---|
| Demo rápida | 3-6 minutos | Reuniones, video, explicación comercial/técnica. |
| Evaluación estándar | 12-25 minutos aprox. | Validación interna, piloto controlado, comparabilidad. |

---

## 2. Orden de implementación recomendado

1. **Fase AC:** UI final de preview/download del reporte.
2. **Fase AD:** modo demo rápido + selector demo/estándar.
3. **Fase AE:** checklist de señal/readiness antes de iniciar.
4. **Fase AF:** guion de demo + checklist de ensayo.
5. **Fase AG:** fixture/demo seed para mostrar historial sin repetir batería.
6. **Fase AH:** QA manual de dispositivos y rehearsal.
7. **Fase AI:** paquete final de entrega local para demo.

El orden es intencional: primero cerrar la experiencia visible de finalización, luego acelerar la batería, luego reducir riesgo de cámara, y finalmente preparar narrativa/ensayo.

---

# Fase AC — UI final de reporte preview/download

**Estado:** [x] Completado  
**Prioridad:** 1  
**Objetivo:** que al terminar la batería aparezca un panel final con validación, preview y descargas sin usar consola/código.

## Archivos

- Creado: `src/assessment/FinalReportPanel.jsx`
- Creado: `src/assessment/FinalReportPanel.test.jsx`
- Modificado: `src/App.jsx`
- Documentado: `docs/plans/post-unified-assessment-advancement-plan.md`

## Contrato funcional implementado

`FinalReportPanel` recibe:

```js
{
  payload,
  reports,
  bundle,
  storageRecord,
  onDownloadFile,
  onDownloadAll,
  onSaveAgain,
}
```

Muestra:

- `payload.validation.ok` como “Validación OK” o “Validación bloqueada”.
- runId.
- batteryId.
- calidad de señal: sampleCount, facePresenceRatio, meanConfidence, correlatedTrialCount.
- preview Markdown/HTML/JSON como texto seguro.
- botones:
  - Descargar Markdown.
  - Descargar HTML.
  - Descargar JSON.
  - Descargar payload final.
  - Descargar manifiesto.
  - Descargar todo.
- violaciones/caveats si validación falla.
- copy: “Reporte observacional para revisión humana; sin decisión automatizada”.

## Tareas TDD

### Task AC.1 — Test rojo del panel vacío/validado

**Resultado:** RED confirmado por import inexistente de `FinalReportPanel.jsx`.

### Task AC.2 — Implementación mínima del panel

**Resultado:** GREEN con componente funcional y callbacks de descarga.

### Task AC.3 — Preview de formatos

**Resultado:** Markdown, HTML y JSON se alternan en tabs; HTML se muestra como texto seguro y no se renderiza con `dangerouslySetInnerHTML`.

### Task AC.4 — Descargas por descriptor

**Resultado:** `buildFinalReportDownloadDescriptors()` genera payload, manifiesto y reportes; los botones llaman `onDownloadFile`/`onDownloadAll` y se bloquean si `validation.ok=false`.

### Task AC.5 — Integración con `App.jsx`

**Resultado:** `App.jsx` mantiene `latestFinalAssessment` al generarse `report_ready` y muestra `FinalReportPanel` debajo de `UnifiedGameBattery`.

### Task AC.6 — Verificación de AC

**Evidencia focal:**

```bash
NODE_ENV=test npx vitest run src/assessment/FinalReportPanel.test.jsx src/assessment/finalAssessmentStorage.test.js src/assessment/FinalAssessmentHistoryPanel.test.jsx src/App.test.jsx --pool=threads
```

Resultado:

```text
4 test files passed
18 tests passed
```

---

# Fase AD — Modo demo rápido + selector demo/estándar

**Estado:** [x] Completado  
**Prioridad:** 2  
**Objetivo:** permitir una batería breve para reuniones sin romper el modo estandarizado.

## Archivos

- Modificado: `src/assessment/batteryConfig.js`
- Creado: `src/assessment/batteryConfig.demo.test.js`
- Modificado: `src/assessment/UnifiedGameBattery.jsx`
- Modificado: `src/assessment/UnifiedGameBattery.test.jsx`
- Documentado: `docs/plans/unified-assessment-demo-readiness-plan.md`
- Pendiente de documentación final: `docs/reference-guide.md`, `src/components/ReferenceGuide.jsx`.

## Config implementada

```js
export const DEMO_BATTERY_CONFIG = Object.freeze({
  id: 'krumm_unified_battery_demo_v1',
  label: 'KRUMM — Demo rápida',
  mode: 'demo',
  baselineDurationMs: 8000,
  restDurationMs: 1500,
  recoveryDurationMs: 5000,
  blocks: Object.freeze([
    Object.freeze({ gameId: 'simple_rt', label: 'RT Simple', trialCount: 4, skill: 'processing_speed' }),
    Object.freeze({ gameId: 'precision_targeting', label: 'Precisión visomotora', trialCount: 4, skill: 'visuomotor_precision' }),
    Object.freeze({ gameId: 'pursuit_tracking', label: 'Seguimiento continuo', durationMs: 4000, skill: 'continuous_motor_control' }),
    Object.freeze({ gameId: 'go_nogo', label: 'Go/No-Go', trialCount: 8, skill: 'inhibitory_control' }),
    Object.freeze({ gameId: 'color_interference', label: 'Interferencia color-palabra', trialCount: 8, skill: 'interference_control' }),
    Object.freeze({ gameId: 'visual_search', label: 'Búsqueda visual', trialCount: 4, skill: 'visual_search_efficiency' }),
  ]),
});
```

También se implementaron:

- `BATTERY_MODE_OPTIONS`
- `listBatteryConfigs()`
- `getBatteryConfigByMode()`
- `getBatteryConfigById()`
- `getBatteryModeLabel()`

## Tareas TDD

### Task AD.1 — Test de configuración demo

**Resultado:** RED confirmado por exports faltantes; luego GREEN con `batteryConfig.demo.test.js`.

### Task AD.2 — Selector de modo

**Resultado:** `UnifiedGameBattery` muestra selector “Modo de batería” con opciones “Demo rápida” y “Evaluación estándar”. El selector queda bloqueado al salir de `idle`.

### Task AD.3 — Integración con runtime

**Resultado:** al seleccionar demo, `createBatterySession()` se reconstruye con `DEMO_BATTERY_CONFIG`; el primer bloque RT Simple usa 4 trials. El modo estándar conserva 10 trials.

### Task AD.4 — Verificación de AD

**Evidencia focal:**

```bash
NODE_ENV=test npx vitest run src/assessment/batteryConfig.demo.test.js src/assessment/UnifiedGameBattery.test.jsx --pool=threads --maxWorkers=4
```

Resultado:

```text
2 test files passed
7 tests passed
```

---

# Fase AE — Signal Readiness Panel

**Estado:** [ ] Por implementar  
**Prioridad:** 3  
**Objetivo:** reducir riesgo de demo fallida mostrando una checklist clara antes del baseline.

## Archivos

- Crear: `src/assessment/SignalReadinessPanel.jsx`
- Crear: `src/assessment/SignalReadinessPanel.test.jsx`
- Modificar: `src/assessment/ConsentCalibrationScreen.jsx`
- Modificar: `src/assessment/UnifiedGameBattery.jsx`
- Modificar: `src/App.jsx` para pasar métricas actuales.

## Señales a mostrar

| Señal | Input esperado | Estado |
|---|---|---|
| Cámara | `cameraActive` | OK/pendiente |
| FaceMesh | `telemetry.sampleCount`, `faceWorker.status` | OK/pendiente/error |
| Rostro | `telemetry.facePresenceRatio` | OK si >= 0.70 |
| Confianza facial | `telemetry.meanConfidence` | OK si >= 0.55 |
| AUs/FACS | `activeAUCount` o sample blendshapes | OK si hay datos |
| Gaze | `latestGaze.confidence` | OK/calibrando |
| Postura | `latestPose.postureScore` | OK/calibrando |
| MoveNet | `moveNet.status`, `moveNetPose.confidence` | OK/no visible/error |
| Privacidad | constante UI | siempre visible |

## Copy requerido

- “Si MoveNet no detecta hombros, aléjate hasta que ambos hombros entren en cuadro.”
- “La demo puede continuar con caveats; no se inventan hombros ni datos faltantes.”
- “No se guarda video, frames, landmarks crudos ni trayectorias de puntero.”

## Tareas TDD

### Task AE.1 — Test del panel con señal buena

Debe mostrar todos los checks en OK.

### Task AE.2 — Test con cámara apagada/señal baja

Debe mostrar acciones:

```text
Iniciar cámara
Mejorar iluminación
Centrar rostro
Alejarse para hombros
```

### Task AE.3 — Integración en camera_check

En `ConsentCalibrationScreen` o `UnifiedGameBattery`, mostrar panel durante `camera_check` antes de iniciar baseline.

### Task AE.4 — Verificación AE

```bash
NODE_ENV=test npx vitest run src/assessment/SignalReadinessPanel.test.jsx src/assessment/UnifiedGameBattery.test.jsx src/App.test.jsx --pool=threads
npm run build
```

---

# Fase AF — Guion de demo y checklist de ensayo

**Estado:** [ ] Por implementar  
**Prioridad:** 4  
**Objetivo:** preparar un guion operacional para presentar KRUMM sin improvisar claims ni pasos técnicos.

## Archivos

- Crear: `docs/demo/unified-assessment-demo-script.md`
- Crear: `docs/demo/demo-rehearsal-checklist.md`
- Opcional: `docs/demo/demo-faq.md`

## Guion mínimo

El guion debe cubrir:

1. Problema que resuelve KRUMM.
2. Qué mide: desempeño gamificado + señales observacionales FACS/AUs/gaze/postura/MoveNet.
3. Qué no mide: personalidad, diagnóstico, inferencias de engaño ni decisión automática.
4. Privacidad: browser-local, agregados, no video/frames/landmarks/pointer paths.
5. Flujo de demo: cámara → checklist → consentimiento → batería demo → reporte → historial.
6. Qué decir en cada juego.
7. Cómo leer el reporte final.
8. Preguntas frecuentes.
9. Plan B si la cámara falla.
10. Cierre: próximos pasos hacia piloto.

## Checklist de ensayo

Debe incluir:

```text
[ ] npm run build OK
[ ] NODE_ENV=test npx vitest run --pool=threads OK
[ ] npm run dev abierto
[ ] navegador con permisos de cámara
[ ] iluminación frontal
[ ] hombros visibles
[ ] demo rápida seleccionada
[ ] historial final limpiado o preparado
[ ] reporte anterior de backup disponible
[ ] privacidad explicada antes de iniciar
[ ] no hay errores críticos en consola
```

## Verificación AF

- Validar que los markdown no tengan fences rotos.
- Validar que no contengan claims prohibidos.
- Validar que no incluyan secretos ni datos personales reales.

---

# Fase AG — Sesión demo sintética/preparada para fallback

**Estado:** [ ] Por implementar  
**Prioridad:** 5  
**Objetivo:** tener una sesión final local de ejemplo para mostrar reporte/historial si la cámara o el tiempo de reunión fallan.

## Archivos

- Crear: `src/assessment/demoAssessmentFixture.js`
- Crear: `src/assessment/demoAssessmentFixture.test.js`
- Modificar: `src/assessment/FinalAssessmentHistoryPanel.jsx` o `App.jsx` para botón dev/demo opcional.
- Documentar: `docs/demo/demo-rehearsal-checklist.md`.

## Reglas

- La fixture debe ser claramente sintética.
- No debe simular video, frames ni landmarks.
- Debe pasar por los mismos builders:

```text
batterySession sintética
→ buildUnifiedAssessmentSession
→ buildTalentProfile
→ buildFinalAssessmentPayload
→ generateTalentReport
→ buildLocalReportBundle
→ saveFinalAssessmentSession
```

## UI sugerida

Botón secundario, visible solo como utilidad local:

```text
Cargar sesión demo sintética
```

Copy obligatorio:

```text
“Sesión sintética para respaldo de demo; no corresponde a una persona real.”
```

## Tests

```text
- genera payload válido
- genera reportes MD/HTML/JSON
- storage record pasa privacy guard
- UI muestra etiqueta “sintética”
```

---

# Fase AH — QA manual de dispositivos y rehearsal

**Estado:** [ ] Manual  
**Prioridad:** 6  
**Objetivo:** ejecutar ensayos reales en condiciones representativas.

## Archivos

- Modificar: `docs/qa/unified-assessment-manual-smoke.md`
- Crear: `docs/demo/demo-rehearsal-log-template.md`
- Crear registros por ensayo: `docs/demo/rehearsals/YYYY-MM-DD-*.md`

## Matriz mínima

| Condición | Navegador | Cámara | Iluminación | Esperado |
|---|---|---|---|---|
| Buena luz | Edge/Chrome | integrada | frontal | pass completo |
| Luz media | Edge/Chrome | integrada | lateral | pass con caveats |
| Hombros fuera de cuadro | Edge/Chrome | integrada | normal | MoveNet caveat accionable |
| Cámara alterna | Edge/Chrome | externa si existe | normal | selector funciona |

## Criterios

- No hay `Maximum update depth exceeded`.
- No hay bloqueo en Go/No-Go, tracking, Stroop o Visual Search.
- La demo rápida dura menos de 6 minutos.
- El reporte final se puede descargar.
- El historial final permite re-descargar.
- Los caveats son comprensibles.

---

# Fase AI — Paquete final de entrega local para demo

**Estado:** [ ] Por implementar  
**Prioridad:** 7  
**Objetivo:** dejar un paquete operativo para ejecutar la demo en cualquier sesión local.

## Archivos

- Crear: `docs/demo/demo-runbook.md`
- Crear: `docs/demo/demo-troubleshooting.md`
- Crear: `docs/demo/demo-privacy-summary.md`
- Opcional: `scripts/demo-preflight.mjs`
- Opcional test: `scripts/demo-preflight.test.js` si se agrega script.

## Runbook mínimo

Debe incluir:

```bash
cd /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl
npm install --include=dev
NODE_ENV=test npx vitest run src/tasks/gameRerenderStability.test.jsx src/assessment/assessmentExperienceSmoke.test.js --pool=threads
npm run build
npm run dev
```

Luego:

```text
Abrir http://localhost:5173
Seleccionar Demo rápida
Iniciar cámara
Ver checklist
Completar flujo
Generar/descargar reporte
Mostrar historial final
```

## Troubleshooting mínimo

| Síntoma | Causa probable | Acción |
|---|---|---|
| MediaPipe log XNNPACK | Informativo | Ignorar si la detección funciona. |
| WASM 404 | asset/middleware | Verificar `/mediapipe/wasm/*` y build. |
| MoveNet sin hombros | encuadre | Alejarse o bajar cámara. |
| Gaze raro | calibración inicial | Mirar al centro 2-3s y usar calibrar mirada. |
| Postura rara | baseline postura | Usar calibrar postura erguida. |
| Juego no avanza | regresión | correr `gameRerenderStability.test.jsx`. |
| Reporte bloqueado | privacy guard | revisar payload/JSON por claves prohibidas. |

---

## 3. Criterios globales de aceptación de demo

La demo queda lista cuando:

- [ ] Modo demo rápido existe y es seleccionable.
- [ ] Modo estándar sigue intacto.
- [ ] Checklist de señal se ve antes del baseline.
- [ ] Reporte final tiene preview y descargas claras.
- [ ] Historial local final muestra sesiones y permite re-descargar.
- [ ] Existe sesión sintética de fallback o reporte anterior preparado.
- [ ] Existe guion de demo y checklist de ensayo.
- [ ] Build, tests, audit y scans pasan.
- [ ] Smoke manual en navegador real queda registrado en `docs/demo/rehearsals/`.
- [ ] No hay claims de contratación automática, diagnóstico, personalidad ni inferencias de engaño.

---

## 4. Comandos estándar de verificación para cada fase

### Focal por fase

```bash
NODE_ENV=test npx vitest run <tests-de-la-fase> --pool=threads
```

### Lint de superficies de demo

```bash
npx oxlint src/assessment src/App.jsx src/components/ReferenceGuide.jsx
```

### Build

```bash
npm run build
```

### Suite completa

```bash
NODE_ENV=test npx vitest run --pool=threads
```

### Audit

```bash
npm audit --audit-level=high --omit=dev
```

### Scans mínimos

```text
line_prefix
conflict_markers
secret_hits
tracked_artifacts
geometric_shoulder_fallback
unsafe_final_persistence
claims prohibidos: contratar/rechazar/aprobado/rechazado/diagnóstico/inferencias de engaño
```

---

## 5. Plan de ejecución inmediato

Empezar por **Fase AC**.

### Primer lote recomendado

1. Crear `FinalReportPanel.test.jsx`.
2. Confirmar RED.
3. Crear `FinalReportPanel.jsx`.
4. Pasar GREEN.
5. Integrar con `App.jsx` usando `latestFinalAssessment`.
6. Actualizar guía y roadmap.
7. Correr focal + build.

### Segundo lote recomendado

1. Crear `DEMO_BATTERY_CONFIG`.
2. Agregar selector de modo.
3. Validar que demo usa menos trials/duración.
4. Correr smoke manual rápido.

---

## 6. No hacer todavía

Evitar por ahora:

- Backend remoto real.
- Login/recruiter dashboard.
- Nuevos juegos.
- ML calibrado con claims psicométricos fuertes.
- Dificultad adaptativa automática en modo comparativo.
- Export PDF complejo.

Primero cerrar:

```text
final report UX + demo mode + readiness + script + rehearsal
```

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Cámara falla en vivo | Sesión sintética de fallback + historial local preparado. |
| Demo tarda demasiado | Modo demo rápido con trials reducidos. |
| Reporte no se entiende | FinalReportPanel con resumen, caveats y tabs. |
| Interpretación excesiva | Copy human-review-only y privacidad visible. |
| Reaparecen loops de juegos | `gameRerenderStability.test.jsx` en preflight. |
| MoveNet no detecta hombros | Readiness panel con instrucciones de encuadre. |
| Payload se bloquea | Privacy guard muestra violaciones antes de descarga. |

---

## 8. Enlaces relacionados

- Roadmap post-Z: `docs/plans/post-unified-assessment-advancement-plan.md`
- Plan A-Z: `docs/plans/unified-gamified-assessment-experience-plan.md`
- Smoke manual base: `docs/qa/unified-assessment-manual-smoke.md`
- Smoke real reportado: `docs/qa/unified-assessment-manual-smoke-2026-07-08.md`
- Guía visible: `src/components/ReferenceGuide.jsx`
- Guía markdown: `docs/reference-guide.md`
