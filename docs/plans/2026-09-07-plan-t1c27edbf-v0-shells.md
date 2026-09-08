# Plan t_1c27edbf — V0: Shells candidato/empresa + rutas + i18n base (fase v3)

> **For Hermes:** ejecutar task-by-task (esta card, worker default). Plan maestro:
> `docs/plans/2026-09-07-plan-fase-vistas-v3.md` §3 (card V0). Referencia archivada:
> `docs/spec/frontend-ref-v2/` (candidate.html/css/js, company.html/css/js, portal.html,
> login-candidate.html, login-company.html, script.js — diccionario EN/ES completo).

**Goal:** fundación de la fase v3: `CandidateShell` + `CompanyShell` (chrome real de la
referencia sobre tokens `--k-*`), registro de las 12 rutas de la fase con placeholders
honestos "próxima iteración", y diccionario i18n base (EN de referencia + ES).

**Arquitectura:** SPA actual sin react-router (selección de RootApp por pathname en
`main.jsx` — mismo patrón que `postulationDemoRoute.js`). Nuevo módulo `src/v3/` con:
(a) `v3Routes.js` — registro puro + `resolveV3Route(pathname)` (testable sin DOM),
(b) `v3Copy.js` — diccionario bilingüe plano (nombres de clave espejan la referencia:
`cp_*`, `company_*`, `portal*`, ...) + `useV3Copy()`, (c) shells + placeholder +
overlay de diálogo accesible, (d) `V3RootApp` despachador por ruta. El contenido real
de cada página es trabajo de V1–V4; V0 solo garantiza que cada ruta existe, renderiza
su shell correcto y su placeholder honesto bilingüe.

**Tech stack:** React 19, Vite 8, CSS con tokens `--k-*` (regimen de test: sin
hex/rgb/hsl en vistas), vitest + @testing-library (jsdom), Playwright (smoke vivo),
oxlint.

---

### Task 1: Diccionario i18n base (`v3Copy.js`)

**Objective:** fuente única del copy EN (de la referencia) + ES (traducido) para todo el
chrome V0 y los placeholders; paridad verificable por test.

**Files:**
- Create: `src/v3/v3Copy.js`
- Test: `src/v3/v3Copy.test.js`

Claves (flat, espejo de la referencia — solo las que V0 usa; V1–V4 amplían):
- `common`: skipContent, logoAlt, language, close, nextIteration (cp_next), backToPortal,
  comingSoon (loginPreview).
- `cp_*` (candidato): help, helpText, privacy, terms, footerYear ("© 2026 KRUMM"),
  title/subtitle de cada página candidato (candidateHome, candidateAccess, jobs).
- `company_*` (empresa): workspace, dashboard, newRequest, processes, settings, help,
  account, notifications, signOut, openNavigation, portalNavigation, breadcrumbLabel,
  demoBadge, demoNotice, previewTitle, previewText, notificationsText, accountText,
  userName (Alex Morgan), userOrg (Andes Industries), userInitials (AM),
  dashboardEyebrow (ANDES INDUSTRIES), pageEyebrowCandidate (KRUMM · TALENT ASSESSMENT).
- `portal*` (bare): pageTitle, title, subtitle, companies, companyPortal,
  companyDescription, candidates, candidatePortal, candidateDescription, companyCta,
  candidateCta, backHome, enterDemo (company_enterDemo), loginPreview.
- `pages.*`: por cada ruta → { title, note, backTo, backLabel } (titulos de la ref:
  "Candidate access", "Job board", "Dashboard", "Active processes", "Process detail",
  "Candidate report", "New request", "New request · Design with KRUMM",
  "New request · Upload profile"; note = próximo-iteración; back según hub).

ES: traducción íntegra (base: diccionario ES de `script.js` de la referencia — ya existe
para la mayoría de claves; se reutiliza textualmente).

**Step 1: test RED (paridad):** recorrer recursivo EN vs ES — mismos keys, ningún string
vacío. Correr → FAIL (módulo no existe).
**Step 2:** implementar `V3_COPY` (frozen) + `useV3Copy()` (hook sobre `useLanguage`,
fallback en→es) + `getV3Copy(language)` puro.
**Step 3:** GREEN.

