# Plan — Fase v3: port completo de la referencia `krumm_frontend.zip` v2 (2026-09-07)

**Repo:** `/home/sarlock/krumm/test-mpfl` · **Referencia:** zip v2 recibido 2026-09-07
(extraída en `/tmp/krumm-frontend-v2/Landing pge Krumm/`; archivar en
`~/krumm/design_ref/v2-completo/` al crear las cards)
**Decisión del usuario (2026-09-07):** "implementes las vistas, páginas, escenas que
se ven ahí al flujo actual, deprecando o bien borrando las versiones actuales y
anteriores (HR, login, report, todo lo demás), con funcionalidad acorde al
propósito de cada una".

## 1. Inventario de la referencia (15 páginas + 6 JS)

| Página | Rol | Funcionalidad en la referencia | Estado ref. |
|---|---|---|---|
| index.html | Landing pública | i18n EN/ES (script.js: diccionario + setLanguage), menú hamburguesa | Real (YA portada v2) |
| portal.html | Selección de portal | 2 cards: Company Portal / Candidate Portal + EN\|ES | Real (estática) |
| login-candidate.html | Acceso candidato | Placeholder "next iteration" + Help dialog | Placeholder |
| login-company.html | Acceso empresa | "Coming soon" + CTA "Explore company demo" | Placeholder |
| candidate.html | Home candidato | "Find your next opportunity" + 2 cards: Explore opportunities / I already have an invitation (Sign in) + Help | Real (estática) |
| jobs.html | Job board | Placeholder "next iteration" | Placeholder |
| candidate-report.html | Reporte (vista en workspace) | Placeholder "next iteration" (breadcrumb Processes → Back to process) | Placeholder |
| company.html | Dashboard empresa | KPIs (Active processes 12, Evaluated 184, Avg 78%, Recommended 24) + tabla Active processes + banner "Demo workspace" | Real (estática) |
| processes.html | Lista de procesos | **Búsqueda + filtros (department/location/sort) + 3 cards de proceso** — interacción real (processes.js: filter/sort live) | Real (interactiva) |
| process-detail.html | Detalle proceso (Plant Supervisor) | Header (estado, días, acciones Edit/View candidates/Pause), stats, Process configuration, Process statistics, Recommended candidates, Process actions | Real (estática + menú acciones) |
| process-operator.html | Detalle (Plant Operator) | Ídem, datos del rol operator | Real (estática) |
| process-technician.html | Detalle (Maintenance Technician) | Ídem, datos del rol technician | Real (estática) |
| new-request.html | Nueva solicitud | 2 cards: QUICK Upload profile (PDF/DOCX/TXT) / RECOMMENDED Design with KRUMM (mock de chat) | Real (estática) |
| request-upload.html | Upload de perfil | Placeholder "coming soon" | Placeholder |
| request-design.html | Diseño con KRUMM | Placeholder "coming soon" | Placeholder |

**Chrome compartido:** (a) *Candidate* — topbar: logo KRUMM + breadcrumb + EN\|ES +
Help (dialog) + "Skip to content"; footer © 2026 KRUMM + Privacy/Terms/Help.
(b) *Company* — sidebar: "Company workspace" (Dashboard / New request / Processes /
Settings / Help) + user chip (Alex Morgan · Andes Industries · Account↗) + mobile
menu (company.js); breadcrumb KRUMM / {sección}; banner "Demo workspace — All names,
processes and results shown here are fictional".

## 2. Arquitectura objetivo (SPA React actual, marca v2, tokens `--k-*`)

**Rutas nuevas** (router actual en `src/main.jsx` / `postulationDemoRoute.js`):

