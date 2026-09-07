# H1 — Audit por vista/sección (baseline + checklist)

**Fecha:** 2026-09-07 (run completo, nocturno) · **Estado:** **COMPLETO — listo para sign-off del usuario** (gate antes de H2/H3)
**Repo:** `/home/sarlock/krumm/test-mpfl` · `main` · **Scope:** audit only, **sin cambios de código**.

Consolida el walkthrough de C1 (5 juegos de la batería original) + audit de las vistas
no-juego (landing pública, landing interna, guard, setup, reporte, `/reclutador`).
Supera al snapshot parcial `wip(H1)` 9b824c4: el recorrido vivo, las capturas por juego,
la pérdida de foco y G1-P01 (teclado) están **completados en vivo** en este run.

## Método

- Recorrido vivo real en la Pi: Vite dev `127.0.0.1:5173` (`NODE_ENV=development`) +
  Chromium headless real (Playwright 1.61, chromium-1234). Sin cámara (consent sin activar).
- Viewports: **desktop 1280×720** y **móvil 390×844** (isMobile + touch, DPR 2).
- Flujo candidato real sin fixture: `/postulaciones?battery=original` → landing → setup →
  5 juegos (laser → balloon → passenger → team → tangram).
- Reporte con `?fixture=1&battery=original`; guard con `?invite=tok-invalid-abc123`
  (validador local determinista, sin red).
- Telemetría QA por vista: consola (error/warning), page errors, request failures,
  HTTP ≥400, overflow horizontal (`scrollWidth − clientWidth`), presencia de LanguageToggle.
- Teclado (G1-P01) y pérdida de foco probados con eventos reales (no mocks).
- **Nota de entorno:** Pi (3.8 GB RAM) + Vite dev produjo 1 incidente
  `ERR_INSUFFICIENT_RESOURCES` (página en blanco) en la primera navegación pesada de una
  sesión; se recuperó con reload (el script QA lo reintenta automáticamente). No es defecto
  de la app: no se reproduce con la página en contexto fresco ni afecta al build de
  producción (krumm.cl).

## Checklist por vista (veredicto)

| Vista (ruta) | overflow D/M | consola D/M | toggle ES/EN | copy ES/EN | privacidad | a11y | Veredicto |
|---|---|---|---|---|---|---|---|
| Landing pública `/` | 0 / 0 | limpia / limpia | ✅ presente en nav (funcional) | ✅ ES↔EN verificado en vivo | ok | ok | **PASS** |
| Landing interna `/postulaciones?battery=original` | 0 / 0 | limpia / limpia | ❌ (scope H3) | ES ok; EN vía `t()` (verificar con toggle en H3) | ok | ok | **PASS** (toggle pendiente H3) |
| Guard `?invite=tok-invalid-*` | 0 / 0 | limpia / limpia | ❌ (scope H3) | ES ok: "Invitación no válida — Este enlace… Pide un nuevo enlace." | ok | `aria-busy`, `role=status` | **PASS** (toggle pendiente H3) |
| Setup (consent + cámara opcional) | 0 / 0 | limpia / limpia | ❌ (scope H3) | ES ok | sin cámara: chips "En espera" (correcto, no inventa señal) | checkbox de consentimiento explícito | **PASS** (toggle pendiente H3) |
| Gameplay — 5 juegos | 0 / 0 | limpia / limpia | ❌ (scope H3) | ES ok; **R2** (copy Team) | HUD solo agregados ("Eventos capturados: N", "X de 5 listos") | hints de teclado en los 5, focus en tableros, `aria-label` en celdas/piezas | **PASS con R2 (copy) + R3 (Tangram P0)** |
| Reporte (fixture) `?fixture=1&battery=original` | 0 / 0 | limpia / limpia | ❌ (scope H3) | ES ok | banner "Datos sintéticos de demostración" + "NO IMPLICA VALIDEZ PSICOMÉTRICA"; "Sin baremos · no comparable" | `aria-label` en cards de score | **R1** (visual) — fix card `t_9e3506b6` (ya creada) |
| Reporte real (tras completar batería) | — | — | — | — | — | — | **NO ALCANZABLE EN VIVO**: la batería muere en Tangram (R3). El layout del reporte real es idéntico al fixture (mismo componente). |
| `/reclutador` | 0 / 0 | limpia / limpia | ❌ (scope H3) | ES ok | "WORKSPACE HR · DATOS SINTÉTICOS" (sin API en dev → datos locales; con API staging → datos reales) | ok | **PASS** |