### Task 2: Registro de rutas (`v3Routes.js`)

**Objective:** las 12 rutas de la fase con su shell y página, resueltas por un helper
puro (segmentos literales + `:param`).

**Files:**
- Create: `src/v3/v3Routes.js`
- Test: `src/v3/v3Routes.test.js`

**Rutas (plan maestro §2):** `/portal` (portal), `/candidato` (candidate),
`/candidato/acceso` (candidate), `/empleos` (candidate), `/empresa/acceso` (companyLogin),
`/empresa` (company), `/empresa/procesos` (company), `/empresa/proceso/:id` (company),
`/empresa/proceso/:id/candidatos/:sessionId` (company), `/empresa/nueva-solicitud`
(company), `/empresa/nueva-solicitud/diseño` (company), `/empresa/nueva-solicitud/subida`
(company).

**Comportamiento de `resolveV3Route`:** normaliza trailing slash (`/empresa/` →
`/empresa`), match segmental exacto, `:id`/`:sessionId` capturan 1 segmento, devuelve
`{ route, params }` o `null`. NO pisa rutas existentes: `/postulaciones*`, `/reclutador`,
`/tecnico*`, `/` → null.

**Tests:** las 12 rutas resuelven; params correctos en las 2 dinámicas; null para las
rutas existentes y desconocidas; trailing slash; `/empresa/proceso/abc/candidatos/s-1`
no colisiona con `/empresa/proceso/:id`.

### Task 3: Dialogo V0 (`V3Dialog.jsx`)

**Objective:** overlay accesible que replica el `<dialog>` de la referencia (Help,
Privacy, Terms, Settings, Notifications, Account — todos "preview" honesto) sin depender
de `showModal()` (no existe en jsdom).

**Files:**
- Create: `src/v3/V3Dialog.jsx`
- (test cubierto en `V3Shells.test.jsx`)

