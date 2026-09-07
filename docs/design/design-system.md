# KRUMM Design System (v1)

**Origen:** H4.1 (2026-09-07), extraído del set de referencia de 8 capturas del usuario
(`docs/design/landing-refs/Captura_de_pantalla_2026-09-05_*.png`).
**Tokens:** `src/styles/krumm-tokens.css` (variables `--k-*`, importadas global en `main.jsx`).
**Documento vivo:** actualizar este archivo cuando H4.2+ refine decisiones (font final, medidas).

## 1. Identidad (mood)

Oscuro cálido **premium** — "corporate humano". Paleta tierra (espresso + crema + oro/arena),
composición **editorial minimalista** (pocos elementos, mucho espacio negativo, jerarquía por
tamaño/peso/color), textura técnica sutil (retícula sobre secciones oscuras). Evita el frío
"tech azul" típico; transmite confianza, seriedad y artesanía. Acento navy reservado para
cards de stats flotantes (dato frío sobre cálido).

## 2. Referencia (las 8 capturas)

| Archivo | Contenido |
|---|---|
| `..._101329.png` | Hero split (sin nav): H1 bicolor, subheadline, 2 CTAs, 3 badges de confianza, foto + 2 cards flotantes navy |
| `..._192215.png` | Hero **con nav**: logo (cabeza-árbol), 5 links, "Iniciar sesión", CTA "Solicitar demo", pill EN\|ES |
| `..._192227.png` | Hero completo (otra toma): badges "EDGE-AI EN EL NAVEGADOR / PRIVACY BY DESIGN / EVALUACIÓN CONDUCTUAL INMERSIVA", curva decorativa superior |
| `..._192244.png` | Sección clara **"01 · CÓMO FUNCIONA"** — "Evalúa lo que un CV no puede mostrar." + párrafo; columna izquierda, aire a la derecha |
| `..._192250.png` | Sección clara **"02 · TECNOLOGÍA"** — "Edge-AI + gamificación + psicometría." (fondo crema-arena más profundo) |
| `..._192259.png` | Cierre oscuro **"HABLEMOS"** — "Descubre qué puede medir KRUMM en tu organización." + CTA arena; footer crema (© 2026 KRUMM / tagline) |
| `..._192315.png` | Sección de accesos oscura — "¿Dónde quieres ingresar?": 2 cards (Empresa=arena, Candidato=crema) con iconos lineales |
| `..._192326.png` | Mismo bloque de accesos completo: CTAs "Ingresar como empresa →" / "Ingresar como candidato →" + "← Volver a KRUMM" |

Copy visible de referencia (usar como base en H4.2, sujeto a confirmación del usuario):
"El talento no se declara. **Se demuestra.**" · "KRUMM revela la capacidad real de cada
candidato mediante simulaciones gamificadas y telemetría conductual procesada con Edge-AI
directamente en el navegador — sin datos biométricos en la nube, sin sesgos, sin CVs
generados por IA." · "Datos en tu dispositivo" · "Tiempo de evaluación −60%".

## 3. Paleta

| Rol | Token | Hex | Uso |
|---|---|---|---|
| Fondo oscuro base | `--k-bg-dark` | `#33261d` | Hero, CTA final |
| Fondo oscuro profundo | `--k-bg-dark-deep` | `#2a1f17` | Nav, sección accesos |
| Fondo claro 1 | `--k-bg-light` | `#f3e9e1` | Sección 01 |
| Fondo claro 2 | `--k-bg-light-sand` | `#e6d3b9` | Sección 02 (variación rítmica) |
| Footer | `--k-bg-footer` | `#e2cfb9` | Barra inferior |
| Card empresas | `--k-card-sand` | `#d8c2a6` | Accesos (rol 1) |
| Card candidatos | `--k-card-cream` | `#f2ece3` | Accesos (rol 2) |
| Card stats flotante | `--k-card-navy` | `#161e2b` | Sobre foto (hero) |
| Retícula | `--k-grid-line` | rgba crema 6% | Textura sobre oscuro |
| Texto crema | `--k-text-cream` | `#f1e7db` | Titulares sobre oscuro |
| Texto crema atenuado | `--k-text-cream-dim` | `#c4b2a0` | Cuerpo sobre oscuro |
| **Acento oro/arena** | `--k-accent-sand` | `#d4b483` | Palabra destacada H1, kickers, CTA, iconos |
| Tinta espresso | `--k-ink-espresso` | `#33241c` | Titulares sobre claro |
| Tinta media | `--k-ink-medium` | `#6e584b` | Cuerpo sobre claro |
| Terracota (kicker claro) | `--k-ink-terracotta` | `#74543e` | "01 · X" sobre crema (H4.2: oscurecido desde `#9c7b66` para AA ≥4.5:1) |
| CTA primario | `--k-cta-bg` / `--k-cta-ink` | `#e4d3b9` / `#33261d` | Pill arena con texto espresso |

