# Handoff EXP-8 C6 — Reporte + constructo 10° (KRU-107) — 2026-09-11

## Estado: C1–C6 COMPLETAS (KRU-102..107 Done). Epic KRU-101 In Progress (cierra con C6).

## C6 (esta entrega)
- **10° constructo `appliedCommunication`** (originalGameTalentMapping.js): descriptive_only,
  score null, 7 sub-dimensiones como evidencia (comm.*), caveat "sin score compuesto ni
  baremos", nextStep = fases de validación. `WORKBOOK_TALENT_CONSTRUCT_ORDER` = 10.
- **controlRoomFeedback.js** (feedback aggregate-only por sub-dimensión): consume el
  block summary; "¿por qué aparece esta señal?" por dimensión; caveat experimental;
  categorías coordination_effective/partial_coordination/coordination_review.
- **Reporte**: PostulationReportSummary dispatcha control_room → buildControlRoomFeedback;
  labels de las 3 categorías; copy "10 constructos" (Summary dinámico + Screen + demoCopy).
- **Tests actualizados 9→10 constructos** (talentMapping, reportScreen) + feedback
  control_room = coordination_effective en el fixture óptimo.

## Evidencia
- 303/303 tests (postulation-demo + assessment + control-room); build OK; oxlint limpio.
- Reporte jsdom: 10 score boxes / provisional tags, "10 constructos con señal",
  "Comunicación aplicada" presente, feedback sin trazas crudas.
- Commits: ver `git log --oneline` (C1..C6, este cierre = C6).

## Pendiente / próximo
- **C7 (KRU-108) = epic biometría separado, POST-PILOTAJE** (no se toca ahora). Parents:
  C6 + T.3b (t_c1892485, hardware cámara — solo-usuario).
- **Pendiente solo-usuario** (recordatorio persistente): invalidar/rotar `LAMBDA_API_KEY`
  leakada en git history (commit f44a7e4).
- Validación del módulo: piloto psicométrico (spec §17.1) antes de cualquier score compuesto.
- AGENTS.md: sincronizar estado de EXP-8 (archivo protegido — requiere aprobación del usuario).
