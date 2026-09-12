# Módulo: Sala de Control (EXP-COMM-001) — comunicación aplicada en coordinación

> Estado: **7° juego de la batería `original` (controlled_active) · constructo experimental (10°, `appliedCommunication`, descriptive_only) · sin baremos ni score compuesto · human-review-only.**
> Spec (ley): `docs/spec/EXP-COMM-001/` (Doc 1 técnica/psicométrica v1.1 FINAL + Doc 2 UI/UX v1.0.0).
> Plan de ejecución: `docs/plans/2026-09-11-plan-exp8-comm.md` (C1–C7, KRU-101..108).
> Handoff: `docs/plans/2026-09-11-handoff-exp8-c6.md`.

## 1. Qué es

Micro-simulador 2D de **comunicación aplicada en coordinación operativa**. El usuario es un
coordinador en un centro de control que comunica con un receptor humano (NPC) en terreno
(operador/técnico/supervisor) mediante **tarjetas de respuesta seleccionables y bloques de
mensaje** (sin teclado; puntero único). 6 bloques × 2 escenarios (12 evaluados, 2 formas
paralelas A/B) + 2 de práctica (tutorial T1–T5). Duración objetivo 8–12 min.

**No es un test de velocidad ni de conocimiento del dominio**: mide comunicación aplicada en
contexto de coordinación. Los incidentes técnicos son pretexto narrativo.

## 2. Estructura (src/tasks/original-games/control-room/)

| Archivo | Rol | Card |
|---|---|---|
| `controlRoomRules.js` | Manifest versionado `control-room-v1.1`: 14 escenarios (grafo determinista de steps), 2 formas paralelas A/B, taxonomía de contenido | C1/C3 |
| `controlRoomTaxonomy.js` | 18 eventos §11, 6 críticos §13.1, 11 métricas §12.1, 7 dimensiones §12.2, clases de error §13, integrity flags §14.2 | C1 |
| `controlRoomEngine.js` | Máquina de estados pura §7 + input gate §12.3 + validador semántico §8 + timer inyectable + event buffer | C1 |
| `controlRoomTimer.js` | Timer monotónico inyectable (budget por escenario, sin penalización §12.3) | C1 |
| `controlRoomGame.jsx` | UI responsive 3 tiers + orquestación de sesión (welcome→tutorial→evaluación→final) | C2/C3 |
| `controlRoom.css` | Mundo "centro de operaciones" (H4.5, paleta local) + a11y §18 | C2 |
| `controlRoomTelemetry.js` | Payload `control_room_session_v1` §19 + `buildControlRoomBlockSummary` (batería) + payload sintético genuino (fixture) | C4/C5 |
| `controlRoomFeedback.js` | Feedback aggregate-only por sub-dimensión (reporte) | C6 |
| `*.test.js` / `*.test.jsx` | 48 tests (timer 7, rules 11, engine 12, UI 8, sesión 4, telemetría 6); el feedback se verifica en los tests del reporte | C1–C6 |

## 3. Modelo de scoring (spec §12.2) — **sin score global**

7 dimensiones por separado (ratio 0–100 de acciones exitosas en la dimensión):
`clarity`, `relevance_and_synthesis`, `inquiry`, `verification_closed_loop`, `adaptation`,
`repair`, `receptive_understanding`. **Prohibido** score global, percentil o ranking
(spec §12.2/§17). Feature vector 2.3.0: 7 keys `comm.*` (0–1, aditivo tras las 53 keys
existentes, sin reordenar; observedMask por key).

## 4. Privacidad (spec §15, gobernanza)

- Solo eventos versionados + métricas agregadas + flags de integridad.
- **Nunca**: texto enviado, texto de tarjetas/bloques, decisiones crudas, eventos crudos,
  trazas de puntero, audio, video, frames, biometría (C7 off por defecto).
- `buildControlRoomBlockSummary` (escalar) viaja a la batería (allowlist blueprint +
  `sanitizeOriginalGameAggregate`); el payload §19 completo viaja aparte en artifacts.
- Tests de privacidad: payload sin campos prohibidos + feature vector validado.

## 5. Batería y reporte

- `originalGameBlueprints.js`: blueprint `control_room` (controlled_active, allowlist
  escalares, reportDimension "comunicación aplicada... revisión humana").
- `PostulationGameStage.jsx`: registrado en `DEFAULT_GAME_COMPONENTS`.
- Batería `original` = **7 juegos** (stable_dg inmutable, 5). "Game X of 7" dinámico.
- Reporte: 10° constructo `appliedCommunication` (descriptive_only, 7 sub-dimensiones,
  score null, caveat "sin baremos ni score compuesto"). Feedback por sub-dimensión
  ("¿por qué aparece esta señal?"). Instruction check: `summarizeControlRoom`.

## 6. Evidencia (2026-09-11)

- Tests: 303/303 (postulation-demo + assessment + control-room); build OK; oxlint limpio.
- Smoke UI: `docs/qa/kru103-c2-ui-smoke.md` (21/21, 1280×720 + 390×844).
- Smoke sesión: `docs/qa/kru104-c3-session-smoke.md` (24/24, welcome→tutorial→evaluación).
- Commits: C1 `ac909c6`/`f5c3578`, C2 `469691c`, C3 `990492f`/`34657f2`, C4 `17caeb0`,
  C5 `d70c5b1`, C6 (este cierre).

## 7. Validación y límites (caveat permanente)

- Módulo experimental: 7 sub-dimensiones descriptivas, **sin score compuesto ni baremos**
  (pesos no fijados hasta piloto, spec §12.2/§17).
- No es un test de personalidad ni de comunicación general: señal de escenario específico.
- Formas paralelas A/B no confirman validez de contenido (misma estructura).
- Path de validación: piloto psicométrico (30–50 participantes) → convergencia con
  evaluación externa por supervisor → solo entonces considerar score compuesto (spec §17.1).
- C7 (biometría) = epic separado, **post-pilotaje** (KRU-108), off por defecto.

## 8. Cómo ejecutar

- Dev/ smoke UI: `/dev/control-room` (?scenario=CR-PRACTICE-01 | ?mode=session).
- Batería original: `/postulaciones?battery=original&invite=...` (juego 7 de 7).
- Fixture: `/postulaciones?fixture=1&battery=original`.
- Tests: `NODE_ENV=test npx vitest run src/tasks/original-games/control-room`.
