# Plan — EXP-8: Sala de Control / Control Room Communication Simulation (EXP-COMM-001) (2026-09-11)

**Spec recibida (desbloquea Exp 8, antes "sin spec — fuera de scope"):** 2 documentos en
`~/lrefs/`: `EXP-COMM-001_Especificacion_Tecnica_Teorica_y_Psicometrica_v1.1_Biometria_FINAL.docx`
(Draft v1.1.0 — "la spec es ley") + `EXP-COMM-001_Diseno_UI_UX_y_Reglas.docx` (v1.0.0).
Archivados en `docs/spec/EXP-COMM-001/` (referencia versionada, igual que EXP-BOMB-001).

## 1. Qué es
Micro-simulador 2D de **comunicación aplicada en coordinación operacional**. El usuario es el
coordinador de una central remota: lee datos del incidente, comunica con un NPC (operador/técnico/
supervisor/cliente) que posee información asimétrica y resuelve cada incidente **seleccionando**
preguntas/instrucciones o **construyendo mensajes con bloques** (sin teclado, un solo puntero).
6 bloques × 2 escenarios (12 evaluativos) + tutorial con 2 prácticas. 8–12 min. Tap-first
320 px–desktop. NPC 100 % determinista (árbol de diálogo, sin IA generativa en V1; el
malentendido va fijado por blueprint para comparabilidad).

Mide 7 dimensiones: claridad, relevancia/síntesis, indagación, verificación/closed loop,
adaptación al receptor, reparación y comprensión receptiva (spec §3.2). Paradigma: SJT interactivo
+ información asimétrica + circuito cerrado + branching (spec §2).

## 2. Contratos clave de la spec (resumen operativo)
- **Máquina de estados** (§7): BOOT → TUTORIAL → por bloque: BLOCK_INTRO → SCENARIO_READ →
  DECISION → MESSAGE_SENT → NPC_RESPONSE → {REPAIR | OUTCOME} → NEXT_SCENARIO → SESSION_END →
  COMPLETE. **Neutralidad**: el feedback nunca revela "la respuesta correcta" durante evaluación.
- **Entidades** (§6): Scenario, Fact (owner/criticality/visibility), Receiver (TECH/SUPERVISOR/
  CLIENT/PEER), MessageOption (intent/fact_refs/specificity/register/risk), MessageBlock
  (semantic_tag/order_role), Rule (acceptable/prohibited), NPCNode (determinista), Outcome.
- **Gramática** (§8): intenciones ASK_CRITICAL/ASK_BROAD/INFORM/INSTRUCT/CONDITION/VERIFY/
  CORRECT/ESCALATE/ACK. Calidad por etiquetas: óptimo / aceptable / subóptimo / incorrecto.
  Regla dura: falta un CRITICAL_REQUIRED → instrucción irreversible NO puntúa óptima (§8.3).
- **Blueprint** (§10): B0 tutorial (2 prácticas, 2 min) + B1 Claridad / B2 Relevancia (4–8
  distractores) / B3 Indagación (falta dato crítico) / B4 Reparación (malentendido controlado) /
  B5 Adaptación (mismo incidente, receptor distinto) / B6 Integración (ruido+dato+45 s).
  Libro base §11 diseño: CR-L1-S01 … CR-L6-S01 (formas paralelas por bloque).
- **Timing** (diseño §14): sin countdown B1–B3; timer visible solo B6 (45 s c/u); NPC reply
  200–400 ms; consecuencia 1.5–2.5 s o tap; transición 0.4–0.8 s; warning <25 %; crítico 10 s.
- **Telemetría** (§11): 18 eventos (SESSION_START, BLOCK_START, SCENARIO_START, FACT_VIEW,
  RESPONSE_OPTION_SELECT, MESSAGE_BLOCK_ADD/REORDER, MESSAGE_SEND, NPC_REPLY,
  MISUNDERSTANDING_TRIGGER, REPAIR_SEND, VERIFY_ACTION, OUTCOME, SCENARIO_END, VISIBILITY_CHANGE,
  SESSION_END) con reloj monotónico común `t_ms`.
