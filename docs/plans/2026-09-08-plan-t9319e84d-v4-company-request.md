# Plan — V4: Empresa · New request (diseño guiado + upload) — t_9319e84d

**Fase:** v3 (plan maestro `docs/plans/2026-09-07-plan-fase-vistas-v3.md` §3, card V4)
**Fecha:** 2026-09-08 · **Repo:** `/home/sarlock/krumm/test-mpfl`
**Depende de:** V3 (t_84f00355, done) · **Habilita:** V5 (t_0184d2e6, cutover)

## 1. Objetivo y aceptación (card kanban)

| Vista | Requisito |
|---|---|
| `/empresa/nueva-solicitud` | 2 cards: QUICK upload / RECOMMENDED design with KRUMM (copia de la referencia `new-request.html`) |
| `/empresa/nueva-solicitud/diseño` | Formulario guiado mínimo — **NO chat LLM**: preguntas estructuradas → crea proceso en el estado demo, visible luego en `/empresa/procesos` |
| `/empresa/nueva-solicitud/subida` | Upload PDF/DOCX/TXT → validación de tipo → metadatos + confirmación; **sin promesas de NLP** |

Aceptación: diseño crea proceso coherente (lista + KPIs + detalle); upload valida y
confirma; ES/EN; estado demo **solo en memoria** (sin backend de procesos aún —
follow-up documentado en §4).

## 2. Referencia

- `~/krumm/design_ref/v2-completo-2026-09-07/` (y `/tmp/krumm-frontend-v2/`):
  - `new-request.html` + `new-request.css` — 2 cards (badges QUICK/RECOMMENDED,
    preview de documento y de conversación, action bar), valores de color.
  - `script.js` — copias `request_*` EN + ES (textuales).
  - `request-design.html` / `request-upload.html` — en la ref son placeholders
    "coming soon" → V4 los implementa de verdad (decisión plan maestro §4.2).

## 3. Decisiones

- **D1 — Store de borradores (nuevo módulo `src/v3/companyProcessStore.js`).**
  Memoria de cliente: estado de módulo + **sessionStorage** (acotado a la
  pestaña, schema v1 versionado con lectura defensiva; **sin backend**) +
  suscripción; React consume vía `useSyncExternalStore`
  (React 19, sin librerías — policy del repo). Funciones puras exportadas en
  `companyData.js`: `validateDesignInput`, `uniqueProcessId`, `buildDraftProcess`,
  `mergeDemoProcesses`, `validateProfileFile`, `formatFileSize`; store
  (stateful): `createDraftProcess({…, now})` (fecha inyectable),
  `getDraftProcesses`, `resetCompanyProcessStore` (tests). Los borradores
  sobreviven a la navegación de carga completa (ver desviación 1) y mueren al
  cerrar la pestaña. Solo campos tipeados por el usuario (cargo/área/ubicación/
  modalidad/perfil) — nunca telemetría ni datos de candidatos.
- **D2 — Integración en `useCompanyData`.** Modo **demo**: `processes` =
  `mergeDemoProcesses(drafts)` = `[...DEMO_PROCESSES, ...drafts]` (función pura,
  derivada en cada render — el hook se suscribe al store). Modo **real**
  (`GET /sessions`): **sin merge** (los borradores son dominio demo — no existe
  backend de procesos; la API es follow-up §4). Dashboard KPIs + lista consumen
  la misma fuente (V2 D1: coherencia; un proceso nuevo sube `activeProcesses`
  sin contaminar el promedio — `averageScore: null`).
- **D3 — Formulario de diseño (guiado, 3 pasos, sin LLM).**
  1. *Cargo*: role* (texto ≤80) + department* (select: operations/maintenance —
     las 2 áreas demo de V2) + location (texto opcional ≤80).
  2. *Perfil a evaluar*: work mode* (select: onsite default/hybrid/remote —
     labels {es,en} fijos, no traducen entrada del usuario) + target profile
     (textarea opcional ≤300).
  3. *Revisar y crear*: resumen de lo que se creará + botón Crear.
  Validación pura `validateDesignInput` (role y department requeridos, longitudes
  máximas). `roleEn = role` (entrada del usuario — **sin traducción inventada**;
  `localizeProcessRole` ya hace fallback). `openedAt` = hoy (inyectable).
  `source: 'design'` marca el origen (lo usa el detalle para distinguir draft).
