# Protocolo de smoke manual — Experiencia gamificada unificada KRUMM

> Documento operativo para ejecutar la Fase Y fuera del entorno headless/WSL. Esta validación requiere navegador real, permisos de cámara y un participante encuadrado.

**Fecha:** 2026-06-19  
**Estado:** protocolo listo; ejecución con cámara real pendiente de realizar en navegador del usuario.  
**Bloque relacionado:** Fase Y del plan `docs/plans/unified-gamified-assessment-experience-plan.md`.

---

## 1. Objetivo

Validar la experiencia completa como participante real:

```text
cámara activa
  → consentimiento
  → calibración
  → baseline
  → secuencia de juegos
  → recovery
  → sesión unificada
  → perfil de talento
  → payload final
  → reporte humano
  → export local
```

La prueba debe confirmar que la app funciona como flujo evaluativo completo y que no exporta datos crudos sensibles.

---

## 2. Preflight técnico

Ejecutar desde la raíz del repo:

```bash
npm install --include=dev
npm run build
NODE_ENV=test npx vitest run --pool=threads
```

Resultado esperado:

```text
build OK
suite OK
0 vulnerabilidades altas
```

Luego iniciar servidor:

```bash
npm run dev
```

Abrir en navegador real:

```text
http://localhost:5173
```

---

## 3. Checklist de cámara/señal

| Paso | Esperado | Resultado |
|---|---|---|
| Iniciar cámara | El navegador solicita permiso y muestra video local. | [ ] |
| FaceMesh | Se dibuja malla facial estable. | [ ] |
| FACS/AUs | Se actualizan AUs activos al gesticular. | [ ] |
| Gaze | Indicador de mirada responde tras 2-3s/calibración. | [ ] |
| Postura | Head tilt/forward cambian al mover cabeza/postura. | [ ] |
| MoveNet | Detecta hombros/brazos si están visibles; si no, muestra estado/error. | [ ] |
| Privacidad visible | UI declara que no guarda video/frames/landmarks/pointer paths. | [ ] |

---

## 4. Checklist de batería unificada

| Paso | Esperado | Resultado |
|---|---|---|
| Abrir “Evaluación gamificada unificada” | Aparece panel R/S. | [ ] |
| Consentimiento | Copy privacy-safe visible; botón de aceptar. | [ ] |
| Camera check | Si cámara está apagada, pide iniciarla. | [ ] |
| Baseline | Muestra instrucción de postura estable/mirada centro. | [ ] |
| RT Simple | Bloque inicia y termina; registra eventos. | [ ] |
| Precisión/Fitts | Requiere punto de inicio; no se confunde con RT simple. | [ ] |
| Pursuit Tracking | Objetivo se mueve automáticamente. | [ ] |
| Go/No-Go | Timeout en No-Go cuenta como withholding; no hay botón falso de “no pulsé”. | [ ] |
| Stroop | Palabras largas como AMARILLO caben. | [ ] |
| Visual Search | Muestra target entre distractores. | [ ] |
| Descansos | Transiciones/rest visibles entre bloques. | [ ] |
| Recovery | Cierre/postura estable final. | [ ] |

---

## 5. Checklist de datos finales

| Artefacto | Esperado | Resultado |
|---|---|---|
| `gameSummary` | `performance.completedTrialCount > 0`. | [ ] |
| `gameCorrelation.aggregate` | `completedTrialCount > 0`. | [ ] |
| `assessment_feature_vector_v2` | `featureArray` finito y `qualityFlags` razonables. | [ ] |
| `adaptiveDifficultyTrace` | Al menos recomendaciones `up/down/hold` trazables. | [ ] |
| `krumm_unified_assessment_session_v1` | `privacy.ok === true`. | [ ] |
| `krumm_talent_profile_v1` | 10 dimensiones con score/confidence/evidence/caveats. | [ ] |
| `krumm_final_assessment_payload_v1` | Governance `humanReviewOnly/noAutomatedDecision/privacySafe`. | [ ] |
| Reporte Markdown | Legible; contiene resumen ejecutivo + habilidades + caveats. | [ ] |
| Reporte HTML | Abre/renderiza sin errores. | [ ] |
| Reporte JSON | Schema `krumm_talent_report_v1`. | [ ] |
| Bundle local | Incluye reportes y opcional research export. | [ ] |

---

## 6. Privacy review manual

Buscar explícitamente en los artefactos descargados que NO existan claves:

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
```

Notas:

- El reporte puede mencionar “no se exportaron landmarks” como texto de gobernanza.
- Lo prohibido son claves/campos crudos persistidos o reconstructivos.

---

## 7. Criterios de aceptación de Fase Y

La Fase Y queda aceptada cuando:

- [ ] La batería completa se puede ejecutar en navegador real sin intervención técnica.
- [ ] La cámara permanece activa durante baseline, juegos y recovery.
- [ ] Se actualizan señales faciales, gaze, postura y MoveNet/estado.
- [ ] Se generan sesión, perfil, payload final y reportes.
- [ ] El reporte es comprensible para una persona evaluadora.
- [ ] No aparecen datos crudos prohibidos en export.
- [ ] Cualquier limitación de señal queda como caveat, no como fallo silencioso.

---

## 8. Limitación de esta ejecución en Hermes/WSL

Desde esta sesión no hay navegador automatizable ni permisos reales de cámara disponibles. Por eso se completó:

- smoke sintético integral automatizado (`assessmentExperienceSmoke.test.js`),
- build,
- suite completa,
- audit,
- privacy scans,
- protocolo manual detallado.

La validación de cámara real queda necesariamente para ejecución local en el navegador del usuario.
