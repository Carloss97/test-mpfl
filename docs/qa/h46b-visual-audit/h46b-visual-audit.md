# H4.6b — Audit visual post-marca v2: flujo candidato + /reclutador (t_be89dafb)

**Fecha:** 2026-09-07 (16:04–16:40 -03) · **Repo:** `/home/sarlock/krumm/test-mpfl`
**Baseline:** `d1adc74` (ee152bb port de marca v2 + d2c6b7e Manrope global + PNGs H4.6)
**Scope (card 15:49):** audit visual SOLO de flujo candidato (landing interna, guard,
setup, stage 5 juegos, reporte) y /reclutador bajo marca v2. La landing pública queda
fuera (auditada en 9062ccf y rehecha en ee152bb).
**Método:** Playwright Chromium headless (1 contexto por vista — diseño Pi heredado de
H3/H4.3/H4.5/H4.6), 21 vistas en 1280×720 (ES/EN) y 390×844 (ES, +EN HR), estilos
computados, contraste WCAG AA in-page, pill de idioma con focus real, recorrido vivo
del stage (5 juegos con soluciones embebidas) y revisión vision de shots clave.
Smoke: `scripts/smoke-h46b-visual-audit.mjs` · verificación prod:
`scripts/prod-verify-h46b.mjs`.
**Vite:** dev server `127.0.0.1:5173` (grafo NUEVO, levantado para este audit — ver
hallazgo F6 sobre el server 5174 stale).

## 1. Checklist de vistas

| # | Vista | Desktop ES | Desktop EN | Móvil ES | Móvil EN | Overflow h | Console | h1 | Contraste AA |
|---|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | `/postulaciones?battery=original` (interna) | OK d01 | OK d11 | OK m01 | — | 0 | 0 | ✓ Manrope | 11.79 (h1) · 3.72 ⚠ kicker (documentado) |
| 2 | Guard inválido | OK d02 | — | OK m02 | — | 0 | 0 | ✓ | 14.19 (texto guard) |
| 3 | Setup | OK d03 | — | OK m03 | — | 0 | 0 | ✓ | 11.79 (panel) |
| 4 | Stage 1/5 — laser Órbita | OK d04 | OK d12 | OK m04 | — | 0 | 0 | ✓ | mundo cian intacto · footer clip OK (974/1262) |
| 5 | Stage 2/5 — balloon Cielo | OK d05 | — | — | — | 0 | 0 | ✓ | arena celeste intacta (8 rondas "asegurar") |
| 6 | Stage 3/5 — passenger | OK d06 | — | — | — | 0 | 0 | ✓ | 3 circuitos completados |
| 7 | Stage 4/5 — team Faro (RPG) | OK d07 | — | — | — | 0 | 0 | ✓ | escena RPG visible · 4 opciones jugadas |
| 8 | Stage 5/5 — tangram | OK d08 | — | — | — | 0 | 0 | ✓ | tutorial + 4 niveles resueltos |
| 9 | Reporte en flujo (post-5 juegos) | OK d09 | — | — | — | 0 | 0 | ✓ | 14.7 / 8.56 (status card) · sin labels framework |
| 10 | Reporte fixture | OK d10 | OK d13 | OK m05 | — | 0 | 0 | ✓ | 14.7 / 8.56 |
| 11 | `/reclutador` | OK d14 | OK d15 | OK m06 | OK m07 | 0 | 0 | ✓ Manrope | 14.19 (brand) · 11.79 (h1) · topbar dark-deep v2 |

Ejecución limpia completa: `h46b-run.json` — `failures: []`, `consoleErrors: []`,
22 screenshots, 1 warning documentado (kicker, §3 F3). Recorrido vivo del stage
sin fallos de mecánica (laser 3 niveles, balloon 8/8 rondas, passenger 3 circuitos,
team 4 decisiones, tangram tutorial + L1–L4, reporte "Resumen ejecutivo HR").

**Tipografía v2 verificada en las 11 vistas auditadas:** `body` y `h1` = Manrope
(fix global `d2c6b7e` — los h1 de flujo declaran `var(--k-font-sans)`; Archivo 900
es de la landing pública, fuera de scope).

**Chrome de marca v2 (estilos computados):** bg landing interna crema/beige v2 ✓ ·
guard `#2b1e16` (dark-deep v2) ✓ · topbar HR `#2b1e16` ✓ · sfx-toggle stage
`#f2e8dc` (card-cream v2) ✓ · pill task-title y pips tokenizados ✓ · mundos de juego
conservados (cyan laser, celeste balloon) — por diseño, no se tokenizan (H4.5) ✓.

