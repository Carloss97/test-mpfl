# H4.6 — Audit visual unificado del cierre de H4 (t_be89dafb)

**Fecha:** 2026-09-07 · **Repo:** `/home/sarlock/krumm/test-mpfl` · **Estado commit auditado:** `87338c1` (H4.5) + delta H4.6
**Método:** Playwright Chromium headless (1 contexto por vista), 19 vistas en 1280×720 (ES/EN) y 390×844 (ES, +EN HR), estilos computados, contraste WCAG AA calculado in-page, bounding-box geometry para oclusión/recorte. Smoke: `scripts/smoke-h46-visual-audit.mjs` (+ `smoke-h46-hero-visual.mjs` para el hero).
**Vite:** dev server `localhost:5173` (trabajo principal) / `5174` (worktree de verificación, estado commit).

## 1. Checklist de vistas

| # | Vista | Desktop ES | Desktop EN | Móvil ES | Móvil EN | Overflow h | Console | h1 | Contraste AA |
|---|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | `/` (landing pública, H4.2) | OK d01 | OK d02 | OK m01 | — | 0 | 0 err | ✓ | 11.98 (h1) |
| 2 | `/postulaciones?battery=original` (landing interna, H4.3) | OK d03 | OK d04 | OK m02 | — | 0 | 0 err | ✓ | 5.70 (eyebrow) |
| 3 | Guard inválido (H4.3) | OK d05 | OK d06 | OK m03 | — | 0 | 0 err | ✓ | 13.16 (texto guard) |
| 4 | Setup (H4.3) | OK d07 | (→stage EN) | OK m04 | — | 0 | 0 err | ✓ | 12.45 (panel) |
| 5 | Stage juego 1 — laser Órbita (H4.5) | OK d08 + fix footer verificado | OK d09 + fix footer verificado | OK m05 | — | 0 | 0 err | ✓ | 12.45 (progress) |
| 6 | Reporte fixture (H4.3) | OK d10 | OK d11 | OK m06 | — | 0 | 0 err | ✓ | 13.70 (strong navy) · 8.49 (kicker navy) |
| 7 | `/reclutador` (H4.4) | OK d12 | OK d13 | OK m07 | OK m08 | 0 | 0 err | ✓ | 13.16 (brand) · 12.45 (h1) |

Ejecución limpia completa (19 vistas, `failures: []`, `consoleErrors: []`): `smoke-clean-run.json` (estado committed, pre-port de marca).

Contraste (par texto/fondo computado, umbral AA 4.5:1): todos ≥ 5.7. Pares con gradiente (mundos de juego) no se miden por sólido: se verifican en H4.5 (report W5 AA) y por revisión visual.

## 2. Hallazgos y correcciones

### 2.1 Footer laser: texto derecho recortado (HALLAZGO PREEXISTENTE → FIX H4.6) ✓
- **Evidencia previa:** shot C1 (`docs/qa/c1-audit-shots/laser_puzzle.png`) + hallazgo H4.5: el check-hint ("Comprueba cuando quieras…") se recortaba a la letra "e" con `overflow-x:hidden` del stage en 1280×720.
- **Causa raíz:** `.laser-puzzle-task__actions { flex: 0 0 auto }` — la caja se dimensionaba a max-content (2 botones + hint en una línea) y la fila del footer desbordaba la tarjeta de 720px.
- **Fix:** `flex: 0 1 auto` + `min-width: 0` en `postulationDemo.css` — la caja es reducible y el check-hint envuelve a su línea dentro de la caja (`flex-basis: 100%` ya existente en `originalGameAnimations.css`).
- **Guardián:** spec en `PostulationGamesDesignSystem.test.jsx` (RED → GREEN).
- **Verificación live:** `smoke-h46-visual-audit.mjs` aserta bounding boxes (hint dentro del rect visible del stage, sin overflow de tarjeta/footer) en stage ES **y** EN a 1280×720: `OK hint dentro del stage (right 974/1262)`.

### 2.2 Hero landing: cards flotantes ocultaban texto del mock (HALLAZGO AUDIT → FIX, SUPERADO por port de marca)
- **Evidencia:** geometry real (1280×720): chip "SCORE PROVISIONAL" oculto **100%** por el badge superior (overlap 185×32); nota "Reporte para revisión humana · …" oculta ~37% (182px). Móvil (390×844): chip oculto 100% (185×32), nota oculta ~70% (201×54), badge superior además pisaba la fila 1 de métricas.
- **Fix aplicado en working tree** (documentado aquí por reconstructibilidad; el archivo fue reescrito después por el port de marca — ver §3):
  - ≥900px: `.landing__stat { max-width: 400px }` (badge superior en una línea, h≈76), `.landing__stat--top { top: -52px }` (contacto con la tarjeta queda en la banda vacía: chip a 29px del tope), `.landing__stat--bottom { bottom: -62px }` (nota a 20px del pie, contacto a 14px).
  - <900px: badges a flujo — `.landing__hero-visual { display: grid; gap: 12px }`, `.landing__stat { position: static; max-width: 100% }`, `.landing__stat--top { order: -1 }` (stacked: privacidad / mock / velocidad).
  - `.landing__mock-head { flex-wrap: wrap }` (el título "Perfil de talento" envuelta 3 líneas en móvil por el chip; con wrap queda en 1 línea).