- **D4 — Detalle coherente del proceso draft.** `buildDraftProcessDetail(process,
  today)` (en `companyProcessDetail.js`): mismo shape que
  `buildRealProcessDetail` (stats 0/0/0, `distribution: null`, `advanced: null`,
  `avgTimeMin: null`, `candidates: []`, `averageScore: null`) +
  department/location/mode/profile/created del formulario. `created` = fecha
  larga localizada (`Intl.DateTimeFormat es-CL/en-US`, determinista por `openedAt`).
  `daysActive` = diferencia `today − openedAt` (hoy → 0). La página de detalle
  (modo demo) rama: 3 perfiles demo → draft (`data.processes` con
  `source === 'design'`) → `notFound` (comportamiento V3 intacto). Ranking sin
  candidatos: nota honesta `pd_noCandidatesYet` (clave nueva) en vez de tbody
  vacío.
- **D5 — Upload (sin NLP, metadatos + confirmación).** Validación pura
  `validateProfileFile(file)`: extensión `pdf|docx|txt` (case-insensitive),
  tamaño `> 0` y `≤ 10 MB` → `{ ok, error: null|'type'|'empty'|'size', type }`.
  Al validar: panel de metadatos (nombre, formato, tamaño formateado, fecha de
  recepción) + confirmación con copia honesta: "Un equipo humano lo revisará y
  creará el proceso contigo. Esta demo no extrae contenido del documento ni
  crea procesos automáticos" — **no se lee el contenido del archivo** (la API de
  `File` da solo name/size/type — privacidad por construcción; nunca se
  persiste ni sube nada en la demo). Reset "Elegir otro documento" + back.
  **No crea proceso** (aceptación de la card: "upload valida y confirma"; el
  plan maestro decía "→ crea proceso" — la card kanban, más reciente, lo
  restringe a validación+confirmación; el vínculo upload→proceso queda en §4).
- **D6 — Copia de la card design (honestidad, maestro §4.2).** Título de la ref
  ("Design profile with KRUMM") se conserva; la descripción de la ref promete
  conversación ("by talking with KRUMM") → se adapta al flujo real (formulario
  guiado): EN "Answer a few guided questions and KRUMM structures your hiring
  process around them." / ES equivalente. El preview mock de la ref (chat) se
  reemplaza por un mock de 3 pasos numerados (mismo lenguaje visual: panel
  arena con "mensajes" superficie). El resto de copias `request_*` = textuales
  de la referencia (EN + ES del `script.js`).
- **D7 — Fix de bug V3 detectado (detalle draft).** `CompanyProcessDetailPage`
  usa `copy.company_candidate` (header de tabla, línea 415) — la clave **no
  existe** en `v3Copy.js` (solo `company_candidates` plural) → header vacío en
  los 3 perfiles demo y en el draft. Se añade `company_candidate`
  (ES "Candidato" / EN "Candidate").
- **D8 — i18n.** Claves nuevas: `request_*` (ref, EN+ES textuales donde la ref
  define; designDescription adaptada por D6), `rd_*` (form: pasos, labels,
  errores, confirmación), `ru_*` (upload: dropzone, formatos, metadatos,
  confirmación, errores, nota privacidad), `pd_noCandidatesYet`,
  `company_candidate`. `v3Copy.test.js`: `newRequest`/`requestDesign`/
  `requestUpload` dejan de requerir `note` (páginas reales desde V4; `backLabel`
  se conserva para el fallback del placeholder, que ya no se usa en esas rutas).
  Paridad ES/EN de la arboleda = guardián existente (automático).
- **D9 — Tokens (bloque "Fase v3 (V4)" en `krumm-tokens.css`).** Valores de
  `new-request.css` mapeados 1:1; pares texto/fondo verificados AA con
  `scripts/contrast_v4_check.py` (2026-09-08, todos ≥3:1; peores pares
  4.75:1 `--k-ink-medium`/`--k-req-card-bg-featured` y 5.08:1 icon):
  `--k-req-card-bg #eee1d0`, `--k-req-card-line #cbb59c`,
  `--k-req-card-line-featured #ae825a`, `--k-req-card-bg-featured #e4cdb5`,
  `--k-req-card-shadow rgba(99,68,44,0.05)`, `--k-req-icon-bg #dfc5a7`,
  `--k-req-icon-line #c5a582`, `--k-req-icon-ink #65472e` (5.1:1 grafico),
  `--k-req-badge-bg #f2ece3`, `--k-req-badge-ink #765e4d` (5.1:1),
  `--k-req-featured-bg #795638` (texto `--k-co-surface` 6.3:1),
  `--k-req-preview-doc #e3d2bc`, `--k-req-preview-doc-line #ad8a65`,
  `--k-req-preview-chat #d8bc9c`, `--k-req-preview-line #e0d3c2`,
  `--k-req-preview-line-soft #e6daca`, `--k-req-preview-msg-user #ede2d2`,
  `--k-req-preview-msg-user-line #e5d7c3`, `--k-req-preview-msg-ink #805d3d`
  (5.7:1), `--k-req-action-bg #fff5e8`, `--k-req-action-line #b39370`,
  `--k-req-action-ink #75503a` (6.6:1). Resto via tokens existentes
  (`--k-co-surface`, `--k-ink-*`, `--k-line`).
