# Plan de avance — KRUMM después de la experiencia gamificada unificada

> Documento de continuidad posterior a las fases A-X y al cierre técnico Y-Z. Úsalo como roadmap fuera de la conversación para llevar el PoC hacia piloto, validación y producto.

**Fecha:** 2026-06-19  
**Estado de partida:** pipeline A-X implementado; smoke sintético y verificación automatizada disponibles; smoke real con cámara documentado para ejecución manual.

---

## 1. Resumen ejecutivo

KRUMM Edge Fusion ya cuenta con una experiencia evaluativa browser-local que une:

```text
FACS/AUs + gaze + postura + MoveNet
  + juegos gamificados A-I
  + correlación multimodal J
  + feature vector K
  + Edge AI L
  + UI/payload/export O-X
```

El sistema puede producir:

- sesión evaluativa unificada,
- perfil de habilidades observacional,
- payload final privacy-safe,
- reporte humano Markdown/HTML/JSON,
- bundle local/futuro envío HTTP,
- export JSONL/CSV de investigación.

El siguiente objetivo no es añadir más señales, sino convertir esto en un piloto confiable, reproducible, revisable y éticamente gobernado.

---

## 2. Revisión general de lo realizado

| Bloque | Resultado | Evidencia técnica |
|---|---|---|
| A-I Juegos | Batería de actividades: RT, Fitts, tracking, Go/No-Go, Stroop, Visual Search. | Tareas React + tests + selector manual en App. |
| J Correlación | Ventanas `preTrial/reaction/postResponse/recovery`. | `gameCorrelation.js`. |
| K Vector | `assessment_feature_vector_v2`. | `gameFeatureVector.js`. |
| L Edge AI | Canales game-aware: inhibición, precisión, búsqueda, resiliencia. | `edgeAiEngine.js` v9.1. |
| M-N UI/payload | Panel de sesión, baseline/delta, reportes base agregados. | `GameSessionPanel`, `payload.js`, `reportGenerator.js`. |
| O-Q Validación/export | Dificultad adaptativa, fixtures sintéticos, research export. | `adaptiveDifficulty.js`, `gameScenarioFixtures.js`, `researchExport.js`. |
| R-S Experiencia | Runtime de batería y flujo participante guiado. | `batteryRuntime.js`, `UnifiedGameBattery.jsx`. |
| T-U Interpretación | Sesión unificada + perfil de talento/habilidades. | `assessmentSession.js`, `talentProfile.js`. |
| V-X Reporte/entrega | Payload final, reporte humano, bundle local/HTTP futuro. | `finalAssessmentPayload.js`, `talentReportGenerator.js`, `reportSubmissionClient.js`. |
| Y-Z Cierre técnico | Protocolo manual + smoke sintético integral + verificación completa. | `docs/qa/unified-assessment-manual-smoke.md`, `assessmentExperienceSmoke.test.js`. |

---

## 3. Principios que deben mantenerse

1. **Human-review-only:** el sistema informa; no decide.
2. **Privacy by design:** no persistir video, frames, landmarks, raw game events ni pointer paths.
3. **Evidencia trazable:** cada habilidad debe indicar señales y caveats.
4. **Modo estandarizado primero:** no adaptar dificultad automáticamente en evaluación comparativa sin datos piloto.
5. **Calidad antes de interpretación:** caveats de señal limitan cualquier conclusión.
6. **TDD + smoke real:** cada capa nueva debe tener prueba pura y validación manual si toca cámara/UI.

---

## 4. Roadmap recomendado

## Fase AA — Smoke real con cámara y registro de hallazgos

**Estado:** [x] Completado como smoke real reportado por usuario

**Objetivo:** ejecutar el protocolo de `docs/qa/unified-assessment-manual-smoke.md` con cámara real.

**Tareas:**

- [ ] Ejecutar batería completa en navegador.
- [ ] Registrar capturas/observaciones de UX, no frames del participante.
- [ ] Verificar permisos, calibración, MoveNet y final report.
- [ ] Documentar caveats reales de cámara/iluminación.
- [ ] Abrir issues/tareas para bugs encontrados.

**Criterio de éxito:** la batería se completa de inicio a fin y genera reporte final legible sin datos crudos.

**Evidencia de cierre:** `docs/qa/unified-assessment-manual-smoke-2026-07-08.md`. La validación de cámara real fue reportada por el usuario en navegador local; Hermes mantiene la limitación de no poder observar cámara física desde WSL/headless.

---

## Fase AB — Persistencia local de sesiones finales

**Estado:** [x] Completado

**Objetivo:** guardar y listar sesiones evaluativas finales en IndexedDB/localStorage seguro.

**Archivos implementados:**

- Creado: `src/assessment/finalAssessmentStorage.js`
- Creado: `src/assessment/finalAssessmentStorage.test.js`
- Creado: `src/assessment/FinalAssessmentHistoryPanel.jsx`
- Creado: `src/assessment/FinalAssessmentHistoryPanel.test.jsx`
- Modificado: `src/App.jsx`

**Tareas:**

- [x] Guardar `finalAssessmentPayload` + report manifest.
- [x] Listar sesiones finales por fecha/runId.
- [x] Descargar artefactos de una sesión previa.
- [x] Añadir pruning configurable.
- [x] Privacy guard antes de persistir.

