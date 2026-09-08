# Plan t_84f00355 — V3: Empresa — detalle de proceso + reporte de candidato embebido — fase v3

> **For Hermes:** ejecutar task-by-task (esta card, worker default). Plan maestro:
> `docs/plans/2026-09-07-plan-fase-vistas-v3.md` §3 (card V3). Referencia visual:
> `~/krumm/design_ref/v2-completo-2026-09-07/` (process-detail.html/css/js,
> process-operator.html, process-technician.html, candidate-report.html, script.js
> bloques EN/ES). V0/V1/V2 done (`src/v3/`, commit e32d7c1).

**Goal:** dos vistas reales del lado empresa:
1. `/empresa/proceso/:id` — detalle de proceso con los **3 perfiles demo de la
   referencia** (Plant Supervisor / Plant Operator / Maintenance Technician):
   header (estado + días + acciones Edit/View candidates/Pause + menú ⋯), 4
   métricas, Process configuration, Process statistics (+ Advanced statistics
   colapsable), Recommended candidates (tabla 6 rows → link al reporte) y
   Process actions.
2. `/empresa/proceso/:id/candidatos/:sessionId` — **reporte de candidato
   embebido** con el **mismo motor H4.3** (artifacts del flujo → resumen
   ejecutivo + mapa de evidencia 8 constructos + resultados por juego +
   calidad + caveats/observaciones), nuevo shell empresa.

**Aceptación (card):** navegación back; reporte embebido = mismo data-model del
flujo (8 constructs, caveats, agregados allowlist); ES/EN; sin datos
biométricos crudos.

**Arquitectura:** SPA sin react-router (V3RootApp → CompanyWorkspace). El hook
`useCompanyData` ahora expone `sessions` (filas reales de /sessions; [] en
demo/checking) y CompanyWorkspace habilita el fetch también para detail/report.
Datos + lógica pura en `companyProcessDetail.js` (testable sin React). El
reporte demo construye **artifacts con el builder del propio flujo**
(`buildPostulationDemoArtifacts`, batería original_games) y los renderiza con
las **mismas funciones puras de H4.3** (`PostulationReportSummary.js`); el shell
es la página empresa (clases `v3-*`, sin CSS de postulation-demo).

**Datos demo (referencia — verificado contra los 3 HTML):**

| proceso | días | cand. | eval. | pend. | avg | dist 0–59/60–69/70–79/80–89/90–100 | edad (avg + 4 barras) | exp (avg + 4) | cogn. presente/escasa |
|---|---|---|---|---|---|---|---|---|---|
| supervisor | 18 | 23 | 19 | 4 | 78% | 2/4/7/5/1 | 36 · 3/9/7/4 | 8 · 2/6/9/6 | 84/79/74 · 37/32/26 |
| operator | 13 | 47 | 40 | 7 | 81% | 2/4/9/18/7 | 32 · 12/18/11/6 | 5 · 10/20/12/5 | 90/80/75 · 35/30/25 |
| technician | 9 | 31 | 26 | 5 | 84% | 1/2/4/12/7 | 35 · 5/12/9/5 | 7 · 4/10/11/6 | 88/81/77 · 38/31/27 |

Coherencia: Σdist = evaluados; Σbarras edad/exp = postulantes (verificado).
Creados: 20/25/29 ago 2026 (misma fecha que V2 `openedAt`).

Candidatos demo por proceso (6, nombres ref; rank 1–3 resaltado):

| rank | supervisor | operator | technician | score ref | fit ref |
|---|---|---|---|---|---|
| 1 | María González | Pablo Morales | Nicolás Fuentes | 94 | Excellent |
| 2 | Diego Ramírez | Ana Silva | Francisca López | 91 | Excellent |
| 3 | Camila Soto | Felipe Castro | Tomás Herrera | 87 | Very good |
| 4 | Juan Pérez | Daniela Muñoz | Javiera Ríos | 82 | Good |
| 5 | Sebastián Torres | Andrés Vega | Matías Contreras | 79 | Good |
| 6 | Valentina Rojas | Carolina Díaz | Catalina Reyes | 76 | Good |

