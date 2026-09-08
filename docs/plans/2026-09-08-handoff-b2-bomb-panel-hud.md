# Handoff — B2: BOMB panel + HUD + accesibilidad (EXP-BOMB-001) · 2026-09-08

**Card:** `t_2fdada28` (B2, EXP-7) → done · **Cadena:** BOMB B1→B6 (plan
`docs/plans/2026-09-07-plan-exp7-bomb.md`) · **Spec (ley):** `docs/spec/EXP-BOMB-001/`
(Draft v1.1.0, 07-sep-2026).

## Entregado (B2 — panel + HUD + a11y)

- `src/tasks/original-games/bomb/bombGame.jsx` — **componente del mundo
  "Desactivación"** (`BombDefusalGame`, gameId `bomb_defusal`):
  - Consume `createBombEngine` + manifest: estado físico del panel ES
    `engine.components` (single source of truth; **DoD §16.2: sin reglas en la UI**).
  - Layout 2 columnas (manual | panel) §6.1: manual con **copy exacto del
    manifest** (`buildManualText`); HUD: nivel (Práctica / Nivel X/4), timer
    (idle/normal/warning/critical + **label de fase textual** — el estado nunca
    depende solo del color, §14), placa **MODEL A/B** (letra + textura: B con
    hachura ámbar), **LED de estado** (neutral/penalty/success/fail; punto + texto).
  - **Switches SW1–3**: OFF/ON/disabled + palanca mecánica (120 ms ease-out) +
    `aria-pressed` + nombre accesible con estado.
  - **Cables R/B/G/Y**: INTACT/CUT (**irreversible §8.3** → hitbox deshabilitada
    tras el corte), color + letra + patrón por cable (a11y §14), corte = dos
    tacos separados + chispa 150 ms + SFX snip.
  - **Botón amarillo hold**: IDLE/PRESSED (depresión física 7 px + sombra
    reducida) / accepted (pulso 300 ms); hold con pointer O teclado
    (Espacio/Enter down/up); **anillo de progreso SOLO en práctica**
    (`evaluated=false`); release vía `pointerup` en window (fuera del elemento).
  - **Flujo práctica (B2)**: bienvenida BOOT (título + bajada **copy exacto
    §4.1** + CTA "Iniciar práctica") → TUTORIAL_PLAY operable (manual visible,
    sin timer, no evaluado) → "Práctica completada" + "Repetir práctica"
    (engine nuevo, estado reseteado).
  - **Feedback controller §6/§12**: SFX por evento, LED penalty flash 900 ms
    (auto-reset), shake **solo en evaluación** (B3), misclick de fondo de panel
    (`recordMisclick`, nunca penaliza), `visibilitychange` → `focusChange`
    (siempre registrado; el timer no se pausa — política v1).
  - **Beeps de timer §10.1** como función pura exportada
    `bombTimerBeepDecision` (>30 % cada 2 s; 30–10 % cada 1 s; <10 %/últimos 3 s
    beep corto marcado) — activa con timer corriendo (B3 la ejercita).
  - **Telemetría**: buffer en memoria (B5) + forward `onGameEvent` como
    `game_event_v1` con **whitelist de meta** (diccionario §11); sin
    pointer/DOM/rostro.
- `src/tasks/original-games/bomb/bomb.css` — **mundo táctico/industrial propio**
  (NO tokenizado, H4.5; solo el chrome pills `.task-title`/`.task-progress` usa
  tokens/override): paleta acero + ámbar/rojo de panel + LED; **contraste AA
  verificado** (`scripts/bomb_contrast_check.py`: 10/10 pares, peor 6.3:1);
  animaciones §16 como variables con durations/curvas fijas (power-on 400 ms
  ease-out · switch 120 ms ease-out · cut 150 ms ease-out · shake 120 ms
  ease-in-out ±5 px · success 300 ms ease-out · critical 650 ms ease-in-out,
  pulso sin saltos de layout: `tabular-nums` + `min-width` fijo); estados
  hover/focus-visible/disabled en todo interactivo; **hitbox ≥44 px**;
  2 columnas ≥900 px, 1 columna <900 px; **compactación vertical ≤820 px de alto
  para el baseline 1280×720** (barra de estado visible sin scroll, targets ≥44 px
  intactos); bloque `prefers-reduced-motion: reduce` (sin shake/power-on/spark/
  pulsos, lógica intacta).
