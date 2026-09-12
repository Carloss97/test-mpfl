# FASE B — Rollup de auditoría pre-lanzamiento (12 juegos)

**Fecha base:** 2026-09-12
**Epic:** Linear KRU-116 · Kanban t_0aeb2bbe
**Plan:** `docs/plans/2026-09-12-next-phase-comprehensive-plan.md` §FASE B
**Criterio de cierre por juego:** reporte en `docs/qa/prelaunch/<fecha>-<juego>.md` + tests focales GREEN + oxlint 0 + build OK + smoke 2 viewports + fixture válido + constructo resuelto en reporte + doc módulo actualizado.

## 8 dimensiones (todas por juego)

1. **Toma de muestras** — capturas de estímulo/respuesta (timestamps rAF/event), muestras por trial, reset por trial, práctica/calibración (G.2), calidad (min/max trials), sin pérdida de muestras.
2. **Telemetría** — eventos `game_event_v1` (`game_start`, `stimulus_shown`, `response`, `game_end`), payload versionado, allowlist-only, privacidad (nada raw: pointer samples, landmarks, logs crudos), tests de telemetría.
3. **Sincronización** — máquina de estados, timers (timeout/ITI) injectables, cleanup (desactivación/unmount/repetir), secuencia de batería, sin drift, sin race.
4. **Gameplay** — reglas según spec, edge cases (timeout, input inválido, foco perdido, abandono), práctica completatable, tutorial/bienvenida, dificultad, sin estados irresolubles/hang.
5. **Inferencia** — chain R-6 completa (constructo → demanda → conducta → telemetría agregada → feature versionada → regla provisional → disponibilidad/confianza → narrativa), doc módulo en `docs/design/modulos/<juego>.md`, `score: null` si no hay señal, sin claims HR no soportados, flags calibration/scored correctos.
6. **Assets** — 0 404s, fuentes/íconos/SFX cargados, sin dependencias externas bloqueadas por CSP, sizes dentro de budget, íconos SVG (no unicode-tofu en dispositivos reales).
7. **Responsividad** — 1280×720 y 390×844: sin overflow horizontal, touch targets ≥44px AA, breakpoints (<900/<560), teclado, `prefers-reduced-motion`.
8. **Fluidez** — 60fps objetivo (rAF sin bloqueos), latencia input (respuesta registrada en el evento), sin layout thrash, sesión larga (GC), SFX no bloquea hilo principal.

## Estado por juego

| # | Juego (gameId) | Batería | Auditoría | Veredicto | P0 | P1 | P2 | P3 | Cerrado |
|---|----------------|---------|-----------|-----------|----|----|----|----|---------|
| 1 | SimpleRT (`simple_rt`) | stable_dg (warmup, visible:false) | [2026-09-12](2026-09-12-simple-rt.md) | 🟡 1 P1 abierto (doc módulo) + 3 P2 + 2 P3 | 0 | 1 | 3 | 2 | ❌ (game_end cerrado) |
| 2 | PrecisionTargeting (`precision_targeting`) | stable_dg | [2026-09-12](2026-09-12-precision-targeting.md) | ✅ PASS (2 P1 + 1 P2 + 1 P3 cerrados: kinemáticas touch, doc módulo, reset por resize, ITI cleanup; 2 P2 + 8 P3 decisionados) | 0 | 0 | 2 | 8 | ✅ |
| 3 | GoNoGo (`go_nogo`) | stable_dg | [2026-09-12](2026-09-12-go-nogo.md) | ✅ PASS (2 P1 + 4 P2 cerrados: cues aleatorizados p=0.35 piso 2, doc módulo, contrato summary, post-error por respuesta, height prop, ITI jitter; 7 P3 cerrados/decisionados) | 0 | 0 | 0 | 4 | ✅ |
| 4 | ColorInterference (`color_interference`) | stable_dg | [2026-09-12](2026-09-12-color-interference.md) | ✅ PASS (2 P1 + 6 P2 + 8 P3 cerrados: 3 condiciones aleatorizadas + sin anuncio + estímulo i18n, doc módulo, contrato summary, costo Stroop vs neutral + guard, ITI tracked + jitter, height/fit; 3 P3 abiertos + 1 decisionado) | 0 | 0 | 0 | 3 | ✅ |
| 5 | VisualSearch (`visual_search`) | stable_dg | pendiente | — | | | | | |
| 6 | BalloonRisk (`balloon_risk`) | original | pendiente | — | | | | | |
| 7 | LaserPuzzle (`laser_puzzle`) | original | pendiente | — | | | | | |
| 8 | PassengerRoute (`caminos` / passenger_route) | original | pendiente | — | | | | | |
| 9 | Tangram (`tangram_exp001`) | original | pendiente | — | | | | | |
| 10 | TeamCoordination (`team_coordination`) | original | pendiente | — | | | | | |
| 11 | BOMB (`bomb_defusal`) | original | pendiente (validar; Exp 7 B1–B6 done) | — | | | | | |
| 12 | ControlRoom (`control_room`) | original | pendiente (validar; Exp 8 C1–C6 done) | — | | | | | |