Leyenda: D/M = desktop 1280×720 / móvil 390×844. "limpia" = 0 errors, 0 page errors,
0 request failures, 0 HTTP ≥400. Único evento de consola en toda la pasada: `ERR_ABORTED`
de preloads de módulos en la primera carga (benigno, Vite dev).

## Recorrido vivo de los 5 juegos (2026-09-07, completado)

| Juego | Resultado en vivo | Cómo se jugó | Captura (estado rico, en juego) |
|---|---|---|---|
| `laser_puzzle` | **3/3 niveles resueltos** (par 4/5/6) | L1/L3 mouse; L2: 1 movimiento completo **por teclado** (cursor ←↑→↓, Enter para seleccionar/mover (0,0)→(2,3), verificado en DOM) + check de ruta con **C** | `laser_puzzle.png` — nivel 3 (2/6 piezas, haz iluminando, bifurcador + portales) |
| `balloon_risk` | **8/8 rondas** | **Juego completo por teclado** (↑ inflar, ↓ asegurar) | `balloon_risk.png` — ronda 3, 3 infladas (estado tenso) |
| `passenger_routes` | **3/3 circuitos** | L1 D-pad (touch); L2–L3 **completamente por teclado** (flechas; 1 replan con **R** en L2). Solución por BFS: costos 10/14, 17/22, 20/16 (1 recarga estratégica en L3) | `passenger_routes.png` — circuito 2 a mitad de ruta (energía 13/22) |
| `team_coordination` | **4/4 escenarios** | **Juego completo por teclado** (1–3 elegir, Enter continuar) | `team_coordination.png` — escenario 2 con opción seleccionada + BehindPanel (Coordinación 65%) |
| `tangram_exp001` | Tutorial **2/2** ✓; evaluación **bloqueada (R3)** | Mouse + probe de teclado (select/deselect OK) | `tangram_exp001.png` — nivel evaluativo 2 (1/5 encajado) |

## G1-P01 — teclado: VERIFICADO EN VIVO (5 juegos)

`gameKeyboard.js` (G.5/G1-P01) pasa la verificación manual que estaba pendiente en C1 §4.6:

| Juego | Tecla(s) | Verificación en vivo |
|---|---|---|
| laser | ←↑→↓ cursor · Enter/Space · R reset · C check | 1 movimiento completo por teclado en L2 (verificado en DOM: pieza `--movable` en la celda destino) + `C` resolvió el nivel |
| balloon | ↑/Space inflar · ↓ asegurar | 8/8 rondas jugadas solo con teclado |
| passenger | ←↑→↓ mover · R replan | 2 circuitos completos por teclado + 1 replan con `R` |
| team | 1–4/A–D elegir · Enter continuar | 4/4 escenarios por teclado |
| tangram | 1–9 seleccionar · Space/R rotar · Enter encajar · Q devolver | probe: focus del lienzo OK, seleccionar con `1` OK, `Q` OK. **Limitación R4:** `Enter` encaja siempre en el **primer slot libre sin importar la forma** |

→ **G1-P01 CERRADO** (scope original: 4 juegos; verificados 5).

## Pérdida de foco (gameClock): VERIFICADO EN VIVO

- Mecanismo: `installGameFocusClock()` en los 5 juegos; `visibilitychange`/`blur` →
  `markHidden()`; el reloj `now()` excluye el tiempo oculto (singleton, un juego montado a la vez).
- Prueba en vivo (balloon, ronda 3, a mitad de trial): pestaña "oculta" 4.0 s →
  `getHiddenMs()` **+4015 ms** y `now()` solo **+27 ms** (frente a +4000 ms reales) →
  **el reloj del trial se pausa correctamente**. UI estable durante el hidden (sin
  auto-avance: `pumpCount` invariante).