**Pill de idioma (focus real, :focus-visible):** vistas claras (interna, setup)
`3px solid rgb(154, 115, 85)` terracota v2 ✓ · guard `3px solid rgb(216, 179, 140)`
arena (override oscuro) ✓.

## 2. Revisión vision — veredicto por vista clave

- **d01 landing interna:** paleta beige/crema/dorado coherente, sin overflow ni
  recortes, pill correcto. Menores (no bloquean): leve diferencia de tinte entre las
  mitades del pill (activo ES beige vs inactivo EN grisáceo); alturas de fila de la
  ficha técnica desiguales por wrap; dorado se percibe como tan apagado (la marca v2
  usa `#d8b38c`, correcto — es la percepción del acento, no un defecto de paleta).
- **d04 stage laser:** chrome completo (título, pips dorados, ES/EN, "Juego 1 de 5");
  el recorte inferior de la shot es el **fold del viewport** (contenido scrollable;
  `scrollWidth == innerWidth` y el check de clipping del footer pasó) — convención
  heredada de H4.6 "cortes de captura ≠ bugs". Mundo Órbita cian intacto; el dorado
  es el puente chrome↔mundo.
- **d08 stage tangram:** controles y cabecera completos; el canvas se extiende bajo
  el fold (scrollable). **Observación F5:** en el estado inicial del tutorial, el
  ápice de una pieza cruza el borde superior de la silueta punteada — verificar si es
  animación de entrada o posición de spawn (contenido de mundo, sin impacto de marca).
- **d14 /reclutador:** topbar espresso con brand nítido, hero crema, cards con
  acentos semánticos (teal = éxito, §3.1), sin overflow interno (el borde inferior
  de la shot es fold). **Observación F4:** card 3 "Revisar **caveats**" — palabra
  inglesa en UI ES (copy → card t_24a0e428).

## 3. Hallazgos

### F1 — CSP de CloudFront bloqueaba Google Fonts en producción (CRÍTICO → FIX aplicado)
- **Síntoma:** krumm.cl servía la CSP `krumm-staging-rhp-m2` con
  `style-src 'self' 'unsafe-inline'; font-src 'self' data:` → el stylesheet de
  `fonts.googleapis.com` (Archivo+Manrope, link de `index.html` del port de marca)
  quedaba **bloqueado**: la marca v2 renderizaba con fallback del sistema y cada
  página emitía 1 error de consola. El deploy de la sesión de marca (15:49–15:56)
  verificó estilos computados (declaraciones), no render real — de ahí el paso
  inadvertido.
- **Fix (2026-09-07 16:35, vía API — políticas RHP inmutables):**
  - RHP nueva `krumm-staging-rhp-m3` (ID `aaac7f10-372b-461e-b387-1ed1f2eeadd6`):
    `style-src ... https://fonts.googleapis.com`, `font-src ... https://fonts.gstatic.com`,
    resto idéntica a m2.
  - `update-distribution` EDQ39PDNI931R (if-match `E1PA6795UKMFR9` → ETag
    `E13V1IB3VIYZZH`), default behavior → m3. Status `Deployed` en ~2 min.
  - m2 eliminada (ya no referenciada). `infra/m1-frontend-stack.yaml` sincronizado
    (ver §CFN).
- **Verificación real (post-fix, `prod-verify-h46b.mjs` + check de landing):**
  4 vistas de flujo + landing: `document.fonts.check('700 16px Manrope') = true` en
  flujo, `document.fonts.check('900 16px Archivo') = true` + h1 = Archivo en
  landing, **0 errores de consola** (antes: 2/página), 0 overflow.
- **CSP vigente:**
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://storage.googleapis.com https://rwm08ik23m.execute-api.us-east-1.amazonaws.com; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`

### F2 — Directive `wasm-src` no reconocida (→ RESUELTO con F1)
Chromium la reportaba como error de consola en cada página. Retirada en m3 (el
bundle no usa wasm). ConsoleErrors: 2/página → 0.

