# H3 — QA: Toggle de idioma ES/EN en flujo candidato + portal reclutador

**Fecha:** 2026-09-07 · **Card:** `t_61613539` · **Plan:** `docs/plans/2026-09-07-plan-ux-vistas-idioma-landing.md` (H3)
**Repo:** `/home/sarlock/krumm/test-mpfl` (main) · **Vite dev:** `127.0.0.1:5173` · **Chromium:** headless 1234 (Playwright)

## Veredicto

**PASS.** Toggle ES/EN visible y funcional en las 6 vistas (landing interna, guard check/invalid,
setup, stage, reporte, /reclutador); el cambio persiste entre vistas (localStorage `krumm-lang`);
sin overflow horizontal en desktop ni móvil; 0 errores de consola en el recorrido completo.

## Evidencia

### Unit tests (jsdom)
- `NODE_ENV=test npx vitest run --pool=threads` → **120 files / 660 tests passed**.
- Tests de toggle H3 (por vista): `PostulationConsentSetup.test.jsx` (setup),
  `PostulationLanding.test.jsx` (landing interna), `PostulationGameStage.test.jsx` (stage:
  toggle en header + sin telemetría al cambiar), `PostulationReportScreen.test.jsx` (reporte
  real + estado de error), `PostulationHrDashboard.test.jsx` (/reclutador + assert H3.3:
  en EN no queda el label ES "Listo para revisión"), `PostulationDemoApp.test.jsx`
  (guard invalid con persistencia), `LanguageContext.test.jsx` (12: persistencia + `?lang=`).

### Build / lint
- `npm run build` → ok (4.5s; warning de chunk >500kB preexistente).
- `npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js`
  → 0 errores (1 warning preexistente en `src/assessment/ParticipantAssessmentFlow.jsx`, ajeno a H3).
- `git diff --check` → limpio.

### Smoke browser (`scripts/smoke-h3-language-toggle.mjs`) — **exit 0, 0 fallos, 0 console errors**
- **Run A (desktop 1280×720):** 6 vistas. Cadena real de persistencia: la app escribe
  `krumm-lang` en cada vista (click verificado) y la vista siguiente se hidrata con ese valor.
  Landing ES→EN · Guard (hidrata EN)→ES · Setup ES→EN · Stage EN (toggle en header, pill no
  invade `game-body`) · Reporte (hidrata EN)→ES · HR ES→EN + hidratación fresca de persistencia.
- **Run B (móvil 390×844):** 6 vistas en EN hidratadas de la cadena de Run A; toggle visible
  y sin overflow en todas.
- **Diseño del smoke (Pi):** 1 contexto (1 carga de documento) por vista. Verificado 06:25:
  la 3ª carga en el mismo contexto revienta con `ERR_INSUFFICIENT_RESOURCES` en Chromium
  headless (Pi 4GB, swap bajo presión) — reproduce en 3 secuencias distintas. La cadena
  `krumm-lang` via `addInitScript` es equivalente a un perfil persistente.

### Screenshots (esta carpeta)
| Shot | Vista | Estado |
|---|---|---|
| a1-landing-en | Landing interna | EN (tras click) |
| a2-guard-es | Guard invitación expirada | ES (tras click) |
| a3-setup-en | Setup/consentimiento | EN |
| a4-stage-en-corner | Stage (juego 1, batería default) | EN, toggle en header |
| a5-report-es | Reporte fixture | ES (tras click) |
| a6-hr-en | /reclutador | EN, toggle en topbar |
| b1-landing-en | Landing interna | EN, móvil, sin overflow |
| b2-guard-en | Guard | EN, móvil |
| b3-setup-en | Setup | EN, móvil |
| b4-stage-en | Stage | EN, móvil, toggle en header |
| b5-report-en | Reporte | EN, móvil |
| b6-hr-en | /reclutador | EN, móvil, toggle horizontal en topbar |

## Fixes aplicados durante la verificación (scope H3)

1. **Stage — posición del toggle (corregido):** el anclaje inicial del WIP (hud-corner,
   `left:0`) caía **sobre el canvas jugable** de precisión en 1280×720 (pill x242-343 dentro
   de task-area x41-561 — bounding boxes verificados; el pill intercepta taps). Se movió a la
   **esquina superior derecha del header** junto al progreso (`.postulation-demo__game-header-right`):
   chrome de la demo, fuera del área jugable en todos los breakpoints (verificado desktop + móvil).
2. **HR móvil — toggle oculto (bug H3):** `@media ≤640px` hacía `display:none` a todo `div`
   de `.hr-dashboard__user` (el toggle es un div) → regla cambiada a `> div:not(.krumm-lang-toggle)`.
3. **HR móvil — toggle apilado en vertical (bug H3):** la regla base `.hr-dashboard__user div {
   display:grid }` convertía el pill en grid de 2 filas (ES sobre EN, 53×70) → excluida con
   `:not(.krumm-lang-toggle)`. Asertión de regresión en el smoke (pill horizontal: w>h).
4. **Landing interna móvil — overflow 28px (bug H3 EN):** el eyebrow EN
   "Original battery · Controlled assessment" mide 408px con `width:max-content` → columna 1fr
   del hero se inflaba (418>390) → wrap permitido en `≤860px`.
5. **HR detail — status ES fijo en EN (H3.3):** `status?.label` → `t(status.label, status.labelEn)`
   (como ya hacía `StatusPill`); test de regresión agregado.