- `src/tasks/original-games/originalGameSfx.js` — **+8 SFX BOMB** en el catálogo
  compartido (spec §17, rango 6–8): `bomb_switch` (click mecánico),
  `bomb_wire_cut` (snip), `bomb_button` (click down), `bomb_beep` /
  `bomb_beep_hi` (timer §10.1), `bomb_penalty` (alerta corta), `bomb_success`
  (chime), `bomb_fail` (tono grave). Toggle: sfx-toggle compartido del stage
  (chrome); línea "Audio: ON/OFF" en la barra de estado (§6.1).
- `src/dev/BombDevStage.jsx` + rama en `src/main.jsx`: **ruta `/dev/bomb`**
  (laboratorio DEV: PostulationGameStage real con el bloque bomb, sin batería,
  sin evaluación, sin telemetría enviada) — para el smoke; se retira en B5 si el
  smoke pasa vía fixture.
- `scripts/smoke-t_2fdada28-b2-bomb.mjs` — **smoke Playwright** (dev
  127.0.0.1:5173): 1280×720 (BOOT bloqueado → práctica → manual exacto del
  manifest → SW1 aria-pressed → error fuera de orden con LED penalty + CUT
  irreversible → hold 2000 ms → success → restart resetea → foco visible →
  sfx-toggle → "Audio: ON" → timer tabular-nums → **sin overflow horizontal y
  barra de estado dentro del viewport**), 390×844 (aviso <1024 + 1 columna + sin
  overflow), 1000×700 (aviso + 2 columnas), reduced-motion (animationName none).
- `scripts/bomb_contrast_check.py` — pares de contraste WCAG del mundo (evidencia
  AA; patrón `contrast_v4_check.py`).
- Tests: `bombGame.test.jsx` — **26** (catálogo SFX, decisiones de beep §10.1,
  estados del mundo, copy del manifest, telemetría + privacidad, régimen CSS
  §14/§15/§16 leído sobre `bomb.css`).

## Decisiones documentadas (alcance B2 / ambigüedades)

1. **Superficie B2 = práctica vía TUTORIAL_PLAY**: sin niveles (B3) ni overlay de
   tutorial (B4), el mundo operable es el tutorial del motor (no evaluado, sin
   timer, sin delay). El CTA "Iniciar práctica" (copy §4.1) llama a
   `beginSession() + startTutorial()`. B4 reemplaza la bienvenida placeholder
   por la pantalla completa §4.1 + T1–T5; B3 agrega los renders de
   LEVEL_INTRO/ENCODEING/DELAY/EXECUTION/RESULT/TRANSITION (el componente ya está
   estructurado sobre `engine.state`).
2. **Sin `onComplete` en B2**: la práctica es un loop ("Repetir práctica"); el
   cierre de batería llega con B3 (SESSION_COMPLETE) y B5 (payload). El stage dev
   no avanza de bloque (intencional).
3. **Feedback físico independiente de la corrección (pilar 3, §12)**: el SFX/efecto
   de switch/cable/botón suena a TODO el feedback físico (un corte fuera de orden
   también hace snip + chispa); el LED penalty/SFX de alerta llega por STEP_ERROR
   **sin revelar el paso esperado** (shake reservado a evaluación, B3).
