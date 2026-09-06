<!--
================================================================================
MÓDULO JUEGO ORIGINAL: Operación Faro (`team_coordination`)
================================================================================
Instancia de: docs/design/modulos/plantilla-modulo-original-game.md (v2)
Fuente de verdad: código real en src/ (backfill J2, 2026-09-06)
Estado: implementado (backfill documental post-implementación)
================================================================================
-->

# Módulo Juego Original: Operación Faro (`team_coordination`)

> **Versión plantilla:** `original-game-unified_v2`
> **Versión del módulo:** `1.0.0`
> **Fecha:** `2026-09-06`
> **Autor(es):** `hermes (backfill J2, a partir del código real del repo)`
> **Estado:** `implementado`
> **Runtime de inferencia:** `Edge AI (WASM / WebGL) — Zero Cloud`
> **Ruta producto:** `/postulaciones-demo`
> **Batería:** `original_games` (`?battery=original`) — **Fallback:** `stable_dg`

---

## 0. Traza de implementación (rutas reales `src/`)

| Sección doc | Archivo(s) `src/` | Export/Función clave | Tests |
|---|---|---|---|
| 1. Objetivo/flujo | `tasks/original-games/TeamCoordinationPostulationTask.jsx` | Componente, `onComplete` | `TeamCoordinationPostulationTask.test.jsx` |
| 2. Escenarios | `tasks/original-games/teamCoordinationTelemetry.js` | `buildTeamCoordinationScenarios` | `teamCoordinationTelemetry.test.js` |
| 3. Textos UX | `tasks/original-games/TeamCoordinationPostulationTask.jsx` | i18n `t(es,en)`, `GameMicroIntro`, RPG scene | `TeamCoordinationPostulationTask.test.jsx` |
| 4. Scoring | `tasks/original-games/teamCoordinationTelemetry.js` | `scoreBundle`, `buildTeamCoordinationResponseAggregate` | `teamCoordinationTelemetry.test.js` |
| 5. Visual/Feedback | `tasks/original-games/TeamCoordinationPostulationTask.jsx` | `RpgScene`, `BehindPanel` (bitácora táctica) | test componente + smoke |
| 7. State machine | `tasks/original-games/TeamCoordinationPostulationTask.jsx` | `introDone`, `currentIndex`, `selectedOption`, `finished` | test componente |
| 8. Contrato ingesta | `tasks/original-games/teamCoordinationTelemetry.js` | Scenario object (freeze): `prompt`, `options[]`, `scores` | `teamCoordinationTelemetry.test.js` |
| 9. Pipeline señales | `telemetry/gameCorrelation.js` | `correlateGameWithMultimodalSignals` | `gameCorrelation.test.js` |
| 10. Contratos evento | `tasks/original-games/TeamCoordinationPostulationTask.jsx` | `emit` stimulus_shown/response/game_end | test componente |
| 11. Métricas derivadas | `assessment/originalGameFeatureVector.js` | `addTeamCoordinationFeatures`, defs `team.*` | `originalGameFeatureVector.test.js` |
| 12. Contrato salida | `tasks/original-games/teamCoordinationTelemetry.js` | `sanitizeTeamCoordinationResponsePayload`, `TEAM_COORDINATION_ALLOWED_RESPONSE_FIELDS` | `teamCoordinationTelemetry.test.js` |
| 13. Privacidad | `tasks/original-games/teamCoordinationTelemetry.js` + `teamCoordinationFeedback.js` | `FORBIDDEN_TEAM_COORDINATION_KEYS`, `TEAM_FEEDBACK_FORBIDDEN_KEYS`, `validateTeamCoordinationAggregatePrivacy` | tests + privacyValidation |
| 14. Riesgos | `tasks/original-games/teamCoordinationFeedback.js` | `buildTeamCoordinationFeedback` | `teamCoordinationFeedback.js` (sin test propio aún) |

---

## 1. Objetivo y flujo de usuario

RPG táctico por texto: el candidato lidera un escuadrón (Mara 🧭 Operaciones, Leo 📡 Comunicaciones, Nia 🛠️ Campo) ante cuatro crisis de coordinación y elige entre 3 opciones estructuradas por escenario. Cada opción tiene un `scoreBundle` de 8 dimensiones; se persisten **solo medias agregadas** (nunca la opción elegida, su categoría ni texto).

### 1.1. Propósito (una frase)
Evidenciar **juicio social estructurado** (liderazgo, comunicación, adaptabilidad, decisión en contexto simulado) mediante elecciones estructuradas — **no** interacción grupal real.

### 1.2. Constructos objetivo (provisionales, R-6 / T.4)

