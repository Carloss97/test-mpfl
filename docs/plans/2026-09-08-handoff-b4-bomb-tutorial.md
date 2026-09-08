# Handoff — B4: BOMB tutorial T1-T5 + welcome (EXP-BOMB-001) · 2026-09-08

**Card:** `t_b3f1dc15` (B4, EXP-7) → done · **Cadena:** BOMB B1→B6 (plan
`docs/plans/2026-09-07-plan-exp7-bomb.md`) · **Spec (ley):** `docs/spec/EXP-BOMB-001/`
(Draft v1.1.0, 07-sep-2026).

## Entregado (B4 — tutorial T1-T5 + welcome §4.1/§4.2/§4.3)

- `src/tasks/original-games/bomb/bombRules.js` — manifest: sección `tutorial`
  (copy exacto Doc 2 §4.1/§4.2/§4.3, ES fuente de verdad): `welcome` (título,
  bajada, MENSAJE, CTA, secundario), `segments` (S1 guided T1-T3 / S2 sequence
  T4 / S3 memory T5 con `readMs` 3000 + `delayMs` 1500), `done` (modal §4.3 +
  CTA + replay). Helpers puros `tutorialNodeFor(segment, stepIndex)` y
  `tutorialNodeIdsDone(segment, stepIndex)` (nodo activo / progreso, derivados
  del manifest — DoD §16.2).
- `src/tasks/original-games/bomb/bombEngine.js` — **segmentos del tutorial guiado**:
  `startTutorial()` (S1), al completar el runtime de un segmento el motor avanza
  solo (`advanceTutorialSegment()`): S2 = panel FRESH en TUTORIAL_PLAY; S3 (T5) =
  INSTRUCTION_ENCODING (lectura fija) → BLIND_DELAY (ocultación breve) → EXECUTION
  sin límite (reutiliza el flujo de fases existente: eventos §11 auditables).
  `restartTutorial()` (INPUT_RESTART_TUTORIAL §5.1): segmento 1, panel fresh,
  `TUTORIAL_REPLAY {count}` (Doc 2 §18 `tutorial_replay_count`). `sessionSummary()`
  + `tutorial_replay_count` (delta aditivo, B5 lo integra en el payload §19).
  El tutorial sigue sin puntuar (DoD §16.2: `evaluated:false`, sin penalty/fail/
  levels_completed).
- `src/tasks/original-games/bomb/bombGame.jsx` — **welcome §4.1 completo**
  (MENSAJE + secundario "Ajustes de audio / accesibilidad": panel inline con toggle
  de audio funcional — persistido por originalGameSfx — y resumen a11y §14);
  **overlay de nodo activo** en la columna manual (T1-T4: tag + instrucción exacta
  + pips de progreso T1-T5 + "Repetir práctica"); **T5**: caption del nodo sobre el
  manual numerado + barra de lectura → delay screen → ejecución con manual oculto
  (···); **modal de salida §4.3** con el texto exacto del manifest + "Comenzar
  evaluación" + "Repetir práctica" (replay desde overlay y desde modal, mismo
  motor: el conteo de replay y el buffer de eventos de sesión acumulan);
  `levelLabel` "Práctica" en todo el tutorial (incluida la ejecución de T5);
  anillo del hold en TODO el tutorial (snapshot `hold` por `evaluated:false`,
  Doc 2 §7); whitelist de telemetría +`segment`/`mode`/`count`; copy ES/EN
  (EN en `BOMB_TUTORIAL_EN`; el diccionario §11 completo es B5).
- `src/tasks/original-games/bomb/bomb.css` — estilos B4 (welcome message/
  secondary, panel de ajustes, overlay de nodo + pips, caption T5, modal §4.3).
  Paleta del mundo propia (H4.5); estados hover/focus/disabled completos;
  reduced-motion no afecta (sin animaciones nuevas).
- Tests: `bombRules.test.js` +7 (copy §4.1/§4.2/§4.3 exacto, segmentos, helpers);
  `bombEngineTutorial.test.js` NUEVO (13: segmentos S1→S2→S3, panel fresh, eventos
  §11 de T5, INPUT_DURING_LOCK, errores sin scoring, replay desde T5/modal/L1-
  inválido, determinismo del tutorial, DoD no-scores); `bombGameTutorial.test.jsx`
  NUEVO (14: welcome §4.1 + toggle de audio, nodos T1-T5 + pips, anillo T3/T5,
  ORDER_ERROR en T4 sin penalty, T5 lectura→delay→execución, modal §4.3 → L1,
  replay overlay/modal con conteo, DoD no-scores, anillo ausente en L2 evaluada);
  actualizados: `bombEngine.test.js` (harness `runTutorial` → tutorial guiado
  completo; +`playSequence`), `bombGame.test.jsx` (4 tests del flujo de práctica +
  helper `completeTutorialToModal`), `bombGamePhases.test.jsx` (`reachL1Intro` →
  tutorial T1-T5; test del countdown con conteo relativo de INSTRUCTIONS_SHOW).