| Ruta | Vista | Reemplaza/deprecia |
|---|---|---|
| `/portal` | Selección de portal (2 cards) | — (nueva; el landing público ya enlaza a ella) |
| `/candidato` | Home candidato (2 cards: empleos / invitación) | **landing interna H4.3** (`/postulaciones` sin invite) |
| `/candidato/acceso` | Login candidato = flujo de invitación (pegar link/token → sesión) | **guard de invitación H4.3** (se integra aquí, no desaparece: sigue siendo la validación) |
| `/empleos` | Job board (honesto "próxima iteración", como la ref) | — (nueva; sin datos reales de empleo aún) |
| `/empresa/acceso` | Login empresa (demo: acceso simulado "Alex Morgan · Andes Industries", como ref "coming soon") | — (nueva; gate del portal empresa en demo) |
| `/empresa` | Dashboard (KPIs + tabla de procesos activos) | **`/reclutador` H4.4 (v1)** — redirigir |
| `/empresa/procesos` | Lista + búsqueda/filtros/sort (funcional real, patrón processes.js) | — (nueva) |
| `/empresa/proceso/:id` | Detalle (config, stats, recomendados, acciones) — 3 perfiles demo (supervisor/operator/technician) | — (nueva) |
| `/empresa/proceso/:id/candidatos/:sessionId` | Reporte de candidato dentro del proceso | **reporte H4.3 embebido** (mismo motor, nuevo shell) |
| `/empresa/nueva-solicitud` | New request (upload vs design) | — (nueva) |
| `/empresa/nueva-solicitud/diseño` | Design with KRUMM (formulario guiado conversacional; la ref es mock → implementar el flujo real mínimo: preguntas → perfil de proceso) | — (nueva) |
| `/empresa/nueva-solicitud/subida` | Upload de perfil (PDF/DOCX/TXT → crea proceso; sin NLP: metadatos + confirmación) | — (nueva) |
| `/postulaciones` | Flujo de evaluación (setup → 5 juegos → reporte) | **SE MANTIENE** (núcleo producto; la ref no lo reemplaza: es el "assessment" al que llevan las invitaciones) |

**Shells nuevos (V0):** `CandidateShell` (topbar logo+breadcrumb+EN|ES+Help dialog+
footer) y `CompanyShell` (sidebar+user chip+breadcrumb+banner demo workspace).
Copys de la referencia EN + diccionario ES (regla `t(es,en)`); la referencia es EN,
el producto es bilingüe desde H3 → todo texto pasa por i18n.

**Datos (política vigente: demo + API opcional):**
- Side empresa: **modo demo** (sin `VITE_KRUMM_API_BASE`): datos sintéticos
  consistentes con la ref (Andes Industries, Alex Morgan, 3 procesos con
  candidatos/escores) + banner "Demo workspace" + `humanReviewOnly`.
  Con API staging: `/empresa` consume `GET /sessions` (KPIs reales: completadas,
  constructs, caveats — pitfall B1.6 del skill: mapping completo obligatorio).
- `/postulaciones` sin cambios de datos (invitaciones + sesiones staging ya wireadas).
- **Sin autenticación real** (no existe backend de auth): login empresa = acceso demo
  simulado (la ref lo declara "coming soon" → honesto); login candidato = flujo de
  invitación existente (token → sesión; es la "autenticación" real del producto).
- Procesos = nuevo dominio demo-local (sin tabla en staging aún); la card de API
  de procesos queda como follow-up explícito (fuera de esta fase).

**Deprecaciones (borrar tras cutover V5, no antes):**
- `src/postulation-demo/hr-dashboard/` (HR dashboard v1) → reemplazado por `/empresa*`
  (se conserva temporalmente el reporte que se embebe en el detalle de proceso).
- Vista de landing interna H4.3 (PostulationLanding) → reemplazada por `/candidato`
  (el guard se mueve a `/candidato/acceso`).
- Rutas viejas: `/reclutador` → 301 a `/empresa`; `/postulaciones` (sin invite) →
  redirige a `/candidato` (con invite sigue al flujo).

**Privacidad (no negociable):** solo agregados allowlist en reportes/recomendados;
`humanReviewOnly`, `noAutomatedDecision`; banner demo workspace; sin datos biométricos
crudos en ninguna vista nueva.

## 3. Cards (kanban) y secuencia

| Card | Scope | Criterio de aceptación (resumen) |
|---|---|---|
| **V0 — Shells + rutas + i18n base** ✅ done (t_1c27edbf, 2026-09-07) | `CandidateShell`/`CompanyShell`, tablas de nav, footer, Help dialog, user chip, banner demo, registro de rutas (placeholders), copy EN+ES | Shells renderizan en 2 viewports con 0 overflow/0 errors; tokens `--k-*` (sin hex en vistas); spec de declaración |
| **V1 — Lado candidato** ✅ done (t_482f57b2, 2026-09-07) | `/portal`, `/candidato` (2 cards), `/candidato/acceso` (integración del guard de invitación), `/empleos` (honesto next-iteration) | Recorrido: portal → home → acceso → (invitación válida) → `/postulaciones` (flujo intacto); ES/EN; smoke |
| **V2 — Empresa: dashboard + procesos** ✅ done (t_90a5157c, 2026-09-08) | `/empresa/acceso` (demo), `/empresa` (KPIs + tabla), `/empresa/procesos` (búsqueda/filtros/sort funcionales, patrón processes.js), datos demo consistentes | Filtros/sort operativos (tests de lógica + smoke); KPIs coherentes con la lista; demo banner |
| **V3 — Empresa: detalle + reporte** ✅ done (t_84f00355, 2026-09-08) | `/empresa/proceso/:id` (3 perfiles demo), reporte de candidato embebido (motor H4.3), acciones (edit/pause/view candidates — UI + estado local) | Reporte embebido = mismo data-model (8 constructs, caveats); navegación back; ES/EN |
| **V4 — Empresa: new request** ✅ done (t_9319e84d, 2026-09-08) | `/empresa/nueva-solicitud` + `/diseño` (flujo guiado mínimo) + `/subida` (upload → metadatos) | Diseño crea un "proceso" en el estado demo (aparece en /procesos); upload valida tipo/archivo y confirma; sin promesas de NLP |
| **V5 — Cutover + limpieza + audit final** | Redirecciones, borrado de vistas deprecadas (hr-dashboard v1, landing interna), audit visual h46c (todas las rutas nuevas, 2 viewports, ES/EN), deploy AWS + verificación prod | Suite 100%, build, audit 0 fallos, krumm.cl sirve las rutas nuevas y las viejas redirigen |