**Comportamiento:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`/`-describedby`;
cierra con Escape (keydown en document) y click en backdrop; focus entra al botón de
cierra al abrir y vuelve al trigger al cerrar; `prefers-reduced-motion: no-preference`
solo para la animación de entrada.

### Task 4: `CandidateShell.jsx`

**Objective:** chrome candidato (ref candidate.html): skip link + topbar (logo → `/`,
breadcrumb, LanguageToggle, botón Help) + footer (© 2026 KRUMM + Privacy/Terms) +
Help/Privacy/Terms abren `V3Dialog`.

**Files:**
- Create: `src/v3/CandidateShell.jsx`
- (test en `V3Shells.test.jsx`)

**API:** `<CandidateShell breadcrumb="Portal candidato">{children}</CandidateShell>` —
breadcrumb opcional (se muestra entre logo y actions). Prop `dialogCopy` por defecto =
help.

### Task 5: `CompanyShell.jsx`

**Objective:** chrome empresa (ref company.html): sidebar (brand → `/portal`,
"Company workspace", nav Dashboard/New request/Processes + divider + Settings/Help,
user chip AM · Alex Morgan · Andes Industries · Account↗) + header (menú móvil,
breadcrumb KRUMM / {sección}, LanguageToggle, notificaciones, perfil con dropdown
Sign out) + banner "Demo workspace — All names, processes and results shown here are
fictional" + V3Dialog para Settings/Help/Notifications/Account.

**Files:**
- Create: `src/v3/CompanyShell.jsx`
- (test en `V3Shells.test.jsx`)

**API:** `<CompanyShell section="Processes" active="processes">{children}</CompanyShell>`.
`active` ∈ dashboard|newRequest|processes|settings (aria-current + is-active). Sidebar
móvil: `sidebarOpen` state, botón menú `aria-expanded`/`aria-controls`, Escape cierra y
devuelve focus, click en nav cierra (patrón company.js de la referencia).

### Task 6: `V3Placeholder.jsx` + `V3RootApp.jsx`

**Objective:** placeholder honesto por página (eyebrow + h1 + note "próxima iteración" +
back link) y despachador que resuelve la ruta y monta el shell correcto.

**Files:**
- Create: `src/v3/V3Placeholder.jsx`, `src/v3/V3RootApp.jsx`

`V3RootApp` lee `window.location.pathname` (jsdom: `history.pushState` en tests),
resuelve con `resolveV3Route` y renderiza: candidate → `CandidateShell`+placeholder;
company → `CompanyShell`+placeholder (breadcrumb = section, banner); portal → página
bare (brand + toggle + main + back home); companyLogin → página bare (brand + toggle +
"coming soon" + CTA "Explore company demo" → `/empresa` + back portals).

### Task 7: CSS (`v3Shells.css`) + tokens nuevos

**Objective:** estilos de ambos shells + bare + dialog + placeholder, SOLO tokens
`--k-*` (regimen de test). Mapeo referencia → tokens: `#f6f0e7/#f5efe7→--k-bg-light`,
`#f2e8dc→--k-bg-beige`, `#38271d→--k-bg-dark`, `#3d2b20→--k-ink-espresso`,
`#765e4d→--k-ink-medium`, `#8b694b→--k-ink-terracotta`, `#d8b38c→--k-cta-bg/--k-gold`,
`#b58c60/#b9906b→--k-gold-dark`, `#e4cdb0/#e4cdb5→--k-bg-light-sand`, `#fffaf4→--k-bg-light`,
`rgba(111,80,58,.18)→--k-line (NUEVO)`, `#4a372a→--k-surface-dark-hover (NUEVO)`,
`#604937→--k-surface-dark-line (NUEVO)`, `#cdb8a4→--k-text-muted-sand (NUEVO)`.
Estados obligatorios: `:hover`, `:focus-visible` (terracota 3px sobre claro — convención
H4.3), `:disabled` donde aplique; animaciones bajo `no-preference`.
Breakpoints: sidebar fija ≥760px (228px), off-canvas <760px (ref company.css);
candidate 2-col → 1-col <700px (ref candidate.css); smoke en 1280×720 y 390×844.

**Files:**
- Create: `src/v3/v3Shells.css`
- Modify: `src/styles/krumm-tokens.css` (+4 tokens bloque "Fase v3 (V0)")

### Task 8: Registro en `main.jsx`

**Objective:** despachar `V3RootApp` para rutas V3 sin tocar el orden de las existentes.

**Files:**
- Modify: `src/main.jsx`

Orden final: `isPostulationHrDashboardPath` → `isPostulationDemoPath` →
`isTechnicalAppPath` → `resolveV3Route(effectivePath)` → `LandingPage`.

### Task 9: Spec de declaración (`V3Shells.test.jsx`)

**Objective:** "spec de declaración verde" — tests que declaran la aceptación V0.

**Files:**
- Create: `src/v3/V3Shells.test.jsx`

**Contenido (≈20 tests):**
1. CandidateShell: skip link, logo+alt, LanguageToggle (group Idioma), Help abre dialog
   (heading/text/close), footer © + Privacy/Terms, breadcrumb visible, un solo h1.
2. CompanyShell: nav 4 links (hrefs correctos) + Settings/Help buttons, aria-current en
   activo, user chip (nombre/org/iniciales), demo banner (badge + notice), breadcrumb
   KRUMM / {sección}, notificaciones, perfil dropdown (Sign out), menú móvil
   (aria-expanded toggle + is-open + Escape).
3. V3RootApp: loop sobre las 12 rutas (pushState) → shell correcto + placeholder
   honesto (note "próxima iteración" / "coming soon" según shell) + back link.
4. i18n: click EN → copias EN del chrome (Help, Dashboard, Demo workspace, ...); click
   ES → copias ES. (localStorage mock jsdom — patrón PostulationFlowDesignSystem.test.jsx.)