Regla: acento oro ÚNICO por vista (una palabra del H1 o un CTA — nunca ambos saturando).

### 3.1 Extensión de tokens (H4.3/H4.4, 2026-09-07)

Añadidos a `krumm-tokens.css` al aplicar los tokens al flujo candidato y a /reclutador
(rol funcional, no paleta de marca; el oro/arena sigue siendo el único acento cálido):

| Rol | Token | Valor | Uso |
|---|---|---|---|
| Estado ok (texto) | `--k-status-ok` | `#0f766e` | badges/pills ok (AA ≥4.5:1 sobre crema) |
| Estado ok (fondo) | `--k-status-ok-soft` | rgba 12% | fondos de pill ok |
| Estado warn (texto) | `--k-status-warn` | `#92400e` | caveats, banners fixture |
| Estado warn (fondo) | `--k-status-warn-soft` | rgba 12% | fondos de warn |
| Estado error (texto) | `--k-status-error` | `#b42318` | errores, integridad bloqueada |
| Estado error (fondo) | `--k-status-error-soft` | rgba 10% | fondos de error |
| Tinte cálido | `--k-tint-gold` | rgba(212,180,131,0.16) | chips, iconos, filas seleccionadas |
| Tinte cálido fuerte | `--k-tint-gold-strong` | rgba 34% | bordes/selección/focus sobre claro |
| Hover sobre claro | `--k-hover-soft` | rgba(107,88,68,0.06) | hover de filas |
| Sombra sobre claro | `--k-shadow-soft` | 0 8px 24px rgba(51,38,29,0.08) | cards de flujo/HR |
| Sombra CTA | `--k-shadow-cta` | 0 14px 30px rgba(107,88,68,0.28) | CTA primario |
| Radio panel | `--k-radius-panel` | 22px | paneles grandes (setup, reporte, stage, queue) |
| Radio pill | `--k-radius-pill` | 999px | pills / badges |

Nota de contraste: el oro `--k-accent-sand` solo va como **texto** sobre oscuro
(kickers arena); sobre claro se usa como relleno (CTA, barras, dots) y el texto
de acento pequeño usa `--k-ink-terracotta`.

## 4. Tipografía

Familia: **Inter** (ya es la fuente del sitio — sin cambio). Jerarquía:

| Nivel | Peso | Tamaño | Tracking | Uso |
|---|---|---|---|---|
| Display (hero H1) | 800 | `clamp(3rem,6vw,5rem)` | −0.02em | 1 por landing, bicolor (crema + acento en la palabra clave) |
| Sección (H2) | 800 | `clamp(2rem,4vw,3rem)` | −0.02em | "Evalúa lo que un CV no puede mostrar." |
| Kicker | 500 | 0.8125rem | +0.12em | MAYÚSCULAS; patrón **"NN · LABEL"** en secciones claras |
| Card title | 700 | ~1.5rem | normal | Dentro de cards |
| Cuerpo | 400 | 1.0625rem | normal | Medida de línea corta (~50-60 chars) |
| Micro (footer) | 400-500 | 0.8rem | normal | © / tagline |