- `scripts/smoke-t_b3f1dc15-b4-bomb-tutorial.mjs` — smoke Playwright 4 runs
  (A welcome→T5→L1 con copy exacto + mediciones lectura/delay + ajustes; B replay
  overlay+modal; C móvil 390×844 overflow 0; D reduced-motion lógica intacta).
- `scripts/smoke-t_7c5cd0c0-b3-bomb-phases.mjs` — `playPractice` actualizado al
  tutorial guiado T1-T5 (el smoke B3 sigue verificando niveles 1-4).
- `scripts/bomb_contrast_check.py` — +10 pares B4.
- `src/dev/BombDevStage.jsx` — banner/label B4.

## Decisiones documentadas (alcance B4 / ambigüedades)

1. **El tutorial guiado T1-T5 corre en 3 segmentos del motor** (manifest
   `tutorial.segments`): S1 guided (T1/T2/T3 = un nodo por paso del runtime
   tutorial A1→A2→B1), S2 sequence (T4: secuencia completa en panel FRESH),
   S3 memory (T5). La segmentación vive en motor+manifest (DoD §16.2); la UI
   pinta el nodo activo por `(tutorialSegment, stepIndex)` vía
   `tutorialNodeFor`. El estado del motor no cambió (Doc 1 §7): T5 reutiliza
   INSTRUCTION_ENCODING/BLIND_DELAY/EXECUTION con el runtime tutorial.
2. **T5 = lectura 3000 ms + delay 1500 ms** (valores nuevos, parametrizados en el
   manifest): Doc 2 §4.2 dice "La pantalla se ocultará brevemente" (breve < delay
   de L2, 2 s) y la lectura es el manual de 3 líneas (misma exposición que L2).
   El motor ancla `encodingEndAt`/`delayEndAt` con su reloj (el tick existente
   dispara INSTRUCTIONS_HIDE/BLACK_SCREEN — auditables desde raw events).
3. **Replay en el MISMO motor** (`restartTutorial`), no re-creación:
   `tutorial_replay_count` (Doc 2 §18) debe acumular en la sesión y el buffer de
   eventos (B5: reconstruible, DoD §16.2) no puede truncarse. Suplanta el
   comportamiento B2 ("engine nuevo" en `restartPractice`). Válido solo durante el
   tutorial (TUTORIAL_PLAY/encoding/delay/EXECUTION/LEVEL_SUCCESS con
   levelKey 'tutorial'); fuera → INVALID_STATE (no interfiere con la evaluación).
4. **Segundo §4.1 "Ajustes de audio / accesibilidad" = panel inline**: la spec
   solo nombra el elemento (sin comportamiento). Se implementa lo mínimo y real:
   toggle de audio (funcional, persistido — el audio es opcional §14 y no afecta
   score) + resumen de accesibilidad ya garantizada (foco visible, ≥44 px,
   color+letra, reduced-motion). Sin controles falsos.
5. **Anillo del hold en TODO el tutorial** (S1-T3 y la ejecución de T5):
   `bombLoopSnapshot.hold` ahora por `level.evaluated === false` (antes solo
   TUTORIAL_PLAY). Doc 2 §7: "anillo de progreso opcional en tutorial" / "En
   evaluación no mostrar progreso exacto". El loop rAF ya corre en EXECUTION.
6. **Recuperación del tutorial (estado "stuck")**: un ORDER_ERROR con cable en
   S1/T4 deja el cable cortado (irreversibilidad §8.3) y el paso ya no es
   completible — la salida es "Repetir práctica" (overlay + modal), conforme a
   Doc 1 §10.1 ("repetir tutorial sin incluir sus datos en scoring"). El B3
   (práctica plana) tenía la misma trampa SIN salida (el replay solo existía en
   el modal, inalcanzable); B4 la resuelve con el botón de replay en el overlay.
7. **Modal §4.3: h2 "Práctica completada" (a11y) + `<p>` con la frase completa
   exacta del manifest** — la copia exacta vive íntegra en el párrafo; el h2 no
   duplica la frase (estructura + texto literal spec).
8. **`levelLabel` "Práctica" por `levelKey === 'tutorial'`** (antes por estado
   TUTORIAL_PLAY): cubre la ejecución de T5 (estado EXECUTION).
9. **T5: manual oculto en ejecución (···) + controles operables** — mismo régimen
   que EXECUTION evaluada (DoD: sin ayuda "Completa sin ayuda", §4.2).
