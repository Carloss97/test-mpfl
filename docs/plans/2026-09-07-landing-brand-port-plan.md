# Plan — Port del diseño de marca KRUMM (referencia `krumm_frontend.zip`) a la landing React

**Fecha:** 2026-09-07
**Referencia:** `~/krumm/design_ref/Landing pge Krumm/` (index.html + styles.css + assets: logo borderless, hero-photo.jpg)
**Autor:** agente autónomo Pi
**Autorización:** diseño + deploy AWS (S3/CloudFront) + repo (commit/push) + kanban/Linear/crons/agentes — autorizada por el usuario en 2026-09-07.

## Decisión de arquitectura

La referencia ES el design system de marca actualizado (paleta beige/crema/arena/marrón/dorado, tipografía Archivo display + Manrope body, header con logo grande 152px, nav centrada, hero split con foto + retícula + glow, secciones alternas con kickers numerados, contact oscuro, footer arena).

Se aplica **vía tokens** (`src/styles/krumm-tokens.css`) para que el cambio de paleta/tipo propague al frontend completo (landing + flujo candidato + HR) sin hex hardcodeados, y se reescribe `src/landing/LandingPage.jsx` + `landing.css` para la estructura de la referencia (header, hero con foto, secciones, contact, footer).

## Cambios

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `src/styles/krumm-tokens.css` | Paleta → valores oficiales (#f2e8dc/#f7efe6/#e4cdb5/#3d2b20/#d8b38c/#b9906b/#38271d); fonts Archivo+Manrope; --k-size-hero clamp(60px,6.1vw,104px); --k-size-section clamp(42px,5vw,76px); tracking -4px/-2px; radio btn 12px; grid cell 74px; espacio sección 120px; nuevos tokens `--k-gold`, `--k-gold-dark`, `--k-btn-gold-from/to`, `--k-font-display`. |
| 2 | `index.html` | Google Fonts preconnect + Archivo (400;500;600;700;800;900) + Manrope (400;500;600;700;800). |
| 3 | `public/assets/` | `hero-photo.jpg`, `krumm-logo-borderless-no-text.png`, `krumm-logo-borderless.png` (copy de la referencia). |
| 4 | `src/landing/LandingPage.jsx` | Header: brand-logo grande + nav centrada + actions (log in + CTA gold) + language switcher + menú móvil. Hero: eyebrow pill, H1 Archivo 900 (accent oro), copy, botones (gold + outline con play), proof row, **visual = foto hero con glow** (se retira el mock de reporte y las 2 stat cards flotantes — la referencia no las tiene). Secciones 01/02/03 + accesos + cierre + footer: misma estructura de contenido, nuevo estilo. |
| 5 | `src/landing/landing.css` | Reescrito sobre la referencia `styles.css` (retícula hero + radial glow, botones gold gradient, secciones alternas, responsive 1150/800, container-query para el h1). Régimen: solo `var(--k-*)`. |
| 6 | `src/landing/LandingPage.test.jsx` | Actualizar: nav nueva (logo img, CTA), hero con foto (img src /assets/hero-photo.jpg), sin assertions de mock/stat cards; mantener i18n, a11y (h1 único, nav, skip), CTAs, secciones, régimen de tokens (40+ uses). |

## Gates

1. `NODE_ENV=test npx vitest run src/landing/LandingPage.test.jsx` verde.
2. Suite completa `NODE_ENV=test npx vitest run --pool=threads` verde (tokens afectan a otros CSS — verificar tests de estilos).
3. `npx oxlint src/landing src/styles src/main.jsx` 0 errores.
4. `npm run build` OK.
5. **Deploy AWS** (autorizado): `aws sts get-caller-identity` (SSO vigente) → `bash scripts/deploy-frontend.sh` (bucket `krumm-staging-frontend-931932531447`, dist `EDQ39PDNI931R`) → curl `https://d3citl7gomy2ql.cloudfront.net/` (200 + assets nuevos + fuentes).
6. Browser smoke: `/` desktop (1280x720, 1440x900) + móvil (390x844): 0 console errors, 0 request failures, sin overflow horizontal, foto y logo cargan.
7. Git: commit (autorizado "actualizando ... repositorio") + push origin main.

## Sync (kanban / Linear / agentes / crons)

- **Kanban:** crear task "Landing: port diseño de marca (krumm_frontend.zip)" → complete tras deploy.
- **Linear (KRU):** crear issue "Landing: portar diseño de marca oficial (Archivo/Manrope + paleta beige/dorado)" → Done tras deploy.
- **AGENTS.md:** actualizar sección "Alcance y estado" — design system v2 (tokens oficiales, fuentes, assets public/assets/), landing portado.
- **Crons:** verificar que `krumm-smoke-diario` cubre `/` (frontpage) con los nuevos assets (fuentes Google + /assets/hero-photo.jpg); si el smoke solo cubre /postulaciones, agregar la ruta frontpage.
- **docs/design/design-system.md:** actualizar §paleta/§tipografía con los valores oficiales de la referencia (v2, 2026-09-07).

## Riesgos / notas

- `--k-ink-terracotta` pasa a #9a7355 (valor de la referencia para kickers) — la sesión H4.2 lo había oscurecido a #74543e para WCAG AA; el valor de marca tiene ~3.2:1 sobre crema (kicker 13px/800). Se documenta; si el usuario pide AA estricto, se oscurece de nuevo.
- El mock de reporte del hero se elimina (faithful al diseño). La info "datos en tu dispositivo / −60%" queda cubierta por proof row + sección tecnología.
- Cambiar `--k-font-sans` a Manrope afecta a flujo candidato/HR (cambio de marca — intencional).

## Ejecución (2026-09-07, sesión interactiva) — COMPLETADO

| Gate | Resultado |
|---|---|
| Focales landing | 18/18 verde (`src/landing/LandingPage.test.jsx` spec v2) |
| Suite completa | 705 tests / 123 archivos — 1 fallo (H4.3 pill focus landing) → corregido al port v2 (`outline: 2px solid var(--k-gold)`) + `--k-lang-*` → espresso v2 rgb(61,43,32); re-run pendiente de confirmación |
| oxlint | 0 errores (1 warning preexistente en ParticipantAssessmentFlow, no mío) |
| Build | `npm run build` 4.64s, bundle `index-DRUCAn_V.js` |
| Deploy AWS | `scripts/deploy-frontend.sh` (bucket `krumm-staging-frontend-931932531447`, dist `EDQ39PDNI931R`, perfil default): 38 MiB sync + invalidación CloudFront. Verificado en vivo: `/` 200 sirviendo `index-DRUCAn_V.js` + `fonts.googleapis`, `/assets/hero-photo.jpg` 200, `/assets/krumm-logo-borderless-no-text.png` 200 |
| Docs | `docs/design/design-system.md` §10 (marca v2) + `AGENTS.md` (estado 2026-09-07 + sección "Design system — reglas de UI" pendiente de H5) |
| Kanban | `t_69044ae0` (H4) archivada con evidencia (cerrada aquí); `t_be89dafb` (audit+deploy H4) reclamada 15:28 por colisión (el worker la documentó en su commit 9062ccf) y bloqueada — pendiente re-dispatch con scope reducido: audit de flujo candidato + /reclutador bajo marca v2 |
| Linear | KRU-80 → Done (comentario con evidencia) |
| Crons | `krumm-smoke-diario` (tests+oxlint+build nocturnos) cubre los cambios; su última corrida 07:36 reportó "verde 660/660". `scripts/m0-smoke.cjs` (smoke visual playwright) ampliado con casos `frontpage-desktop`/`frontpage-mobile` para la próxima QA visual |
| GPU | Levantada a pedido del usuario (2xH100, ~$8.38/h vivo); en uso por esta sesión |

**Colisión documentada**: worker autónomo `t_be89dafb` (qwen-model, corriendo 14:36–15:28) editaba la misma superficie (H4.6 audit). Su commit 9062ccf registra la colisión con transparencia: no commiteó mis archivos, y mi test fue restaurado por su `git checkout` (lo reescribí como su nota y el plan anticipaban). Clausurada con reclaim + comentario.