Puntos editoriales: punto final en titulares declarativos ("…psicometría."), `+` como
conector de fórmulas, separador `·` en kickers.

## 5. Layout y ritmo

- **Contenedor** `--k-container` 1200px, gutters 64px (mobile: 20-24px).
- **Alternancia clara/oscuro** por sección (hero oscuro → 01 claro → 02 claro-arena →
  accesos oscuro → cierre oscuro + footer claro). La alternancia crea ritmo editorial.
- **Split 2 columnas** ~45/55 (texto izq / visual der) para hero y secciones con imagen.
- **Espacio negativo agresivo**: columnas a la izquierda con tercio derecho vacío es un
  patrón deliberado (secciones 01/02).
- **Retícula de fondo** solo en secciones oscuras (líneas a ~100-120px, opacidad 6%).
- Padding vertical de sección: 96px desktop / 64px mobile.

### 5.1 Breakpoints (evidencia del código actual)

| Breakpoint | Uso |
|---|---|
| ≥ 900px | Desktop: splits 2 columnas (45/55), gutter 64px, padding de sección 96px |
| < 900px | Splits colapsan a 1 columna (regla §7.7); nav compacta |
| < 860px | Colapso actual de landing (`src/landing/landing.css`) — base tablet |
| < 560px | Móvil pequeño: gutter 20-24px, padding sección 64px, medidas micro |
| max-height 820/800px | Viewports cortos (dashboard/juegos): HUD compacto, sin scroll vertical |

Objetivos de smoke (plan H1.2): desktop 1280×720 y móvil 390×844 — cero overflow horizontal.

## 6. Componentes

| Componente | Especificación |
|---|---|
| **CTA primario** | Pill arena (`--k-radius-btn` 10px), fondo `--k-cta-bg`, texto espresso 600 |
| **CTA ghost** | Borde 1px `--k-border-ghost`, transparente, icono play en círculo a la izq. |
| **Badge de confianza** | Check en círculo arena + texto MAYÚSCULAS pequeño (fila wrap) |
| **Card flotante (stat)** | Navy `--k-card-navy`, radio 18px, sombra `--k-shadow-float`, icono en squircle (escudo azul `#2e4a6b` / rayo arena) + etiqueta pequeña + valor bold blanco |
| **Card de acceso** | Radio 18px, fondo arena (empresa) o crema (candidato); icono lineal en recuadro redondeado con borde fino; kicker MAYÚSCULAS; título bold espresso; párrafo; divisor fino; CTA texto + flecha "→" |
| **Pill de idioma** | EN \| ES, borde fino translúcido, activo subrayado (patrón existente en landing — mantener). Tema light (flujo candidato): base espresso cálida, activo espresso subrayado, focus terracota 3px (H4.3). Superficies oscuras (landing pública, guard, topbar HR): override por reglas — borde ghost, texto crema, activo subrayado, focus arena |
| **Kicker numerado** | "01 · CÓMO FUNCIONA" terracota sobre claro / arena sobre oscuro |
| **Footer** | Barra crema full-width: © izq, tagline der |
| **Logo** | Glifo cabeza-árbol con nodos (marca existente) + wordmark MAYÚSCULAS tracking amplio |

### 6.1 Estados (regla para todo interactivo, aplicable desde H4.2)

| Estado | Regla |
|---|---|
| `:hover` | Nav: subrayado animado; CTA: leve elevación/tono; cards: sombra `--k-shadow-float` (patrones actuales en `landing.css`) |
| `:focus-visible` | Obligatorio en todo interactivo (nav, CTAs, pills, opciones de juegos): outline 3px — terracotta sobre claro (≥3:1, WCAG 1.4.11) o crema/arena sobre oscuro (refinado en H4.3: el arena puro no llega a 3:1 sobre crema) |
| `:active` | Feedback inmediato en botones, sin delay |
| `:disabled` | Opacidad reducida + `cursor: not-allowed`; el hover se excluye con `:hover:not(:disabled)` (patrón `postulationDemo.css`) |
| Idioma activo | Pill EN\|ES: activo subrayado (patrón existente) |
| `prefers-reduced-motion` | Toda animación dentro de `@media (prefers-reduced-motion: no-preference)` (patrón `originalGameAnimations.css`, WCAG 2.3.3) |