## Criterios de veredicto

- ✅ **PASS**: sin hallazgos P0/P1 abiertos; P2/P3 documentados y con decisión.
- 🟡 **CONDICIONAL**: P1 abiertos con fix planificado (card kanban + Linear).
- 🔴 **BLOQUEADO**: P0 abierto (break de contrato, privacidad, hang, datos raw expuestos).

## Notas de auditoría (aprendizajes para los juegos restantes)

- Contrato `game_end`: SimpleRT era el único de stable_dg que no lo emitía (fix 2026-09-12). Verificar en todos: `grep -ln 'game_end' src/tasks/*.jsx`.
- Docs de módulo: solo existen para los 7 juegos original (`docs/design/modulos/`); los 5 de stable_dg NO tienen doc R-6 → P1 sistemático para 2-5.
- `sanitizeGameResults` no expone role calibration/scored → P2 para todo juego con `visible:false` (warmups).
- Íconos unicode en juegos: verificar en dispositivo real (patrón del fix `t_25009e33` del landing).
- Viewport responsive: `getPostulationGameViewport` (clamp 240×280..620×340) — verificar márgenes/canvas por juego.
- SFX: solo juegos original tienen SFX (toggle global en GameStage, persistido en localStorage).
- **Kinemáticas touch degeneradas (B.2, cerrado en PrecisionTargeting):** un tap = 2 muestras de puntero → pathEfficiency 1.0 trivial. Fix: `MIN_KINEMATICS_SAMPLES=3` (kinematics.js) + `motor.kinematicsMeasuredCount/kinematicsResponseCount` (gameTelemetry) + `qualityFlags: kinematics_insufficient_samples` (gameFeatureVector) + caveat qualitySummary (postulationDemoSessionBuilder). **Re-verificar en SimpleRT (B.1 — el warmup también emite pointerSummary; el fix es agregado y ya lo cubre, pero su reporte no lo documenta).**
- **Geometría dependiente de viewport mid-trial (B.2, cerrado en PrecisionTargeting):** `useMemo(trials, [width, height, trialCount])` + reset effect dependiente de la identidad del objeto trial → resize/rotación re-mede el stage y resetea el trial en curso (stimulus huérfano). Fix: lock de geometría al montar (`initialSizeRef`). **B.5 `visual_search` tiene el mismo patrón (línea 138) — aplicar/verificar.**
- **Pantalla finished invisible en batería:** `onComplete` monta el siguiente juego en el mismo batch — el smoke debe esperar la superficie siguiente, no el testid `*-finished` (B.1 y B.2 verificado).
- **Orden de eventos hijo-ante-padre (B.3):** el effect del hijo corre antes que el del padre → `stimulus_shown` precede a `game_start` (GameRuntime) en TODOS los juegos stable_dg. Los tests no deben asertar orden entre ambos (sistémico; documentado en `docs/design/modulos/go_nogo.md` §10/§17).
- **Secuencias de cues aleatorizadas (B.3 GoNoGo):** los tests de componente que dependen de qué trial es GO/NO-GO deben inyectar `rng` (prop del juego) o usar counts donde el piso de NO-GO fuerce la secuencia (count=2 → GO,NO-GO garantizado). Smoke E2E: asertar propiedades (no-alternancia, rango), no la secuencia exacta.
- **Stroop 3 condiciones (B.4 ColorInterference):** la condición viaja en `response.interference.condition` (`congruent`/`incongruent`/`neutral`; `congruent: null` en neutral) con **fallback al booleano legado** en `summarizeGameEvents` (eventos viejos sin `condition` siguen clasificándose). `conflictCostMs` = RT incongruente − RT **neutral** (canónico; antes − congruente) con **guard no-negativo** en el juego y en gameTelemetry (RT ausente → 0, nunca negativo: `conflictScore(0)=1` lo leería como máximo). Re-verificar en juegos original con conflicto parecido.
- **Smoke bajo carga en la Pi (B.4):** con la suite vitest completa corriendo en paralelo, los round-trips de Playwright llegan a ~1 s → un trial de 3200 ms puede timeoutear legítimamente en vivo (artefacto de evidencia, no del juego). No asertar precisión en el smoke; re-ejecutar con la Pi libre.
- **RTL vs Playwright en tests (B.4):** `getByRole` con regex que matchea varios botones lanza `getMultipleElementsFoundError` (no existe `.first()` en RTL como en Playwright) → `getAllByRole(...)[0]` o nombre exacto. Medición "1 línea" del estímulo: `rect.height` incluye el chrome del card (padding+border, 23 px) → restarlo antes de dividir por la altura de línea (verificado con vision: AMARILLO 68 px = 1 línea).
