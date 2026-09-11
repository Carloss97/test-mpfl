# Handoff EXP-8 COMM — C1 + C2 done (2026-09-11 19:48)

## Estado
| Card | Linear | Estado | Commit(s) |
|---|---|---|---|
| t_c8b3ec82 C1 motor | KRU-102 | ✅ done 19:27 | `ac909c6` (motor) + `f5c3578` (spec+plan) |
| t_a2d9f478 C2 UI responsive | KRU-103 | ✅ done 19:48 | `469691c` (UI) |
| t_d5965d8d C3 contenido | KRU-104 | ⏭ ready (auto-promovida 19:48) | WIP en tree ✳ |

## Evidencia
- **C1 (KRU-102)**: manifest `control-room-v1.1` (14 escenarios: 6 bloques × 2 formas A/B + 2 práctica), state machine §7, validador semántico §8 (CRITICAL_REQUIRED §8.3), timer inyectable sin penalización. 30/30 tests vitest (timer 7 + rules 11 + engine 12) + casos QA §16.1 #1,#2,#5,#6,#8. oxlint limpio, build OK.
- **C2 (KRU-103)**: `controlRoomGame.jsx` + `controlRoom.css`. 3 tiers (desktop 2col 40/60, tablet, móvil stack). Compositor de bloques add/reorder/remove. A11y §18 (aria-live, targets ≥44px, reduced-motion, focus-visible). Playwright 21/21 (`docs/qa/kru103-c2-ui-smoke.md`) + jsdom 38/38. Dev-stage `/dev/control-room`.

## ⚠️ WIP ajeno en el tree (NO commiteado, política 1-worker-per-tree)
Worker C3 (t_d5965d8d, arrancó sobre C2 aún en curso) dejó en working tree:
- `controlRoomRules.js` +85 líneas: `CONTROL_ROOM_WELCOME`, tutorial T1-T5 ES/EN (Doc 2 §4/§5).
- `controlRoomEngine.js` +9: `dimensionStats()` (aggregate C3).
- `controlRoomGame.jsx` / `controlRoom.css` / `ControlRoomDevStage.jsx` con cambios de sesión.
- NUEVO `controlRoomGameSession.test.jsx` — **RED legítimo**: espera `buildControlRoomSessionAggregate` de C3 que no existe aún.
Todo verificado coherente con el scope C3 (test de sesión, no contenido). Al despachar C3, continuar este WIP. Entrega anterior a este handoff dejó estos archivos fuera del commit `469691c` → el diff ya es parte del tree para C3.

## Otros untracked preexistentes (NO tocar)
`docs/qa/page-review-2026-09-10/`, `scripts/review-prod-page-2026-09-10.mjs`.

## Siguiente
1. **C3 (t_d5965d8d, KRU-104) — ready**: 6 intros de bloque, 12 escenarios (libro base CR-L1..L6 + forma paralela), tutorial T1-T5, NPC replies 200-400ms, consecuencias 1.5-2.5s neutrales, pantalla final, copy ES/EN completo. Aceptación: checklist §22.1/escenario + revisión contenido→dimensión (§17.1).
2. Después cadena C4 → C5 → C6 (KRU-105/106/107). C7 (biometría, KRU-108) epic separado.

## Notas
- Repo: tree limpio salvo WIP C3 documentado arriba; HEAD = `469691c` == origin/main (vía git log local; push ya hecho por workers).
- GitHub remoto: verificado vía `git rev-parse HEAD == @{u}` antes de los commits.