| Constructo (provisional) | Feature vector key(s) | Disponibilidad | Caveat / evidencia |
|---|---|---|---|
| `leadership` (estructurado) | `team.leadershipScore` (+alignment, roleClarity) | `insufficient` | Juicio social estructurado, no interacción grupal ni peer rating; requiere validación. |
| `communication` (estructurada) | `team.communicationScore` (+feedbackUse, alignment) | `insufficient` | Sin texto libre; opciones predefinidas limitan expresión. |
| `adaptability` | `team.adaptabilityScore` (+changeResponse) | `insufficient` | Reportado descriptivo, **sin score como constructo** (T.4 #4/#12). |
| `decision quality` | `team.decisionQualityScore` | `insufficient` | Descriptivo (T.4 #11); sin punto de corte normativo. |

> **T.4 #6 (deprecación):** el `score` global del juego (media de las 4 funciones) se sigue calculando por compatibilidad de wire/payload, pero **NO se usa en reporte ni dashboard** (Miyake et al. 2000 — no colapsar funciones ejecutivas).

### 1.3. Alcance IN / OUT
- **IN:** 4 escenarios benchmark (alinear roles, cambio de prioridad, feedback/ambigüedad, recurso perdido); 3 opciones/escenario; teclado 1-4/A-D + Enter/Espacio; bitácora táctica con métricas activas en vivo (display only); `TEAM_TARGET_SCORE = 0.75` (umbral de exhibición, no corte de talento).
- **OUT:** interacción grupal real, texto libre, speech/writing evaluation; contratación.

---

## 2. Estructura de escenarios

| # | Id | Título | Escena | Constructos medidos (chips) |
|---|---|---|---|---|
| 1 | `team-brief-1-alignment` | Inicio de turno: tres frentes abiertos | Acto I · Sala de mando (Mara) | liderazgo, comunicación, decisión |
| 2 | `team-brief-2-communication` | Mensaje al equipo: cambio de prioridad | Acto II · Canal de emergencia (Leo) | comunicación, adaptabilidad, decisión |
| 3 | `team-brief-3-feedback` | Feedback del equipo: tarea poco clara | Acto III · Sala táctica (Nia) | comunicación, liderazgo, feedback |
| 4 | `team-brief-4-adaptation` | Imprevisto final: falta un recurso clave | Acto IV · Terminal Norte (Mara) | adaptabilidad, liderazgo, decisión |

Onboarding: `GameMicroIntro` (overlay) antes de iniciar; sin fase tutorial por nodos. Práctica de batería aislada con `markPracticeSummary`.

## 3. Textos e instrucciones (UX Copy)

| Pantalla | Texto ES | Texto EN | Notas |
|---|---|---|---|
| Bitácora (aside) | `KRUMM observa elecciones estructuradas; no guarda texto libre ni conversación real.` | `KRUMM observes structured choices; it stores no free text or real conversation.` | disclaimer de privacidad visible |
| Persistencia | `Se persisten solo scores agregados y conteos; no se guarda la opción ni su categoría.` | `Only aggregated scores and counts persist; the option and its category are not stored.` | |
| Hint teclado | `Teclado: 1–4 o A–D elegir opción · Enter/Espacio continuar` | `Keyboard: 1–4 or A–D choose option · Enter/Space continue` | `GAME_KEYBOARD.team` |
| Señal registrada | `Señal registrada: <why>` | `Signal recorded: <why>` | por opción, explicación observable |

Cada escenario tiene `prompt`/`promptEn`, escena (acto, locación, speaker, narración) y 3 opciones con `label/labelEn`, `why/whyEn`, `category` (solo interna, **no se persiste**).

## 4. Scoring

- Por escenario, la opción elegida entrega un `scoreBundle` de 8 ratios [0,1]: `leadership, communication, adaptability, decision, alignment, roleClarity, feedbackUse, changeResponse`.
- Agregado (`team_coordination_aggregate_v1`): media por dimensión sobre escenarios respondidos; `completed` solo si `completedScenarioCount >= scenarioCount`.
- Respuestas con claves prohibidas se **descartan** en el agregado (`hasForbiddenKeys` defensivo).

## 5. Elementos visuales y feedback (UI/UX)
- Escena RPG: top-line (acto/turno/GamePips), escuadrón (3 miembros con estado efecto por dimensión), diálogo con retrato, opciones como botones.
- BehindPanel: chips de constructos medidos + métricas en vivo (%) con `—` hasta primera decisión.
- Escape de teclado completo (`teamKeyAction`: 1-4/A-D seleccionan; Enter/Espacio confirma).

## 6. Referencias diseño
- `docs/plans/2026-07-21-original-games-v2-laser-passenger-team-rpg-plan.md`.
- Blueprint: `src/postulation-demo/originalGameBlueprints.js` (entry `team_coordination`, skill `structured_team_coordination`, `durationLabel: '2 min'`, `trialCount: 4`).

---

## 7. Máquina de estados
```
INTRO -> introDone -> START (scenarioStartRef)
ESCENARIO_i -> selección (click/teclado) -> response emit + agregado parcial
  -> siguiente escenario (i+1) ... -> fin -> agregado final -> game_end -> onComplete
```
La interacción (selección) está disponible por botón y teclado en todo escenario; gates solo aíslan fase práctica/telemetría.

## 8. Contrato de ingesta (escenario)

```js
/** Scenario (Object.freeze): id, title/titleEn, prompt/promptEn,
 *  scene: {act, location, speaker, role, portrait, narration (+En)},
 *  measuredConstructs: [chips visibles],
 *  options: [{id, label/labelEn, category, why/whyEn, scores: scoreBundle(8 dims)}] */
```

## 9. Pipeline de señales (Edge AI)
- Eventos `game_event_v1` por escenario + `game_end`; correlación contextual vía `gameCorrelation.js`.
- Latencia por escenario (`reactionTimeMs`) agregada al `response`; biometría solo contexto/calidad.

## 10. Contratos de evento (`game_event_v1`)

| Evento | meta/response |
|---|---|
| `stimulus_shown` | scenario id/index/title |
| `response` | `sanitizeTeamCoordinationResponsePayload`: correct, outcome `structured_choice`, reactionTimeMs, score (media 4 funciones, legacy), subobjeto `teamCoordination` allowlist |
| `game_end` | agregado final (mismo allowlist) |

## 11. Métricas conductuales derivadas (feature vector)

| Key | Fórmula | Nota |
|---|---|---|
| `team.completion` | `completed ? 1 : 0` | disponibilidad |
| `team.leadershipScore` | media `leadership` opciones | +alignment/roleClarity en definición |
| `team.communicationScore` | media `communication` | +feedbackUse |
| `team.adaptabilityScore` | media `adaptability` | descriptivo, no constructo T.4 |
| `team.decisionQualityScore` | media `decision` | descriptivo T.4 #11 |
| `team.alignmentScore` | media `alignment` | fallback → communication si falta |
| `team.roleClarityScore` | media `roleClarity` | fallback → leadership |
| `team.feedbackUseScore` | media `feedbackUse` | fallback → communication |
| `team.changeResponseScore` | media `changeResponse` | fallback → adaptability |
| `team.timeMs` | ms totales | contexto |

Defs completas en `originalGameFeatureVector.js` (10 features `team.*`, ORDER estable).

## 12. Contrato de salida

### 12.1. Allowlist (`TEAM_COORDINATION_ALLOWED_RESPONSE_FIELDS` / `team_coordination_aggregate_v1`)
`aggregateSchemaVersion, score (legacy), completed, scenarioCount, completedScenarioCount, leadershipScore, communicationScore, adaptabilityScore, decisionQualityScore, alignmentScore, roleClarityScore, feedbackUseScore, changeResponseScore, timeMs, aggregateOnly: true`.

### 12.2. Campos PROHIBIDOS
- `FORBIDDEN_TEAM_COORDINATION_KEYS` (telemetry): `freeText, typedResponse, messageText, optionText, scenarioText, selectedOptionId, selectedOptionLabel, choiceSequence, choiceCategory, rawChoices, rawGameEvents, pointerSamples, clickTrace, DOMEvent, domEvent`.
- `TEAM_FEEDBACK_FORBIDDEN_KEYS` (feedback): `freeText, typedResponse, messageText, optionText, scenarioText, selectedOptionId, selectedOptionLabel, choiceSequence, rawChoices, rawGameEvents, pointerSamples`.
- **No se persiste:** opción elegida, su texto, su categoría, ni el orden de selección en raw; solo medias agregadas.

## 13. Privacidad y gobernanza (checklist)
- [x] Sin texto libre ni transcripciones; opciones estructuradas con contenido fijo del autor.
- [x] `validateTeamCoordinationAggregatePrivacy` verifica ausencia de claves prohibidas.
- [x] Disclaimer de privacidad visible en UI (BehindPanel).
- [x] Score global legacy **no** en reporte (T.4 #6).
- [x] Lenguaje observacional, `humanReviewOnly`, `noAutomatedDecision`, `descriptive_only`.
- [x] Umbral `TEAM_TARGET_SCORE = 0.75` = meta de exhibición interna, no punto de corte de talento.

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Confundir "liderazgo estructurado" con liderazgo real | `limitations` explícitas por feature; disclaimers UI |
| Opciones predefinidas limitan expresión | caveat por feature; no claims de escritura/habla |
| Colapso de 4 funciones en un score | score global deprecado para interpretación (T.4 #6) |
| Fuga de opción elegida | allowlist escalar + filtros en aggregate y sanitize |

## 15. Criterios de aceptación (gates ejecutados 2026-09-06)

```bash
NODE_ENV=test npx vitest run src/tasks/original-games/TeamCoordinationPostulationTask.test.jsx src/tasks/original-games/teamCoordinationTelemetry.test.js
```
- [x] Tests componente (intro, selección teclado+botón, agregado, payload privacy).
- [x] Allowlist-only; `hasForbiddenKeys` descarta respuestas contaminadas.
- [x] Feature vector `team.*` (10 features) con qualityFlags.
- [ ] Pendiente: test propio para `teamCoordinationFeedback.js` (backfill futuro, fuera de scope J2).