5. Régimen tokens: `v3Shells.css` sin `#[0-9a-f]{3,8}`, sin `rgb( | hsl(`,
   `var(--k-*)` ≥ 60; contiene `:focus-visible`, `:hover`, `prefers-reduced-motion`.

**RED primero:** escribir tests, correr (fallan — componentes no existen), implementar
4–8 hasta GREEN.

### Task 10: Gates

```bash
NODE_ENV=test npx vitest run src/v3 --pool=threads --reporter=default
NODE_ENV=test npx vitest run --pool=threads --reporter=default
npx oxlint src/v3 src/main.jsx
npm run build
git diff --check
```

### Task 11: Smoke browser vivo (Playwright, Pi)

**Files:**
- Create: `scripts/smoke-t_1c27edbf-v0-shells.mjs`
- Shots: `docs/qa/v0-shells/`

Dev server: `NODE_ENV=development npx vite --host 127.0.0.1 --port 5173` (background).
Matriz: 12 rutas × 2 viewports (1280×720, 390×844) × ES; + EN en `/candidato` y
`/empresa` (2 viewports). Asertos por página: 0 overflow horizontal
(`scrollWidth <= innerWidth + 1`), 0 console error/pageerror/requestfailed, chrome
presente según shell (topbar+footer | sidebar+banner | bare). Screenshots: candidato y
empresa en 2 viewports (ES) + 1 EN.
Lanzar chromium con `executablePath: /home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome`
(pitfall Pi). Exit 1 con JSON de fallos.

### Task 12: Docs + commit

**Files:**
- Create: `docs/plans/2026-09-07-plan-t1c27edbf-v0-shells.md` (este doc; marcar [x])
- Modify: `docs/plans/2026-09-07-plan-fase-vistas-v3.md` (§3 V0 → done + nota ejecución)
- Modify: `docs/design/design-system.md` (§10: tokens nuevos v3, nota breve)

Commit local (patrón de la fase): `feat(t_1c27edbf): V0 fase v3 — shells candidato/empresa
+ 12 rutas placeholder + i18n base (EN ref + ES) — tests + smoke 2 viewports`.
SIN push (instrucción de fase: push/deploy solo por el usuario en V5).

---

## Decisiones (fijas para V1–V4)

1. **Rutas y shells:** las 12 rutas de la tabla §2 del plan maestro; shells `candidate`,
   `company`, `portal` (bare), `companyLogin` (bare). V1–V4 reutilizan `v3Routes.js`
   (solo cambian el contenido de la página, no el registro).
2. **i18n:** diccionario plano `V3_COPY = { en, es }` (claves espejo de la referencia);
   los componentes usan `useV3Copy()`; las cadenas one-shot fuera del diccionario usan
   `t(es, en)`. Paridad EN/ES exigida por test (claves espejo, sin vacíos).
3. **Dialogos:** overlay `V3Dialog` (role=dialog, aria-modal, Escape/backdrop, focus
   return) — no `<dialog>.showModal()` (inexistente en jsdom; la referencia lo usa pero
   el comportamiento se replica 1:1).
4. **Tokens:** 4 tokens nuevos en `krumm-tokens.css` (bloque "Fase v3 (V0)"):
   `--k-line`, `--k-surface-dark-hover`, `--k-surface-dark-line`, `--k-text-muted-sand`.
   Todo lo demás se mapea a tokens existentes (tabla Task 7).
5. **Placeholders honestos:** sin datos inventados (riesgos 1–4 del plan maestro):
   job board = "próxima iteración"; login empresa = "coming soon" + CTA demo; sin
   KPIs/tablas en V0 (son V2/V3).
6. **No tocar:** `/postulaciones*` (PostulationDemoApp), `/reclutador`
   (HrDashboardRoot), `/tecnico*`, landing pública, juegos, telemetría, payloads.
   V5 hará los redirec/cutover.
7. **Commit local, sin push.** AGENTS.md es archivo protegido (no editarlo; reportar en
   handoff).

## Estado (ejecutado 2026-09-07, t_1c27edbf)