6. **Smoke — marcador de stage:** la batería default (`stable_dg`, sin `?battery=original`)
   muestra **4 bloques visibles** ("Game 1 of 4"; el calentamiento de reacción no cuenta en el
   progreso) y el label de nivel del juego es `t('Nivel','Level')` → "Level 1 of 3" en EN
   (el WIP del run 75 esperaba "Game 1 of 5" / "Nivel 1 de 3", bug latente corregido).

## Hallazgos FUERA de scope H3 (creadas cards de seguimiento)

1. **Stage móvil — canvas recortado (juego parcial invisible):** `getPostulationGameViewport`
   clampa el ancho del canvas a **mínimo 500px** (`clamp(width-760, 500, 620)`); en 390×844 el
   stage completo mide 526px (game-body y header) y el ~27% derecho del canvas queda fuera de
   pantalla (oculto por `overflow-x:hidden`) → blancos del lado derecho inalcanzables.
   Preexistente (no introducido por H3; el audit H1 midió overflow por `scrollWidth`, que este
   clip oculta). Afecta a toda la batería en móvil.
   - **RESUELTO (t_f40921bf, 2026-09-07):** `getPostulationGameViewport` (PostulationGameStage.jsx)
     ya no clampa el canvas a piso 500px: en compacto usa `min(anchoDeseado, contenidoStage-32)`
     con tope 620, piso jugable 240 y tope = ancho real del contenedor (helper
     `getStageContentWidth`, chrome-aware: shell 18/10px por el breakpoint @520, border 1px,
     stage padding `clamp(12px,2vw,22px)`). El walk-through vivo (`scripts/smoke-t_f40921bf-stage-mobile.mjs`,
     390×844 y 320×700) midió bounding boxes reales (no `scrollWidth`): 4 juegos stable_dg + 5
     original sin recorte, blancos de precisión alcanzables. Hallazgo extra del smoke: go_nogo y
     color_interference hardcodeaban `width:520` en `.task-area` (no usaban el prop del stage) →
     ambos ahora reciben `width` (test de regresión en goNoGo/colorInterference). Evidencia:
     `docs/qa/h3-language-toggle/t_f40921bf-*.png` (16 capturas). Gates: suite 711 tests,
     build, oxlint, git diff --check — todo verde.
2. **Copy EN faltante en datos sintéticos HR:** `hrDashboardData.js` — `summary`,
   `interviewPrompts`, `caveats` y `games[].metric` de los 5 candidates son ES-only (los campos
   de identidad/rol/constructos/juegos sí traen `labelEn`). En la vista EN del Evidence Profile
   aparece narrativa en español. Requiere copywriting (fuera del toggle).
3. **Juegos de la batería default `stable_dg` sin EN:** titles/descriptions de los bloques
   (`postulationDemoConfig.js`) y el copy in-game (p. ej. `PrecisionTargetingTask.jsx`:
   "🎯 Ruta de precisión adaptativa", captions, route cards) están hardcodeados en español sin
   `useLanguage`. La batería original (5 juegos, `?battery=original`) sí usa `t()` (audit H1).
   Con EN activo, el chrome del stage se traduce pero el contenido del juego no.
   - **RESUELTO (t_42978412, 2026-09-07):** los 5 bloques stable_dg ganan siblings de
     presentación `labelEn`/`shortLabelEn`/`descriptionEn` (campo ES canónico intacto —
     pattern `originalGameBlueprints.js`); `PostulationProgressHeader` renderiza
     `t(label, labelEn)`/`t(description, descriptionEn)`; las 4 tareas (precision, go_nogo,
     color, visual_search) usan `useLanguage()` + `t(es,en)` en todo el copy in-game
     (títulos, instrucciones, botones, timer, aria, feedback, pantallas de cierre) — los
     helpers puros conservan salida ES (contrato de telemetría: `routeLabel` en payload,
     cues GO/NO-GO, estímulo Stroop). El reporte resuelve el EN de las game cards desde la
     config (antes mostraba el gameId crudo en stable_dg EN). **Limitación documentada:**
     las palabras-estímulo del Stroop (ROJO/AMARILLO/AZUL/VERDE) permanecen en español en
     ambas lenguas — dato congelado + payload; la tarea mide selección de tinta ("ignora
     el texto"), no lectura. Walkthrough vivo EN+ES 1280×720
     (`scripts/smoke-t_42978412-stable-dg-en.mjs`): setup→4 juegos jugados→reporte,
     0 fallos, 0 console errors, 10 capturas (`t_42978412-*.png`). Hallazgo colateral (fuera
     de scope, candidate para t_24a0e428): el hero del reporte EN muestra "observations
     **de alcance**" (`de alcance` hardcodeado en `PostulationReportSummary.js`).

## Nota de recuperación (WIP H4.2 mezclado en el stash del run 75)

`src/landing/LandingPage.test.jsx` (spec del rebuild H4.2: 12/13 fallan contra el
`LandingPage.jsx` actual pre-H4.2) y `public/logo.svg` (asset del rebuild) se recuperaron del
WIP de H3 y quedaron en **`/home/sarlock/krumm/h4-wip-recovery/`** (con README). Integrar junto
con `stash@{0}` wip(H4.2/4.3/4.5) antes de tocar H4.2. El override oscuro
`.landing .krumm-lang-toggle` que H3 dejó en `landing.css` usa colores hardcodeados; el test de
régimen de tokens del rebuild exigirá moverlo a `var(--k-*)` cuando H4.2 reescriba `landing.css`.
