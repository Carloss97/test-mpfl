# Módulo Juego Original: Sala de Control / Control Room (`control_room`)

> **EXP-COMM-001 · comunicación aplicada en coordinación operativa.**
> Estado: **7° juego de la batería `original` (`controlled_active`) · constructo experimental
> 10° (`appliedCommunication`, `descriptive_only`) · feature vector `comm.*` 2.3.0 · sin
> baremos ni score compuesto (spec §12.2/§18) · human-review-only.**
> Spec (ley): `docs/spec/EXP-COMM-001/` — Doc 1 Especificación Técnica/Teórica/Psicométrica
> v1.1 FINAL + Doc 2 Diseño UI/UX y Reglas v1.0.0.
> Plan de ejecución: `docs/plans/2026-09-11-plan-exp8-comm.md` (C1–C7, KRU-101..108).
> Handoff: `docs/plans/2026-09-11-handoff-exp8-c6.md`.
> Cadena EXP-8: C1 `ac909c6`/`f5c3578` · C2 `469691c` · C3 `990492f`/`34657f2` ·
> C4 `17caeb0` · C5 `d70c5b1` · C6 `74f56b8` + cierre de verificación (ver §16).

## 0. Traza de implementación (rutas reales `src/`)

| Concern | Archivo | Card |
|---|---|---|
| Manifest versionado + diálogos deterministas + formas paralelas | `src/tasks/original-games/control-room/controlRoomRules.js` | C1/C3 |
| Taxonomía canónica (intents, veredictos, errores, eventos §11, dimensiones §12.2) | `src/tasks/original-games/control-room/controlRoomTaxonomy.js` | C1 |
| Máquina de estados pura + validador semántico + input gate + event buffer | `src/tasks/original-games/control-room/controlRoomEngine.js` | C1 |
| Timer monotónico inyectable (budget por escenario, sin penalización §12.3) | `src/tasks/original-games/control-room/controlRoomTimer.js` | C1 |
| UI responsive 3 tiers + orquestación de sesión (welcome→tutorial→bloques→final) | `src/tasks/original-games/control-room/controlRoomGame.jsx` | C2/C3 |
| Mundo "centro de operaciones" (tokens `--k-*`, paleta local) + a11y §18 | `src/tasks/original-games/control-room/controlRoom.css` | C2 |
| Payload `control_room_session_v1` §19 + block summary + payload sintético genuino | `src/tasks/original-games/control-room/controlRoomTelemetry.js` | C4/C5 |
| Feedback aggregate-only por sub-dimensión (reporte) | `src/tasks/original-games/control-room/controlRoomFeedback.js` | C6 |
| Tests (timer, rules, engine, UI, sesión, telemetría, feedback) | `src/tasks/original-games/control-room/*.test.js(x)` | C1–C6 |
| Blueprint `control_room` (allowlist + battery) | `src/postulation-demo/originalGameBlueprints.js` | C5 |
| Registro en batería original (7° juego) | `src/postulation-demo/PostulationGameStage.jsx` | C5 |
| Feature vector `comm.*` (2.3.0) | `src/assessment/originalGameFeatureVector.js` | C5 |
| Constructo 10° `appliedCommunication` | `src/assessment/originalGameTalentMapping.js` | C6 |
| Reporte (métricas por juego + explicación del constructo + copy) | `src/postulation-demo/PostulationReportSummary.js` / `PostulationReportScreen.jsx` / `postulationDemoCopy.js` | C6 |
| Demo empresa (V3) — agregado genuino + eventos | `src/v3/companyProcessDetail.js` | C6 |
| Práctica + instruction check | `src/tasks/original-games/originalGamePractice.js` / `candidateInstructionCheck.js` (`summarizeControlRoom`) | C5 |

## 1. Objetivo y flujo de usuario

### 1.1. Propósito (una frase)

Micro-simulador 2D de **comunicación aplicada en coordinación**: el candidato es el
coordinador de una central remota y resuelve 12 incidentes comunicando con un NPC
(operador/técnico/supervisor) de información asimétrica, **seleccionando** preguntas o
instrucciones o **construyendo mensajes con bloques** (sin teclado, un solo puntero).