- **Limitación del entorno:** en Chromium headless (build 1234) una pestaña real de fondo
  NO cambia `document.visibilityState` (permanece `visible`), así que la prueba de cambio
  de pestaña real no fue observable en headless; se verificó el wiring con el evento
  `visibilitychange` simulado contra el listener real. **Recomendación:** re-check manual de
  10 s (cambiar a otra app a mitad de un trial y volver; el timer del juego no debe haber
  avanzado) en un dispositivo real.
- Veredicto: **PASS (mecanismo + wiring)**; pendiente: confirmación en dispositivo real.

## Hallazgos

### R1 — BUG de layout: badge "Score provisional" solapa el texto de las cards de constructos (CONFIRMADO EN VIVO)
- **Repro:** `/postulaciones?fixture=1&battery=original` → sección "Mapa de evidencia KRUMM".
- **Medición en vivo (DOM, desktop):** el badge `SCORE PROVISIONAL` mide **145×22 px** dentro
  de un contenedor de score de **64 px** (`.postulation-demo__talent-score--provisional`,
  grid, `place-items:center`). Se solapa **80×12 px** con el título del constructo (p. ej.
  "Toma de decisiones (descriptiva)") y **80×2 px** con la línea "Sin baremos · no comparable".
  Afecta a las cards de varios constructos (mididas en 2 columnas: left 86 / 683).
- **Causa (código):** `PostulationReportScreen.jsx:74-77` (tag `inline-flex; width:max-content;
  margin-bottom:7px` dentro del grid 64 px) + `postulationDemo.css:1888-1928`.
- **Severidad:** visual (no afecta datos). Bloqueante para sign-off visual; no bloquea B1/B2.
- **Fix:** card `t_9e3506b6` (ya creada, `ready`) — mover el tag fuera del grid del score o
  `white-space:nowrap` + posición relativa; validar ES/EN (EN "Provisional score" es más corto).
- **Evidencia:** `r1-construct-card.png` (crop de la card), `report-fixture-evidence-map.png`.

### R2 — NUEVO (copy): Team muestra interpolación literal en el status del footer
- **En vivo (4/4 escenarios):** el footer `[role=status]` muestra literalmente:
  `Señal registrada: coordinación ${pct(interimAggregate.score)}. Revisa el panel lateral para ver qué se calculó por detrás.`
- **Causa (código):** `TeamCoordinationPostulationTask.jsx:248` — string entre comillas simples
  que contiene `${pct(...)}` sin ser template literal.
- **Nota:** el panel BehindPanel ("Trabajo por detrás") muestra `option.why` correctamente
  (verificado en la captura); el bug es solo en la línea de status del footer, que en
  1280×720 queda bajo el fold (visible al scrollear y en móvil).
- **Severidad:** copy (menor). Fix: template literal o concatenación — en la pasada de copy
  de H2/H3 o tarjeta micro.

### R3 — NUEVO (P0): Tangram — el módulo evaluativo no se puede completar (3 defectos independientes)
Verificado por **código + ejecución de los módulos reales en node + recorrido en vivo** (2 runs independientes).

1. **Todos los niveles evaluativos (1–4) son estructuralmente irresolubles** — mismatch de
   composición entre bandeja (`buildTangramLevelShapes`) y slots (`buildTangramSlots`, primer
   N de `SLOT_LAYOUT`). Ejecutando los módulos reales:
   | Nivel | purpose | Slots (forma×cnt) | Bandeja (forma×cnt) | Falta | Cobertura máx |
   |---|---|---|---|---|---|
   | L0 (tutorial) | tutorial | tri_large×2 | tri_large×2 | — | **100% ✓** |
   | L1 | calibration | tri_large×2, square, tri_medium | tri_large, tri_medium, tri_small, rhombus | tri_large×1, square×1 | 50% |
   | L2 | planning | tri_large×2, square, tri_medium, tri_small | tri_medium, tri_small×2, square, rhombus | tri_large×2 | 60% |
   | L3 | stress | tri_large×2, square, tri_medium, tri_small×2 | tri_small, square, rhombus×2, tri_large×2 | tri_medium×1, tri_small×1 | 67% |
   | L4 | dual_constraint | tri_large×2, square, tri_medium, tri_small×2, rhombus | tri_small×3, square, rhombus, tri_large, tri_medium | tri_large×1 | 86% |

   → `finishLevel('success')` (cobertura 100%) es **inalcanzable en cualquier nivel evaluativo**.
   (Dato agravante: L2 y L4 tienen además `moveLimit < pieceCount` (3<5, 4<7) → "solved"
   imposible incluso si las formas matchearan.)
