# KRUMM Postulation Demo — Sprint / Gantt / Kanban de cierre MVP

**Fecha base:** 2026-07-09  
**Repo:** `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl`  
**Ruta:** `/postulaciones-demo`  
**Estado base:** Dv2 completada y commiteada (`a8d6853 Dv2`).  

## 1. Principio de planificación

No saltar directo a servidor/LLM/dashboard. Primero convertir el flujo local ya probado en una demo presentable y robusta:

1. Cerrar reporte local productizado.
2. Hacer la demo reproducible con fixture y smoke real.
3. Diseñar contrato HR/API.
4. Añadir CV/rol e inferencia servidor como módulo aislado.
5. Construir dashboard recruiter.
6. Endurecer para piloto.

Reglas constantes:

- `humanReviewOnly: true`.
- `noAutomatedDecision: true`.
- `observationalOnly: true`.
- No video, frames, landmarks, keypoints, raw game events, raw windows ni raw pointer paths en artefactos finales.
- Sin claims de contratación/rechazo/diagnóstico/personalidad/verdad.

---

## 2. Carta Gantt propuesta — 12 semanas

| Bloque | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | S11 | S12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Base Dv2 | cerrado |  |  |  |  |  |  |  |  |  |  |  |
| Report UX + descargas | Fase F | descargas |  |  |  |  |  |  |  |  |  |  |
| HUD/drawer + fixture |  | HUD | fixture | QA visual |  |  |  |  |  |  |  |  |
| CV + server inference design |  |  | CV schema | parser | LLM PoC |  |  |  |  |  |  |  |
| HR dashboard frontend |  |  |  |  | wireframes | list/detail | viewer |  |  |  |  |  |
| Backend/API/storage |  |  |  |  |  | contract | API | auth | audit |  |  |  |
| Pilot hardening |  |  |  |  |  |  |  | security | privacy | device QA | pilot | docs |

---

## 3. Kanban de cierre MVP

### Done / base cerrada

- **Dv2 route-specific**
  - `gameCorrelation.aggregate` real.
  - `assessment_feature_vector_v2` integrado.
  - Edge AI v9.1 route-specific con fallback caveated.
  - Privacy scan sin raw exports.

- **Candidate stage**
  - Landing.
  - Setup/consent.
  - Juegos estables.
  - HUD básico.
  - Report preview local.

### Next sprint — S1/S2

- **PostulationReportScreen**
  - Cards de calidad, habilidades, resultados por juego y caveats.
  - Sección governance visible.
  - Technical drawer para JSON/Markdown.
  - Tests de render y lenguaje conservador.

- **Download bundle UX**
  - Botones Markdown/HTML/JSON/manifest.
  - Validación previa a descarga.
  - Nombres de archivo consistentes.
  - Tests de bundle y privacy-safe.

- **Behind-the-scenes drawer**
  - Explicar inferencia local.
  - Mostrar señales disponibles/no disponibles.
  - Mostrar sincronización por `performance.now()`.
  - No mostrar datos crudos.

### Backlog priorizado — S3/S8

- **Fixture sintético `?fixture=1`**
  - Datos etiquetados como sintéticos.
  - Prohibir mezcla con sesión real sin etiqueta.
  - Reporte demostrable sin cámara/juegos completos.

- **CV/rol schema**
  - Upload/parsing.
  - Alias/hash.
  - Rol objetivo declarado.
  - Separación clara entre CV y evidencia conductual.

- **Server inference / LLM lane**
  - Contrato de entrada: CV + final payload agregado.
  - Contrato de salida: `report_enriched_v1` o similar.
  - Prompts/gobernanza/versionado.
  - Fallback si LLM no está disponible.

- **HR Dashboard frontend**
  - Login recruiter.
  - Candidate list.
  - Candidate detail/report viewer.
  - Filtros por cargo, fecha, calidad, caveats.
  - Comparación/shortlist sin ranking automático.
  - Descarga/share del reporte.

- **Backend/API/storage**
  - `submitAssessmentReport()` real.
  - Auth/tenant.
  - Storage aggregate-only.
  - Retención/deleción.
  - Audit log.

### Hardening/piloto — S8/S12

- **Security/privacy review**
  - Threat model.
  - Data inventory.
  - Política de retención y borrado.
  - Consent copy.
  - Revisión legal/privacy.

- **Device/browser matrix**
  - Chrome/Edge.
  - Múltiples cámaras.
  - Low-light.
  - 1366×768, 1440×900, 1920×1080.
  - Cámara permitida y denegada.

- **Pilot protocol**
  - Runbook.
  - Smoke manual.
  - Métricas de éxito.
  - Soporte.
  - Validación inicial de confiabilidad/usabilidad.

---

## 4. Plan recomendado replanteado

### Paso 1 — Cerrar experiencia local end-to-end

Implementar Fase F antes de backend:

- `PostulationReportScreen.jsx`.
- `PostulationReportSummary.jsx`.
- `PostulationReportTechnicalDrawer.jsx`.
- Descargas productizadas.
- Tests focales y build.

**Criterio de salida:** una persona puede jugar o usar fixture y terminar con una pantalla de reporte presentable sin ver panel técnico.

### Paso 2 — Asegurar demo confiable

- Fixture `?fixture=1`.
- QA visual con Playwright.
- Smoke real con cámara permitida/denegada.
- Runbook para reunión.

**Criterio de salida:** demo reproducible aunque falle cámara o no haya tiempo para jugar toda la batería.

### Paso 3 — Diseñar contrato HR antes de backend

- Definir schema de envío.
- Definir qué queda local, qué se persiste, qué se borra.
- Definir auth/tenant/roles.
- Definir versionado y auditoría.

**Criterio de salida:** contrato revisable antes de implementar dashboard/backend.

### Paso 4 — Añadir CV/rol como módulo aislado

- CV upload/parsing primero con fixture/mock.
- Luego LLM server opcional.
- Mantener separación entre CV y señales conductuales.

**Criterio de salida:** CV enriquece el reporte, pero no altera los guardrails ni genera decisión automática.

### Paso 5 — Construir dashboard recruiter MVP

- Candidate list.
- Report viewer.
- Filtros y caveats.
- Descargas.
- Comparación sin ranking automático.

**Criterio de salida:** RR.HH. puede acceder a resultados y leerlos como soporte humano.

### Paso 6 — Endurecer para piloto

- Seguridad.
- Privacy/legal.
- Device/browser QA.
- Protocolo piloto.
- Validación psicométrica/usabilidad inicial.

**Criterio de salida:** listo para piloto controlado, no producción masiva.