- **Métricas** (§12.1): critical_information_coverage, relevance_ratio, clarification_precision,
  premature_commitment_rate, verification_rate, repair_success_rate, repair_latency_ms,
  audience_adaptation_fit, receptive_accuracy, redundancy_rate, message_order_accuracy.
  **Scores por dimensión** (§12.2): fórmulas transparentes (clarity = 0.55*cov + 0.25*order +
  0.20*(1−ambig); inquiry = 0.60*precision + 0.40*(1−premature); closed_loop = 0.55*verify +
  0.45*repair; pesos provisionales). **NUNCA score global** de comunicación hasta validación
  factorial (§12.2/§18).
- **Errores** (§13): 11 códigos (ERR_OMISSION, ERR_IRRELEVANCE, ERR_AMBIGUOUS_REF,
  ERR_PREMATURE, ERR_WRONG_QUESTION, ERR_NO_VERIFY, ERR_REPAIR_FAIL, ERR_AUDIENCE,
  ERR_RECEPTIVE, ERR_ORDER).
- **Integridad** (§14.2): many_visibility_losses, abnormal_fast_clicking, viewport_too_small
  (bloquea inicio), asset_or_state_error (invalida escenario, no penaliza), session_resume.
- **JSON de integración** (§19): exp_id, schema 1.1.0, device, results por dimensión,
  scenario_results, events, integrity_flags.
- **QA** (§16.1): 8 casos críticos — dato crítico faltante ⇒ óptima imposible; malentendido ⇒
  siempre hay oportunidad de reparación válida; mouse≡touch en score; drag≡botones mismo payload
  semántico; rotación no duplica eventos; localización conserva tags semánticos; error técnico ≠
  error de usuario (nunca descuenta score). DoD diseño §22 (320 px sin scroll horizontal,
  targets ≥44 px, un solo MESSAGE_SEND por envío, copy sin placeholders).
- **Biometría** (§11.1–11.14): capa **opcional de investigación** (consentimiento separado,
  calibración 12 s, FACS/gaze/head pose/rPPG, quality gates, ventanas W0–W7). **No modifica el
  score conductual** (§11.11). → **Fuera de la cadena V1** (ver C7).

## 3. Encaje en el producto KRUMM
- **Nuevo juego `control_room`** (id EXP-COMM-001, schema 1.1.0) en
  `src/tasks/original-games/control-room/` (patrón BOMB: motor puro + UI + telemetría + feedback).
- **Baterías:** entra como **7.º juego de `original`** (`?battery=original`; "Juego X de 7").
  `stable_dg` **se queda en 5** hasta pilotaje (misma decisión que BOMB). ⚠ Duración de
  `original` pasa de ~18–23 a ~26–32 min → decisión de producto en C6.
- **Constructo nuevo (provisional):** `appliedCommunication` (**10.º** del reporte,
  `descriptive_only`; sub-dimensiones por bloque, sin compuesto). Feature vector: delta aditivo
  `comm.*` en `originalGameFeatureVector.js` → `featureDefinitionsVersion` **2.3.0**
  (conserva orden/semántica de las definiciones 2.2.0).
- **Privacidad (no negociable):** agregados allowlist-only al reporte; `FORBIDDEN_ORIGINAL_GAME_FIELDS`
  ya prohíbe `messageText`/`optionText`/`scenarioText`/`choiceSequence`/`rawChoices` — el payload
  de sesión completo (§19) viaja en `artifacts.sessionPayloads`, nunca por el allowlist
  (patrón BOMB B5). Biometría **off por defecto** (`bio_tracking_loss_ms: 0`); rechazo/cámara
  ausente ⇒ score conductual completo sin penalización (spec §11.13).
- **Localización:** ES/EN vía `t(es, en)`; los tags semánticos de scoring NO cambian entre
  idiomas (QA §16.1 caso 6) → contenido del manifest en datos, no en JSX.
- **Copy:** tono literal, frases cortas, sin "correcto/incorrecto" que revele la clave, sin
  humor en incidentes críticos, sin etiquetas de "buena comunicación" (diseño §15.1).