**Notas de implementación:** al llegar a `report_ready`, `App.jsx` construye `krumm_unified_assessment_session_v1` → `krumm_talent_profile_v1` → `krumm_final_assessment_payload_v1` → reportes Markdown/HTML/JSON → `krumm_report_delivery_bundle_v1`, y guarda el registro con `saveFinalAssessmentSession()`. El panel `FinalAssessmentHistoryPanel` permite listar, limpiar y re-descargar payload/manifiesto/reportes guardados. La persistencia valida payload final, claves prohibidas y contenido JSON de reportes antes de escribir.

**Evidencia:** `NODE_ENV=test npx vitest run src/assessment/finalAssessmentStorage.test.js src/assessment/FinalAssessmentHistoryPanel.test.jsx src/assessment/UnifiedGameBattery.test.jsx src/App.test.jsx --pool=threads` → 4 archivos / 15 tests verdes.

---

## Fase AC — UI final de report preview/download

**Estado:** [ ] Por implementar

**Objetivo:** que la app permita previsualizar y descargar el reporte final sin tocar consola/código.

**Archivos sugeridos:**

- Crear: `src/assessment/FinalReportPanel.jsx`
- Crear: `src/assessment/FinalReportPanel.test.jsx`
- Modificar: `UnifiedGameBattery.jsx` / `FinalAssessmentScreen.jsx`.

**Tareas:**

- [ ] Preview Markdown/HTML.
- [ ] Botones Descargar MD/HTML/JSON.
- [ ] Botones Descargar JSONL/CSV research export.
- [ ] Mostrar `payload.validation.ok` y caveats.
- [ ] Bloquear descarga si privacy guard falla.

---

## Fase AD — QA de cámara y dispositivos

**Estado:** [ ] Por implementar/probar

**Objetivo:** robustecer experiencia con webcams reales, baja luz, laptops multi-cámara y encuadre variable.

**Tareas:**

- [ ] Selector explícito de cámara si aún no está suficientemente visible.
- [ ] Refresh de dispositivos tras permisos.
- [ ] Checklist visual de iluminación/rostro/hombros.
- [ ] Mensajes accionables cuando MoveNet no detecta hombros.
- [ ] Pruebas manuales en al menos 3 condiciones: buena luz, luz media, hombros fuera de cuadro.

---

## Fase AE — Validación piloto interna

**Estado:** [ ] Por diseñar

**Objetivo:** ejecutar 5-10 sesiones piloto internas para observar estabilidad, fatiga, UX y consistencia de reportes.

**Tareas:**

- [ ] Definir protocolo de consentimiento interno.
- [ ] Definir duración máxima aceptable.
- [ ] Registrar tiempos por bloque.
- [ ] Comparar reportes entre participantes simulados/reales.
- [ ] Ajustar caveats y umbrales si hay falsos positivos sistemáticos.

---

## Fase AF — Calibración psicométrica inicial

**Estado:** [ ] Por investigar

**Objetivo:** pasar de reglas observacionales a métricas calibradas con datos piloto.

**Tareas:**

- [ ] Definir criterios externos no sensibles para comparación.
- [ ] Analizar distribución de scores por dimensión.
- [ ] Estimar confiabilidad test-retest si es posible.
- [ ] Revisar sesgos por cámara/iluminación/dispositivo.
- [ ] Mantener reportes como apoyo humano, no decisión automática.

---

## Fase AG — Backend opcional / entrega remota

**Estado:** [ ] Futuro

**Objetivo:** activar `reportSubmissionClient` contra un backend real solo después de cerrar privacidad y consentimiento.

**Tareas:**

- [ ] Definir endpoint `POST /api/assessment-reports`.
- [ ] Validar payload en servidor con whitelist de campos.
- [ ] Retención/deletion policy.
- [ ] Cifrado en tránsito y reposo.
- [ ] Auditoría de acceso a reportes.

---

## Fase AH — Revisión legal/ética y copy de producto

**Estado:** [ ] Futuro

**Objetivo:** preparar uso en piloto sin claims indebidos.

**Tareas:**

- [ ] Revisar consentimiento.
- [ ] Revisar lenguaje de reporte.
- [ ] Eliminar cualquier ambigüedad de diagnóstico/contratación automática.
- [ ] Definir política de uso humano.
- [ ] Documentar límites de la inferencia.

---

## 5. Verificación estándar para futuras fases

Usar siempre:

```bash
npx oxlint src/assessment src/components/ReferenceGuide.jsx src/App.jsx src/App.test.jsx
NODE_ENV=test npx vitest run --pool=threads
npm run build
npm audit --audit-level=high --omit=dev
```

Y scans de privacidad:

```text
line_prefix
conflict_markers
secret_hits
raw_assessment_refs
tracked_artifacts
geometric_shoulder_fallback
```

---

## 6. Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Cámara/iluminación pobre | Caveats visibles + calidad antes de interpretación. |
| MoveNet sin hombros | Mostrar estado/error, no inventar hombros. |
| Reporte sobreinterpretado | Lenguaje observacional + governance obligatorio. |
| Comparabilidad afectada por dificultad adaptativa | Modo estandarizado primero; adaptación solo recomendada. |
| Payload con raw fields | Validadores en sesión, payload final y delivery. |
| UX demasiado densa | Paneles progresivos, preview final y checklist manual. |

---

## 7. Próximo paso recomendado inmediato

Ejecutar **Fase AA — Smoke real con cámara**, usando:

```text
docs/qa/unified-assessment-manual-smoke.md
```

Después de esa prueba, priorizar bugs/UX reales antes de añadir backend o nuevas métricas.