## 7. Reglas de aplicación (H4.2 → H4.5)

1. **H4.2 (landing)**: rebuild completo de `LandingPage.jsx` + `landing.css` con estos
   tokens. Secciones objetivo: nav, hero, 01 cómo funciona, 02 tecnología, accesos
   (empresas/candidatos), cierre "Hablemos", footer. Mantener: anclas existentes, i18n
   (`t()`), SEO, accesibilidad (aria, contraste), CTAs actuales (/postulaciones, /reclutador).
2. **H4.3 (flujo candidato)**: setup, stage, reporte y guard adoptan tokens (fondos,
   textos, radios, CTA). No tocar mecánicas de juego.
3. **H4.4 (/reclutador)**: panel HR sobre tokens (header espresso, cards crema/arena,
   acento oro para métricas).
4. **H4.5 (juegos)**: solo tokens visuales (tipografía, paleta de UI, radios); el mundo
   visual de cada juego se conserva.
5. **Contraste**: todo texto sobre fondo debe cumplir WCAG AA (verificar al aplicar).
6. **Idioma**: todo texto nuevo pasa por `t(es, en)`.
7. **Responsive**: medidas con `clamp()`; splits colapsan a 1 columna < 900px;
   cards flotantes del hero se anclan dentro de la foto en mobile.

## 8. Decisiones del usuario (resueltas 2026-09-07)

1. **Copy**: usar el de las referencias como **working copy** (sujeto a ajuste por el usuario en la primera iteración de H4.2, antes de deploy).
2. **Foto/visual del hero**: el usuario autoriza "cualquier foto accesible manteniendo la narrativa". El repo no trae fotos (solo favicon + WASM). Decision: **captura de gameplay real de la plataforma** (juego más rico visualmente — candidato: balloon o rutas). Las capturas las genera el **walkthrough de C1** (se le pidió guardarlas en `docs/qa/c1-audit-shots/`); H4.2 elige la mejor. Alternativa de respaldo: mockup del reporte con cards flotantes navy.
   - Capturas tentativas de esta sesión (laser pre-partida + gameplay inicial + reporte fixture) descartadas: tablero pobre en estado inicial y el reporte actual tiene un **bug de layout** (badge "SCORE PROVISIONAL" superpone texto en las cards de constructos) → agregar a findings de H1/C1.
3. **"Iniciar sesión" en nav**: SÍ → ancla al bloque "¿Dónde quieres ingresar?" (cards Empresa/Candidato) dentro de la misma landing.

## 9. Notas de ejecución

- Tokens (`--k-*`) ya están en el repo y aplicados globalmente (`main.jsx`), sin cambios visuales hasta H4.2. Build + App.test OK (commit `d42bcd1`).
- H4.2 (2026-09-07): rebuild de `LandingPage` completado sobre los tokens
  (verificado por `src/landing/LandingPage.test.jsx`, 13 tests GREEN) y smoke
  browser real en 1280×720 / 800×1000 / 390×844: overflow horizontal 0, h1
  único, logo `/logo.svg` resuelto, 0 console errors, cards flotantes navy
  dentro del hero a todo breakpoint. El commit externo `e61f44d` (card
  t_9e3506b6, message "docs") absorbió por colisión la migración
  LandingPage.jsx + landing.css; el asset `public/logo.svg` y la spec test se
  commitearon en `86e71e1` (H4.2). Push pendiente (H4.6 + doble verificación
  del rebase, main ahead 1 de origin).