- **Mundo visual:** centro de operaciones sobrio (tarjetas/indicadores/diagramas planos,
  diseño §17); chrome shared con tokens `--k-*`; 3–5 avatares NPC reutilizables; crítico
  = etiqueta+icono+tipografía (nunca solo color).

## 4. Cards (kanban) y secuencia

| Card | Scope | Criterio (resumen) |
|---|---|---|
| **C1 — Manifest + motor (sin UI)** | `controlRoomRules.js`: manifest versionado `control-room-v1.1` (6 bloques, 12 escenarios + 2 tutorial: facts con criticality/visibility, receivers, MessageOptions con intent tags, MessageBlocks con semantic_tag/order_role, rules acceptable/prohibited, NPC trees deterministas, malentendidos fijados, time_limit solo B6 45 s) + state machine pura §7 + validator semántico (calidades §8.2, regla CRITICAL_REQUIRED §8.3, taxonomía §13) + timer monotónico inyectable | Tests unitarios: casos QA §16.1 1,2,5,6,8 a nivel motor (falta dato crítico ⇒ óptima imposible; malentendido ⇒ oportunidad de reparación SIEMPRE; determinismo por form_id/seed; rotación/reanudación sin duplicar eventos; error técnico ≠ evaluativo) |
| **C2 — UI: sala de control responsive** | `controlRoomGame.jsx` + `controlRoom.css`: zonas §6 diseño (header con bloque/progreso/timer, contexto, panel de datos con Info Cards, burbuja NPC con avatar/rol/estados, área de respuesta con tarjetas + Composer de bloques, CTA Enviar/Undo/Continuar, consequence strip); layouts 3 tiers §7 (≥1024 / 600–1023 / 320–599 stack contexto→datos→NPC→respuesta); componentes §8 con sus estados; tap-first single-pointer; tokens `--k-*`; a11y §18 (≥44 px, sin hover-only, color+icono+texto, reduced-motion, reorder por botones "subir/bajar" + drag opcional); SFX opcionales | Smoke 1280×720 + 390×844 sin overflow horizontal; compositor 6 bloques envuelve en 2 filas sin scroll (límite §21); CTA visible tras opciones en 320 px; estados obligatorios hover/focus-visible/disabled |
| **C3 — 6 bloques + tutorial + contenido** | Intros de bloque (contextualizan sin nombrar score), 2 escenarios por bloque (libro base §11 + una forma paralela c/u), tutorial T1–T5 + bienvenida + salida (NO puntúa), NPC replies 200–400 ms, consecuencias 1.5–2.5 s neutrales, B4 reparación (malentendido determinista), B5 adaptación (mismo incidente, receptor distinto), B6 integración con presión 45 s, pantalla final de sesión | Checklist §22.1 por escenario (objetivo, hechos críticos/distractores etiquetados, óptima+alternativas revisadas, nodo determinista, resultado neutral, copy probado en móvil, eventos documentados, score trazable); copy ES/EN completo; revisión de contenido escenario→dimensión (fase 1 validación §17.1) |
| **C4 — Telemetría + métricas + scoring** | 18 eventos §11 con reloj común `t_ms` (injected clock en tests), métricas derivadas §12.1 (11), scores por dimensión §12.2 (fórmulas transparentes, pesos provisionales, SIN global), payload JSON §19, integrity flags §14.2 + VISIBILITY_CHANGE (blur → many_visibility_losses) | Tests: escenario scripteado (ruta óptima / subóptima / incorrecta) ⇒ métricas y error_tags esperados exactos; latencia ≠ mejor comunicación (§12.3 nota); payload validado contra schema §19 |
| **C5 — Batería + práctica + fixture** | Blueprint `control_room` en `originalGameBlueprints.js` (7.º de `original`; allowlist agregados del payload §19, `activation: controlled_active`), registro en `PostulationGameStage.jsx` + session builder ("Juego X de 7"), modo práctica (tutorial + 2 escenarios sin score, patrón `originalGamePractice.js`), fixture para QA de reporte, stable_dg intacta (5 juegos) | Recorrido vivo de 7 juegos sin errores; práctica completatable; fixture de sesión reconstruible desde raw events (patrón BOMB B5) |
| **C6 — Reporte + constructo + docs** | Constructo `appliedCommunication` (10.º, `descriptive_only`, sub-dimensiones, sin compuesto) en feature vector → **2.3.0** (delta aditivo `comm.*`) + `controlRoomFeedback.js` (patrón aggregate-only) + reporte (`PostulationReportSummary.js`/`PostulationReportScreen.jsx`) con "Por qué aparece así" + "Cómo volverlo medible" si aplica + caveats de validación (fases A–G §17) + doc de módulo (plantilla v2, patrón J2) + handoff + audit visual del mundo + **milestone-sync** | Reporte con 10.º constructo sin romper los 9 existentes; decisión duración batería `original` (~26–32 min) documentada; AGENTS.md sincronizado (approval de usuario); milestone-sync completo (kanban/Linear/docs) |
| **C7 — Capa biométrica (modo investigación) — EPIC SEPARADO** | Spec §11.1–11.14: consentimiento separado + explicación de datos derivados; calibración 12 s (A permiso/encuadre, B estabilización, C baseline 8 s, D chequeo ocular); inferencia local (reusa Edge AI existente; dependencia T.3b); FACS (18 AUs + AU24 opcional) + gaze AOI (panel de datos/NPC/respuestas/timer) + head pose + rPPG opcional (solo con SQI); quality gates §11.8 + flags §11.8.1; ventanas W0–W7; features normalizadas (deltas vs baseline, nunca reemplazan señal cruda); payload §11.12; **criterios de aceptación §11.14** (pérdida total de cámara NO interrumpe juego ni altera score conductual) | Queda **fuera de la cadena jugable V1**: padres C6 + T.3b (`t_c1892485`) + decisión explícita del usuario (recurso GPU/Edge AI + coorte de investigación). Ningún índice biométrico toca el score conductual (§11.11) |

