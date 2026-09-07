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
| Terracota (kicker claro) | `--k-ink-terracotta` | `#9c7b66` | "01 · X" sobre crema |
| CTA primario | `--k-cta-bg` / `--k-cta-ink` | `#e4d3b9` / `#33261d` | Pill arena con texto espresso |

Regla: acento oro ÚNICO por vista (una palabra del H1 o un CTA — nunca ambos saturando).

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

## 6. Componentes

| Componente | Especificación |
|---|---|
| **CTA primario** | Pill arena (`--k-radius-btn` 10px), fondo `--k-cta-bg`, texto espresso 600 |
| **CTA ghost** | Borde 1px `--k-border-ghost`, transparente, icono play en círculo a la izq. |
| **Badge de confianza** | Check en círculo arena + texto MAYÚSCULAS pequeño (fila wrap) |
| **Card flotante (stat)** | Navy `--k-card-navy`, radio 18px, sombra `--k-shadow-float`, icono en squircle (escudo azul `#2e4a6b` / rayo arena) + etiqueta pequeña + valor bold blanco |
| **Card de acceso** | Radio 18px, fondo arena (empresa) o crema (candidato); icono lineal en recuadro redondeado con borde fino; kicker MAYÚSCULAS; título bold espresso; párrafo; divisor fino; CTA texto + flecha "→" |
| **Pill de idioma** | EN \| ES, borde fino translúcido, activo subrayado (patrón existente en landing — mantener) |
| **Kicker numerado** | "01 · CÓMO FUNCIONA" terracota sobre claro / arena sobre oscuro |
| **Footer** | Barra crema full-width: © izq, tagline der |
| **Logo** | Glifo cabeza-árbol con nodos (marca existente) + wordmark MAYÚSCULAS tracking amplio |

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
- Browser remoto compartido (también lo usa el worker de C1): si queda 401, el worker lo re-autentica en su sesión; no forzar uso en paralelo.