4. **Label de fase textual del timer** (sin límite / normal / warning / crítico):
   además del color (a11y §14 "el estado crítico no puede depender solo de rojo")
   quita la lectura de "timer roto" en práctica. Los dígitos van `aria-hidden`
   (screen reader lee label + fase; anunciar dígitos a 60 fps es mala práctica).
5. **Aviso <1024 px JS-driven** (listener resize), no media query: testeable en
   jsdom y alimenta la analítica de diseño §18 (viewport events, B5).
6. **Chrome compartido**: solo pills de título/progreso + sfx-toggle + footer del
   stage; el HUD propio (nivel/timer/MODEL/LED) es contenido de mundo (§6.1).
7. **`/dev/bomb` es dev-only**: sin evaluación, cámara, persistencia ni sesión.
   Quien encuentre la URL solo puede practicar. Retirar en B5.

## Gates (evidencia)

- `NODE_ENV=test vitest run src/tasks/original-games/bomb` → **98/98** (B1: 72 +
  B2: 26)
- `NODE_ENV=test vitest run --pool=threads` (suite completa) → **131 archivos,
  1032/1032 pass**
- `oxlint src/tasks src/main.jsx src/dev src/postulation-demo` → **0 warnings**
- `NODE_ENV=production vite build` → **✓ built en 5.05 s** (warning de chunk
  >500 kB preexistente, documentado desde B1)
- `git diff --check` → limpio
- **Smoke** `scripts/smoke-t_2fdada28-b2-bomb.mjs` → **0 failures, 0 console
  errors**; 1280×720: `.bomb-game` bottom 702 ≤ 720 (statusbar 693), hold 1983 ms
  → LEVEL_SUCCESS, foco visible (outline solid 3 px), Audio OFF→ON, overflow
  0 px; 390×844: aviso + 1 columna + overflow 0; 1000×700: aviso + 2 columnas;
  reduced-motion: `animationName: none`. Screenshots: `docs/qa/b2-bomb-panel-hud/`
  (01-boot … 09-reduced-motion) + `smoke-result.json`.
- **Contraste**: `python3 scripts/bomb_contrast_check.py` → 10/10 pares AA
  (peor: --bomb-red sobre #0d1319 = 6.3:1).

## Kanban / Linear

- Cadena: B2 done → **B3 (`t_7c5cd0c0`) ready**; luego B4 (`t_b3f1dc15`) → B5
  (`t_1d9aa1b3`) → B6 (`t_32c02f91`).
- Linear **KRU-91** (módulo EXP-7 Bomb) sigue **In Progress** hasta B6;
  comentario de cierre de B2 con evidencia.

## Siguiente (ordenado)

1. **B3 (t_7c5cd0c0)**: niveles 1–4 + fases — LEVEL_INTRO, INSTRUCTION_ENCODING
   (exposición por nivel; `tick()` ya dispara INSTRUCTIONS_HIDE/BLACK_SCREEN
   automáticos), BLIND_DELAY (pantalla oscura/estática sutil, inputs bloqueados +
   QA-08), EXECUTION (timer vivo: el rAF loop y los beeps §10.1 ya están
   implementados en B2 — conectar fases), penalty (shake + "Secuencia incorrecta.
   Tiempo penalizado."), success ("Artefacto neutralizado."), fail (razón general
   sin revelar respuesta), TRANSITION (copy "Antes de Lx"), aviso MODEL B L4
   (la placa ya renderiza B desde el manifest; el manual ya incluye el aviso
   §9.2 vía `buildManualText`). QA-01…QA-10 en smoke; **timer visual vs lógico
   ≤100 ms (DoD)**; determinismo por seed.
2. **B4**: tutorial T1–T5 + bienvenida completa (copy §4.1) + modal de salida
   §4.3.
3. **B5**: telemetría final (§11–12–14) + registro en blueprint (batería original
   → "de 6") + práctica G.2 + ES/EN (diccionario §11).
4. **B6**: constructo `proceduralWorkingMemory` + reporte + docs + audit +
   decisión stable_dg.