- **D10 — CSS.** Reglas V4 en `v3Shells.css` (prefijos `v4-req-*` cards,
  `v4-rd-*` form, `v4-ru-*` upload) — **sin hex** (régimen de tokens V0,
  guardián `V3Shells.test.jsx` ≥60 usos `var(--k-*)`). Breakpoints: se pliegan a
  los `@media` existentes (1200/1150/1000/760/700/480) — la banda 761–1100 de la
  ref entra al 1150/1000; cards 2→1 columna en ≤1150 (mismo punto que V2
  pl-grid); orden descendente estricto (V2, design-system §10). Estados
  obligatorios en todo interactivo (hover/focus-visible/disabled); transiciones
  solo bajo `prefers-reduced-motion: no-preference`.
- **D11 — `V3RootApp`.** `CompanyWorkspace` renderiza las 3 páginas reales
  (`newRequest`/`requestDesign`/`requestUpload`) en vez de `V3Placeholder`;
  `needsData` no cambia (no consumen `/sessions`; el diseño lee el store).
- **D12 — Tests (RED primero).** `src/v3/V4CompanyRequest.test.jsx` (spec de
  declaración, secciones A–G): A store (shape/id único/validación/reset/
  inmutabilidad); B merge + `useCompanyData` reactivo (demo mergea, real no);
  C landing (2 cards, hrefs, ES/EN, badges); D diseño end-to-end (validación
  bloquea vacío, crea → confirmación → visible en `/empresa/procesos` + KPI
  dashboard + detalle coherente 0/0/0/—, `notFound` para id ajeno intacto);
  E upload (txt/docx/pdf OK → metadatos+confirmación; png y `.exe` rechazados
  por tipo; vacío y >10MB rechazados; **privacy assert**: el registro solo
  tiene name/size/type/date — nunca content); F detalle draft (`pd_noCandidatesYet`,
  `company_candidate` header no vacío — regresión D7); G copias (paridad
  request_*/rd_*/ru_* en ambos idiomas; v3Copy.test actualizado).

## 4. Follow-ups documentados (fuera de scope V4)

1. **Backend de procesos** (API create/list — hoy los borradores viven solo en
   memoria del SPA; persistiría el flujo de diseño contra staging).
2. **NLP del documento subido** (extraer cargo/área del PDF → precargar el
   formulario). Hoy: metadatos + revisión humana explícita; sin promesas.
3. **Vínculo upload → proceso** en modo real (post-revisión humana).
4. **V5 (t_0184d2e6)**: estas 3 rutas quedan cubiertas por el audit h46c y el
   cutover; ningún change adicional planeado aquí.

## 5. Archivos

**Nuevos:** `src/v3/companyProcessStore.js`, `src/v3/CompanyNewRequestPage.jsx`,
`src/v3/CompanyRequestDesignPage.jsx`, `src/v3/CompanyRequestUploadPage.jsx`,
`src/v3/V4CompanyRequest.test.jsx`, `scripts/contrast_v4_check.py` (verificación
AA, patrón de scripts QA existentes).

**Modificados:** `src/v3/v3Copy.js` (D7/D8), `src/v3/v3Copy.test.js` (D8),
`src/v3/useCompanyData.js` (D2), `src/v3/V3RootApp.jsx` (D11),
`src/v3/CompanyProcessDetailPage.jsx` (D4), `src/v3/companyProcessDetail.js`
(D4), `src/styles/krumm-tokens.css` (D9), `src/v3/v3Shells.css` (D10).

## 6. Gates (verificación)

1. Focales: `V4CompanyRequest` + `V2Company` + `V3CompanyProcess` + `v3Copy` +
   `V3Shells` (régimen tokens) — `NODE_ENV=test npx vitest run <focales>`.
2. Suite completa `NODE_ENV=test npx vitest run --pool=threads`.
3. `npx oxlint src/v3 src/main.jsx` · `npm run build` ·
   `npm audit --audit-level=high --omit=dev` · `git diff --check`.
4. Smoke vivo sobre build prod (`vite preview`): 3 rutas × ES/EN ×
   1280×720/390×844 — 0 overflow horizontal, 0 console errors; recorrido:
   diseño (crear "Analista de Control" → aparece en `/empresa/procesos` →
   detalle coherente → KPI dashboard 4 activos) + upload (txt OK, png
   rechazado).