- H4.3/H4.4 (2026-09-07): tokens aplicados al flujo candidato (landing interna, guard, setup, stage, reporte — `postulationDemo.css` + `PostulationReportScreen.jsx`) y a `/reclutador` (`postulationHrDashboard.css`: topbar espresso, cards crema, métricas oro). El guard de invitación pasó de sin estilos a pantalla espresso con texto crema. `report-status-card` es navy (dato frío sobre cálido) y gana modificador `--blocked` cuando la integridad no verifica. Extensión de tokens en §3.1. La sección de juegos de `postulationDemo.css` (UI de tasks, ~líneas 792–1547 y 2165 en adelante) conserva la paleta anterior hasta H4.5 (t_5d775c9a).
- H4.3 (2026-09-07, cierre t_36dd7011): pill de idioma en vistas claras alineado a §6 (activo subrayado espresso, sin relleno indigo `#4f46e5` — color frío fuera del sistema detectado en smoke); focus-visible terracota 3px AA (base) y arena (superficies oscuras, paridad guard/HR/landing). Evidencia: spec `PostulationFlowDesignSystem.test.jsx` (16 tests) + suite 689/689 + build + smoke browser 12 vistas (1280×720 + 390×844, 0 fallos, 0 console errors) — `docs/qa/h43-flow-design-system/`.
- H4.5 (2026-09-07, cierre t_5d775c9a): tokens aplicados al chrome de juegos (design-system §7.4: solo tokens visuales; el mundo visual de cada juego se conserva). Mapa `:root` de superficies de juego tokenizado (`--postulation-game-*` → crema/ink-card/divider/status-ok/ink-medium — el rebuild que H4.3 reservó); `.primary` compartido ahora CTA pill arena (`--k-cta-bg`/`--k-cta-ink`/`--k-shadow-cta`, paridad H4.3); pips (base `--k-divider`, fallbacks espresso/arena), sfx-toggle, micro-intro, task-area, panels/option/kickers (crema, divider, terracotta, tint oro), overlay Tangram. Conservados: mundos Órbita/Cielo/Urbano/Faro y colores de estado funcional de tarea (go/no-go, correct/incorrect, urgencia, presupuesto, delivered/popped). Tres fixes en `originalGameThemes.css` detectados por el smoke vivo: (1) los CTAs de mundo (laser cian, balloon azul) declaran `color: #ffffff` — el `.primary` compartido hereda `--k-cta-ink` (espresso) y sobre el gradiente de mundo salía ilegible; (2) la regla del caption de laser ganó prefijo `.postulation-demo` (paridad de especificidad con `.postulation-demo .caption`; sin él el color world `#94a3b8` NUNCA se aplicaba y el caption salía tinta oscura sobre fondo oscuro — bug de especificidad preexistente, verificado contra captura C1); (3) report W5 (vive en ese archivo): tag provisional blanco-sobre-oro (fallaba AA desde el mapa H4.3) → `--k-cta-ink`, indigo `#4338ca` (color frío fuera del sistema) → espresso. HALLAZGO PARA H4.6 (preexistente, verificado contra shot C1 1280×720): el texto derecho del footer de laser ("Comprueba cuando quieras…") se recorta con `overflow-x: hidden` del stage en 1280×720 — es layout, fuera del scope de H4.5. Evidencia: spec `PostulationGamesDesignSystem.test.jsx` (10 tests) + suite completa + build + oxlint + smoke browser vivo (setup → 3 niveles de laser resueltos con soluciones embebidas → balloon; 1280×720 + 390×844, 0 fallos, 0 console errors) — `docs/qa/h45-games-design-system/`.
- Browser remoto compartido (también lo usa el worker de C1): si queda 401, el worker lo re-autentica en su sesión; no forzar uso en paralelo.
- H4.6 (2026-09-07, cierre t_be89dafb): audit visual unificado (19 vistas ES/EN, 1280×720 + 390×844; 0 overflow, 0 console errors, contraste AA ≥5.7:1 en chrome) — `docs/qa/h46-visual-audit/h46-visual-audit.md`. Dos findings: (1) footer laser — recorte preexistente del check-hint (hallazgo H4.5) corregido con `.laser-puzzle-task__actions { flex: 0 1 auto; min-width: 0 }` + spec guardián + verificación live en stage ES/EN; (2) hero landing — las stat cards flotantes ocultaban el chip "SCORE PROVISIONAL" (100%) y la nota del mock (~37-70%); fix por overhang (top:-52/bottom:-62, max-width 400) + stacked <900px, **superado por el port de marca v2** (2026-09-07: tokens oficiales Archivo/Manrope, mock eliminado). El port documenta `--k-ink-terracotta` → `#9a7355` (~3.2:1 sobre crema; AA estricto pendiente de decisión del usuario).

