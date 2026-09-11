# C2 — UI Sala de Control: smoke responsive (KRU-103)

Fecha: 2026-09-11 · Autor: orquestador (C2, t_a2d9f478) · Estado: **PASS 21/21**

## Alcance verificado
UI sala de control responsive (Doc 2 §7/§18) consumiendo el motor C1:
- Layout 3 tiers: desktop (2 columnas datos 40% | NPC 60%), tablet (2 col. compactas), móvil (stack vertical, datos en grid 2 col.).
- Compositor de bloques (add / reorder / remove / send) — Doc 2 §12.
- Input gate §12.3 (send deshabilitado sin selección; compositor vacío bloqueado).
- A11y §18: targets ≥44px, aria-live en NPC, aria-pressed en tarjetas, reduced-motion, focus-visible.
- Altura compacta (`max-height:820px`): compactación para que header+datos+NPC+respuesta+CTA quepan en 1280×720 sin scroll.
- SFX opcionales (solo nombres válidos del catálogo).

## Metodología
- **jsdom (38 tests, `control-room/`)**: máquina de estados, compositor, a11y, privacy, 3 tiers (data-cr-mobile/tablet), timeout B6.
- **Navegador real (Playwright chromium-1234, headless)** sobre el dev-stage `/dev/control-room`
  (Vite dev 127.0.0.1:5199): aserciones de geometría (bounding boxes) + interacción real.

## Resultado navegador (script `/tmp/cr-smoke.cjs`, reproducible)
| Viewport | Aserción | Resultado |
|---|---|---|
| 1280×720 (desktop) | sin scroll horizontal (scrollWidth=1280=clientWidth) | PASS |
| | panel de datos visible | PASS |
| | burbuja NPC visible | PASS |
| | **botón enviar visible SIN scroll** | PASS |
| | ≥2 tarjetas visibles (4/4) | PASS |
| | columnas datos\|NPC sin solape (fRight=517 ≤ nLeft=525) | PASS |
| | send se habilita tras seleccionar (input gate) | PASS |
| | el envío avanza el estado del motor | PASS |
| | sin errores JS/console | PASS |
| 390×844 (móvil) | sin scroll horizontal (scrollWidth=390=clientWidth) | PASS |
| | panel de datos visible (grid 2 col.) | PASS |
| | burbuja NPC visible | PASS |
| | **botón enviar alcanzable (no recortado)** tras scrollIntoView | PASS |
| | ≥2 tarjetas visibles (3/4 — 1ª abajo del pliegue, scroll natural) | PASS |
| | send se habilita tras seleccionar | PASS |
| | el envío avanza el estado | PASS |
| | sin errores JS/console | PASS |
| 390×844 (compositor, `?scenario=CR-PRACTICE-02`) | banda de bloques visible (4) | PASS |
| | send habilitado tras add 2 bloques | PASS |
| | sin scroll horizontal | PASS |
| | sin errores JS | PASS |

**Total: 21/21 aserciones OK.**

## Notas de diseño (decisiones C2)
1. **Móvil: send alcanzable por scroll de página** (no recortado). A 844px el contenido
   ocupa ~892px (un scroll de ~50px). Doc 2 §7 permite "CTA sticky local solo si no tapa
   contenido"; se prefiere scroll natural sobre CTA sticky (evita tapar tarjetas).
2. **Datos en grid 2 columnas en móvil** (agrupación visual, NO mini-font — §18): compacta
   la altura sin sacrificar legibilidad (texto ≥16px).
3. **Altura compacta desktop** (`max-height:820px`): paddings/gaps/cards reducidos para que
   todo quepa en 720px de alto (patrón isCompactViewport).
4. **overflow**: `overflow-x:hidden` (nunca scroll horizontal) + `overflow-y:auto` (red de
   seguridad: en alturas muy cortas el contenido scrolla, nunca se recorta).
5. **Dev-stage** `/dev/control-room` (`src/dev/ControlRoomDevStage.jsx` + ruta en `main.jsx`):
   laborarorio sin batería; `?scenario=<id>` fija el escenario (default práctica CR-PRACTICE-01).
   Se retira o conserva en C5 (registro en batería).

## Gate
- vitest control-room: **38/38** (C1 30 + C2 8)
- oxlint control-room + dev + main.jsx: **limpio**
- `npm run build`: **OK**
- git diff --check: **OK**