**Orden:** V0 → V1 → V2 → V3 → V4 → V5 (cadenas kanban parent/child).
Paralelismo: la fase V es 1-worker-per-tree (política vigente); los fixes de juegos
(t_f40921bf, t_42978412) corren ANTES de V0 (área de juegos, archivos disjuntos).

**Estado (2026-09-07):** V0 done — `src/v3/` (CandidateShell, CompanyShell, V3Dialog,
V3Placeholder, V3RootApp, v3Routes.js, v3Copy.js, v3Shells.css) + 5 tokens nuevos en
krumm-tokens.css + registro en main.jsx. Suite 771/771, build OK, smoke vivo
12 rutas × 2 viewports + EN (0 fallos, 0 console errors) sobre `vite preview`.
Detalle + desviaciones + hallazgo (leak box-shadow global button → candidate
follow-up): `docs/plans/2026-09-07-plan-t1c27edbf-v0-shells.md`.
**V1 done (t_482f57b2, 2026-09-07):** `/candidato` (home real: hero + 2 cards de la
referencia, copias textuales EN/ES), `/candidato/acceso` (form: link/token →
`extractInviteToken`/`buildInvitationUrl` nuevos en postulationDemoInvite.js →
`/postulaciones?invite=…` → guard existente → sesión; auto-navegación si la URL ya
trae el token), `/empleos` job board honesto (placeholder, igual que la ref),
`/portal` verificado (V0). 4 tokens nuevos (bloque "Fase v3 (V1)") + **fix de bug V0
detectado en smoke V1**: encabezados dentro de `<a>` caían al morado UA
(h2 portal, h3 cards home) → `color: inherit` en los enlaces v3 (referencia) +
especificidad compuesta para los back links. Suite 805/805 (127 archivos), build
OK, smoke vivo: 12 cargas estáticas (0 overflow/0 errors) + recorrido de
aceptación portal→home→acceso→token válido→**setup** (flujo intacto) + guard
expirado (mensaje correcto). Detalle: `docs/plans/2026-09-07-plan-t482f57b2-v1-candidate.md`.
**V2 done (t_90a5157c, 2026-09-08):** `/empresa` (dashboard real: 4 KPIs
**derivados de la lista** 3/85/81%/24 — decisión D1 del plan V2, la ref era
incoherente con sus propios KPIs — + tabla de 3 procesos de la ref + CTA New
request) y `/empresa/procesos` (búsqueda NFD + filtros department/location +
sort 5 opciones + reset + empty state, patrón processes.js; cards con
pill/fecha/cargo/área·ubicación/dl). Lógica pura en `companyData.js` + hook
`useCompanyData` (demo | checking | real vía `GET /sessions` con fallback demo,
contract v1; CompanyShell gana prop `note` para el banner real/loading).
`/empresa/acceso` intacto (V0). 10 tokens nuevos (bloque "Fase v3 (V2)").
Suite 870/870 (129 archivos; +65 tests: V2Company + V2CompanyReal), build OK,
smoke vivo sobre build prod: 12 screenshots (ES desktop+móvil × 3 rutas +
EN desktop × 2 + 6 interacciones: search/department/sort/empty/reset/sort-EN,
0 fallos/0 errors). **Bug detectado y corregido en smoke:** orden de `@media`
(≤1150/≤1000 añadidos tras ≤760 → pl-grid 2 col ganaba en móvil, overflow
404>390) → orden descendente estricto documentado en design-system §10.
Detalle: `docs/plans/2026-09-08-plan-t90a5157c-v2-company.md`.
**V3 done (t_84f00355, 2026-09-08):** `/empresa/proceso/:id` (3 perfiles demo de
la referencia: header con estado/días + acciones Editar/⋯ (diálogos de preview),
4 métricas 18/23/19/78%, configuration, statistics + advanced (disclosure),
ranking 6 rows con score/fit/estado y link a su reporte, process actions) y
`/empresa/proceso/:id/candidatos/:sessionId` — **reporte de candidato embebido
con el MISMO motor H4.3 del flujo** (`buildPostulationDemoArtifacts` con
`original_games`: resumen ejecutivo + 8 constructos R-6 + 5 juegos + calidad +
caveats, con banner demo + banner batería; los 2 constructos descriptivos
conservan score null). Datos/escalado en `companyProcessDetail.js` (fit bands
calibradas contra el motor real: overalls 89/87/85/82/80/78), nuevo bloque de
tokens V3 (AA verificado). Modo real: detalle por grupo + reporte por fila
(alias), tests con fetch stub. Suite **919/919** (131 archivos; +49 tests),
build OK, smoke vivo sobre build prod: 14 screenshots + 5 interacciones
(0 fallos/0 errors) + 3 vision checks. **Bug detectado y corregido en smoke:**
`.v3-pd-sr-only` (abs) sin ancestro posicionado inflaba scrollWidth del doc a
690 en móvil → `position: relative` en el scroll container. Detalle:
`docs/plans/2026-09-08-plan-t84f00355-v3-process-detail.md`.

