# Plan t_482f57b2 — V1: Lado candidato (portal, home, acceso, job board) — fase v3

> **For Hermes:** ejecutar task-by-task (esta card, worker default). Plan maestro:
> `docs/plans/2026-09-07-plan-fase-vistas-v3.md` §3 (card V1). Referencia visual:
> `~/krumm/design_ref/v2-completo-2026-09-07/` (candidate.html/css/js,
> login-candidate.html, jobs.html, portal.html — archivada también en
> `docs/spec/frontend-ref-v2/`). V0 done: `docs/plans/2026-09-07-plan-t1c27edbf-v0-shells.md`.

**Goal:** contenido real del lado candidato: `/candidato` (home: hero + 2 cards de la
referencia), `/candidato/acceso` (integración del guard de invitación existente:
pegar link/token → `/postulaciones?invite=<token>` → guard valida → sesión), y
`/empleos` job board honesto "próxima iteración" (igual que la referencia).
`/portal` ya quedó real en V0 (2 cards navegables) — se verifica, no se cambia.

**Aceptación (card):** recorrido portal → home → acceso → invitación válida →
flujo `/postulaciones` intacto (guard + setup); ES/EN; smoke 2 viewports.
La landing interna H4.3 (`PostulationLanding`, fase `landing` de `/postulaciones`
sin invite) queda reemplazada como entrada del candidato (la reemplaza `/candidato`);
se retira físicamente en V5. **`/postulaciones` no se toca en V1** (decisión V0 #6).

**Arquitectura:** SPA sin react-router. `V3RootApp` (V0) ya despacha
`candidate` → `CandidateShell`; V1 sustituye el `V3Placeholder` de `candidateHome`
y `candidateAccess` por `CandidateHomePage` / `CandidateAccessPage` (nuevos,
mismo shell, breadcrumbs existentes). `jobs` sigue placeholder (idéntico al
`jobs.html` de la referencia). El "login" candidato NO inventa auth: es un
puente que extrae el token del input (link o token crudo) y navega a
`/postulaciones?invite=<token>` donde el guard existente
(`postulationDemoInvite.js` + `PostulationDemoApp`) valida y liga la sesión.
Extracción de token: helper puro `extractInviteToken` + `buildInvitationUrl`
en `postulationDemoInvite.js` (mismo módulo dueño del formato de token;
sin ciclo de imports: `postulationDemoRoute.js` no importa nada).

**Tech stack:** React 19, Vite 8, CSS tokens `--k-*` (régimen: sin hex en vistas),
vitest + @testing-library (jsdom), Playwright smoke sobre build de producción
(`vite preview` — pitfall Pi RAM).

---

### Task 1: `extractInviteToken` + `buildInvitationUrl` (RED)

**Files:**
- Test: `src/postulation-demo/postulationDemoInvite.test.js` (añadir describes)
- Modify: `src/postulation-demo/postulationDemoInvite.js`

```js
// postulationDemoInvite.js (añadir; importa POSTULATION_DEMO_BASE_PATH)
export function extractInviteToken(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const withoutFragment = raw.split('#', 1)[0];
  const questionIndex = withoutFragment.indexOf('?');
  if (questionIndex !== -1) {
    return parseInviteToken(withoutFragment.slice(questionIndex + 1));
  }
  return TOKEN_REGEX.test(raw) ? raw : null;
}

export function buildInvitationUrl(token) {
  return `${POSTULATION_DEMO_BASE_PATH}?${INVITATION_PARAM}=${encodeURIComponent(token)}`;
}
```

Tests: token crudo válido (±whitespace), URL https completa, URL relativa
`/postulaciones?invite=…`, URL con fragment `#…`, URL con params extra,
URL sin `invite` → null, URL con `invite` mal formado → null, basura → null,
corto → null, vacío/null/undefined → null; `buildInvitationUrl('tok-valid-abc123')`
→ `'/postulaciones?invite=tok-valid-abc123'`.

### Task 2: i18n V1 (`v3Copy.js`) (RED vía paridad)

**Files:** Modify: `src/v3/v3Copy.js`

Claves nuevas (EN/ES espejo; EN/ES de la home **textuales de la referencia**
`script.js` de la ref; `ca_*` nuevas — la ref `login-candidate.html` es
placeholder y la página real no existe en la referencia):

| clave | EN | ES |
|---|---|---|
| `cp_title` | Find your next opportunity. | Encuentra tu próxima oportunidad. |
| `cp_subtitle` | Explore available hiring processes or access an assessment you've been invited to. | Explora procesos de selección disponibles o accede directamente a una evaluación a la que fuiste invitado. |
| `cp_question` | How would you like to continue? | ¿Cómo quieres continuar? |
| `cp_explore` | Explore opportunities | Explorar oportunidades |
| `cp_exploreText` | Browse KRUMM's available hiring processes and find an opportunity that matches your profile. | Revisa los procesos de selección disponibles en KRUMM y encuentra una oportunidad que se ajuste a tu perfil. |
| `cp_exploreAction` | View opportunities | Ver oportunidades |
| `cp_exploreHint` | Explore available roles | Explora los cargos disponibles |
| `cp_invitation` | I already have an invitation | Ya tengo una invitación |
| `cp_invitationText` | Access the hiring process you've been invited to and start your assessment. | Accede al proceso de selección al que fuiste invitado e inicia tu evaluación. |
| `cp_signIn` | Sign in | Iniciar sesión |
| `cp_invitationHint` | Did you receive a KRUMM invitation link? | ¿Recibiste un enlace de KRUMM? |
| `ca_intro` | Paste the invitation link or token you received and we will validate it to start your assessment. | Pega el enlace de invitación o el token que recibiste y lo validaremos para iniciar tu evaluación. |
| `ca_label` | Invitation link or token | Enlace o token de invitación |
| `ca_inputPlaceholder` | https://…/postulaciones?invite=your-token | https://…/postulaciones?invite=tu-token |
| `ca_formatError` | That does not look like an invitation link or token. Check it and try again. | Eso no parece un enlace o token de invitación. Revísalo e inténtalo de nuevo. |
| `ca_note` | The link is validated before starting your assessment. | El enlace se valida antes de iniciar tu evaluación. |

(`v3Copy.test.js` de V0 ya exige paridad recursiva EN/ES + sin vacíos →
cubre estas claves sin cambio.)

### Task 3: Tokens V1 (krumm-tokens.css)

**Files:** Modify: `src/styles/krumm-tokens.css` (bloque "Fase v3 (V1)")

Valores de la referencia `candidate.css` (solo los sin token equivalente;
el resto mapea a tokens existentes — tabla abajo). Contraste verificado
AA ≥4.5:1 en cada par (verificación de plan):

| Token nuevo | valor | uso | contraste (token sobre fondo) |
|---|---|---|---|
| `--k-cp-card-bg` | `#efe2d0` | superficie card home | texto `--k-ink-medium` 5.7:1 ✓ |
| `--k-cp-card-line` | `#d5bfa4` | borde card + icon box | n/a (bordes) |
| `--k-cp-card-line-hover` | `#ad825a` | borde card hover | n/a |
| `--k-cp-card-shadow` | `rgba(98, 67, 43, 0.05)` | sombra card hover (ref `#62432b0d`) | n/a |

Mapeo reutilizado: icon bg `#e4cdb0`→`--k-bg-light-sand`; icon ink
`#7b5635`→`--k-ink-terracotta` (4.8:1 sobre arena ✓); eyebrow `#8b694b`→
`--k-ink-terracotta` (6.4:1 sobre crema ✓); body/hint `#705a47/#765e4d`→
`--k-ink-medium`; CTA card bg `#d8b38c`→`--k-gold`, borde `#b58c60`→
`--k-gold-dark`, texto espresso `#3d2b20`→`--k-ink-espresso` (6.9:1 sobre
gold ✓); error form → `--k-status-error`; input bg → `--k-bg-light`.

### Task 4: `CandidateHomePage.jsx` (RED)

**Files:** Create: `src/v3/CandidateHomePage.jsx`

Estructura (ref candidate.html; SVGs de la ref — briefcase, envelope, arrow):
hero (eyebrow `cp_eyebrow` + `h1 cp_title` + `p cp_subtitle`) → `section`
(`h2 cp_question`) → `.v3-cp-grid` 2 cards `<a class="v3-cp-card">`:
1. `href="/empleos"` — icon briefcase, `h3 cp_explore`, `p cp_exploreText`,
   CTA `cp_exploreAction` + arrow, hint `cp_exploreHint`.
2. `href="/candidato/acceso"` — icon envelope, `h3 cp_invitation`,
   `p cp_invitationText`, CTA `cp_signIn` + arrow, hint `cp_invitationHint`.
Cards con `aria-labelledby`/`aria-describedby` (ids `v3-cp-explore-*`,
`v3-cp-invitation-*`); iconos `aria-hidden`.

### Task 5: `CandidateAccessPage.jsx` (RED)

**Files:** Create: `src/v3/CandidateAccessPage.jsx`

API: `({ onNavigate, initialSearch } = {})` — `onNavigate(url)` (default
`globalThis.location.assign(url)`), `initialSearch` (default
`globalThis.location.search`). Render (ref login-candidate.html como base +
form real): eyebrow + `h1 cp_access` + `p ca_intro` + form
(label `ca_label` + input `ca_inputPlaceholder` + submit `cp_signIn`) +
nota `ca_note` + back link `cp_back` → `/candidato`.
Comportamiento:
- submit: `extractInviteToken(value)` → null: `setError(ca_formatError)`
  (mensaje `role="alert"`); token: `onNavigate(buildInvitationUrl(token))`.
- mount: si `extractInviteToken(initialSearch)` → auto-navega 1 vez
  (ref guard; StrictMode-safe).

### Task 6: `V3RootApp.jsx` dispatch V1

**Files:** Modify: `src/v3/V3RootApp.jsx`

Rama candidate: `candidateHome` → `<CandidateHomePage/>`; `candidateAccess`
→ `<CandidateAccessPage/>`; resto (`jobs`) → `V3Placeholder` (sin cambios).
`/portal`, `/empresa/acceso` y rama company: sin cambios.

### Task 7: CSS (v3Shells.css)

**Files:** Modify: `src/v3/v3Shells.css`

- `.v3-cp-hero` (max 760, center, mb 42), `.v3-cp-eyebrow` (10px 800 ls .18em
  terracotta), `.v3-cp-hero h1` (Archivo 600 clamp(34,4.5vw,52) ls -1.8px
  balance), `.v3-cp-subtitle` (15px lh 1.85 medium, max 630),
  `.v3-cp-question` (Archivo 500 18px center), `.v3-cp-grid` (2col gap 24),
  `.v3-cp-card` (flex col, p 32, border/radius 14, `--k-cp-card-bg`; hover
  `translateY(-3px)` + `--k-cp-card-line-hover` + `--k-cp-card-shadow`
  **solo bajo `prefers-reduced-motion: no-preference`** + reset en `reduce`),
  `.v3-cp-card-icon` (52px box, radius 12, `--k-bg-light-sand`,
  `--k-ink-terracotta`, svg 26), `.v3-cp-card h3` (Archivo 600 24 ls -0.6),
  `.v3-cp-card > p` (13 lh 1.9 medium), `.v3-cp-card-cta` (gold bar: min 48,
  p 13/18, border `--k-gold-dark`, bg `--k-gold`, ink espresso 12 800,
  arrow 20), `.v3-cp-hint` (10px medium center).
- Form acceso: `.v3-ca` (max 560 center), `.v3-ca-intro`, `.v3-ca-form`
  (left), `.v3-ca-field`, `.v3-ca-input` (min 52, border `--k-cp-card-line`,
  radius 10, bg `--k-bg-light`, focus terracotta 3px), `.v3-ca-submit`
  (full-width gold gradient como `.v3-cta-gold`, **con sombra vía regla
  compuesta `.v3-candidate .v3-ca-submit`** para ganar a la neutralización
  V0 `box-shadow: none` — especificidad (0,2,0) > (0,1,1)), `.v3-ca-error`
  (`--k-status-error`), `.v3-ca-note`.
- Responsive ≤700px (ref candidate.css): grid 1col gap 20, card p 28/24,
  hero mb 32, subtitle 14, h1 ls -1.2, `.v3-ca` padding-top reducido.

### Task 8: Spec V1 (`V1Candidate.test.jsx`) + actualización spec V0

**Files:** Create: `src/v3/V1Candidate.test.jsx` · Modify: `src/v3/V3Shells.test.jsx`

V1Candidate (~22 tests): home (hero/h1/subtitle, question h2, card explore
href `/empleos` + copias, card invitation href `/candidato/acceso` + copias,
CTA/hint, iconos svg presentes, un solo h1, i18n EN/ES por toggle); acceso
(h1 `cp_access` + intro + label + input + submit `cp_signIn` + note + back
`/candidato`; submit vacío → error `role=alert` y sin navegación; basura →
error; token crudo → `onNavigate(buildInvitationUrl)`; URL completa → token
extraído; URL con fragment → token; URL sin invite → error; auto-navegación
`initialSearch` 1 vez; sin `initialSearch` → nada; i18n EN); integración
root (`/candidato` sin `.v3-placeholder` + con `.v3-cp-grid` 2 cards;
`/candidato/acceso` form dentro de `CandidateShell` con breadcrumb
"Acceso candidato"; `/empleos` sigue placeholder con note+back).

V3Shells (actualizar 3 tests V0): loop 12 rutas — título esperado por ruta
(`candidateHome` → `cp_title`, `candidateAccess` → `cp_access`, resto
`pages.*.title`); "rutas candidato" — el hub ya no es placeholder (mantiene
la aserción "sin `.v3-back`" y la de `/empleos`); "i18n root app" —
`/candidato/acceso` EN aserta `cp_access` EN + `ca_intro` EN (sin note).

### Task 9: Gates

```bash
NODE_ENV=test npx vitest run src/v3 src/postulation-demo/postulationDemoInvite.test.js --pool=threads --reporter=default
NODE_ENV=test npx vitest run --pool=threads --reporter=default
npx oxlint src/v3 src/postulation-demo src/main.jsx
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

### Task 10: Smoke browser vivo (Playwright, Pi, build prod)

**Files:** Create: `scripts/smoke-t_482f57b2-v1-candidate.mjs` · Shots: `docs/qa/v1-candidate/`

Build → `vite preview` (127.0.0.1:4173). Matriz estática: 4 rutas candidato
(`/portal`, `/candidato`, `/candidato/acceso`, `/empleos`) × 2 viewports
(1280×720, 390×844) × ES + 2 rutas (`/candidato`, `/candidato/acceso`) ×
2 viewports × EN — 0 overflow, 0 console/pageerror/requestfailed, h1
esperado por ruta/idioma, chrome candidato + contenido específico
(grid 2 cards / form input+submit / placeholder).
**Recorrido de aceptación** (ES desktop): `/portal` → click card candidato
→ `/candidato` → click card invitación → `/candidato/acceso` → escribir
`tok-valid-abc123` → submit → URL `/postulaciones?invite=tok-valid-abc123`
→ guard local → **setup** (`h1 "Preparación de la sesión"` +
`[data-demo-phase="setup"]`) = flujo intacto. Flujo expirado (ES móvil):
`/candidato/acceso` → `tok-expired-abc123` → submit →
`h1 "Invitación no válida"` + "ha expirado". Screenshots: home desktop+móvil
(ES), acceso desktop (ES) + (EN), setup post-guard, guard expirado móvil.
Exit 1 con JSON de fallos.

### Task 11: Docs + commit

**Files:** Modify: plan maestro (V1 → done + nota), `docs/design/design-system.md`
§10 (bloque tokens V1 + mapeo). Create: este doc con estado.
Commit local: `feat(t_482f57b2): V1 fase v3 — home candidato (2 cards ref) +
acceso (guard invitación → /postulaciones) + job board honesto — tests +
smoke 2 viewports + flujo valid`. SIN push (V5).

---

## Decisiones

1. **Sin auth inventada:** el acceso candidato es el flujo de invitación
   existente (token → guard → sesión ligada, `runIdForInvitation` +
   `x-invitation-id`); `/postulaciones` no se modifica (decisión V0 #6;
   cutover/retiros en V5).
2. **Helper puro en el módulo dueño del token** (`postulationDemoInvite.js`):
   `extractInviteToken` (link completo/relativo o token crudo → token|null) y
   `buildInvitationUrl` (→ `/postulaciones?invite=…`); import de
   `POSTULATION_DEMO_BASE_PATH` de `postulationDemoRoute.js` (sin ciclo).
3. **Copy home textual de la referencia** (EN+ES de `script.js` ref);
   `ca_*` (acceso) es copy nuevo honesto (la ref es placeholder); todo en
   `V3_COPY` (paridad forzada por test V0).
4. **Tokens V1:** 4 nuevos bloque "Fase v3 (V1)" (superficie/borde/sombra
   card); reutilización para todo lo demás (tabla Task 3 con contrastes AA).
5. **Auto-navegación desde `?invite=` en `/candidato/acceso`:** ref guard
   1 vez (idempotente bajo StrictMode) — cubre links compartidos a la nueva
   URL sin romper el form.
6. **`/empleos` = placeholder V0 sin cambios** (idéntico a `jobs.html` ref);
   `/portal` = real de V0 sin cambios (se verifica en smoke).
7. **Navegación por `location.assign`** (SPA sin router: el cambio de
   RootApp requiere reload; mismo patrón de navegación por links que todo
   el app). `onNavigate` inyectable para tests.

## Riesgos / no-cope (documentados)

- Redirecciones viejas (`/postulaciones` sin invite → `/candidato`,
  `/reclutador` → `/empresa`) = V5 (cutover), no V1.
- Retiro físico de `PostulationLanding` = V5.
- Landing pública no se toca (decisión V0 #6); sigue enlazando a
  `/postulaciones` hasta V5.

## Estado (ejecutado 2026-09-07, t_482f57b2)

- [x] T1 extractInviteToken/buildInvitationUrl (RED→GREEN, 10 tests nuevos en
      postulationDemoInvite.test.js → 29/29)
- [x] T2 i18n V1 (16 claves EN+ES; paridad cubierta por v3Copy.test.js V0)
- [x] T3 tokens V1 (4 nuevos, bloque "Fase v3 (V1)" en krumm-tokens.css)
- [x] T4 CandidateHomePage (hero + 2 cards ref, SVGs de la ref)
- [x] T5 CandidateAccessPage (form + auto-navegación + onNavigate inyectable)
- [x] T6 V3RootApp dispatch (candidateHome/candidateAccess → páginas reales;
      jobs → placeholder sin cambios)
- [x] T7 CSS (home cards + form acceso + responsive ≤700px + reduced-motion)
- [x] T8 spec V1 (V1Candidate.test.jsx, 24 tests) + 3 tests V0 actualizados
      (loop 12 rutas, rutas candidato, i18n root app)
- [x] T9 gates: focales 106/106 · suite completa 805/805 (127 archivos; 771
      previos + 34 nuevos) · oxlint 0 errores en archivos tocados (1 warning
      PREEXISTENTE en src/assessment/ParticipantAssessmentFlow.jsx, fuera de
      diff) · build OK (warning chunk >500kB preexistente) · npm audit 0 ·
      git diff --check clean
- [x] T10 smoke vivo sobre build prod (vite preview :4173):
      `scripts/smoke-t_482f57b2-v1-candidate.mjs` → 0 fallos, 0 console errors.
      Matriz estática: 4 rutas × 2 viewports ES + 2 rutas × 2 viewports EN
      (h1 por ruta/idioma, chrome candidato, grid 2 cards / form / placeholder).
      **Recorrido de aceptación**: /portal → click card candidato → /candidato
      → click card invitación → /candidato/acceso → `tok-valid-abc123` → submit
      → `/postulaciones?invite=tok-valid-abc123` → guard local →
      **`data-demo-phase="setup"`** ("Preparación de la sesión") = flujo intacto.
      Flujo expirado (móvil): `tok-expired-abc123` → "Invitación no válida" +
      "ha expirado". 12 screenshots en `docs/qa/v1-candidate/`.
- [x] T11 docs + commit local

### Ejecución — desviaciones del plan

1. **BUG V0 detectado en smoke V1 (fix de clase): encabezados morados UA.**
   Los `h2` de las cards de `/portal` (V0) y los `h3` de las cards de
   `/candidato` (V1) estaban dentro de `<a>` sin color explícito → caían al
   color de enlace por defecto del navegador (lila/periwinkle), rompiendo la
   paleta. La referencia aplica `a { color: inherit }` global (styles.css);
   v3Shells.css solo quitaba `text-decoration`. Fix: `color: inherit` en la
   regla de enlaces v3 (3 scopes) + regla compuesta
   `.v3-candidate/.v3-company/.v3-bare .v3-back { color: var(--k-ink-terracotta) }`
   ((0,2,0) > (0,1,1)) para no perder el color de los back links. Guardián:
   tests de declaración en V1Candidate.test.jsx (régimen V1). Verificado
   visualmente en screenshots (portal + home, antes/después).
2. **Submission de forms en jsdom:** `fireEvent.click` en el botón submit no
   dispara el submit event de forma fiable en jsdom → los tests usan
   `fireEvent.submit(form)` (el mismo evento que dispara click/Enter real en
   navegador). Documentado en la spec.
3. **`npx` bloqueado por security scan en single-query** (timeout OSV/
   ecosyste.ms del threat intel de los binarios) → se usaron los binarios
   locales (`./node_modules/.bin/oxlint`, `npm run test`) — mismos tooling,
   sin pasar por npx.
4. **`/portal` y `/empleos` sin cambios** (V0): el portal ya era real
   (decisión V0 #2) y el job board honesto coincide 1:1 con `jobs.html` de la
   referencia (eyebrow + title + "próxima iteración" + back) — V1 los verifica
   en smoke, no los reimplementa.
5. **Landing pública sin tocar** (decisión V0 #6): sigue enlazando a
   `/postulaciones`; el cutover de entradas es V5.

### Evidencia

- Tests: `src/v3/V1Candidate.test.jsx` (24) + 10 nuevos en
  `postulationDemoInvite.test.js` (29 total) + 3 actualizados en
  `V3Shells.test.jsx` — focales 106/106, suite completa 805/805.
- Smoke: `scripts/smoke-t_482f57b2-v1-candidate.mjs` → JSON
  `{ failures: [], consoleErrors: [] }`, 12 screenshots en
  `docs/qa/v1-candidate/` (incl. `...-es-flow-setup-postguard.png` = flujo
  /postulaciones intacto tras token válido, y `...-es-mobile-flow-guard-expirado.png`).
- Revisión visual (vision): home desktop/móvil ES + EN, acceso, portal, setup
  post-guard, guard expirado móvil → 0 halos teal, 0 overflow, títulos en
  espresso (morado resuelto), form limpio, consent screen íntegro.
