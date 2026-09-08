# Handoff — B3: BOMB niveles 1-4 + fases (EXP-BOMB-001) · 2026-09-08

**Card:** `t_7c5cd0c0` (B3, EXP-7) → done · **Cadena:** BOMB B1→B6 (plan
`docs/plans/2026-09-07-plan-exp7-bomb.md`) · **Spec (ley):** `docs/spec/EXP-BOMB-001/`
(Draft v1.1.0, 07-sep-2026).

**Nota de histórico (anomalía documentada):** durante la sesión, un proceso externo
(identidad local del repo) commitó y empujó parte del WIP de B3 a las 09:36 como
`36c18f3` ("feat(B2): BOMB panel + HUD...") — contenido B3 (bomb.css, bombRules.js,
bombGame.jsx) con etiqueta de commit incorrecta. No se reescribió el histórico
(empujado); el cierre completo de B3 es el commit `feat(t_7c5cd0c0)` de este handoff
(tests + whitelist `observed` + dev stage + smoke + scripts).

## Entregado (B3 — niveles 1-4 + fases)

- `src/tasks/original-games/bomb/bombRules.js` — manifest + **copy exacto de la spec**
  (Doc 2 §11, ES fuente de verdad): transiciones "Antes de L1..L4", delay
  ("Memoriza la secuencia."), penalty, success, fail timeout/errors, final;
  `newRuleForLevel()` puro (regla nueva destacada de la intro, derivado del manifest:
  L1 null / L2 B1 / L3 C1 / L4 null→modificador B).