- [x] T1 diccionario v3Copy (RED→GREEN, 8 tests)
- [x] T2 v3Routes (RED→GREEN, 21 tests)
- [x] T3 V3Dialog (focus return + Escape/backdrop)
- [x] T4 CandidateShell
- [x] T5 CompanyShell
- [x] T6 V3Placeholder + V3RootApp
- [x] T7 v3Shells.css + 5 tokens nuevos
- [x] T8 main.jsx (despacho V3 entre /tecnico y LandingPage)
- [x] T9 spec V3Shells.test.jsx (24 tests, verde)
- [x] T10 gates: focales 53/53 · suite completa 771/771 · oxlint 0 · build OK · git diff --check OK
- [x] T11 smoke vivo: build de producción (vite preview :4173), 28 cargas
  (12 rutas × 2 viewports ES + /candidato y /empresa × 2 viewports EN) →
  0 overflow, 0 console errors, chrome verificado por ruta, 10 screenshots
  en docs/qa/v0-shells/
- [x] T12 docs + commit local

### Ejecución — desviaciones del plan

1. **Tokens:** 5 en lugar de 4 — se añadió `--k-scrim` (backdrop de diálogos;
   la referencia lo hacía con `#38271d66`/`rgba(40,28,20,.45)`, fuera de tokens).
2. **`/portal` con 2 cards reales en V0** (decisión): la referencia lo marca
   "Real (estática)" y es el hub de la fase; hacerlo placeholder vacío
   rompería la navegabilidad del grafo de rutas para V1. Las cards son estáticas
   (sin datos inventados): → `/empresa/acceso` y → `/candidato`.
3. **Fix de ruta con ñ (bug real detectado por smoke):** `location.pathname`
   percent-encodea caracteres no ASCII (`/empresa/nueva-solicitud/diseño` llega
   como `.../dise%C3%B1o` en jsdom Y en navegadores reales). `resolveV3Route`
   decodifica cada segmento (`decodeSegment`); test de guardián en
   `v3Routes.test.js`.
4. **Leak de `box-shadow` global (hallazgo, ver abajo):** el `button` global de
   `src/styles.css` (app técnico, cargado en TODAS las rutas vía import de
   App.jsx en main.jsx) inyecta `box-shadow: 0 12px 30px rgba(77,212,172,.25)`
   (teal, fuera de paleta) a todo botón que no declare sombra. `v3Shells.css`
   lo neutraliza en los 3 scopes v3 (`.v3-candidate/.v3-company/.v3-bare
   button { box-shadow: none }`) preservando la sombra de marca del CTA gold.
   El mismo leak afecta PREEXISTENTE a la LanguageToggle de landing/flujo/HR
   (evidencia: `docs/qa/v0-shells/` + diag `scripts/diag-v0-header.mjs`) →
   candidate de card de follow-up (fuera de scope V0).
5. **jsdom no enfoca por mousedown/click** (sin activación nativa): los tests
   de focus-return usan `element.focus()` explícito antes del click (documentado
   en la spec). El botón de menú móvil (display:none en desktop) se consulta por
   selector estable + aserción de aria (patrón documentado en LandingPage.test.jsx).
6. **Smoke sobre `vite preview` (build de producción), no dev server:** la Pi
   (3.7 GB RAM) da `ERR_INSUFFICIENT_RESOURCES` con Vite dev on-demand +
   chromium tras la suite completa (pitfall conocido del skill). Preview es más
   ligero y valida el bundle real.

### Evidencia

- Tests: `src/v3/*.test.*` — 53 tests (v3Copy 8 · v3Routes 21 · V3Shells 24).
- Smoke: `scripts/smoke-t_1c27edbf-v0-shells.mjs` → JSON exit 0 (failures: [],
  consoleErrors: []), 10 screenshots en `docs/qa/v0-shells/`.
- Verificación visual (capturas 2× del header candidato + vista empresa móvil):
  0 halos/artefactos, chrome íntegro, sin overflow (ver docs/qa/v0-shells/).
- Suite completa: 771/771 (126 archivos) — 718 previos + 53 nuevos.
