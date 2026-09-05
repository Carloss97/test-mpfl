# KRUMM Postulación — Product Design Document (PDD)

**Fecha:** 2026-07-26
**Versión:** `pdd_v1`
**Estado:** borrador de consolidación (deriva de `docs/product/*` y `docs/reference-guide.md`)
**Ruta producto:** `/postulaciones-demo`
**Batería default/fallback:** `stable_dg`
**Batería original controlada:** `original_games` (`?battery=original`)
**Fixtures:** `?fixture=1` y `?fixture=1&battery=original`

> Documento de diseño de producto (PDD). Consolida el "qué" y el "para quién" de la demo
> `/postulaciones-demo` sin reescribir los contratos técnicos ni la hoja de ruta. El PDD es el
> dueño del **alcance**; el proceso scope-driven (SDD) está en `krumm-postulation-sdd.md`.
>
> **Metodología scope-driven (PDD + SDD):** ver `docs/design/README.md`. El PDD es dueño del
> alcance in/out; el SDD es el proceso que arranca cada slice desde ese Scope.

---

## 1. Resumen de producto

KRUMM Postulación es una superficie de producto que separa la experiencia del candidato del
dashboard técnico. El postulante ve landing, preparación de señales y juegos fullscreen; la
cámara, FaceMesh, AUs/FACS, gaze, postura y MoveNet corren en segundo plano solo cuando se
habilitan. El resultado es un reporte de talento observacional, aggregate-only, de revisión
humana, sin decisión automatizada.

**No es** una herramienta psicométrica validada ni un sistema de decisión de contratación.

---

## 2. Problema y oportunidad

### 2.1 Problema
El demo técnico original mezclaba la experiencia del evaluador y del candidato en una sola
interfaz, dificultando presentarlo a reclutadores y postulantes sin exponer complejidad de
señales multimodales. Faltaba una narrativa de producto clara y conservadora para HR.

### 2.2 Oportunidad
Ofrecer a revisores humanos un soporte complementario basado en evidencia observacional
agregada (no raw), con caveats explícitos, para complementar —no reemplazar— entrevistas y
evaluaciones técnicas.

### 2.3 Restricción ética central
Hasta contar con validación normativa (R-7), todo uso es `descriptive_only`: sin percentiles,
cortes, ranking ni apto/no apto. Ausencia de señal = desconocida/caveated, nunca desempeño bajo.

---

## 3. Usuarios y segmentos

| Rol | Necesidad | Restricción |
|---|---|---|
| Candidato/postulante | Experiencia clara, consentimiento, juegos fullscreen, sin juicio visible. | Cámara/biometría opcional; sin raw reconstructivo. |
| Recruiter / revisor | Reporte legible, evidencia por juego, caveats y calidad de señal. | Human-review-only; sin decisión automática. |
| Revisor técnico | Trazabilidad de agregados, contratos de señal, privacy guard. | Solo agregados allowlist-only. |
| Admin/empresa (roadmap) | Invitaciones, roles, exportación, eliminación. | Fase B/C del roadmap, no en demo actual. |

---

## 4. Principios de diseño

1. **Privacidad por diseño:** solo agregados; nunca video, frames, landmarks, keypoints, rutas,
   celdas, pointer samples, eventos DOM crudos ni secuencias por acción.
2. **Cámara/biometría = contexto/calidad, no inferencia de talento/personalidad/emoción/estrés/
   fatiga/sinceridad/decisiones de contratación.**
3. **Lenguaje observacional:** el reporte describe conducta observable, no diagnostica ni recomienda
   contratar/rechazar.
4. **Conservador por defecto:** `score: null` para evidencia faltante (no cero ni 50 neutro).
   Leadership/communication y frustración-tolerancia son `not_measured` con la batería actual.
5. **Fallback robusto:** `stable_dg` es default; `original_games` solo con disclaimer y revisión.

---

## 5. Alcance del producto (demo actual)

### 5.1 Incluido (fases A–D de la demo MVP)