- `src/tasks/original-games/bomb/bombGame.jsx` — **fases de niveles** (+ re-render del
  timer a 10 Hz por snapshot `bombLoopSnapshot`: el tick del motor sigue a 60 Hz;
  reduce la carga de render y elimina el drift bajo carga — Doc 1 §15 "degradación
  controlada"):
  - Flujo evaluado completo: práctica → "Comenzar evaluación" (Doc 2 §4.3; B4 completa
    el modal) → L1..L4 → SESSION_COMPLETE → "Finalizar" (`onComplete` con
    `sessionSummary()` agregado-only, para B5).
  - **LEVEL_INTRO** (Doc 1 §4/Doc 2 §5): nivel + MODELO + copy "Antes de Lx" + regla
    nueva destacada (NUEVA REGLA en L2/L3; modificador MODELO B en L4) + CTA.
  - **Countdown 0.5 s** (Doc 2 §10): beat UI entre intro y encoding; el reloj de
    exposición del motor arranca cuando termina (la transición NO recorta exposición).
  - **INSTRUCTION_ENCODING**: manual desde manifest; L1 exposición libre + CTA
    "Continuar"; L2-L4 exposición fija 3/2/2 s con barra; pre-fade 200 ms antes del fin
    ("Manual hide" 150-250 ms §16); auto-hide por tick del motor.
  - **BLIND_DELAY**: pantalla oscura con estática sutil (grano que se desplaza, sin
    parpadeo >3 Hz; negro limpio bajo reduced-motion), "Memoriza la secuencia."
    (pantalla + barra de estado), inputs → **INPUT_DURING_LOCK (QA-08)** sin cambio
    físico, **sin pistas residuales del manual (DoD)**.
  - **EXECUTION**: timer vivo desde el MISMO reloj lógico del motor — display a
    resolución de 100 ms (`MM:SS.d`) → **timer visual vs lógico ≤100 ms (DoD §16.2)**;
    beeps §10.1; manual ausente (···) en L2-L4 (DoD).
  - **Penalty state**: LED + shake + "Secuencia incorrecta. Tiempo penalizado." en la
    barra (copy genérico del manifest; nunca revela el paso esperado, §13.1).
  - **Success**: LED verde, timer congelado, microresumen neutro
    ("Nivel X · Tiempo: N.N s · Errores: N" — sin nombres de pasos) + "Siguiente nivel".
  - **Fail**: razón general (timeout / límite de errores) sin revelar la respuesta +
    "Continuar" (el flujo sigue al siguiente nivel; el fail no termina la sesión).
  - **MODEL B antes de L4**: transición §11 + modificador destacado + placa B en HUD.
  - **QA-09**: blur siempre registrado (FOCUS_CHANGE); el timer de ejecución NO se pausa.
  - **QA-10**: `pagehide`/`beforeunload` en nivel evaluado → `TECHNICAL_ABORT`
    (sesión incompleta; al recargar, BOOT — nunca reanuda silenciosamente).
  - **Input gate (QA-08)**: en intro/encoding los controles quedan atenuados
    (`cursor: not-allowed` + `aria-disabled`) pero operables para que el intento llegue
    al motor (log con id del componente); en delay/resultados el overlay captura el
    intento (observed `UNKNOWN`).
  - Telemetría: whitelist + `observed` (STEP_ERROR §11).
- `src/tasks/original-games/bomb/bomb.css` — estilos de fase: intro card (level/model/
  transition/highlight), encoding + barra de exposición, pre-fade (180 ms ease-in),
  countdown (barra 500 ms linear), delay screen (estática ≤3 Hz), panel `--locked`
  (atenuado) y `--success` (pulso de borde 300 ms), overlays de resultado (solo
  columnas: HUD con LED/timer congelado sigue visible), fail, session end,
  status `--penalty`; reduced-motion: estática→negro limpio, barra de countdown llena,
  sin pulso de success, pre-fade inmediato (lógica intacta, DoD §20).
- `src/dev/BombDevStage.jsx` — `?seed=<int>` en el stage dev (verificación de
  determinismo); banner B3.
- Tests: `bombGamePhases.test.jsx` — **25** (flujo de fases completo + QA-01..QA-10 +
  DoD timer visual/lógico + sin manual en ejecución + determinismo por seed: mismo
  seed+config+inputs ⇒ telemetría idéntica). `bombRules.test.js` +**8** (copy §11
  exacto; `newRuleForLevel`).
- `scripts/smoke-t_7c5cd0c0-b3-bomb-phases.mjs` — smoke Playwright 4 runs: A happy
  path L1-L4 + DoD timer (3 muestras rAF) + mediciones in-page de exposición (3/2/2 s)
  y delay (2/4/3 s); B failure paths (QA-06 timeout 20 s, QA-07 max errors, penalty
  state L3, QA-04 interferencia L4 + recuperación QA-05); C móvil 390×844 (aviso +
  overflow 0 en intro/encoding/execution/success/delay); D reduced-motion (sin
  animaciones, lógica intacta).
- `scripts/bomb_contrast_check.py` — +7 pares de fase (**17/17 AA**).

## Decisiones documentadas (alcance B3 / ambigüedades)

1. **Countdown 0.5 s como beat UI ANTES de `startLevelExecution()`** (Doc 2 §10:
   "evita que el usuario pierda exposición por transición"): la exposición se ancla
   exactamente cuando el manual aparece; no se recorta 0.5 s. Es UI-only (no es un
   estado del motor).
2. **L1 (exposición libre) requiere CTA "Continuar"** en el encoding: el manifest fija
   `exposureMs: null` (tick del motor nunca oculta); el motor expone `continueEncoding()`
   precisamente para este caso (reason 'continue' vs 'exposure_elapsed'). L2-L4: sin
   CTA (auto-hide).
3. **Transición "Antes de Lx" renderizada en la LEVEL_INTRO** (decisión B1 #7: TRANSITION
   es momento en el motor — loguea NEXT_LEVEL y entra directo al LEVEL_INTRO siguiente).
4. **Regla nueva destacada derivada del manifest** (`newRuleForLevel`): L2→B1, L3→C1,
   L4→modificador B (`typeBNoticeEs`), L1→protocolo base (sin highlight; la transición
   lo destaca). Nada codificado por nivel en la UI (DoD §16.2).
5. **Overlays de resultado solo sobre las columnas** (no sobre el HUD): success exige
   "LED verde + timer detenido" visibles (Doc 2 §5); fail "estado bloqueado" con la
   placa/timer igualmente visibles.
6. **Controles en intro/encoding atenuados pero operables** (no `disabled`): el intento
   llega al input gate del motor y se registra INPUT_DURING_LOCK con id del componente
   (taxonomía §13: "Problema de control o bug UI"). En BLIND_DELAY sí `disabled`
   ("sin targets accionables", Doc 2 §5) — el overlay captura el intento (observed
   UNKNOWN). En BOOT/resultados/SESSION_COMPLETE: `disabled`.
7. **QA-03 en UI con hold (no con cable)**: un ORDER_ERROR con cable corta el cable
   (irreversibilidad §8.3, decisión B1 #2) y hace el nivel insoluble → timeout/OMISSION;
   el smoke Run B ejercita ese caso real (verde fuera de orden → penalty + timeout), y
   el test jsdom ejercita ORDER_ERROR + recuperación con el hold (recuperable).
8. **Display a centésimas de decima (100 ms) con `Math.round`**: acota la divergencia
   visual/lógica a ≤50 ms de redondeo + ≤1 frame (~17 ms) = <100 ms (DoD §16.2), con un
   solo reloj (el del motor); `data-remaining-ms` expuesto para verificación.
9. **`observed` añadido a la whitelist de telemetría** (meta de STEP_ERROR §11):
   faltaba; sin él la taxonomía §13 (expected/observed/error_class) salía incompleta.
10. **EN de copy de fase en la UI** (par `t(es, en)` con ES desde el manifest): B5
    completa el diccionario §11 completo (decisión de alcance del plan).

## Gates (evidencia)

- `NODE_ENV=test vitest run src/tasks/original-games/bomb` → **131/131** (B1: 72 + B2:
  26 + B3: 25 + rules B3: 8)
- `NODE_ENV=test vitest run --pool=threads` (suite completa) → **132 archivos,
  1065/1065 pass**
- `oxlint src/tasks/original-games/bomb src/dev/BombDevStage.jsx` → **0 warnings**
- `NODE_ENV=production vite build` → **✓ built in 6.40 s** (warning de chunk >500 kB
  preexistente, documentado desde B1)
- `git diff --check` → limpio
- **Smoke** `scripts/smoke-t_7c5cd0c0-b3-bomb-phases.mjs` → **PASS: 0 failures, 0
  console errors, 4 runs** (`docs/qa/b3-bomb-phases/smoke-result.json` + 17 shots):
  - **Run A** (1280×720, seed=42, happy path L1-L4): DoD timer **visual vs lógico
    42 ms** (≤100) y drift **11 ms** por intervalo de 2 s / **10,8 ms** acumulados en
    6 s (reloj único; con 60 fps el drift bajo carga fue 130 ms → re-render del timer
    a 10 Hz por snapshot `bombLoopSnapshot`, el tick del motor sigue a 60 Hz);
    exposición medida **3010/2181/2178 ms** (spec 3000/2000/2000 ±250); delay medido
    **2148/4109/3109 ms** (spec 2000/4000/3000); countdown 0.5 s verificado por
    watcher in-page; copy exacto de las 4 transiciones + NUEVA REGLA L2/L3 +
    modificador B L4 + manual transformado L4 (SW3/AZUL + aviso §9.2); success ×4 con
    microresumen neutro; SESSION_COMPLETE + "Finalizar"; overflow 0.
  - **Run B** (failure paths): QA-06 timeout 20 s — el nivel cerró **191 ms** tras el
    00:00.0 visual (≤250: cierre alineado visual/lógico) + timer `stopped`; QA-07
    MAX_ERRORS (copy exacto); penalty state L3 (status "Secuencia incorrecta. Tiempo
    penalizado." + LED penalty + sin nombre de cable; verde fuera de orden →
    irreversible → timeout, decisión B1 #2); QA-04 TYPE_INTERFERENCE L4 como primera
    acción (LED penalty, sin "AZUL" en el status) → timeout post-penalización →
    SESSION_COMPLETE (QA-05 recovery cubierta por Run A).
  - **Run C** (390×844): aviso <1024 px + **overflow 0** en intro/encoding/execution/
    success/delay.
  - **Run D** (reduced-motion): countdown/success/delay-static con `animation: none`
    (estática → negro limpio) y **lógica intacta** (el delay termina y la ejecución
    arranca).
- **Contraste**: `python3 scripts/bomb_contrast_check.py` → **17/17 pares AA** (peor
  5.88:1 — tag MODELO B / fail title sobre card)

## Kanban / Linear

- Cadena: B3 done → **B4 (`t_b3f1dc15`) ready** (tutorial T1-T5 + welcome §4.1/§4.3);
  luego B5 (`t_1d9aa1b3`) → B6 (`t_32c02f91`).
- Linear **KRU-91** sigue In Progress hasta B6; comentario de cierre de B3 con evidencia.

## Siguiente (ordenado)

1. **B4 (t_b3f1dc15)**: tutorial T1-T5 + bienvenida completa §4.1 (mensaje faltante) +
   modal de salida §4.3 (reemplaza el "Comenzar evaluación" minimal de B3) + replay
   (tutorial_replay_count). El motor ya soporta TUTORIAL_INTRO/PLAY/RESULT.
2. **B5**: telemetría final (§11-12-14) + payload sesión (esquema §19, fixture
   reconstruible) + registro en blueprint (batería original → "de 6") + práctica G.2 +
   diccionario ES/EN §11 completo + retiro de `/dev/bomb` si el smoke pasa vía fixture.
3. **B6**: constructo `proceduralWorkingMemory` + reporte (9.º constructo, caveats
   provisionales) + docs + audit + decisión stable_dg.