5. Doc: plan maestro §3 (V4 ✅) + §Estado, design-system §10 (bloque V4),
   handoff kanban + Linear KRU-90 (comentario; epic sigue In Progress hasta V5).

## 7. Desviaciones (llenadas al cierre)

1. **"Solo en memoria" → sessionStorage (memoria de cliente de la pestaña).**
   La app navega por `<a>` de carga completa (sin router de cliente; main.jsx
   resuelve el pathname solo al montar). Un store puramente en RAM haría
   invisible el proceso creado al primer click a `/empresa/procesos` en el
   navegador real — rompiendo la aceptación ("visible luego en
   /empresa/procesos"). sessionStorage cumple la restricción de la card ("sin
   backend de procesos"): vive en el cliente, acotado a la sesión de la
   pestaña (muere al cerrarla), sin servidor. Test de persistencia con
   "recarga" simulada (módulo fresco vía vi.resetModules) + lectura defensiva
   (schema v1 / JSON corrupto → []).
2. **Upload no crea proceso.** Plan maestro §2 decía "PDF/DOCX/TXT → crea
   proceso"; la card kanban (más reciente) restringe la aceptación a "upload
   valida y confirma". El vínculo upload→proceso queda en §4 (follow-up con
   revisión humana).
3. **Fix de bug V3 (D7):** `company_candidate` (header tabla detalle) no
   existía en v3Copy.js → se añadía ES/EN; detectado al construir el detalle
   draft (misma tabla).
4. **Specs vecinas actualizadas (declaraciones de fase, no regresiones):**
   `V2Company.test.jsx` B (`toBe(DEMO_PROCESSES)` → `toEqual`: el demo ahora
   deriva `mergeDemoProcesses(drafts)`, D2) y `V3CompanyReport.test.jsx` K
   (new request pasaba de placeholder a página real V4); nombre de test
   desactualizado en `V3Shells.test.jsx`.

## 8. Sign-off / handoff (worker, 2026-09-08 05:15 -03)

- **Veredicto:** DONE — aceptación de la card cumplida y verificada en
  navegador real (recorrido de carga completa, no solo jsdom).
- **Commits:** `e9ccef6` (feat: 38 archivos, +2318/−24) pushed; HEAD ==
  upstream (`Carloss97/test-mpfl` main).
- **Gates:** suite **950/950** (132 archivos; +31 tests V4) · build OK
  (NODE_ENV=production) · oxlint 0 errores en diff (1 warning preexistente
  fuera de scope) · npm audit 0 high · git diff --check limpio.
- **Smoke:** `scripts/smoke-t_9319e84d-v4-company-request.mjs` sobre `vite
  preview` (build prod): 16 screenshots (`docs/qa/v4-company-request/`),
  0 fallos, 0 console errors. Cobertura: ES desktop recorrido completo
  (diseño 3 pasos → crear → "Ver procesos" real → 4 cards → detalle coherente
  → dashboard KPI 4 → upload txt metadatos/9 B sin leak de contenido → png
  rechazado → recarga persiste 4 cards) + contexto nuevo 3 cards (sin
  backend) + EN (hub 2 cards + validaciones paso 1) + móvil 390×844 (3 rutas,
  0 overflow, apilado 1 col). Vision checks: hub ES (2 cards/badges/paleta ✓),
  detalle draft (0/0/0/—, config, fecha ✓), upload confirmación
  (metadatos+nota ✓).
- **Contraste:** `scripts/contrast_v4_check.py` — 12 pares, todos ≥3:1
  (peores: 4.75:1 ink-medium/card-featured, 5.08:1 icon).
- **Linear:** KRU-90 (epic fase v3) comentado; epic sigue In Progress hasta
  el cierre de V5.
- **Pendiente de consentimiento del usuario:** actualizar AGENTS.md ("fase v3
  de vistas: V0–V4 done, pendiente V5") — protegido en headless (mismo
  estado que tras V3).
- **Siguiente:** V5 (t_0184d2e6) ready para despacho — cutover:
  redirecciones `/reclutador`→`/empresa` y `/postulaciones` sin invite→
  `/candidato`, borrado de vistas deprecadas, audit h46c (las 3 rutas V4
  entran en la matriz), deploy AWS + verificación prod.
- **Follow-ups documentados (§4):** backend de procesos (persistir drafts),
  NLP del documento subido (futuro; hoy metadatos + revisión humana),
  vínculo upload→proceso en modo real.