**V4 done (t_9319e84d, 2026-09-08):** `/empresa/nueva-solicitud` (hub: 2 cards
QUICK upload / RECOMMENDED design, copias de new-request.html; desviación D6:
la card design no promete chat LLM — preview de 3 pasos + descripción adaptada
al flujo guiado real), `/empresa/nueva-solicitud/diseño` (formulario guiado de
3 pasos SIN LLM: cargo/área/ubicación → modalidad/perfil → resumen → crea
proceso **draft** en el store `companyProcessStore.js` — memoria de cliente en
sessionStorage de la pestaña, **sin backend** (desviación 1 del plan V4: un
store puramente en RAM moría con la navegación de carga completa y rompía la
aceptación en navegador real)) y `/empresa/nueva-solicitud/subida` (upload
PDF/DOCX/TXT → validación tipo/tamaño (≤10MB) → metadatos + confirmación; sin
NLP: el contenido del archivo nunca se lee ni persiste). El draft aparece en
`/empresa/procesos` (count 4), en los KPIs del dashboard y con detalle
coherente en `/empresa/proceso/:id` (shape "real" vacío: 0/0/0/—, config del
form, sin avanzadas, nota "Aún no hay candidatos"). **Fix de bug V3 (D7):**
clave `company_candidate` ausente en v3Copy.js → header de tabla del detalle
renderizaba vacío; añadida ES/EN. 22 tokens nuevos (bloque "Fase v3 (V4)",
pares AA verificados con `scripts/contrast_v4_check.py`). Suite **950/950**
(132 archivos; +31 tests), build OK, oxlint 0 errores en diff, audit 0 high,
smoke vivo sobre build prod: 16 screenshots + recorrido completo de aceptación
(navegación real carga-completa: diseño → crear → 4 cards en /procesos →
detalle → dashboard KPI 4 → upload txt OK / png rechazado → recarga persiste 4
cards → contexto nuevo 3 cards sin backend) + EN (hub + validaciones) + móvil
390×844 (0 overflow, cards apiladas) — 0 fallos/0 console errors. Detalle:
`docs/plans/2026-09-08-plan-t9319e84d-v4-company-request.md`.

## 4. Riesgos / decisiones documentadas
1. **Job board sin datos** → pantalla honesta "próxima iteración" (como la ref); no
   inventar roles.
2. **"Design with KRUMM"** → la ref es un mock de chat; implementar formulario
   guiado real mínimo (no un chat LLM): preguntas estructuradas → perfil.
3. **Auth empresa** → demo simulada (la ref lo declara coming soon); no inventar
   credenciales de producción.
4. **Procesos sin backend** → estado demo local; follow-up: API de procesos (fuera de fase).
5. **Referencia en inglés** → port bilingüe (ES primera, como el producto vigente);
   los textos de la ref se traducen y versionan en el diccionario i18n.
6. Cada card termina con milestone-sync (kanban/Linear/repo/handoff) y la fase V5
   cierra con audit h46c + deploy + sign-off del usuario.

**Estimación:** V0–V5 ≈ 6 tarjetas heavy (GPU) + 1 audit; la fase completa es la
mayor desde B1.
