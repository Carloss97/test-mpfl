# Handoff EXP-8 C6 — Reporte + constructo 10° (KRU-107) — 2026-09-11

## Estado: C1–C6 COMPLETAS (KRU-102..107). Cadena jugable V1 cerrada.
## C7 (KRU-108 biometría) = epic separado post-pilotaje (no se toca).

## C6 (esta entrega)

- **10° constructo `appliedCommunication`** (`originalGameTalentMapping.js`):
  `descriptive_only`, score `null`, confidence ≤ 0.2, 7 sub-dimensiones como evidencia
  (`comm.*`), caveats `no_composite_score_subdimensions_only` /
  `scenario_specific_not_trait` / `descriptive_not_normative`. `WORKBOOK_TALENT_CONSTRUCT_ORDER` = 10
  (workbookRow 12). Señal ausente (sin control_room o agregado inválido) = `not_measured`,
  nunca bajo desempeño.
- **controlRoomFeedback.js** (feedback aggregate-only por sub-dimensión): consume solo
  escalares del block summary `control_room_block_summary_v1`; 7 sub-dimensiones con
  "¿por qué aparece esta señal?"; categorías `coordination_effective` /
  `partial_coordination` / `coordination_review` (+ `incomplete_session` / `not_available`).
  **Guard R-6**: dimensión `null` = no observada → se omite, NUNCA 0
  (fix `finite()` contra `Number(null) === 0`). 9 tests dedicados.
- **Reporte**: `PostulationReportSummary` dispatch `control_room` → feedback + labels de
  las 3 categorías + **métricas por juego** (Escenarios evaluados 12/12, Incidentes
  resueltos, Mensajes enviados, Tiempo de lectura) + `CONSTRUCT_DEMO_EXPLANATIONS.
  appliedCommunication` ("Por qué aparece así" / "Cómo volverlo medible", fases §17.1) +
  resumen ejecutivo con los 7 juegos. Copy "10 constructos" ES/EN (demoCopy, screen,
  summary dinámico).
- **V3 empresa (demo)**: `companyProcessDetail.js` agrega `control_room` con agregado
  GENUINO del motor (guion óptimo) + sub-dimensiones escaladas por factor de calidad del
  candidato (patrón bomb_defusal) + eventos `communication_completed` con `controlRoom`.
  Demo = 7 juegos, 10 constructos (6 provisional + 4 descriptivos), overall invariante
  (media de constructos no-nulos; score null no entra).
- **Matrices R-7 (src/validation/)**: `appliedCommunication: 'descriptive_only'` en
  `CONSTRUCT_AVAILABILITY` (contentValidity + cognitiveUsability) + 3 rows de borrador en
  `PROVISIONAL_MATRIX` (comm.clarity / comm.inquiry / comm.verification_closed_loop,
  `origin: exp8_comm_draft`, veredicto `revisar`).
- **Docs**: `docs/design/modulos/control_room.md` (plantilla v2, secciones 0–17 + A) +
  audit visual `docs/qa/exp8-c6-visual-audit/` (PASS 4/4, desktop/móvil) + este handoff.

## Referencias de spec corregidas en el cierre (ley: EXP-COMM-001)

La primera versión de C6 citaba secciones inexistentes (§13.2, §15.3, "30–50 participantes
§15") y §14.3 como "feedback" (es Privacidad). Corregido a las reales:
- Scoring/dimensiones: Doc 1 **§12.1/§12.2** (sin score global hasta estructura factorial),
  **§12.3** (compuesto experimental interno + nota latencia).
- Validación: Doc 1 **§17/§17.1** (7 fases: validez de contenido, entrevistas cognitivas,
  piloto técnico, piloto psicométrico, evidencia convergente, criterial, equidad) y
  **§17.2** (tamaño de muestra con apoyo psicométrico — NO "30–50").
- Riesgo score compuesto: Doc 1 **§18**.
- Privacidad: Doc 1 **§14.3** (biometría §11.13).
- Neutralidad/feedback: Doc 2 **§2** (pilar), **§16**, **§20.1** (error evaluativo =
  consecuencia narrativa).

## Evidencia (números reales del cierre)

- **Suite completa**: ver §"Gates finales" (suite + oxlint + build + audit abajo).
- Focales C6: controlRoomFeedback 9/9, originalGameTalentMapping 9/9,
  PostulationReportScreen, V3CompanyReport 19/19, V3CompanyProcess 29/29,
  contentValidity 9/9, cognitiveUsability 14/14.
- **Audit visual**: `docs/qa/exp8-c6-visual-audit/` PASS — 4/4 runs, 0 fallos, 0 errores de
  consola, 0 overflow (1280×720 + 390×844). Script:
  `scripts/audit-t_b17fd176-c6-comm-visual.mjs`.
- Commits: C1 `ac909c6`/`f5c3578` · C2 `469691c` · C3 `990492f`/`34657f2` · C4 `17caeb0` ·
  C5 `d70c5b1` · C6 `74f56b8` + cierre de verificación (este commit).

## Gates finales (cierre de verificación)

- `NODE_ENV=test vitest run` (suite completa, pool=threads): **1282/1282 (145 archivos, 0 fallos)**.
- `oxlint` (postulation-demo, tasks, main.jsx, assessment, validation, v3): **0 errores**
  (1 warning preexistente en `ParticipantAssessmentFlow.jsx`, fuera de scope C6).
- `npm run build`: **OK** (5.8 s).
- Smoke/audit reporte fixture 7 juegos + mundo: **PASS 4/4** (0 fallos, 0 errores de consola,
  0 overflow; 1280×720 + 390×844) — `docs/qa/exp8-c6-visual-audit/` (smoke-result.json ok:true),
  script reproducible `scripts/audit-t_b17fd176-c6-comm-visual.mjs`.

## Decisiones / pendientes

- **Duración batería `original` (plan §5 riesgo 1 / D2)**: `original` = **7 juegos (~26–32 min)**
  (C5 shipped, C6 documenta); `stable_dg` inalterada (5 juegos, ~14–16 min) hasta pilotaje.
  Alternativa D2 (batería `original_extended` separada) sigue **pendiente de decisión del
  usuario** — no se implementó.
- **AGENTS.md**: archivo protegido — sincronización de estado EXP-8 requiere aprobación
  explícita del usuario (pendiente; diff preparado en kanban comment).
- **C7 (KRU-108)**: epic biometría separado, post-pilotaje. Parents: C6 + T.3b
  (`t_c1892485`, hardware cámara) + decisión explícita del usuario (D3 plan §6).
- **Pendiente solo-usuario (persistente)**: invalidar/rotar `LAMBDA_API_KEY` leakada en git
  history (commit `f44a7e4`).
