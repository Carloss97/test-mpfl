# Política de Privacidad KRUMM — /postulaciones-demo

**Fecha:** 2026-09-03  
**Versión:** v1.0  
**Estado:** Borrador (firma DPO/legal en paralelo, Fase M5)

## Principios Generales

1. **Privacy by design.** El procesamiento de datos faciales y de telemetría ocurre exclusivamente en el dispositivo del postulante. Nunca se transmiten videos, frames, capturas de pantalla ni datos reconstructivos al backend.
2. **Transparencia.** El presente documento describe qué datos se recogen, para qué fin, cómo se protegen y cuáles son los derechos del usuario.
3. **Minimización.** Solo se conservan agregados sin identificar. No se almacenan claves prohibidas (video, landmarks, rawFrames, blendshapesRaw, etc.).
4. **Revisión humana.** Los reportes finales están diseñados para apoyo a entrevista estructurada; no toman decisiones automáticas de contratación o talento.

## Datos Recogidos (Batería Original)

| Categoría | Datos | Almacenamiento | Retención |
|-----------|-------|----------------|-----------|
| Señales faciales | Action Units (AUs), eye gaze, head pose | Agregado en ventana móvil (5s); counts, means, stddevs | Sesión activa + 30d (TTL DynamoDB) |
| Eventos de juego | target_shown, target_click, trial completions | Metadatos-only (no DOM/pointer samples) | Sesión activa + 30d |
| Metadatos de sesión | runId, batteryId, start/end timestamps | En DynamoDB (PK sessionId, expiresAt) | 30d TTL |
| Calidad de captura | illumination, occlusion, frontal score | Agregado por sesión | Sesión activa |

## Datos que NUNCA se Almacenan (Prohibido)

`video`, `rawVideo`, `frames`, `rawFrames`, `imageData`, `screenshot`, `landmarks`, `keypoints`, `normalizedKeypoints`, `faceSamples`, `blendshapesRaw`, `pointerSamples`, `rawPointerPath`, `fullRoute`, `routeTrace`, `visitedCells`, `stepByStepPath`, `clickTrace`, `eventLog`, `pumpSequence`, `beamCells`, `rawGameEvents`, `choiceCategory`, `trials`, `trialResults`, `stimuli`, `items`, `windows`, `DOMEvent`, `domEvent`, `rawDOMEvents`, `MouseEvent`, `PointerEvent`

## Flujo de Datos

1. **Inicio.** El postulante ingresa a `/postulaciones-demo` y acepta consentimiento explícito.
2. **Cámara (opcional).** Si el usuario concede permiso, la cámara captura frames en el navegador. Solo se extraen AUs y métricas agregadas (no landmarks crudos).
3. **Procesamiento local.** `edgeAiEngine.js` y `auProcessor.js` operan completamente en el browser. Se genera un `edgeAIResult` con canales calificados y confidence scores.
4. **Reporte.** Al finalizar la batería, `reportGenerator.js` produce un JSON agregado con scores 0–100, caveats, y flags `privacyValidation.ok === true`.
5. **Persistencia.** El payload se POSTea a `POST /sessions` (API Gateway → Lambda → DynamoDB). Server-side `validateSessionPayload` rechaza si hay FORBIDDEN_KEYS o `privacyValidation.ok !== true`.

## Derechos del Usuario

- **Oponer cámara.** El postulante puede descartar el uso de cámara en cualquier momento; los juegos continúan sin telemetría facial; solo se registra un caveat `low_face_presence`.
- **Acceso y rectificación.** El postulante puede solicitar la eliminación de su sesión vía `/postulaciones-demo/hr` (read-only) o contacto DPO.
- **Limitaciones.** Los scores 0–100 son *provisionales* y sin baremos comparativos. No implican validez psicométrica ni decisiones automáticas.

## Contacto DPO / RGPD

- **Delegado de Protección de Datos:** carlos.saldivia@sansano.usm.cl  
- **Política de retención:** 30 días tras sesión completa (TTL DynamoDB + EventBridge Scheduler).  
- **Eliminación bajo solicitud <24h:** ruta administrativa en `/postulaciones-demo/hr` → *Delete session*.

## Cambios Recientes

- 2026-09-03: Política publicada; DPIA draft listo para revisión DPO; FORBIDDEN_KEYS server-side validación (M2) operativa.

---

*Esta política forma parte de la Fase M5 (Seguridad/privacidad/CI guards). Para la versión final firmada por DPO, ver `docs/legal/privacy-policy-final.md` después de firma.*