**Orden:** C1 → C2 → C3 → C4 → C5 → C6 (cadenas kanban, 1-worker, GPU qwen-model,
milestone-sync por card). C7 en paralelo posterior (padres C6 + T.3b). Sin commit/push ni
deploy sin instrucción explícita; cierre de cadena ≠ deploy prod (regla vigente).

## 5. Riesgos
1. **Duración de `original`** (+8–12 min ⇒ ~26–32 min) → decisión C6; `stable_dg` inalterada.
2. **Medir lectura, no comunicación** (riesgo Alto §18) → textos breves, vocabulario controlado,
   sin countdown en B1–B3, timer solo en B6 con límites amplios; analizar distribución de tiempos
   en piloto técnico.
3. **Aprendizaje de la clave entre ítems** → feedback neutro (sin coaching en evaluación),
   formas paralelas por bloque, intenciones internas nunca visibles.
4. **Compositor móvil** (drag vs botones) → equivalencia de payload semántico obligatoria
   (QA §16.1 caso 4); drag solo atajo en desktop/tablet.
5. **Sesgo cultural/idiomático** → localización profesional ES/EN con tags invariantes;
   narrativa genérica (sin ventaja por experiencia industrial, diseño §3).
6. **Biometría prematura** → C7 aislada, off por defecto, score conductual completo sin cámara.
7. **Volumen de contenido** (14 escenarios × ES/EN × forms paralelas) → manifest es datos
   versionados (no lógica en UI); revisión experta de opciones antes de C5.

## 6. Decisiones abiertas (para el usuario)
- **D1:** ¿Autorizar la cadena C1→C6 (V1 conductual) tras Exp 8 con biometría fuera de scope?
- **D2:** Batería `original` a 7 juegos (~26–32 min) — se confirma/descarta al cerrar C6
  (alternativa: crear batería `original_extended` para no alargar la controlada actual).
- **D3:** C7 (modo biométrico de investigación): ¿incluirlo en el roadmap post-pilotaje
  (requiere T.3b + coorte consentida)? — card creada pero bloqueada como dependencia, no como
  compromiso.

## 7. Autorización
Pendiente. C1 queda **bloqueada (needs_input)** hasta aprobación explícita del usuario
(mismo patrón BOMB: comentario de autorización en card + plan + Linear). Tras autorización:
C1 ready; el resto se auto-promociona por parent/child (1-worker-per-tree).