## 10. Marca v2 — referencia oficial (2026-09-07)

El usuario entregó la referencia de marca definitiva: `krumm_frontend.zip`
(HTML/CSS completo de la landing, archivado en `~/krumm/design_ref/Landing pge Krumm/`).
Sustituye a las 8 capturas de §2 como fuente de verdad visual. Plan de port:
`docs/plans/2026-09-07-landing-brand-port-plan.md`.

**Paleta oficial** (actualizada en `src/styles/krumm-tokens.css`):

| Token | v1 | v2 (oficial) |
|---|---|---|
| `--k-bg-dark` (card/hero) | `#33261d` | `#38271d` |
| `--k-bg-dark-deep` | `#2a1f17` | `#2b1e16` |
| `--k-bg-beige` (nuevo, fondo base) | — | `#f2e8dc` |
| `--k-bg-light` (crema) | `#f3e9e1` | `#f7efe6` |
| `--k-bg-light-sand` (arena) | `#e6d3b9` | `#e4cdb5` |
| `--k-ink-espresso` | `#33241c` | `#3d2b20` |
| `--k-ink-medium` | `#6e584b` | `#6f503a` |
| `--k-ink-terracotta` (kickers) | `#74543e` | `#9a7355` ⚠ ~3.2:1 sobre crema |
| `--k-accent-sand` / `--k-gold` | `#d4b483` | `#d8b38c` |
| `--k-gold-dark` (nuevo) | — | `#b9906b` |

**Tipografía oficial**: `Archivo` (display, H1/H2, peso 900) + `Manrope` (body).
Se cargan vía Google Fonts en `index.html`. Tokens: `--k-font-display`,
`--k-font-sans` (pasó de Inter a Manrope — aplica a todo el frontend),
`--k-size-hero-brand` `clamp(60px, 6.1vw, 104px)`, `--k-size-section-brand`
`clamp(42px, 5vw, 76px)`, tracking hero `-4px` / sección `-2px`.
Los tokens compartidos de los flujos demo/HR (`--k-size-hero`, `--k-size-section`,
`--k-tracking-display`) se mantuvieron con los valores v1 para no regredir layouts.

**Botones**: CTA gold = `linear-gradient(115deg, --k-btn-gold-from, --k-btn-gold-to)`
(`#b9906b → #e4cdb5`, texto `--k-btn-gold-ink`), sombra `--k-shadow-gold`;
CTA secondary = outline ghost (`--k-border-ghost` + `--k-btn-ghost-bg`).

**Landing (estructura portada 1:1)**: header absoluto con logo de marca 152px
(`/assets/krumm-logo-borderless-no-text.png`) + nav centrada + CTA gold + switch EN|ES
+ hamburger ≤1150px; hero split con retícula 74px + glow radial dorado + H1 de 3
líneas (accent oro) + proof row (chips ✓) + **foto de marca** `/assets/hero-photo.jpg`
con glow difuminado (mock de reporte y stat cards eliminados); secciones 01/02/03 con
fondos crema/arena/beige y H2 Archivo 900; accesos oscuro 2 cards; cierre HABLEMOS
oscuro + CTA gold; footer arena. Assets: `public/assets/` (logo borderless, foto hero).

**Abierto (decisión de usuario)**: contraste del kicker `#9a7355` (~3.2:1 sobre
crema; la referencia oficial lo usa a 13px/800). Si se exige AA estricto, oscurecer
`--k-ink-terracotta` de vuelta.