2. **L1 se salta automáticamente** (stale `levelOutcome`): el éxito del tutorial deja
   `levelOutcome='success'`; al pulsar "Comenzar Evaluación Real" (`setPhase('play')+setLevel(1)`)
   el efecto de avance se re-dispara y pasa a Nivel 2 tras ~1.4 s. **En vivo (2 runs):**
   t+0.6 s tras el CTA = "Nivel 1 de 4 · Tiempo: 60s" → t+2.75 s = "Nivel 2 de 4 · Tiempo: 44s"
   sin ninguna interacción. Un postulante real vería L1 por ~1.4 s y jugaría L2 sin haber jugado L1.
3. **No existe la salida por tiempo agotado:** `finishLevel('timeout')` **nunca se llama**
   (el efecto del temporizador llega a 0 y limpia el intervalo; no hay listener de `secondsLeft===0`).
   **En vivo:** el countdown de L2 (45 s) superó 0:00 por **>17 s** (run 2) y **>27 s** (run 1)
   con: HUD congelado en "Tiempo: ¡crítico!" (cop de estado crítico), canvas
   `tangram-canvas--critical`, **sin overlay de resultado, sin transición, sin `game_end`, sin
   `onComplete`**, y sin ningún botón para continuar o abandonar (botones presentes: "Rotar 45°",
   "Deseleccionar", "Ver qué pasa detrás", SFX). El mensaje "¡Tiempo Agotado! Nivel No Superado."
   existe en `tangramFeedback.js:64-65` pero es inalcanzable.

**Impacto:** el flujo de la batería original **no puede completarse en vivo** (se muere en
Tangram): el reporte real es inalcanzable y la señal evaluativa de Tangram es
estructuralmente 0/4 solved. Esto califica de P0 para cualquier demo que juegue la batería de
punta a punta. **No bloquea H2/H3** (reporte/idioma, componentes distintos).
**Nota de tests:** `TangramPostulationTask.test.jsx` solo cubre welcome/práctica/transición
(líneas 33–102) — la fase evaluativa (timer, timeout, moveLimit, skip, avance) no tiene
cobertura de componente (mismo patrón de "logic-only tests" documentado en el skill).
**Evidencia:** `tangram-timeout-hang.png` (estado congelado 0:00), `tangram_exp001.png`
(nivel evaluativo en juego), ejecución de solvabilidad en node (tabla arriba).
**Fix (fuera de scope H1 — audit only):** tarjeta P0 creada en este run (ver
`created_cards` al completar): (a) generar la bandeja desde los slots activos (o viceversa)
para garantizar match de formas; (b) limpiar `levelOutcome` al entrar a evaluación (o
re-guardar el efecto de avance); (c) `finishLevel('timeout')` al llegar a 0;
(d) `moveLimit ≥ pieceCount`; (e) tests de componente de la fase evaluativa.

### R4 — Menor (a11y): Tangram, `Enter` por teclado encaja en el primer slot libre sin importar la forma
- `TangramPostulationTask.jsx:360-366`: la acción `snap` toma el primer slot no ocupado; si la
  pieza no matchea, es denied **y consume un movimiento**. En el tutorial (una sola forma)
  funciona; con múltiples formas el usuario de teclado está a la suerte.
- **Recomendación:** foco por slot (flechas sobre los slots) o `Enter` → primer slot libre
  **compatible** con la forma de la pieza seleccionada.

### LanguageToggle — corrección del snapshot parcial (verificación solicitada)
- **Existe en la landing pública** (verificado en DOM, desktop y móvil):
  `.krumm-lang-toggle` dentro del nav, `aria-label="Idioma / Language"`, botones ES/EN con
  `aria-pressed`. **Funcional:** al pulsar EN el h1 cambia
  "Evaluación humana, gamificada." → "Human evaluation, gamified.".
  Evidencia: `landing-public-es.png` / `landing-public-en.png`. Se corrige así la nota
  "no se encontró" del snapshot anterior.