### F3 — Kicker terracota #9a7355 sobre crema: 3.72:1 (DOCUMENTADO → RESUELTO 2026-09-07)
Medido en landing interna (eyebrow): `rgb(154,115,85)` sobre `rgb(247,239,230)` =
3.72:1 (< AA 4.5). El valor era el oficial de la referencia (la usa a 13px/800);
quedó abierto en design-system.md §10 a decisión del usuario.
**Decisión del usuario (2026-09-07): "cualquiera está bien, la que genere menos
errores" → AA estricto.** Fix aplicado: `--k-ink-terracotta` oscurecido a
**`#704f39`** (6.4:1 crema · 6.0:1 beige · 4.8:1 arena); el valor de marca se
conserva como `--k-ink-terracotta-brand: #9a7355` con override de scope solo en
la sección `__accesos` de la landing (superficie oscura, donde el AA no rinde).
Re-audit post-fix: ver adenda al pie de este doc. Afecta también el focus del
pill en vistas claras (mejora ~6:1).

### F4 — Copy "Revisar caveats" (inglés en UI ES) → card existente
Dashboard HR, card 3 de métricas. Es scope de la card ready `t_24a0e428`
("Copy: HR dashboard — datos sintéticos sin EN"). No se toca en este audit.

### F5 — Tangram: pieza en estado inicial cruza el borde de la silueta (OBSERVACIÓN, mundo)
Shot d08 (post `tangram-start-tutorial`, pre-placement): el ápice del triángulo
superior sobrepasa la arista superior punteada. Posible animación de entrada o
posición de spawn. Contenido de mundo (azul por diseño, H4.5), sin impacto de marca
ni de layout. Sugerencia: verificar en la próxima tarea de juegos (t_f40921bf o
review de P0 Tangram) — si es spawn real, es un defecto visual menor del mundo.

### F6 — Dev server 5174 stale (proceso, no código) — aviso de proceso
El Vite de la sesión de marca (arrancado 15:27) seguía sirviendo
`krumm-tokens.css` **v1** (`#2a1f17`, `#33241c`, Inter) aunque el disco tenía v2:
el grafo de módulos no se invalidó tras el rewrite de tokens. Un audit contra 5174
(detección: primer run del smoke marcó Inter + valores v1) habría dado falso
positivo masivo. **Contra-medida:** se levantó server nuevo en `127.0.0.1:5173`
(verificado: `curl /src/styles/krumm-tokens.css` sirve `#2b1e16`/`#3d2b20`/`#f7efe6`)
y todo el audit corrió contra él. Regla para audits locales futuros: verificar que
el dev server sirve los tokens del disco antes de ejecutar el smoke.

## 4. Gates

| Gate | Resultado |
|---|---|
| Smoke H4.6b (21 vistas + recorrido, `h46b-run.json`) | `failures: []`, `consoleErrors: []`, exit 0 |
| Suite completa `NODE_ENV=test vitest run` | **705/705** (123 archivos, 16:23) |
| oxlint `smoke-h46b-visual-audit.mjs` + `prod-verify-h46b.mjs` | 0 errores (2 warnings de parámetros sin usar, corregidos) |
| `npm run build` | ver handoff (gate de cierre) |
| Verificación prod post-RHP (4 vistas flujo + landing) | 0 errors, Manrope/Archivo render real, 0 overflow |

## 5. Evidencia

- Shots: `d01…d15` (desktop) + `m01…m07` (móvil) en este directorio.
- JSON de la ejecución limpia: `h46b-run.json`.
- RHP: m3 `aaac7f10-372b-461e-b387-1ed1f2eeadd6`; m2 `23b296b7-…` eliminada;
  m1 `24c8a9d6-…` (orphan época B1) intacta.
- Handoff con secuencia y advertencia CFN:
  `docs/plans/2026-09-07-handoff-h46b-audit-marca-v2.md`.

## Adenda — Re-audit post-fix AA (2026-09-07 17:15–17:30)

Decisión del usuario (F3): AA estricto → `--k-ink-terracotta: #704f39`
(6.4:1 crema · 6.0:1 beige · 4.8:1 arena) + `--k-ink-terracotta-brand: #9a7355`
con override de scope en `.landing__section--accesos` (superficie oscura).
- Re-ejecución del smoke completo (`h46b-run-aa.json`, 17:15): **0 failures,
  0 warnings (eyebrow ahora 6.43:1), 0 console errors, 22 shots**; focus del pill
  verificado con el nuevo valor `rgb(112,79,57)` en vistas claras y `rgb(216,179,140)`
  en guard.
- Suite completa **705/705** (123 archivos); build OK; oxlint del smoke 0 errores.
- Deploy AWS 17:26 (bundle `index-BpguQVqX.js`) + verificación prod 17:29:
  `eyebrow = rgb(112,79,57)` en vivo, Manrope cargada, 0 errors, 0 overflow.