**No es un test de velocidad ni de conocimiento del dominio**: los incidentes técnicos son
pretexto narrativo; se mide la coordinación comunicativa (spec §1/§2).

### 1.2. Constructos objetivo (provisionales, R-6)

- **Primario (10° del workbook)**: `appliedCommunication` — `descriptive_only`, score
  `null`, 7 sub-dimensiones §12.2 como evidencia (`comm.*`), confidence ≤ 0.2,
  **sin score compuesto ni baremos** (spec §12.2/§18: no score global hasta estructura
  factorial demostrada).
- **Colaterales (spec §3.4, solo contexto)**: atención a datos críticos, memoria de
  trabajo de diálogo. No se derivan constructos nuevos colaterales.

### 1.3. Alcance IN / OUT (del módulo)

IN: 6 bloques × 2 formas (A base + B paralela por `deriveParallelForm`) + 2 prácticas;
tutorial T1–T5 (no puntúa); validación semántica §8; métricas §12.1; dimensiones §12.2;
payload §19; integridad §14.2 (incluye `VISIBILITY_CHANGE` → `many_visibility_losses`).

OUT (V1): IA generativa en el NPC (árbol determinista), biometría (C7, epic separado,
off por defecto), audio/voz, teclado/multi-puntero, localización además de ES/EN,
score global de comunicación.

## 2. Estructura de bloques / escenarios

| Bloque | Dimensión focal | Escenarios (forma A) | Presión temporal |
|---|---|---|---|
| B1 Claridad | `clarity` | CR-L1-S01 | Sin countdown (§12.3) |
| B2 Relevancia/síntesis | `relevance_and_synthesis` | CR-L2-S01 (4–8 distractores) | Sin countdown |
| B3 Indagación | `inquiry` | CR-L3-S01 (falta dato crítico) | Sin countdown |
| B4 Reparación | `repair` | CR-L4-S01 (malentendido fijado por blueprint) | Sin countdown |
| B5 Adaptación al receptor | `adaptation` | CR-L5-S01 (mismo incidente, receptor distinto) | Sin countdown |
| B6 Integración bajo presión | todas | CR-L6-S01 (ruido + dato + 45 s) | Timer visible 45 s, **sin penalización** (§12.3) |

- Total: **14 escenarios evaluativos/juegables** = 6 × 2 formas (A + B) + 2 práctica
  (`CR-PRACTICE-01`, `CR-PRACTICE-02`, solo forma A). La forma se asigna
  **determinísticamente por hash(scenario + seed)** (manifest `control-room-v1.1`).
- Duración objetivo: 8–12 min (batería `original` pasa a ~26–32 min; `stable_dg`
  inalterada en 5 juegos — decisión C5/C6, plan §5 riesgo 1).
- Malentendido B4 **fijado por blueprint** (comparabilidad, plan §2); el feedback de
  consecuencia es **neutral**: describe el estado del incidente, nunca "correcto/incorrecto"
  (Doc 2 §2/§15.1/§20.1).

## 3. Textos e instrucciones (UX Copy)

- **El contenido vive SOLO en el manifest** (`controlRoomRules.js`): escenarios, tarjetas,
  bloques de mensaje, diálogos NPC, textos de consecuencia — ES/EN inline por campo.
  Ningún JSX codifica texto de escenario (regla C1; QA §16.1 caso 6: localización
  conserva los tags semánticos porque el scoring usa `COMM_INTENTS`/veredictos, no texto).
- Tono (Doc 2 §15.1): literal, frases cortas, sin humor en incidentes críticos, sin
  etiquetas de "buena comunicación", sin placeholders.
- Intenciones internas (`COMM_INTENTS`: ASK/INFORM/INSTRUCT/CONDITION/VERIFY/CORRECT/
  ESCALATE) **nunca visibles** (evita aprendizaje de la clave, plan §5 riesgo 3).
- Tutorial T1–T5 + welcome (no puntúa, `practice: true`).

## 4. Economía del juego

