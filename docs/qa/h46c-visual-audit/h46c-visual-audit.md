# H4.6c — Audit visual final post-cutover (fase v3, V5) — 2026-09-08

**Card:** `t_0184d2e6` (V5: Cutover — deprecaciones, audit h46c, deploy prod)
**Script:** `scripts/smoke-h46c-visual-audit.mjs` (Chromium headless sobre
`vite preview` del build prod, `NODE_ENV=production npm run build`).
**Resultado: 0 fallos, 0 warnings, 0 console errors — 42 vistas verificadas.**

## Alcance

Supera a h46b (que auditaba flujo candidato + /reclutador pre-cutover). h46c
audita **todas las 12 rutas nuevas de la fase v3** tras el cutover, más la
verificación en vivo de las redirecciones:

| Matriz | Viewport | Check |
|---|---|---|
| ES × 12 rutas | 1280×720 | h1 único+copy, overflow, console, tipografía Manrope, contraste AA (h1+lead), pill de idioma (focus), screenshot |
| Eyebrow home candidato | 1280×720 | contraste AA del kicker terracota |
| ES × 12 rutas | 390×844 | h1, overflow, console, screenshot |
| EN × 12 rutas | 1280×720 | h1 EN (paridad i18n), overflow, console; screenshots de 4 rutas |
| Cutover | 6 verif. | redirecciones reales en navegador (incl. ?lang y flujo con invite) |

## Rutas auditadas (h1 verificado ES/EN)

| Ruta | h1 ES | h1 EN |
|---|---|---|
| `/portal` | Elige tu portal | Choose your portal |
| `/candidato` | Encuentra tu próxima oportunidad. | Find your next opportunity. |
| `/candidato/acceso` | Acceso candidato | Candidate access |
| `/empleos` | Bolsa de empleos | Job board |
| `/empresa/acceso` | Portal para empresas | Company Portal |
| `/empresa` | Dashboard | Dashboard |
| `/empresa/procesos` | Procesos activos | Active processes |
| `/empresa/proceso/supervisor` | Supervisor de Planta | Plant Supervisor |
| `/empresa/proceso/supervisor/candidatos/maria-gonzalez` | Informe del candidato | Candidate report |
| `/empresa/nueva-solicitud` | Nueva solicitud | New request |
| `/empresa/nueva-solicitud/diseño` | Nueva solicitud · Diseñar con KRUMM | New request · Design with KRUMM |
| `/empresa/nueva-solicitud/subida` | Nueva solicitud · Subir perfil | New request · Upload profile |

## Cutover verificado en navegador real

| Desde | A | Nota |
|---|---|---|
| `/reclutador` | `/empresa` | h1 "Dashboard", 0 overflow |
| `/postulaciones` | `/candidato` | h1 "Encuentra tu próxima oportunidad." |
| `/reclutador?lang=en` | `/empresa?lang=en` | `?lang` preservado |
| `/postulaciones?lang=en` | `/candidato?lang=en` | `?lang` preservado |
| `/postulaciones?invite=tok-live-abc123` | (no redirige) | flujo intacto: setup "Preparación de la sesión" |
| `/reclutador` (móvil 390×844) | `/empresa` | 0 overflow |

## Métricas

- **Contraste WCAG AA:** 25 pares medidos (h1+lead × 12 rutas desktop + eyebrow
  home candidato + pill-focus outlines), **mínimo 6.02:1** (lead dashboard:
  `rgb(111,80,58)` sobre `rgb(242,232,220)`) — todos ≥4.5.
- **Overflow horizontal:** 0 en las 42 vistas.
- **Console/page/request errors:** 0.
- **Pill de idioma:** focus :focus-visible = 3px terracota `rgb(112,79,57)` en
  las 12 rutas desktop (la pill vive en headers/topbars claras en los 4
  shells; el focus arena aplica a los links dentro de la sidebar oscura).
- **Tipografía:** body = Manrope en todas las vistas (marca v2).
- **Screenshots:** 30 en este directorio (`d-*` ES desktop, `m-*` ES móvil,
  `e-*` EN desktop, `r-*` cutover).

## Hallazgos (no fallos)

1. **Wordmark del logo**: el texto "KRUMM" del asset `krumm-logo-borderless-
   no-text.png` es de tono arena (parte de la imagen de marca, mismo asset de
   la landing pública y de la referencia oficial) — no es texto CSS; el
   contraste del asset queda documentado aquí como observación (idéntico en
   todas las fases V0–V4, sin cambio de decisión).
2. **Tabla del dashboard** se recorta al viewport de 720px (scroll natural de
   la página, no overflow de layout) — mismo comportamiento auditado en V2.

## Veredicto

**PASS** — la fase v3 queda visualmente auditada post-cutover: las 12 rutas
nuevas sirven en 2 viewports × 2 idiomas sin overflow, sin errores de consola,
con contraste AA, pill de idioma consistente y las redirecciones viejas→nuevas
comportándose como define el plan (fase v3 §2).