- **No existe** (medido `hasToggle=false`) en: landing interna, guard, setup, reporte
  (fixture), `/reclutador` → **scope H3** (como esperaba la tabla del plan).

### Privacidad (todas las vistas)
- HUD "Procesando en segundo plano" (setup + stage): "X de 5 listos" con Cámara/Rostro/Señal
  en "En espera" (flujo sin cámara — correcto: no inventa señal) y "Eventos capturados: N"
  (agregado). Sin video, frames ni biométricos visibles en ninguna captura.
- Team BehindPanel: "KRUMM observa elecciones estructuradas; no guarda texto libre ni
  conversación real" + "Se persisten solo scores agregados y conteos; no se guarda la opción
  ni su categoría."
- Reporte fixture: banner "Datos sintéticos de demostración" + "NO IMPLICA VALIDEZ
  PSICOMÉTRICA" + por constructo "Score provisional · Sin baremos · no comparable".
- `/reclutador`: "WORKSPACE HR · DATOS SINTÉTICOS" (en dev sin API: datos locales; con API
  staging: datos reales).
- SFX default-off (🔇) en el stage.
- **OK: aggregate-only respetado en todas las superficies visibles.**

## Capturas (docs/qa/c1-audit-shots/)

Candidatas al hero de la landing (H4.2) — estado rico, en juego, desktop 1280×720:
`laser_puzzle.png` · `balloon_risk.png` · `passenger_routes.png` · `team_coordination.png` ·
`tangram_exp001.png`

Evidencia de hallazgos: `r1-construct-card.png` (R1) · `report-fixture-evidence-map.png` (R1) ·
`tangram-timeout-hang.png` (R3) · `team_coordination.png` (R2, BehindPanel correcto; el status
bugueado está bajo el fold — evidencia por lectura DOM).

Vistas no-juego: `landing-public-es.png` / `landing-public-en.png` (toggle) ·
`internal-landing.png` · `setup-consent.png` · `report-fixture-top.png` · `reclutador.png` ·
móvil 390×844: `mobile-landing-public.png` · `mobile-internal-landing.png` · `mobile-setup.png` ·
`mobile-laser.png` · `mobile-balloon.png` · `mobile-guard-invalid.png` ·
`mobile-report-fixture-evidence.png` · `mobile-reclutador.png`.

> Nota: en el mismo directorio quedaron 6 PNGs ajenos a este run (`landing.png`,
> `landing-en.png`, `postulation-landing.png`, `setup.png`, `guard-invalid.png` ~04:09 UTC y
> `tangram-transition.png` ~04:26 UTC, mtimes; 1280×720, nombres distintos a este run).
> Provenencia no identificada (sin proceso activo al momento de la auditoría; posible script
> huérfano de un intento previo o QA manual). **No están incluidos en el commit de este
> entregable** (quedan untracked) — el orquestador debe verificarlos.

## Estado para sign-off

- **H1 COMPLETO:** todas las vistas cubiertas con evidencia en vivo (overflow 0 en desktop y
  móvil, consola limpia, privacidad OK) + capturas + mediciones DOM. Sin cambios de código
  (solo este doc + capturas).
- **Hallazgos:** R1 (fix card `t_9e3506b6` ya existe) · **R2** (copy Team, nuevo) · **R3**
  (Tangram P0, nuevo — bloquea completar la batería en vivo; tarjeta de fix creada en este
  run) · R4 (a11y teclado Tangram, menor) · G1-P01 cerrado · pérdida de foco PASS (re-check
  manual en dispositivo real recomendado) · LanguageToggle verificado (corrección aplicada).
- **Decisiones para el usuario (sign-off):**
  1. Aprobar el baseline (tabla de veredictos) → desbloquea **H2 + H3**.
  2. **R3 Tangram P0**: priorizar la tarjeta de fix antes de cualquier demo que juegue la
     batería de punta a punta (no interfiere con H2/H3).
  3. R1 → ventana H2/H3 (card existente); R2 → pasada de copy H2/H3; R4 → junto al fix de R3.
  4. Re-check manual de 10 s de pérdida de foco en dispositivo real (opcional pero recomendado
     antes de sign-off final).