No aplica: no hay puntos, energía ni recursos competitivos. La calidad de la acción es
**semántica** (veredictos `optimal`/`acceptable` del validador §8.2) y la consecuencia es
**narrativa neutral** (estado del incidente tras la acción, Doc 2 §20.1).

## 5. Elementos visuales y feedback (UI/UX)

- Mundo "centro de operaciones" sobrio (Doc 2 §17): tarjetas/indicadores/diagramas planos,
  avatares NPC reutilizables, chrome shared con tokens `--k-*` + paleta local en
  `controlRoom.css`.
- Zonas (Doc 2 §6): header (bloque/progreso/timer), contexto, panel de datos (Info Cards),
  burbuja NPC (avatar/rol/estados), área de respuesta (tarjetas + compositor de bloques),
  CTA Enviar/Continuar, consequence strip.
- 3 tiers (Doc 2 §7): ≥1024 / 600–1023 / 320–599 (stack contexto→datos→NPC→respuesta).
- Feedback inmediato = consecuencia del incidente (1.5–2.5 s o tap), **neutral durante la
  evaluación** (Doc 2 §2/§16/§20.1). Crítico = etiqueta + icono + tipografía, nunca solo
  color (plan §3, a11y §18: targets ≥44 px, sin hover-only, reduced-motion).
- Reordenamiento de bloques: botones "subir/bajar" + drag opcional (equivalencia de
  payload obligatoria, QA §16.1 caso 4).

## 6. Referencias diseño

- `docs/spec/EXP-COMM-001/EXP-COMM-001_Especificacion_..._v1.1_Biometria_FINAL.docx` (Doc 1, ley).
- `docs/spec/EXP-COMM-001/EXP-COMM-001_Diseno_UI_UX_y_Reglas.docx` (Doc 2, ley).
- `docs/design/design-system.md` (tokens `--k-*`) + `docs/plans/2026-09-11-plan-exp8-comm.md`.
- Referencias conceptuales de la spec §20 (Clark & Brennan 1991, Grice 1975, Hargie 2011,
  Motowidlo et al. 1990, Salas et al. 2005) — ver Doc 1 §20.

## 7. Máquina de estados del juego (state machine)

Pura (sin DOM), en `controlRoomEngine.js` (9 estados por escenario; flujo de sesión
welcome→tutorial→6 bloques→final orquestado por `controlRoomGame.jsx`):

```
INTRO → READING → NPC_TURN → RESPONSE → VERIFICATION → CONSEQUENCE → TRANSITION → COMPLETE
                                        ↘ (malentendido B4) → RESPONSE (reparación)
TECHNICAL_ERROR (fallo técnico: invalida escenario, NUNCA penaliza — spec §13.1/§16.1 caso 8)
```

- Input gate §12.3: una sola acción relevante por estado; rotación/reanudación sin
  duplicar eventos (QA §16.1 caso 5; `RESUME_SESSION` + `VISIBILITY_CHANGE`).
- Timer: solo B6 (45 s, sin penalización en score — §12.3: la latencia no se transforma
  en "mejor comunicación"; reloj monotónico inyectable `now()`).
- Determinismo: mismo `form_id` ⇒ misma oportunidad (Doc 1 §1.1); malentendido B4 fijado.

## 8. Contrato de ingesta de datos (manifest versionado)

- `CONTROL_ROOM_CONFIG_VERSION = 'control-room-v1.1'` (build 1.1.0, experience
  `EXP-COMM-001`).
- Entidades (Doc 1 §6): Scenario, Fact (owner/criticality/visibility), Receiver
  (TECH/SUPERVISOR/CLIENT/PEER), MessageOption (intent/fact_refs/specificity/register/risk),
  MessageBlock (semantic_tag/order_role), Rule (acceptable/prohibited), NPCNode
  (determinista), Outcome.
- Regla dura §8.3: falta un CRITICAL_REQUIRED → instrucción irreversible NO puntúa óptima.
- Timing (Doc 1 §14.1): NPC reply 300 ms, consecuencia 2000 ms (o tap), transición 500 ms,
  warning <25 %, crítico 10 s.

