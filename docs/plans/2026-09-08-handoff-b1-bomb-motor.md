# Handoff — B1: BOMB rule manifest + motor (EXP-BOMB-001) · 2026-09-08

**Card:** `t_ee587ad1` (B1, EXP-7) → done · **Cadena:** BOMB B1→B6 (plan
`docs/plans/2026-09-07-plan-exp7-bomb.md`) · **Spec (ley):** `docs/spec/EXP-BOMB-001/`
(Draft v1.1.0, 07-sep-2026, archivada en repo).

## Entregado (B1 — sin UI)

- `src/tasks/original-games/bomb/bombRules.js` — **rule manifest versionado**
  (`bomb-v1.1` / manifest 1.1.0 / build 1.1.0): reglas A1/A2/B1/C1 con acción por tipo
  (A/B), stepId canónico por tipo (formato §19: `SW_3_ON`, `CUT_BLUE`, `HOLD_YELLOW_2000`,
  `CUT_GREEN`), copy exacto del manual ES (Doc 2 §9.2), aviso MODEL B, niveles
  (tutorial + L1-L4: exposición/delay/time limit/evaluado), hold 2000 ms ±200 (1800-2400),
  penalización 30% del tiempo restante (clamp 0 + fail inmediato), max_errors 2, fases del
  timer (warning 30% / critical 5 s), taxonomía de 10 códigos con flag `penalizes`.
  `transformSequence(ruleIds, bombType, manifest)` = `effective_sequence` 100% derivada del
  manifest (**DoD §16.2: sin condicionales Tipo B fuera del manifest**).
- `src/tasks/original-games/bomb/bombTimer.js` — **timer service monotónico**: reloj
  inyectable (determinismo headless), clamp de retroceso, `remainingMs` clamp 0,
  penalización sobre el restante actual, fases normal/warning/critical, modo sin presión
  (tutorial).
- `src/tasks/original-games/bomb/bombEngine.js` — **state machine pura + input gate +
  action validator**: estados spec §7 (BOOT → TUTORIAL_INTRO/PLAY/RESULT → LEVEL_INTRO →
  INSTRUCTION_ENCODING → BLIND_DELAY → EXECUTION → LEVEL_SUCCESS/LEVEL_FAIL → LEVEL_RESULT
  → TRANSITION → SESSION_COMPLETE), eventos §11 (LEVEL_START con seed, INSTRUCTIONS_
  SHOW/HIDE, BLACK_SCREEN_START/END, EXECUTION_START, ACTION_*, STEP_SUCCESS/STEP_ERROR,
  TIME_PENALTY, LEVEL_SUCCESS/FAIL, FOCUS_CHANGE, NEXT_LEVEL, SESSION_COMPLETE), clasificación
  con prioridad documentada (REPEAT → EXACT → TYPE_INTERFERENCE → ORDER → WRONG_TARGET,
  hold window solo cuando el hold ES el paso esperado), 2 errores → MAX_ERRORS, timeout →
  OMISSION con pasos omitidos, integridad (blur, misclick, abort técnico, transiciones
  inesperadas), `sessionSummary()` como base del payload B5.
- Tests: **72** (`bombRules.test.js` 19, `bombTimer.test.js` 13, `bombEngine.test.js` 40) —
  QA-01/03/04/06/07/08 como specs, QA-02 (hold ±200), secuencias efectivas L1-L4,
  transformación B desde manifest, penalización 30%, determinismo por seed, integridad.

## Decisiones documentadas (ambigüedades/divergencias de spec)

1. **Tutorial**: Doc 1 §10 lista A1+A2; Doc 2 §4.2 (T4) ejecuta SW1→Rojo→Amarillo
   (A1+A2+B1). El manifest toma Doc 2 (flujo real que implementa B4). El tutorial no
   puntúa (DoD) → sin impacto en métricas.
2. **Irreversibilidad de cables (§8.3)**: cortar un cable requerido antes de su posición lo
   consume; el paso ya no puede ejecutarse (hitbox deshabilitada en B2) → el nivel se
   pierde por timeout (OMISSION). Switches/botones fuera de orden SÍ son recuperables.
   Consecuencia testeada en `bombEngine.test.js` (QA-03 caso 2).
3. **Edges OFF de switch no son acción canónica** (solo se valida flanco OFF→ON, §8.3):
   sobre switch resuelto → REPEAT_ACTION; en otro caso → WRONG_TARGET. Política explícita
   de recuperación documentada en el test.
4. **max_errors acumulativo por nivel** (pseudocódigo §8.2), reset en cada nivel.
5. **Inputs durante lock (QA-08)**: ignorados físicamente + evento INPUT_DURING_LOCK,
   sin conteo hacia max_errors ni penalización (no es un intento de paso).
6. **Focus (QA-09)**: siempre registrado (FOCUS_CHANGE + total_blur_ms) pero el timer de
   ejecución v1 NO se pausa (la presión temporal es parte de la tarea).
7. **TRANSITION es momento** en el motor (loguea NEXT_LEVEL y entra al LEVEL_INTRO
   siguiente); la UI (B3) renderiza el copy "Antes de Lx" (Doc 2 §11) junto a la intro.
8. **MISCLICK_PROXIMAL / TECHNICAL_ABORT**: solo se registran (analítica de diseño Doc 2
   §18 / sesión incompleta QA-10); nunca penalizan (spec §13).

## Gates (evidencia)

- `NODE_ENV=test vitest run src/tasks/original-games/bomb` → **72/72 pass**
- `oxlint src/tasks/original-games/bomb` → **0 warnings**
- Suite completa: _(ver comentario de cierre de la card)_
- Build: _(ver comentario de cierre de la card)_

## Kanban / Linear

- Cadena: B1 done → **B2 (`t_2fdada28`) ready**; luego B3 (`t_7c5cd0c0`) → B4
  (`t_b3f1dc15`) → B5 (`t_1d9aa1b3`) → B6 (`t_32c02f91`).
- Linear **KRU-91** (módulo EXP-7 Bomb) sigue **In Progress** hasta B6; comentario de
  cierre de B1 con evidencia.

## Siguiente (ordenado)

1. **B2 (t_2fdada28)**: `bombGame.jsx` + `bomb.css` — panel + HUD + accesibilidad.
   Consumir `engine.action()/tick()` + manifest (no duplicar reglas en UI — DoD).
   Chrome = tokens `--k-*`; mundo táctico/industrial propio (regla H4.5).
2. **B3**: niveles 1-4 + fases (encoding/delay/execution/pensalty/success/fail/transition,
   aviso MODEL B L4, timer visual vs lógico ≤100 ms).
3. **B4**: tutorial T1-T5 + bienvenida (copy Doc 2 §4).
4. **B5**: telemetría completa (§11-12-14), registro en blueprint (batería original →
   "de 6"), práctica, ES/EN.
5. **B6**: constructo `proceduralWorkingMemory` + reporte + docs + audit + decisión stable_dg.