| Fase | Superficie | Módulo principal | Estado |
|---|---|---|---|
| A — Shell producto | Landing aislada `/postulaciones-demo` | `PostulationDemoApp.jsx`, `PostulationLanding.jsx` | Completada |
| B — Setup/señales | Consentimiento + cámara local opcional + HUD fondo | `PostulationConsentSetup.jsx`, `BackgroundSignalOrchestrator.jsx`, `BehindTheScenesMiniHud.jsx` | Completada |
| C — Game stage | Juegos fullscreen + progreso + HUD discreto | `PostulationGameStage.jsx`, `PostulationProgressHeader.jsx`, `postulationDemoConfig.js` | Completada |
| D — Reporte v1 | Sesión + talentProfile + payload + reportes MD/HTML/JSON + bundle | `postulationDemoSessionBuilder.js`, `PostulationDemoApp.jsx` | D v1 implementada |

Privacidad: la demo no muestra el dashboard técnico ni guarda raw. El reporte es human-review-only.

### 5.2 Fuera de alcance (roadmap, no demo)

Backend aggregate-only, invitaciones, roles, dashboard recruiter, R-7, piloto B2B, producto
comercial v1. Ver `docs/product/krumm-productization-roadmap.md`.

---

## 6. Flujo del candidato (experiencia)

1. **Landing** — propósito, privacidad y consentimiento.
2. **Preparación de señales** — cámara opcional, checklist de calidad (SignalReadiness).
3. **Juegos fullscreen** — batería unificada RT → Fitts → Tracking → Go/No-Go → Stroop →
   Visual Search; progreso visible, HUD discreto de fondo.
4. **Cierre** — bundle local + reporte; sin decisión automática.

El modo demo rápido (`DEMO_BATTERY_CONFIG`) reduce baseline/recovery/descansos/trials sin alterar
el modo estandarizado.

---

## 7. Requisitos de producto

| ID | Requisito | Prioridad |
|---|---|---|
| PR-1 | Landing aislada sin router nuevo ni cambios en app técnica. | Alta |
| PR-2 | Consentimiento explícito + cámara local opcional. | Alta |
| PR-3 | Reporte observacional, aggregate-only, sin claims de decisión. | Alta |
| PR-4 | 0 overflow horizontal en 390×844 y 1280×720. | Alta |
| PR-5 | Cada métrica visible con caveat o justificación. | Alta |
| PR-6 | Bundle local descargable sin campos prohibidos. | Media |
| PR-7 | Modo demo rápido separable del estandarizado. | Media |

---

## 8. Métricas de éxito (producto)

Tomadas del roadmap Fase A/E: completion rate objetivo ≥ 80% sin asistencia; 0 errores
consola/page/request en smoke; reporte entendido por recruiter ≥ 80%; payloads con raw fields = 0.

---

## 9. Riesgos de producto y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Overclaiming HR / decisión automática | Lenguaje observacional, `noAutomatedDecision`, `humanReviewOnly`. |
| Señal ausente interpretada como bajo desempeño | `score: null` + caveats; nunca cero. |
| Complejidad expuesta al candidato | Shell producto aislado; sin dashboard técnico. |
| MoveNet sin hombros visibles | Sin fallback FaceMesh; status/error y guía de acercamiento. |

---

## 10. Referencias y fuentes

- `docs/product/README.md` — paquete documental producto.
- `docs/product/krumm-productization-roadmap.md` — línea de tiempo Fase A–F.
- `docs/product/krumm-data-signal-inference-contract.md` — contrato de datos (técnico).
- `docs/reference-guide.md` — arquitectura multimodal A–Z y R–Z.
- `docs/plans/postulation-demo-mvp-product-plan.md` — plan MVP de producto.
- `docs/plans/postulation-demo-original-games-integration-plan.md` — integración original games.
- SDD (proceso scope-driven): `docs/design/krumm-postulation-sdd.md`.

## 11. No negociables (privacidad/gobernanza)

- No persistir video, frames, landmarks, keypoints, rutas, celdas, pointer samples, eventos DOM
  crudos ni secuencias por acción.
- Cámara/biometría solo como calidad/contexto.
- Ausencia de señal = desconocida; nunca bajo desempeño.
- Sin percentiles, cortes, ranking ni apto/no apto hasta validación normativa.