## 9. Pipeline de señales (Edge AI, privado por diseño)

- **V1: sin biometría propia.** La capa biométrica (FACS/gaze/head pose/rPPG, calibración
  12 s, ventanas W0–W7) es el epic **C7 separado** (KRU-108, post-pilotaje, off por
  defecto, §11.1–11.14). Ningún índice biométrico modifica el score conductual (§11.11);
  pérdida total de cámara NO interrumpe el juego ni penaliza (§11.14).
- En batería completa, la cámara del flujo aporta solo **contexto/calidad** del reporte
  compartido (mismo tratamiento que los demás juegos originales; nunca inferencia directa).

## 10. Contratos de evento (`game_event_v1` + diccionario §11)

- Diccionario canónico: `COMM_EVENT_NAMES` — **18 eventos** (SCENARIO_START, INFO_CARD_TAP,
  INFO_PANEL_SCROLL, NPC_MSG_SHOWN, CARD_SELECTED, CARD_DESELECTED, BLOCK_ADDED,
  BLOCK_REORDERED, BLOCK_REMOVED, MESSAGE_SEND, MESSAGE_EDIT_AFTER_SEND, NPC_REPLY_SHOWN,
  VERIFICATION_SENT, VERIFICATION_RECEIVED, CONSEQUENCE_SHOWN, TIMEOUT_TRIGGERED,
  RESUME_SESSION, VISIBILITY_CHANGE), con reloj común `t_ms` relativo al escenario.
- 6 eventos críticos (§13.1) portan `t_ms` + `scenario_id` + nodo/step afectado.
- En batería: el evento `game_event_v1` agregado (stimulus/response) porta SOLO el block
  summary (allowlist §12.1); el payload de sesión completo (§19, con `events`) viaja en
  `artifacts.sessionPayloads`, nunca por el allowlist (patrón BOMB B5).

## 11. Métricas conductuales derivadas (provisionales, `descriptive_only`)

**11 métricas §12.1** (escalar, allowlist): `first_decision_latency_ms`,
`average_decision_latency_ms`, `time_spent_reading_ms`, `pre_send_edit_count`,
`pre_send_reorder_count`, `total_message_count`, `question_count`, `verification_count`,
`confirmation_requested`, `confirmation_given`, `timeout_count`.

**7 dimensiones §12.2** (0–100 o `null` si sin oportunidad observada; pesos provisionales
y **no fijados hasta pilotaje**): `clarity`, `relevance_and_synthesis`, `inquiry`,
`verification_closed_loop`, `adaptation`, `repair`, `receptive_understanding`.