10. **EN del copy B4 en `BOMB_TUTORIAL_EN`** (par `t(es, en)` con ES desde el
    manifest): el diccionario §11 completo ES/EN sigue siendo B5 (decisión B3 #10).

## Gates (evidencia)

- `NODE_ENV=test vitest run src/tasks/original-games/bomb` → **165/165** (7 archivos:
  bombEngine 40 · bombRules 34 · bombTimer 13 · bombGame B2 26 · bombGamePhases B3 25 ·
  bombEngineTutorial B4 13 · bombGameTutorial B4 14; B3 cerró en 131 → +34 tests B4)
- `NODE_ENV=test vitest run --pool=threads` (suite completa) → **134 archivos,
  1099/1099 pass** (B3: 132 archivos, 1065)
- `oxlint src/tasks/original-games/bomb src/dev/BombDevStage.jsx` → **0 warnings**
- `NODE_ENV=production vite build` → **✓ built in 4.30 s** (warning de chunk >500 kB
  preexistente, documentado desde B1)
- `git diff --check` → limpio
- **Smoke B4** `scripts/smoke-t_b3f1dc15-b4-bomb-tutorial.mjs` → **PASS: 0 failures,
  0 console errors, 4 runs** (`docs/qa/b4-bomb-tutorial/smoke-result.json` + 13 shots):
  - **Run A** (1280×720, seed=42): flujo de aceptación **welcome→T5→L1**: copy exacto
    §4.1 (título/bajada/MENSAJE/CTA/secundario) + ajustes (toggle de audio funcional
    ON↔OFF, resumen a11y) + overflow 0; nodos T1-T5 con copy exacto §4.2 y avance por
    criterio; anillo del hold en T3 (t3ring); **T4 panel fresh** (SW1 OFF/RED INTACT tras
    completar T1-T3); **T5: lectura 3057 ms (3000±350) + delay 1655 ms (1500±350)**
    (medición in-page), manual oculto en ejecución (···); **modal §4.3 exacto** +
    botones; "Comenzar evaluación" → intro L1 ("Nivel 1 de 4" + transición §11 exacta),
    overflow 0.
  - **Run B** (replay): overlay en T4 (SW1 accionado) → "Repetir práctica" → T1 + panel
    fresh; tutorial completo de nuevo → modal → "Repetir práctica" (modal) → T1 +
    panel fresh (replayOverlay/replayPanelFresh/replayModal todos true).
  - **Run C** (390×844): aviso <1024 px + **overflow 0** en welcome/T1/T5-lectura/
    T5-ejecución/modal §4.3.
  - **Run D** (reduced-motion): estática del delay T5 apagada (`animationName: none`,
    `opacity: 0`) y **lógica intacta** (el tutorial completo llega al modal §4.3).
  - Nota operativa: los smokes B3/B4 NO corren en paralelo en la Pi (contention CPU →
    jitter de rAF rompe las mediciones de tiempo real; verificado en esta sesión:
    lectura T5 3851 ms y timeouts bajo doble Chromium).
- **Smoke B3** `scripts/smoke-t_7c5cd0c0-b3-bomb-phases.mjs` (re-run con `playPractice`
  B4 = tutorial T1-T5) → **PASS: 0 failures, 0 console errors, 4 runs** (secuencial;
  `docs/qa/b3-bomb-phases/smoke-result.json`): Run A happy path L1-L4 — DoD timer
  **visualVsLogicalMax 33 ms** (≤100) + drift 38 ms; exposición 3024/2109/2082 ms;
  delay 2089/4154/3139 ms; overflow 0. Runs B (QA-06/07/03/04/05 fallos), C (móvil),
  D (reduced-motion) PASS.
  - **Nota operativa (importante):** los smokes B3 y B4 NO se ejecutan en PARALELO en
    la Pi — la contención de CPU jittereó el rAF y produjo falsos fallos (lectura T5
    3851 ms, timeouts). Correrlos secuencialmente (B4 → B3) pasó limpio ambos.
- **Contraste**: `python3 scripts/bomb_contrast_check.py` → **27/27 pares AA**
  (+10 pares B4; peor ratio sin cambios: 5.88:1 — tag MODELO B / fail title)

## Kanban / Linear

- Cadena: B4 done → **B5 (`t_1d9aa1b3`) ready** (telemetría final + batería +
  práctica G.2 + diccionario ES/EN §11 + registro blueprint "de 6"); luego B6
  (`t_32c02f91`).
- Linear **KRU-91** sigue In Progress hasta B6; comentario de cierre de B4 con
  evidencia.
- **PENDIENTE (sesión interactiva):** línea de estado de AGENTS.md ("B4 done /
  B5 en curso") — el archivo es protegido y el approval timeout ocurrió en la
  sesión del worker (mismo caso que B3; no reintentar por otras vías).

## Siguiente (ordenado)

1. **B5 (t_1d9aa1b3)**: event logger completo (§11) con los eventos nuevos del
   tutorial (TUTORIAL_SEGMENT/TUTORIAL_REPLAY; whitelist ya lista), métricas
   derivadas (§12, con `tutorial_replay_count` §18 en el payload), integrity flags
   (§14), payload de sesión (esquema §19: fixture reconstruible desde raw events
   — el buffer ya conserva los replays), registro en `originalGameBlueprints.js`
   (batería original → "Juego 6 de 6"), práctica G.2, diccionario ES/EN §11
   completo, retiro de `/dev/bomb` si el smoke pasa vía fixture.
2. **B6**: constructo `proceduralWorkingMemory` + reporte (9.º constructo,
   caveats provisionales) + docs + audit + decisión stable_dg.