- **Verificación:** geometry post-fix: `chipVsTop: null`, `noteVsBottom: null` en desktop y móvil; visión: chip y nota 100% visibles, badges completos y alineados.
- **Especificación:** `LandingPage.test.jsx` (3 tests de declaración) — **retirada** al colisionar con el port de marca (ver §3); el port elimina el mock y las stat cards (decisión documentada en su plan), así que el fix queda obsoleto.

### 2.3 Revisión visual (vision) — veredicto por vista
- **Landing pública (d01/d02):** paleta espresso/crema/oro coherente; H1 bicolor; kickers "NN · LABEL"; CTA pill arena. El navy de las stat cards flotantes + escudo azul `#2e4a6b` es **by design** (design-system §1 "acento navy reservado para cards de stats flotantes" y §6). Sin indigo frío fuera de sistema (el pill de idioma ya corregido en H4.3).
- **Landing interna / guard / setup (d03-d07, m02-m04):** crema `--k-bg-light`, eyebrow terracota, CTA arena, guard espresso con pill oscuro. Coherente.
- **Stage laser (d08/d09/m05):** mundo Órbita conservado (cian), chrome espresso/crema, fix 2.1 verificado. Sin recortes de texto.
- **Reporte (d10/d11/m06):** status card navy con strong crema 13.70:1 y kicker arena 8.49:1; banners fixture (warn) legibles; "Integridad de archivos verificada · no implica validez psicométrica" visible. La card navy y el teal de "Listo para revisión humana" son semántica documentada (§3.1 `--k-status-ok` = teal).
- **HR (d12/d13/m07/m08):** topbar espresso con brand crema 13.16:1; cards crema; iconos de métrica con tintes semánticos (ok/warn/neutral) — capa de estado, no paleta de marca (documentado §3.1). Sin indigo.
- **EN (d02/d04/d06/d09/d11/d13/m08):** headings correctos en las 6 vistas (`Talent is not declared. It is demonstrated.`, `KRUMM Applications`, `Invalid invitation`, `Session preparation`, `Sample report…`, `Evaluations…`); sin overflow en EN.
- **Cortes de captura ≠ bugs:** el recorte en el borde inferior de varias shots es el fold del viewport (contenido scrollable), no clipping de layout — verificado con `scrollWidth` y con shots contextuales (d14/m09).

## 3. COLISIÓN: port de marca en curso (transparencia)

Durante la ejecución (15:09–15:15) una **sesión paralela del usuario** (plan: `docs/plans/2026-09-07-landing-brand-port-plan.md`, "agente autónomo Pi", autorizado por el usuario 2026-09-07) reescribió en el working tree:
- `src/styles/krumm-tokens.css` (paleta oficial v2, `--k-ink-terracotta` → `#9a7355`, fuentes Archivo/Manrope)
- `index.html` (Google Fonts)
- `src/landing/LandingPage.jsx` + `src/landing/landing.css` (rebuild completo; **elimina el mock y las stat cards del hero**)
- `public/assets/` (hero-photo + logos)
- `src/landing/LandingPage.test.jsx` (actualización en curso)

Consecuencias para este task:
1. **El fix 2.2 (hero) quedó superado** (el mock ya no existe). Valores de reconstruction en 2.2.
2. **Incidente de revert:** al retirar mis 3 tests H4.6 de `LandingPage.test.jsx` (referenciaban reglas `.landing__stat` que el port eliminó, y habrían roto el gate de spec del port), `git checkout --` restauró el archivo a HEAD y **descartó los cambios no-commitados de la sesión paralela en ese archivo (~23 ins/14 del)**. El port reescribe el spec completo en su gate 1 (`write_file` del plan item 6), por lo que se auto-recupera en su próximo write; se deja constancia aquí y en comentario de kanban.
3. **El deploy de H4 colisiona con el del port:** el plan del port incluye su propio deploy AWS + push (autorizado por el usuario). Un deploy desde este working tree capturaría la landing a medio portar. **Decisión de deploy → needs_input** (ver comentario de cierre en kanban).
4. Los colores de la ejecución "final" de la smoke (terracota `#9a7355`, bg `#f7efe6`) ya reflejan los tokens v2 del port — la evidencia limpia del estado committed está en `smoke-clean-run.json` + shots regeneradas desde worktree.

**Fuera de scope afectado:** el fix del footer laser (2.1) NO toca landing — sobrevive al port y se commitea/pusha con este task.

## 4. Gates (estado committed + delta H4.6, verificados en worktree)

| Gate | Resultado |
|---|---|
| spec `PostulationGamesDesignSystem.test.jsx` | 11/11 (incluye guardián del footer laser) |
| suite completa | ver worktree (ver §5) |
| oxlint (scope H4.6) | ver worktree |
| `npm run build` | ver worktree |
| `git diff --check` | OK |
| smoke 19 vistas (estado committed) | `failures: []`, `consoleErrors: []` — `smoke-clean-run.json` |

## 5. Evidencia

- Shots: `d01…d14` (desktop) + `m01…m09` (móvil) en este directorio — **regeneradas desde el worktree del commit H4.6** (estado limpio, sin tokens del port).
- Geometry hero pre/post fix: comentarios del smoke + §2.2.
- JSON de la ejecución limpia: `smoke-clean-run.json`.