**Prohibido**: score global de "comunicación", percentil o ranking (spec §12.2/§18;
riesgo "score compuesto prematuro" = Alto → "reportar subdimensiones hasta contar con
evidencia factorial"). Latencia ≠ mejor comunicación (§12.3 nota importante).

## 12. Contrato de salida

### 12.1. Agregados (allowlist-only)

`control_room_block_summary_v1` (`buildControlRoomBlockSummary`, C5): escalares solo —
`aggregateSchemaVersion`, `completed`, `state`, `scenarioCount`, `scoredCount`,
`resolvedCount`, `resumeCount`, las 11 métricas §12.1, las 7 dimensiones §12.2 (0–100 o
null), `integrityFlagCount`, `sessionPayloadVersion`, `aggregateOnly: true`.
Allowlist declarada en `originalGameBlueprints.js` (blueprint `control_room`,
`activation: controlled_active`) + `sanitizeOriginalGameAggregate`.

### 12.2. Assessment feature vector

`featureDefinitionsVersion 2.3.0`: **delta aditivo 7 keys `comm.*`** (0–1, tras las 53 keys
de 2.2.0, sin reordenar; 60 keys totales) + `observedMask` por key.
`addControlRoomFeatures`: valida `aggregateOnly` + `scenarioCount > 0` + rangos 0–100 +
sin keys prohibidas; inválido ⇒ `gameAvailability.control_room = 'invalid'` + flag
`control_room_contains_forbidden_raw_keys` (NUNCA score 0: señal ausente ≠ bajo
desempeño, R-6).

### 12.3. Payload de sesión (esquema JSON spec §19)

`control_room_session_v1`: `exp_id`, `schema_version 1.1.0`, `device`, `results` por
dimensión, `scenario_results` (incluye `error_tags`), `events` (con `t_ms`),
`integrity_flags`. Viaja en `artifacts.sessionPayloads` (privacidad: nunca por allowlist).

### 12.4. Campos PROHIBIDOS (privacy guard)

Texto enviado (`messageText`), texto de tarjetas/bloques (`cardTexts`/`blockTexts`),
diálogos NPC (`npcMessages`), secuencias de elección (`choiceSequence`/`rawChoices`),
eventos crudos (`rawGameEvents`/`eventLog`/`eventCounts`), trazas de puntero
(`pointerSamples`/`rawPointerPath`), frames/biometría cruda — guardados en
`FORBIDDEN_ORIGINAL_GAME_FIELDS` (blueprint) + `CONTROL_ROOM_FEEDBACK_FORBIDDEN_KEYS`
(feedback) + `validateOriginalGameFeatureVectorPrivacy`.

## 13. Privacidad y gobernanza (no negociables — estado verificado 2026-09-11)

- [x] Agregados allowlist-only al reporte (block summary escalar).
- [x] Payload §19 completo fuera del allowlist (`artifacts.sessionPayloads`).
- [x] Feedback del reporte consume SOLO escalares allowlisted (tests de keys prohibidas).
- [x] `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe` en el
  framework/report (compartido con la batería original).
- [x] Señal ausente = `null`/"No medido", nunca 0/50 (guard `Number(null) === 0` en
  feedback + feature vector; test dedicado).
- [x] Cámara/biometría: off en V1 (C7 separado); si se usa, contexto/calidad, nunca
  inferencia directa de talento (contrato científico R-6).
- [x] Fixture: payload GENUINO del motor (guion óptimo determinista), marcado sintético
  (`synthetic: true`), no corresponde a persona real.

## 14. Riesgos y mitigaciones (plan §5 + spec §18)

| Riesgo | Impacto | Mitigación implementada |
|---|---|---|
| Medir lectura, no comunicación | Alto | Textos breves, vocabulario controlado, sin countdown B1–B5, timer solo B6 con límite amplio 45 s; distribución de tiempos se analiza en piloto técnico (§17.1 fase 3) |
| Aprendizaje de la clave entre ítems | Medio | Feedback neutral (no coaching en evaluación), formas paralelas A/B, intenciones internas nunca visibles |
| Score compuesto prematuro | Alto | 7 sub-dimensiones separadas; score `null`; caveat permanente §12.2/§18 |
| Sesgo cultural/idiomático | Alto | Localización ES/EN con tags invariantes; narrativa genérica (sin ventaja por experiencia industrial, Doc 2 §3) |
| Compositor móvil (drag vs botones) | Medio | Equivalencia de payload semántica obligatoria (QA §16.1 caso 4); drag solo atajo |
| Error técnico ≠ error de usuario | — | `TECHNICAL_ERROR` invalida escenario sin penalizar (QA §16.1 caso 8) |
| Duración de `original` ~26–32 min | Medio | `stable_dg` inalterada (5); decisión D2 del plan (batería extendida alternativa) pendiente de usuario |

## 15. Criterios de aceptación (gates) — ejecutados 2026-09-11

| Gate | Card | Estado |
|---|---|---|
| Manifest + state machine + validator + timer (30 tests, QA §16.1 1,2,5,6,8) | C1 | ✅ `ac909c6` |
| UI responsive 3 tiers + a11y + SFX (smoke 1280×720 + 390×844, sin overflow) | C2 | ✅ `469691c` + `docs/qa/kru103-c2-ui-smoke.md` (21/21) |
| 6 bloques + tutorial T1–T5 + contenido ES/EN (smoke sesión 24/24) | C3 | ✅ `990492f`/`34657f2` + `docs/qa/kru104-c3-session-smoke.md` |
| 18 eventos + 11 métricas + 7 dimensiones + payload §19 + integrity | C4 | ✅ `17caeb0` |
| Blueprint 7° juego + práctica + fixture genuino (recorrido vivo 7 juegos) | C5 | ✅ `d70c5b1` |
| Constructo 10° + feedback + reporte + docs + audit | C6 | ✅ `74f56b8` + cierre de verificación (este doc, §16) |
| QA §16.2 DoD (320 px sin scroll horizontal, targets ≥44 px, 1 MESSAGE_SEND por envío, copy sin placeholders) | C2/C3 | ✅ smokes C2/C3 |

## 16. Bitácora de incidentes / lecciones (C6, 2026-09-11)

1. **`Number(null) === 0` en el feedback** (cerrado): la WIP de C6 usaba
   `Number(value)` sin guard; una dimensión `null` (sin oportunidad observada, p. ej.
   `repair` en el guion óptimo) se reportaba como score **0** en `dimensionFeedback`,
   violando "sin señal = null, nunca 0". Fix: guard explícito `value == null → null` en
   `finite()` + test dedicado (se omite la dimensión, nunca 0).
2. **Referencias de spec inventadas** (cerrado): la WIP citaba `§14.3 (feedback)`,
   `§13.2`, `§15/§17` y "piloto 30–50 participantes (§15.3)" — ninguna existe en la spec
   (ley). Corregido a las secciones reales: §12.2/§12.3 (scoring), §17/§17.1 (7 fases de
   validación), §17.2 (tamaño de muestra con apoyo psicométrico), §18 (riesgo score
   compuesto), §14.3 (privacidad), Doc 2 §2/§16/§20.1 (neutralidad/feedback).
3. **Demo empresa V3 sin control_room** (cerrado): `scaledSummary`/`demoGameEvents` de
   `companyProcessDetail.js` caían al fallback genérico (sin `controlRoom` agregado) →
   constructo 10° `not_measured` + 4 tests rotos. Fix: agregado GENUINO del motor con
   escalado por factor de calidad (patrón bomb_defusal).
4. **Métricas por juego ausentes en el reporte** (cerrado): sin branch `control_room` en
   `getOriginalGameMetrics`, la card mostraba el fallback "Ensayos: 0". Fix: branch con
   escalares del block summary (escenarios evaluados, resueltos, mensajes, tiempo de
   lectura).
5. **Cierre parcial en paralelo** (lección): el commit `74f56b8` marcó C6 done con
   subset de tests ("303/303") sin la suite completa; el cierre de verificación (este
   doc) ejecutó suite completa + oxlint + build + smoke y aplicó los fixes 1–4.

## 17. Validación (nextStep — spec §17.1)

Fases (nombres reales de la spec; **no** "A–G" — esa es la numeración de EXP-BOMB-001):

1. Validez de contenido (matriz escenario→dimensión, revisión experta).
2. Entrevistas cognitivas (comprensión de instrucciones y opciones).
3. Piloto técnico (dificultad, distribuciones, fallos de telemetría).
4. Piloto psicométrico (confiabilidad, estructura, correlaciones entre subescalas).
5. Evidencia convergente (medidas externas relacionadas).
6. Evidencia criterial (conductas/criterios laborales pertinentes).
7. Equidad (dispositivo, idioma, grupos relevantes según marco legal).

Tamaño de muestra: definido con apoyo psicométrico (§17.2); piloto de usabilidad/
telemetría pequeño + piloto psicométrico posterior sustancialmente mayor. **Solo tras
evidencia factorial se considera score compuesto** (§12.2/§18).

## A. Referencias técnicas

- `docs/spec/EXP-COMM-001/` (Doc 1 + Doc 2, ley).
- `docs/plans/2026-09-11-plan-exp8-comm.md` (plan C1–C7, riesgos, decisiones D1–D3).
- `docs/plans/2026-09-11-handoff-exp8-c6.md` (handoff C6 + cierre de verificación).
- `docs/qa/exp8-c6-visual-audit/` (audit visual del mundo, desktop/móvil, 2026-09-11).
- Patrón de referencia: `docs/design/modulos/bomb_defusal.md` (EXP-BOMB-001).