**Calibración medida (Task 1, node real sobre el engine, 2026-09-08):**
f = ref/94 → overalls del motor: **89/87/85/82/80/78** (monótono estricto, orden
ref preservado). Constructos: 6× provisional_score + decisionMaking/adaptability
descriptive_only (score null). validation.ok=true, 3 reports + bundle. 6 builds
= 180 ms (node; jsdom ~2-3× más — sin riesgo). **FIT_BANDS = {excellent: 86,
veryGood: 84, good: 78, fair: <78}** → fit demo = Ex/Ex/VG/G/G/G (igual que ref).
El demo artifacts usa gameEvents sintéticos (mismo shape que el fixture) para
que la correlación exista y los caveats coincidan con el reporte fixture H4.3.

**Motor del reporte demo (mismo H4.3):**
- `buildDemoCandidateArtifacts(processId, candidateId)`: `completedDemo` con los
  5 bloques de la batería original (labels/trialCounts de la config real) y
  summaries en el shape del fixture (`aggregateOnly`), **escalados por factor
  `f = scoreRef_i / scoreRef_1`** sobre los campos ratio/eficiencia →
  `buildPostulationDemoArtifacts({batteryMode:'original_games', runId:
  'krumm-company-demo-<process>-<cand>', generatedAt: fijo, signalSnapshot/
  Context sintéticos (misma forma que el fixture), cameraConsent: true,
  participant: {mode:'company_demo_candidate'}}) + `fixture: {synthetic: true,
  label, description/descriptionEn}`. Caché en módulo (identidad referencial).
- **Overall del candidato = media de constructos no-nulos** del
  talentFramework (misma semántica `candidateOverallScore` V2; decisionMaking y
  adaptability = descriptive_only score null → no entran a la media).
- La tabla del detalle muestra ese overall (no el literal de la ref — ver D2).
- **Fit = bandas calibradas sobre el spread real del motor** (post-calibración;
  el orden Excellent×2/Very good/Good×3 de la ref se preserva por construcción).

**Reporte real (modo API, D6):** fila de /sessions → mismo data-model:
- 8 constructos: `row.constructs` (score null → availability 'insufficient'
  "Evidencia insuficiente"; no-nulo → 'provisional_score').
- Caveats: códigos de calidad de la fila (camera_not_enabled_or_no_samples,
  low_sample_count, low_face_presence, low_face_confidence,
  missing_game_correlation) → labels ES/EN (mapa local); fallback = código.
- Juegos: `row.games` (4 agregados allowlist contract v1: metric + value).
- Cobertura/calidad/estado: completion, sessionQuality, HR status pill, fecha.
- Integridad: `validateHrDashboardDataPrivacy(row)` (guard existente v1) →
  "Verificada"/"Bloqueada".
- Identidad: **alias** de la fila (pseudónimo; nunca nombre real).
- Sin signalContext → no hay calidad facial por muestra; se muestra lo que la
  fila trae (honesto, no inventar).

**Privacidad/contrato (no negociables):** solo agregados allowlist en ambas
vistas; el artifacts demo pasa por los mismos builders del flujo (privacy
guards incluidos: feature vector v2, payload validation); `humanReviewOnly` en
caveats/aviso; sin video/frames/landmarks/pointer/rutas crudas en ninguna
vista; scores provisionales sin baremos (warning visible, igual que H4.3);
banner demo workspace del shell; modo real con aviso "Solo revisión humana".

**Tech:** React 19, Vite 8, tokens `--k-*` (régimen: sin hex en vistas — test
V0 cubre v3Shells.css completo), vitest + @testing-library, Playwright smoke
sobre build prod (`vite preview` 4173).

---

### Task 1: Calibración del motor (node, scratch)
Ejecutar el engine real con los 6 factores del supervisor y fijar: (a) spread
de overalls, (b) bandas de fit, (c) verificar determinismo y performance
(build de 6 artifacts < ~2 s). Scratch en /tmp, no entra al repo.

### Task 2: `companyProcessDetail.js` — datos + lógica (RED: spec §A/§B)
`DEMO_PROCESS_PROFILES` (3 perfiles con todos los datos de la tabla arriba,
texto localizado {es,en}: subtitle/created, profile, mode),
`getDemoProcessDetail(id)` (null si desconocido), `scaleDemoCandidateSummary(f)`
(summaries de los 5 juegos), `buildDemoCandidateArtifacts(processId, candidateId)`
(caché), `demoCandidateOverall(artifacts)` (media no-nulos, null-safe),
`FIT_BANDS` + `fitForScore(overall)` (overall null → null),
`buildRealProcessDetail(process, sessions)` (D6: stats + candidatos ordenados
por overall desc + alias), `findSession(sessions, id)`,
`buildRealReportModel(row, {processRole})` (artifacts-like + campos directos:
coverage/quality/status/integrity/games/caveats trad.), `CAVEAT_LABELS` (códigos
→ {es,en}), `REAL_STATUS` (ready/needs_review/in_progress → labels + tone,
mismo que HR_DASHBOARD_STATUS).

### Task 3: i18n V3 (`v3Copy.js`) (RED vía paridad)
~55 claves EN/ES espejo del diccionario de la referencia (script.js):
pd_subtitlePrefix/pd_created (con fecha por proceso → data), pd_activeDays
("{n} días activo"/"days active" con plural), pd_days/pd_since/pd_received/
pd_evaluated (ya existe)/pd_applicants/pd_pending/pd_configuration/
pd_configurationSubtitle/pd_editConfig/pd_role/pd_mode/pd_onsite/pd_profile/
pd_statistics/pd_statisticsSubtitle/pd_candidateStatus/pd_distribution/
pd_averageTime/pd_perCandidate/pd_recommended/pd_rankingSubtitle/pd_fit/
pd_excellent/pd_veryGood/pd_good/pd_fair/pd_allCandidates/pd_pause/pd_edit/
pd_actions/pd_more/pd_close/pd_back (ya pl_back)/pd_backProcess/pd_report/
pd_mockAction/pd_evaluatedStatus/pd_notFound/pd_notFoundText,
pa_title/pa_intro/pa_note/pa_age/pa_years/pa_experience/pa_ageDistribution/
pa_experienceDistribution/pa_present/pa_scarce/pa_attention/pa_reasoning/
pa_memory/pa_flexibility/pa_planning/pa_speed + claves de reporte embebido:
pr_overall/pr_demoBanner/pr_demoBannerText/pr_coverage/pr_sessionQuality/
pr_integrity/pr_verified/pr_blocked/pr_pending/pr_resultPending/pr_noGames/
pr_reportNotFound/pr_statusReady/pr_statusReview/pr_statusProgress (reusar lo
que exista: company_* de V0/V2). `pages.processDetail.title` /
`pages.processReport.title` se conservan (h1 report = pd_report = mismo texto
EN "Candidate report"; ES "Informe del candidato").

### Task 4: Tokens V3 (`krumm-tokens.css`)
Bloque "Fase v3 (V3)": --k-pd-seg-evaluated #ad825a, --k-pd-seg-pending
#e5d5c2, --k-pd-bar-track #f0e6d9, --k-pd-bar-fill #bd956c, --k-pd-time-bg
#f4eadc, --k-pd-clock-line #ddc6aa, --k-pd-clock-ink #936b47, --k-pd-row-top
#faf1e5, --k-pd-rank-bg #e9d5bb, --k-pd-rank-ink #725035, --k-pd-avatar-top
#e6ceb0, --k-pd-fit-excellent #795331 (AA sobre crema), --k-pd-menu-shadow
rgba(56,39,29,0.08). Resto mapea a tokens existentes (line, ink-*, co-*,
status-warn para warning de evidencia, gold para CTA primary).

### Task 5: `CompanyProcessDetailPage.jsx` (RED: spec §C–§F)
`{data, processId}`. Demo: perfil + heading (h1 cargo localizado, sub
"Proceso de selección · Creado el 20 de agosto de 2026", status line: pill
Active + "{n} días activo"), actions: button primary "Edit process" (icono
pencil) + details ⋯ (menú local: Edit/View all/Pause; click afuera y Escape
cierran, focus vuelve al trigger), 4 métricas (iconos ref: clock/users/check/
chart) con labels+notas, panel configuration (dl 4 col + profile span 3 +
"Edit configuration" → diálogo preview), panel statistics (3 stats: estado de
candidatos [num grande + segmented bar flex evaluated:pending + legend],
distribución [5 bars con track, % = count/max], tiempo [clock icon + "14 min"],
solo en demo), details "Advanced statistics" (pa-note + grid: edad, experiencia,
cognitivas presente/escasa — solo demo), panel recommended (tabla 6 rows:
rank, avatar initials + nombre, score % + mini-track, fit, status Evaluado,
acción "Ver informe ↗" → /empresa/proceso/:id/candidatos/:candidId), section
Process actions (3 text buttons → diálogo), footer. Real: header (alias de
rol, Active, días "—"), stats (cand/eval/avg; distribución/advanced/tiempo
ocultos), config (cargo + estado), candidatos = filas reales (alias + overall +
fit + status real + link reporte), acciones igual (preview). Id desconocido:
estado honesto (h1 de página + texto + back). Diálogo = V3Dialog (título
pd_edit/pd_allCandidates/pd_pause + texto pd_mockAction).

### Task 6: `CompanyProcessReportPage.jsx` (RED: spec §G–§K)
`{data, processId, sessionId}`. Demo: candidato (id) → artifacts (caché).
Real: fila (id) → buildRealReportModel. Layout: back "← Volver al proceso"
(→ /empresa/proceso/:id), heading (h1 "Informe del candidato" / "Candidate
report" + nombre o alias + contexto: cargo del proceso · fecha · estado),
banner demo (fixture synthetic: label + description) en demo;
**Resumen ejecutivo** (getPostulationExecutiveSummary: 4 cards — demo) / en
real: coverage + quality + status + integrity compacto; **Mapa de evidencia
KRUMM** (getWorkbookTalentFrameworkCards demo / constructs reales: 8 cards con
score, availability, confidence, narrative + details alcance/validación en demo)
+ warning "Scores provisionales no validados…" (ambos modos); **Resultados por
juego** (demo: getPostulationGameCards 5 juegos con metrics agregados; real:
row.games 4 cards); **Calidad e integridad** (demo: getPostulationQualityCards
6 cards; real: cobertura/calidad/estado/integridad); **Gobernanza y
observaciones** (caveats: getPostulationCaveats demo / CAVEAT_LABELS real;
aviso "No contiene video, frames, puntos reconstructivos ni rutas crudas").
Sesión/candidato desconocido: estado honesto (h1 página, texto, back; **sin
expedir el par raw** — test V0). Sin descargas (read-only embebido).

### Task 7: `V3RootApp.jsx` + `useCompanyData.js`
CompanyWorkspace: `needsData` += processDetail || processReport; dispatch a las
2 páginas nuevas (con route.params). useCompanyData: estado gana `sessions`
(filas en real; [] en demo/checking) — no cambia nada del contrato de V2
(processes/source intactos).

### Task 8: CSS (v3Shells.css, bloque V3)
Heading pd (status line, actions, more-menu), métricas (reusar v3-co-metrics),
panels (v3-co-panel existente), config dl, statistics (segmented, distribution
bars, time), advanced (pa-grid, pa-bars), tabla recomendados (pd-table, top
candidate, rank, score-track, fit), actions, reporte (hero, exec cards reusan
patrón, construct cards, game cards, quality grid reusa v3-*, warning,
governance). Focus/hover/disabled en todo interactivo; animaciones bajo
prefers-reduced-motion. Responsive: reglas V3 **dentro de los @media
existentes en orden descendente** (1150: config 2 col, stats 2 col, actions
column — plegado del 1100 de la ref; 760: config 1 col, stats 1 col, tabla
sticky th, report compact; 480: metrics 1 col ya existe). Sin hex (régimen).

### Task 9: Specs + ajustes V0/V2
- `V3CompanyProcess.test.jsx` (detalle: §A data ref, §B artifacts/engine,
  §C demo ES, §D EN, §E acciones/menú/diálogo, §F real + not-found).
- `V3CompanyReport.test.jsx` (reporte: §G demo ES (8 constructos, exec, games,
  quality, caveats, banner, back, score==tabla), §H EN, §I not-found (sin par
  raw), §J real (alias, constructs null→insufficient, caveat labels, games
  fila, integrity), §K integración V3RootApp: detail/report ya no placeholders).
- `V3Shells.test.jsx`: test "rutas empresa placeholder (V3–V4)" → ahora proceso
  real (back → /empresa/procesos); test "rutas dinámicas" → h1 'Informe del
  candidato' + not-found sin params (demo sin API).
- `V2CompanyReal.test.jsx`: "placeholder empresa (V3) con API: enabled=false"
  → ahora processDetail/processReport SÍ fetchen en real (actualizar
  expectativa: detail real renderiza sin placeholder).

### Task 10: Gates
```bash
NODE_ENV=test ./node_modules/.bin/vitest run src/v3 --pool=threads --reporter=default
NODE_ENV=test ./node_modules/.bin/vitest run --pool=threads --reporter=default
./node_modules/.bin/oxlint src/v3 src/postulation-demo src/assessment
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```
(npx bloqueado por security scan → binarios locales, desviación V1/V2.)

### Task 11: Smoke browser vivo (Playwright, build prod `vite preview` 4173)
`scripts/smoke-t_84f00355-v3-process-detail.mjs`:
- Estática ES: /empresa/proceso/supervisor, /operator, /technician +
  /empresa/proceso/supervisor/candidatos/<top> (desktop 1280×720); detail
  supervisor + reporte × móvil 390×844 (overflow).
- Estática EN: detail supervisor + reporte (desktop).
- Asertos: 0 console errors, 0 overflow (móvil), 1 h1, valores ref (métricas
  18/23/19/78% supervisor; 6 rows tabla; reporte: 8 construct cards, warning
  evidencias, banner demo, back links correctos).
- Interacciones (ES desktop): link "Ver informe" row 1 → reporte; back →
  detalle; back → procesos (3 cards); menú ⋯ abre (3 items) y Escape cierra;
  "Pausar proceso" → diálogo preview (título + texto mock); "Advanced
  statistics" expande; EN: toggle → titles EN.
- ~14 screenshots → `docs/qa/v3-process-detail/`.

### Task 12: Docs + commit + milestone sync
- Plan maestro §3 V3 → done + bloque "V3 done".
- design-system.md §10: bloque V3 (tokens + pares AA).
- Commit local `feat(t_84f00355): ...` (sin push — V5).
- Linear (KRU) + kanban + Discord (patrón V0/V1/V2; AGENTS.md protegido en
  headless → edición pendiente documentada).

## Decisiones
1. **D1 — Datos de detalle = referencia literal** (números, nombres, textos).
   Coherencia con V2 DEMO_PROCESSES verificada (23/19/78, 47/40/81,
   31/26/84; fechas creados = openedAt V2).
2. **D2 — Score de la tabla = engine (una sola fuente).** El KRUMM score de
   cada row = overall computado por el motor H4.3 (media de constructos
   no-nulos del talentFramework); el reporte embebido muestra el mismo valor.
   El literal de la ref (94/91/87/82/79/76) se usa como **ancla de escala**
   (f_i = ref_i/ref_1) para preservar el orden y el fit (Ex/Ex/VG/G/G/G).
   Desviación documentada: los valores mostrados (≈78–89) difieren de los
   literales ref, igual que V2 D1 con los KPIs (12/184/78/24 → 3/85/81%/24):
   coherencia interna > fidelidad literal cuando la ref es auto-incoherente.
   El KPI "recommended" del dashboard (5/12/7, V2 D2) sigue siendo un conteo
   de estado; la tabla muestra el ranking top-6 (como la ref: 6 rows aunque el
   conteo KPI diga otro — la ref misma tiene 24 vs 18 rows; la diferencia es
   visible solo comparando dashboard con detalle, igual que en la referencia).
3. **D3 — Reporte = artifacts del builder del flujo + funciones puras H4.3.**
   `buildPostulationDemoArtifacts` (no una copia del shape) → el data-model es
   el del flujo por construcción (feature vector v2, talentFramework v2,
   payload validation, caveats). Nuevo shell: la página empresa renderiza las
   secciones con clases v3-* (la card dice "mismo motor, nuevo shell").
4. **D4 — Acciones = preview (como la ref).** Edit/Pause/View all abren el
   diálogo "Next in the preview" (título por acción + pd_mockAction); UI +
   estado local, sin cambios de datos (la ref no tiene backend de procesos).
5. **D5 — Advanced statistics solo demo.** Agregados ficticios con el pa_note
   de la ref ("Fictional aggregate data… not selection criteria"); en real no
   hay esos datos en /sessions → secciones ocultas (no inventar).
6. **D6 — Real modo: mismo data-model con menos campos.** La fila /sessions
   (contract v1) no trae signalContext ni summaries por juego completos: el
   reporte real muestra 8 constructos (score/confidence/availability),
   caveats traducidos, 4 juegos (agregados contract), cobertura/calidad/
   estado e integridad (guard de privacidad sobre la fila). Días activos =
   "—" (/sessions no trae fecha de inicio del proceso).
7. **D7 — Id desconocido → estado honesto** (sin expedir el par raw; test V0
   "el param no se expone" se conserva).
8. **D8 — useCompanyData expone `sessions`.** Un solo fetch por mount (D4 V2)
   se mantiene; detail/report reciben las filas desde el workspace.
9. **D9 — "days active" del demo = literal ref** (18/13/9; consistente con
   creados 20/25/29 ago y "hoy" ~7 sep).
10. **D10 — Breakpoint 1100 de la ref plegado a 1150** de la cadena V2 (orden
    descendente estricto; regla design-system §10).

## Riesgos / no-scope
- **Costo de build de 18 artifacts demo en jsdom**: cache en módulo + build
  perezoso (solo el candidato abierto + overalls de la tabla). Calibrar en
  Task 1 (objetivo: 6 builds < ~2 s; si es más lento, el overall de la tabla
  se calcula con `buildOriginalGameTalentFramework` directo sobre el feature
  vector — mismo data-model, sin reports/bundle).
- Reporte en candidate shell (flujo /postulaciones) NO se toca: V3 solo agrega
  la vista embebida empresa (el flujo sigue siendo el dueño del reporte).
- API de procesos real (staging) = follow-up fuera de fase (plan maestro §2).
- Sin descargas en el reporte embebido (read-only; la descarga vive en el
  flujo candidato, que no se modifica).
- V5 deprecará hr-dashboard v1; V3 NO importa de ese árbol (precedente V2 D9):
  los labels de estado/caveats se duplican mínimos en companyProcessDetail.js.

## Estado (ejecutado 2026-09-08, t_84f00355)
**DONE.** Gates: suite completa **919/919 (131 archivos; +49 vs V2**: 29
V3CompanyProcess + 19 V3CompanyReport + 1 V2CompanyReal nuevo — y 2 ajustes de
expectativa V0/V2), build OK (3.5s, warning chunk preexistente), oxlint 0
errores en diff (1 warning preexistente en ParticipantAssessmentFlow, fuera de
diff), npm audit 0 vulns high, git diff --check limpio. **Smoke sobre build
prod (vite preview 4173): ok=true, 0 fallos, 0 console errors** — 14
screenshots `docs/qa/v3-process-detail/` (ES desktop ×4: 3 detalles + reporte;
ES móvil ×4; EN vivo detail+report; 5 interacciones: link row1→reporte, back→
detalle, back→procesos, diálogo pause, advanced expand) + 3 vision checks
(desktop detail, desktop report, móvil detail — 0 defectos).

### Desviaciones del plan
1. **Calibración (Task 1) confirmó la líneaal predictiva**: overalls
   89/87/85/82/80/78 (f = ref/94) → FIT_BANDS {86/84/78} fijadas en el plan
   antes de implementar (spread real, no supuesto).
2. **Label del fixture en calidad**: `artifacts.fixture.synthetic=true` → el
   motor usa los labels "simulado" del fixture ('Cámara del fixture', 'Muestras
   simuladas', etc.) — mismo comportamiento que el reporte `?fixture=1` del
   flujo (QA aprobado H4.3); el test G los aserta así.
3. **Bug de overflow móvil detectado en smoke**: el span `.v3-pd-sr-only`
   (position:absolute, dentro de la celda de score) no tenía ancestro
   posicionado → su containing block era el DOCUMENT: su posición estática
   (x≈689 en la tabla de 780px) inflaba `documentElement.scrollWidth` a 690
   (390 viewport). Fix: `position: relative` en `.v3-pd-table-scroll`
   (contenido queda acotado al scroll container). Documentado en design-system
   §10 (bloque V3).
4. **vi.mock del config en V2CompanyReal**: el mock de V2 reemplazaba el módulo
   completo (solo KRUMM_API_BASE); V3 importa el builder del flujo (que usa el
   resto de exports en module scope) → mock con `importOriginal` + override
   (los tests V2 conservan su semántica).
5. **Real detail: filtrado por grupo** — `sessionsForProcess(sessions, id)`
   (slugifyProcessId(role) === id): el detalle real solo lista las sesiones del
   grupo (V2 agrupa en processes; el detalle necesitaba las filas miembro).
6. **Test E menú**: `getAllByRole('menuitem')` THROWS con 0 elementos → las
   aserciones de "cerrado" usan `queryAllByRole` (hallazgo de debugging, no un
   bug del producto).
7. **npx bloqueado** por security scan (timeout threat-intel) → binarios
   locales (mismo que V1/V2, desviación 4 de esos planes).

### Hallazgos
- **AGENTS.md no actualizado** (archivo protegido, approval timeout headless —
  mismo patrón V0/V1/V2). Edición pendiente de consentimiento: línea Pendientes
  → '**fase v3 de vistas: V0+V1+V2+V3 done** (t_1c27edbf, t_482f57b2,
  t_90a5157c, t_84f00355) — pendiente V4–V5: new request, cutover+deploy'.
- Los 2 constructos R-6 descriptivos (decisionMaking, adaptability) se
  preservan en el reporte embebido (score null + 'Lectura descriptiva') —
  coherencia con el contrato científico sin tocar el motor.
- El KPI 'recommended' del dashboard (5/12/7, V2 D2) y las 6 rows del ranking
  coexisten como en la referencia (que también tiene 24 vs 18 rows) — plan D2.
- Modo real no testeable en vivo (sin .env / VITE_KRUMM_API_BASE) → cubierto
  por tests con fetch stub (V3CompanyReport §J/§K + V3CompanyProcess §F2 +
  V2CompanyReal actualizado); smoke solo modo demo (precedente V1/V2).

### Evidencia
- Tests: `src/v3/V3CompanyProcess.test.jsx` (29), `src/v3/V3CompanyReport.test.jsx`
  (19), `V2CompanyReal.test.jsx` (+1), `V3Shells.test.jsx` (2 actualizaciones),
  `V2Company.test.jsx` (1 actualización).
- Smoke: `scripts/smoke-t_84f00355-v3-process-detail.mjs` + 14 PNG en
  `docs/qa/v3-process-detail/` (3 vision checks: desktop detail, desktop
  report, móvil detail — 0 defectos).
- Calibración motor: scratch /tmp/calibrate_v3.mjs (node real, 6 builds = 180ms;
  overalls 89/87/85/82/80/78; no entra al repo).

---

## Sign-off / handoff (worker t_84f00355, 2026-09-08)

- **Estado:** card `t_84f00355` → **done** (completada 2026-09-08, worker
  default, modelo qwen — GPU vía túnel 18000).
- **Commit (push 2026-09-08):** `58916e5`
  `feat(t_84f00355): V3 fase v3 — /empresa/proceso/:id ...` + este docs commit.
  HEAD == upstream; tree limpio (sin WIP ajeno).
- **Verificación:** suite 919/919 (131 files, +49 tests), build OK, oxlint 0
  errores en diff (1 warning preexistente fuera de diff), npm audit 0 high,
  git diff --check limpio; smoke sobre build prod (vite preview): 14
  screenshots + 5 interacciones + 3 vision checks (0 fallos/0 console errors).
- **Bug detectado y corregido en smoke:** overflow móvil 690>390 en el detalle
  — `.v3-pd-sr-only` (position:absolute) sin ancestro posicionado → su
  containing block era el document → `position: relative` en
  `.v3-pd-table-scroll` (documentado en design-system §10 bloque V3).
- **Deuda pendiente:** AGENTS.md "fase v3 de vistas" → marcar V0+V1+V2+V3
  done, pendiente V4–V5 (archivo protegido en headless → requiere
  consentimiento; queda bitácora en kanban/Discord si no se aplica).
- **Siguiente (secuencia):** `V4` (Empresa — new request:
  `/empresa/nueva-solicitud` + `/diseño` + `/subida`) está **ready** para
  despacho. Luego V5 (cutover + deploy + audit h46c).
- **Linear:** KRU-90 (epic fase-v3 port) queda **In Progress** — V3 es un
  sub-entregable del port; se comenta el avance, no se cierra hasta V5/Done.
