# KRUMM Edge / test-mpfl — instrucciones para agentes

## Alcance y estado

- Repo runtime y fuente de verdad: `/home/sarlock/krumm/test-mpfl`.
- Repo visual/original de referencia (solo cuando se solicite portabilidad): `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test` (PC Windows, sync manual).
- Ruta producto: `/postulaciones` (cutover V5: `/reclutador`→`/empresa`, `/postulaciones` sin invite/fixture→`/candidato`).
- Batería predeterminada/fallback: `stable_dg`.
- Batería interna controlada: `?battery=original`.
- **Acceso dev (local)** — `vite dev` sin `VITE_KRUMM_API_BASE`: sin endpoint configurado, el validador local (`localValidateInvitationToken`) acepta cualquier token bien formado — p. ej. `?invite=tok-dev-dev1234` entra a setup → gameplay en modo demo determinista. Añade `&battery=original` para la batería de 7 juegos (incluye BOMB y Sala de Control). **Solo en local**: en stage y prod (modo real, con `VITE_KRUMM_API_BASE`) el token se valida contra el backend y uno inválido muestra "invitación no válida".
- **Fixtures (reporte QA sin jugar):** `?fixture=1` (stable_dg, 5 juegos) y `?fixture=1&battery=original` (original, 7 juegos). Sirven para validar el reporte final con datos sintéticos, no para recorrer los juegos.
- R-0 a R-6 completados técnicamente (R-6d: cobertura completa de demo, 8 constructos con señal provisional, reporte sin `No medido`). Exp 6 (Tangram) done; Exp 7 = BOMB (en ejecución, ver más abajo); Exp 8 = Sala de Control (EXP-COMM-001; C1–C6 completas 2026-09-11, ver estado abajo). **Estado 2026-09-07:** UX H1–H4.6 completados (audit por vista, `SignalErrorHint` en lugar de "¿qué pasa detrás?", toggle ES/EN en 6 vistas, design system unificado sobre tokens `--k-*`), **port de marca v2 de la landing pública** (referencia oficial `krumm_frontend.zip` → `~/krumm/design_ref/`: paleta beige/crema/arena/marrón/dorado, Archivo + Manrope, hero con foto) y **H4.6b: audit visual post-marca de flujo candidato + /reclutador** (recorrido vivo de 5 juegos; `docs/qa/h46b-visual-audit/`) — ver `docs/design/design-system.md` §10. Todo desplegado en AWS CloudFront **incluido el fix CSP RHP m3** (Google Fonts; la m2 bloqueaba las fuentes de marca → `infra/m1-frontend-stack.yaml` + handoff `docs/plans/2026-09-07-handoff-h46b-audit-marca-v2.md`). **Fase v3 COMPLETA (V0–V5, 2026-09-08):** port completo de `krumm_frontend.zip` (portal, candidato, empresa/HR, procesos, detalle+reporte, nueva-solicitud/diseño/subida) + **cutover en prod** (`/reclutador`→`/empresa`, `/postulaciones` sin invite→`/candidato`; hr-dashboard v1 + PostulationLanding interna eliminadas) + audit h46c (42 vistas, 0 fallos) + verificación prod 17/17 — `docs/plans/2026-09-08-handoff-v5-cutover.md`. **EXP-7 BOMB COMPLETA (cadena B1–B6, 2026-09-08):** B1 done (motor sin UI: `src/tasks/original-games/bomb/` — manifest bomb-v1.1, state machine, validator, timer; 72 tests; handoff `docs/plans/2026-09-08-handoff-b1-bomb-motor.md`); B2 done (panel+HUD+a11y+SFX, 98 tests, AA 10/10, commit 5403cf3; `2026-09-08-handoff-b2-bomb-panel-hud.md`); B3 done (niveles 1-4 + fases, 131 tests, AA 17/17, commit adf42c1); B4 done (tutorial T1-T5 + welcome, 165 tests, AA 27/27, commit 6ea4148); B5 done (telemetría+métricas+batería 6 juegos+práctica G.2, blueprint `bomb_defusal` + fixture, commit 4e65c75); **B6 done** (9° constructo `proceduralWorkingMemory` experimental + feature vector **2.2.0** 12 features `bomb.*` + reporte + audit visual + doc módulo `docs/design/modulos/bomb_defusal.md`; commit 9565bae; handoff `2026-09-08-handoff-b6-bomb-reporte.md`). **Suite 1173/1173** (137 archivos). **Decisión stable_dg:** se queda en **5 juegos (~14–16 min)** hasta pilotaje; BOMB solo en batería controlada `?battery=original` (6 juegos, ~18–23 min) — plan `docs/plans/2026-09-07-plan-exp7-bomb.md`, spec `docs/spec/EXP-BOMB-001/`, §17 fases A–G. **Deploy:** cierre de cadena en `main` NO implica deploy a prod (por instrucción explícita). **Copy EN (KRU-84/85) CERRADO (2026-09-10):** HR/empresa bilingüe por diseño en fase v3 (V2/V3) + brief de entrevista bilingüe (KRU-50 B3, `src/v3/companyBrief.js`, `hrDashboardData.js` eliminado en cutover V5); juegos `stable_dg` con EN — 4 tareas + config en `4eb90ef` (t_42978412) + fix practice `SimpleRTTask` t(es,en) 2026-09-10 (práctica simple_rt quedó ES-only en el cierre previo). Pendientes: T.3b (t_c1892485, sensibilidades MoveNet/FaceMesh — requiere webcam, no en Pi), obs. F5 tangram (spawn de pieza), Fase A validación de contenido §17 (input psicometría), sign-off visual del usuario sobre prod v3. Kicker terracota RESUELTO a AA (#704f39, §10).
- **Estado 2026-09-10 (KRU-50/51):** **KRU-51 (Seguridad/Privacidad/CI) DONE** — pipeline CI/CD GitHub Actions operativo y verde (CI: tests+oxlint+build+audit+gitleaks; CD: build → OIDC role `krumm-gh-actions-deploy` (solo `main`, mín. privilegio) → S3+CloudFront → smoke Playwright prod; primer deploy 100% automático verificado, sin keys estáticas — runs 34433388943 / 34437880887); SECURITY.md con CSP real de prod + evidencia CI/CD; `docs/security/privacy-data-flow.md` (inventario de datos R-6). **KRU-50 (Recruiter Dashboard v1 Real) DONE (B3 frontend)** — brief de entrevista por candidato (`src/v3/companyBrief.js`, descriptivo R-6: `score null` = sin señal, nunca 0; watermark `humanReviewOnly` en exports), filtros modo real Periodo (7d/30d) + Estado (derivado) en `/empresa/procesos` (ocultos en demo), export client-side `.csv` del proceso (BOM UTF-8) + `.md` por candidato en el detalle; suite **1207/1207 (138 files)** + oxlint 0 + smoke Playwright modo real contra mock API contract v1 (0 fallos, 0 console errors, descargas verificadas, sin overflow desktop/móvil — `docs/qa/kru50-b3-brief/`); commit `c8f4c36`. Backend `/staging/sessions` LIVE (11 sesiones reales); follow-up fuera de scope (§2 plan 09-08): `VITE_KRUMM_API_BASE` en el build prod para activar modo real en krumm.cl (decisión de producto; CSP ya permite el origen; fallback demo cubre 404). **Pendiente solo-usuario:** invalidar la key Lambda leakada en history git (dashboard AWS; repo público, allowlist documentada en `.gitleaks.toml`).
- **Estado 2026-09-10 (Landing fixes — 5 tareas cerradas en un changeset):** (1) **Contraste botón 'Iniciar sesión' 1.08→6.87** — causa raíz: `--k-dark`/`--k-text-primary` *undefined* en `landing.css` → el `var()` caía a `initial` y el color heredaba crema `--k-nav-ink` (#d3bdab) del `.landing__nav a` sobre fondo oro (#d8b38c) = ilegible; fix: `.landing__nav .landing__nav-login--cta { color: var(--k-btn-gold-ink) }` (especificidad 0,2,0 gana al 0,1,1) + borrar los 2 tokens muertos. (2) **Dev card eliminada** de la landing pública (exponía `?invite=tok-dev-dev1234` a cualquier visitante); el acceso dev sigue disponible solo vía URL interna (documentado arriba). (3) **Móvil (390px): gutters normalizados a 24px** en topbar/hero/secciones/footer (design-system §5: 20-24px) — antes las secciones iban a 84px (`--k-gutter` 64 + sección 20) y el hero/topbar a 20 (desalineados); el heading contacto/cierre iba 84/26 (asimétrico) → ahora 5/5 secciones 24/24. H1 ES 49.3→45.5px (`12.8cqw→12cqw` ≤800) con margen derecho 53px (antes tocaba el borde). Sin overflow horizontal. (4) **Iconos unicode ☰ ▶ ✓ → SVG inline** (renderizaban caja .notdef/tofu en headless; verificado en real pendiente). (5) **Favicon** smiley azul antiguo → cabeza-árbol de marca (SVG solid, 4 iteraciones con audit vision: lee como cabeza ≥32px) + `theme-color #38271d` en index.html. **Evidencia:** `LandingPage.test` 18/18 + oxlint 0 + vite build OK + Playwright smoke 1280×720 y 390×844 todo verde (`scripts/smoke-landing-fixes-2026-09-10.mjs`; screenshots `/tmp/krumm-landing-smoke/`). **Desplegado en prod** vía CD (push a `main`, commit `fa4e0b0`): login/dev-card/iconos/theme-color verificados en vivo krumm.cl. **BUG DEPLOY detectado y corregido (2026-09-10, commit `807446f`):** el favicon (asset no-hasheado de `public/`) seguía sirviendo el smiley viejo en el edge de CloudFront pese al deploy — `deploy-frontend.sh` subía todo con `max-age=31536000,immutable` pero solo invalidaba `/index.html` `/`, así que los ... [truncated]
- **Estado 2026-09-11 (2/2 landing fixes cerrados):** (1) **AA tokens (t_3b20610a → Linear KRU-99):** proof-row `--k-proof-ink` sobre hero oscuro = 6.65:1 ✓; kicker `--dark` pasó a `--k-accent-sand` (7.28:1 sobre `--k-bg-dark`, el brand `#9a7355` era 3.4:1 FAIL) ✓; card paragraph `--k-ink-medium` sobre sand/cream = 4.75/6.02/6.39:1 ✓; `--k-btn-gold-ink` en CTA gold = 8.7:1 ✓. Regla tokens abre todos los huesos de la cascada (sin hardcode). (2) **Favicon 16px non-retina (t_5acd452b → Linear KRU-100):** SVG con `data-retina="true"` + máscara simplificada (cráneo 34u / cuello 18u) — silueta legible a 16px ✓. Ambos commits: `71fca73` (fix) + `3514372` (docs). **Pendiente único en este epic:** key Lambda leakada en history git (invalidar en dashboard de Lambda).
- **Estado 2026-09-11 (KRU-94..98 entornos — avance):** Secuencia aprobada por el usuario ("continúa KRU-94 en adelante"). **KRU-94 (stage) DONE:** bucket `krumm-stage-frontend-931932531447` con contenido (auto-deploy 02:20 CL), dist `E2OPPVGDO8R75S` Deployed + alias `stage.krumm.cl`, cert ACM wildcard `*.krumm.cl` (d201648d) ISSUED, build con `VITE_KRUMM_API_BASE` staging (modo real; CSP m3 ya permite el origen). **CNAME Cloudflare agregado (usuario) y verificado:** `https://stage.krumm.cl` HTTP 200 + TLS estricto OK desde la Pi (la zona krumm.cl NO está en Route53 — Cloudflare). **KRU-95 (CD bifurcado) DONE y verificado:** `cd.yml` main→stage auto / tag v*+dispatch→prod (gate humano, build modo demo + smoke Playwright) — fix artifact build→deploy (run 34565085586 "No existe dist") → **run 34565498444 SUCCESS**: stage actualizado (02:20 CL) y krumm.cl intacto (`DVbRsXY9`); policy OIDC v5 + trust con `ref:refs/tags/v*` + `pull_request`. **KRU-96 (PR preview) workflow desplegado:** `preview.yml` buckets efímeros `krumm-dev-frontend-pr-<N>` (S3 website index+error-doc, policy pública solo `s3:GetObject`, BPA con ACLs bloqueadas, URL s3 directo — el endpoint website se resetea TLS desde la egress Pi, documentado en runbook); PR #1 de test merged (`22da7bf`): pipeline validado e2e (deploy → URL HTTP 200 modo real → merge → cleanup bucket 404). **KRU-97 (backend /prod) DONE — opción (b) (decisión usuario):** `/prod` = segundo stage de la misma HTTP API (mismo Lambda `krumm-staging-sessions`, mismas tablas `krumm-staging-*`, mismo dataset; sin migración) + flag `env: 'prod'` en sesiones nuevas vía `requestContext.stage` (tests backend 27/27); verificado `GET /prod/sessions` = mismas 11 candidatas que `/staging`; stack SAM actualizado. Pitfall: CFN no soporta `AutoDeploy` en `ApiGatewayV2::Deployment` → stage prod es snapshot (re-deploy manual si cambian rutas — runbook §7). Build de `cd.yml` prod inyecta `VITE_KRUMM_API_BASE=…/prod` (commit `008b451`) → el próximo tag/deploy activa modo real en krumm.cl (gate humano). **KRU-98 (runbook) DONE:** `docs/ops/environments.md` (matriz dominio↔bucket↔dist↔API↔gate, DNS Cloudflare, ACM, RHP m3, OIDC v5, procedimientos deploy/preview/barrido huérfanos, pitfalls CFN m1 + bucket "staging"→prod). Commits en main: `d733d21` `35944ad` `21d8ce2` `07d4fcd` `9e97daa` `22da7bf` (merge PR #1) `b0a706a` `153499b` `008b451`. **Pendiente solo-usuario:** activar modo real en krumm.cl (tag `v*` o workflow_dispatch — gate humano, build ya listo) + invalidar key Lambda leakada (histórico).
- **Estado 2026-09-11 (landing topbar + micro-transiciones):** (1) "Iniciar sesión" movido al slot donde estaba el CTA "Solicitar demo" (`.landing__header-actions`; "Solicitar demo" queda solo en cierre HABLEMOS; a ≤1150px header-actions sigue visible en el topbar móvil). (2) Transiciones suaves/modernas: dropdown móvil con fade+slide (opacity/visibility/transform, `cubic-bezier(0.22,1,0.36,1)`, sin display:none abrupto), hamburguesa→X animado (3 paths con clases `--1/--2/--3`, back-out `cubic-bezier(0.34,1.56,0.64,1)`), underline dorado `scaleX(0→1)` en links de nav (hover/focus-visible), press `:active` en CTAs (scale 0.98, 0.08s) y login pill (scale 0.97), `scroll-behavior: smooth` scoped a la ruta (useEffect mount/unmount en `LandingPage`) + `scroll-margin-top` en secciones (190px desktop / 160px ≤800px) para que las anclas no queden bajo la topbar overlay, y bloque `prefers-reduced-motion: reduce`. **Evidencia:** suite landing **29/29** (3 tests nuevos: paths animables, estructura de transiciones CSS, smooth scroll scoped), oxlint 0, build OK (6.5 s), smoke Playwright `scripts/smoke-landing-login-slot-2026-09-11.mjs` 8/8 (contraste login 6.87:1 AA) + `scripts/smoke-landing-transitions-2026-09-11.mjs` 11/11 (underline matrix 0→1 en hover, press matrix 0.98 y regreso, scrollY 4066 + sección #contacto a 190px de top, fade mid 0.63→0.97→1.0, morph X verificado, sin overflow desktop/móvil, 0 console errors). **Desplegado a stage.krumm.cl vía CD** (push a main); krumm.cl (prod) sin cambios hasta tag `v*`.
- **Estado 2026-09-11 (landing v2 — feedback post-review del usuario):** (1) **Anclas sin offset**: quitado `scroll-margin-top` (190/160px) de `.landing__section` — la topbar es `position:absolute` (no fixed) y se va con el scroll, así que el offset dejaba la sección "a mitad de pantalla" (feedback: "la transición queda corta"); ahora el ancla asienta el borde superior de la sección al top del viewport y el padding propio de la sección (120px) da la respiración (verificado en smoke: #contacto sectionTop=0px). (2) **Login como CTA gold completo** (estaba "muy simple"): clases `landing__cta landing__cta--gold landing__cta--sm` + marcador `landing__nav-login` + flecha SVG `landing__nav-login-arrow` (nudge 3px en hover; oculta ≤800px). Móvil: CTA compacto (min-height 42px, 13px, padding 0 14px), brand logo 104px, gap topbar 8px → la fila brand+CTA+idioma+hamburguesa quepa en 390px sin overflow. **Evidencia:** suite landing 29/29, oxlint 0, build OK (5.4 s), smoke login 8/8 (contraste 4.64:1 parada oscura / 8.75:1 parada clara, ambas AA) + smoke transiciones 11/11, verificación vision de topbar (CTA con gradiente/sombra/flecha, jerarquía correcta) y sección asienta. **Deploy: stage (push main) + PROD vía tag `v1.0.1`** (CD tag = build modo real `VITE_KRUMM_API_BASE=…/prod` + smoke Playwright post-deploy; prod ya estaba en modo real desde `v1.0.0` 18:39).
- **Estado 2026-09-11 (EXP-8 Sala de Control — cadena C1–C6 COMPLETA, KRU-102..107):** 7° juego de la batería `original` (EXP-COMM-001, comunicación aplicada en coordinación; spec versionada en `docs/spec/EXP-COMM-001/`). **C1 motor** (manifest `control-room-v1.1`: 14 escenarios = 6 bloques × 2 formas paralelas A/B + 2 práctica; timeout 45 s solo B6; máquina de estados §7; validador semántico §8; timer inyectable; QA §16.1 casos 1/2/5/6/8) — 30 tests. **C2 UI** (3 tiers, compositor de bloques, a11y §18 targets ≥44 px + reduced-motion, SFX opcional, dev-stage `/dev/control-room`) — smoke navegador 21/21 (1280×720 + 390×844, sin scroll horizontal; `docs/qa/kru103-c2-ui-smoke.md`). **C3 contenido** (tutorial T1–T5 + bienvenida + salida + intros de bloque + orquestación welcome→tutorial→evaluación→final) — smoke sesión 24/24 (`docs/qa/kru104-c3-session-smoke.md`). **C4 telemetría** (payload `control_room_session_v1`: 18 eventos §11, 11 métricas §12.1, 7 dimensiones §12.2, **sin score global**, privacidad + gobernanza). **C5 batería** (blueprint `control_room` controlled_active + GameStage + "Game X of 7" dinámico + **FeatureVector 2.3.0**: 7 `comm.*` aditivas tras las 53 existentes sin reordenar = 60 keys + observedMask; fixtures con payload GENUINO del motor headless; instruction check `summarizeControlRoom`). **C6 reporte** (**10° constructo `appliedCommunication`** descriptive_only, score null, 7 sub-dimensiones, sin baremos + `controlRoomFeedback.js` aggregate-only por sub-dimensión + copy "10 constructos" + doc módulo `docs/design/modulos/control_room.md` + handoff `docs/plans/2026-09-11-handoff-exp8-c6.md`). **Evidencia:** 303/303 tests (postulation-demo + assessment + control-room), build OK, oxlint 0. Commits: `ac909c6`/`f5c3578` (C1), `469691c` (C2), `990492f`/`34657f2` (C3), `17caeb0` (C4), `d70c5b1` (C5), `74f56b8` (C6). **C7 (KRU-108) = epic biométrico separado, POST-PILOTAJE** (parents C6 + T.3b; off por defecto). Decisión: stable_dg inmutable (5 juegos); `original` = 7 juegos solo vía `?battery=original` (controlled_active).
- **Estado 2026-09-10 (Fixes finales landing + entornos + kanban):** (1) **CTA gold hero/topbar** (fix `46cc279`): `.landing a {color:inherit}` pisaba `.landing__cta--gold` → crema sobre oro 1.35:1 → selector doble `.landing__cta.landing__cta--gold` (0,2,0) + `--k-btn-gold-ink` = **8.7:1** verificado en prod (krumm.cl). (2) **Skip link** (fix `5a5b9b3`): misma clase de bug de cascada — al hacer Tab el link aparecía espresso sobre dark-deep (~1.5:1) → `.landing a.landing__skip` (0,2,1) con crema = **~12:1** verificado en prod. Tests regresión (4 nuevos en `LandingPage.test.jsx`): asertan declaración ganadora `var(--k-btn-gold-ink)` / `var(--k-text-cream)` (jsdom resuelve `inherit` pero no `var()`). Suite 22/22 + oxlint 0. (3) **Evaluación entornos dev/test/stage** (`docs/plans/2026-09-10-eval-entornos-dev-test-stage.md`): main→stage auto (datos reales), prod→tag/dispatch, PR→preview, dev→local. Linear: **KRU-93 parent + KRU-94..98** (Backlog, Carlos). Kanban: 5 cards bloqueadas `t_304afb61` `t_12836f19` `t_eed33a92` `t_f0df7711` `t_5426613c` (requieren SSO + approval de secuencia). (4) **Review landing prod (barrido píxel-real 60 items)**: 2 bugs cascada fijados y verificados (CTA gold 1.35→8.7:1, skip link 1.5→~12:1). Quedan 2 cards kanban: `t_5acd452b` (favicon 16px, low priority) + `t_3b20610a` (AA tokens marca: proof-row 3.73:1, kickers terracota 2.46/3.5:1, párrafo card 4.23:1 — decisión de marca pendiente). **Pendiente solo-usuario:** invalidar key Lambda leakada en history git (dashboard AWS).

- **Estado 2026-09-12 (FASE PRE-BETA — plan v2.0 + A.3 cerrado + Linear/kanban sincronizado):** **Plan maestro pre-beta v2.0** (`docs/plans/2026-09-12-next-phase-comprehensive-plan.md`): fases A (funcionalidad), B (12 juegos pre-lanzamiento, auditoría 8 dims), E (legal+soporte+beta), F (analytics+finops), G (hardening+), H (inversión). **Decisiones fijadas por el usuario 2026-09-12:** (1) fases E/F/G/H incluidas en plan; (2) beta = 2 empresas externas; (3) multi-tenancy real AHORA (G.5, `companyId` en sesión); (4) analytics = PostHog (privacy-safe: autocapture OFF en /postulaciones/*, opt-in cookie, NUNCA telemetría biométrica); (5) legal = template redactado + revisión abogada 1-2h; (6) PWA post-beta. **FASE A.3 (job board) DONE** (worker GPU t_7aad621f + cierre de la sesión): `JobsPage` + `JobDetailPage` + `jobsData.js` (4 ofertas demo ES/EN, esquema {es,en}), ruta `/empleos/:slug` (13 total), CTA postular placeholder honesto, empty state 404; fixes de cierre: test negativo profundo roto por la nueva ruta (`/empleos/a/b` → null) + oxlint 0 (imports sin usar). **Evidencia:** 13/13 JobsBoard + 74/74 suite v3 + build OK + CI/CD verde (run 34702392577/34702392581) → **deployado en stage.krumm.cl** (main auto). Commit `cd30461`. **Linear:** epic PRE-BETA **KRU-110** (canónico) con children **KRU-112..121**; epics duplicados KRU-109/111 → Canceled; KRU-114 (A.3) → Done. **Alcance real A.1 (KRU-112):** M3 backend YA DEPLOYADO 2026-09-06 (B1; E2E 7/7 /staging; /prod KRU-97) — faltante efectivo: SES production access + envío email real, Cognito pool recruiters + JWT authorizer en POST /invitations (hoy público), authorizer en GET /staging|prod/sessions (gap seguridad pre-beta), UI creación invitaciones en /empresa/nueva-solicitud (hoy placeholder). **A.4 (KRU-115):** krumm.cl YA en modo real desde v1.0.0 (2026-09-11 18:39) + KRU-50 done — faltante: smoke Playwright prod (evidencia docs/qa/). **Docs creados:** legal (T&C, privacidad, template piloto B2B), soporte (FAQ candidatos/empresas), beta-protocol, investor (pitch deck, data room, roadmap 18m), security (error-tracking design). **Código:** `FeedbackWidget` (src/v3/) integrado en Landing/Candidate/Company shells + docs/api/feedback-endpoint.md (commit `341e9f6`). **Hallazgo G.1:** chunk principal 1137 kB min (318 kB gzip) > budget 500 kB propuesto — code-splitting pendiente. **P0 bloqueante (KRU-121, t_b8f096bb):** `aws sso login --sso-session aws_sso --use-device-code` (usuario; token expirado) → invalidar key Lambda leakada + SES production access (24-48h).

## Skills obligatorias según tarea

Cargar antes de trabajar:

- `krumm-talent-assessment-development`: siempre para producto, juegos, telemetría, payload o reporte KRUMM.
- `software-delivery-workflows`: cualquier implementación, revisión o corrección.
- `writing-plans`: cambios de varias etapas.
- `react-responsive-game-layouts`: UI, juegos, reportes o smoke responsive.
- `academic-writing`: estudio técnico, referencias o afirmaciones científicas.
- `document-productivity-workflows`: XLSX/PDF/Office.
- `hermes-agent`: solo al configurar o depurar Hermes, skills o toolsets.

Toolsets necesarios para sesiones completas: `terminal,file,code_execution,skills,memory,session_search,delegation,todo,browser,web,vision`. Los cambios de toolsets de Hermes requieren una sesión nueva (`/reset`).

## Inicio de sesión

1. Usar `session_search` si se pide continuar un handoff.
2. Leer, en este orden:
   - `docs/plans/postulation-demo-original-games-new-agent-handoff.md`
   - `docs/plans/postulation-demo-original-games-integration-plan.md`
   - `docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md`
   - `docs/demo/postulation-demo-qa-smoke-template.md`
3. Consultar el estado real con Git antes de editar y preservar cambios ajenos.
4. No tocar `.env`, credenciales ni secretos.
5. No hacer commit, push, reset, rebase ni PR salvo instrucción explícita.

## Método de trabajo

- Español, hands-on y con evidencia real.
- Plan → lectura/trazado de símbolos → tests RED → implementación mínima → GREEN → refactor acotado → gates → browser smoke si cambia una superficie visible.
- Usar `read_file`/`search_files` para inspección; `patch` V4A para archivos existentes y `write_file` para nuevos.
- No inventar archivos, APIs, imports, resultados, referencias ni salidas.
- Mantener documentación, plan maestro y handoff sincronizados con cada fase.
- Verificar afirmaciones científicas contra título, autores, año, DOI/URL y abstract o texto primario. Clasificar evidencia como directa, adyacente, ambigua/no resuelta o interna.

## Design system — reglas de UI (H5, v2 marca 2026-09-07)

- Fuente de verdad UI: `docs/design/design-system.md` + tokens `--k-*` en `src/styles/krumm-tokens.css` (import global en `main.jsx`). **Marca v2 oficial**: la referencia de marca es `krumm_frontend.zip` (archivada en `~/krumm/design_ref/Landing pge Krumm/`) — paleta beige `#f2e8dc` / crema `#f7efe6` / arena `#e4cdb5` / marrón `#3d2b20` / dorado `#d8b38c` (`#b9906b` dark) / card `#38271d`; tipografía **Archivo** (display, 900) + **Manrope** (body) vía Google Fonts en `index.html`. Ver `design-system.md` §10.
- Antes de UI nueva o rebuild de vista: leer design-system.md + tokens y usar `--k-*`; **sin hex ni medidas hardcodeadas en vistas** (regimen verificado por test en `src/landing/LandingPage.test.jsx`). Los valores de marca v2 son los del §10.
- Estados obligatorios en todo interactivo: `:hover`, `:focus-visible`, `:disabled` (con `:hover:not(:disabled)`); animaciones solo bajo `prefers-reduced-motion: no-preference`.
- Breakpoints canónicos: ≥900px desktop (splits 2 columnas), <900px 1 columna, <560px móvil compacto; landing marca v2 usa ≤1150px (nav→hamburger) y ≤800px (móvil). Smoke en 1280×720 y 390×844 sin overflow horizontal.
- Todo texto nuevo pasa por `t(es, en)`. Contraste WCAG AA en pares texto/fondo (nota: el kicker terracota `#9a7355` ~3.2:1 sobre crema es el valor oficial de marca — AA estricto pendiente de decisión del usuario, ver design-system.md §10).
- Assets de marca: `public/assets/` (logo borderless, foto hero). La landing pública (`/`) es `src/landing/LandingPage.jsx` + `landing.css`.

## Privacidad y gobernanza no negociables

Nunca persistir/exportar video, frames, imágenes, screenshots, landmarks, keypoints, muestras faciales crudas, blendshapes crudos, ventanas crudas, rutas/celdas reconstructivas, pointer samples, DOM events, eventos/logs crudos de juego o secuencias acción por acción.

Mantener:

- `game_event_v1` y eventos `stimulus_shown` / `response` / `game_end`.
- `gameCorrelation.aggregate`.
- `assessment_feature_vector_v2` sin cambios incompatibles.
- agregados por juego allowlist-only.
- `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe`.
- cámara/biometría como contexto/calidad, nunca como inferencia directa de talento, personalidad, emoción, estrés, fatiga, sinceridad o decisión de contratación.
- señal ausente = desconocida/caveated, nunca desempeño bajo.
- MoveNet real o caveat; no fallback FaceMesh para hombros.

## Contrato científico R-6

Cadena de inferencia obligatoria:

`constructo → demanda de tarea → conducta observable → telemetría agregada → feature versionada → regla provisional → disponibilidad/confianza/caveats → narrativa para revisión humana`.

- El XLSX fuente es una matriz de hipótesis y procedencia, no evidencia de validación.
- Los puntajes transformados 0–100 no son percentiles, normas, diagnósticos ni puntos de corte.
- Toma de decisiones y riesgo/feedback deben ser `descriptive_only` mientras no exista validación normativa.
- Adaptabilidad es `insufficient` con la batería actual.
- Liderazgo y comunicación son `not_measured` en tareas individuales actuales.
- Tolerancia a la frustración no se deriva de Balloon, AUs ni rPPG.
- Leadership/communication y cualquier evidencia faltante deben usar `score: null`, no cero ni 50 neutral.
- No generar fortalezas/áreas de atención para el framework provisional sin normas y criterios validados.

## Verificación

Entorno conocido: `NODE_ENV` del shell puede ser `production`; fijarlo explícitamente.

```bash
NODE_ENV=test npx vitest run <focales> --pool=threads --reporter=default
NODE_ENV=test npx vitest run --pool=threads --reporter=default
npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

Para Vite/smoke:

```bash
NODE_ENV=development npx vite --host 127.0.0.1 --port 5173
```

Validar con navegador real stable/original + fixtures en desktop y móvil: consola, page errors, request failures, overflow horizontal, semántica `No medido`, privacidad y ausencia de claims HR no soportados.

Tras cambios con tests y build, entregar resumen de archivos/comandos/resultados y enviar la notificación de cierre a Discord DM `.sarlock` cuando la herramienta de mensajería esté disponible.

---

## GPU Lambda (Tier-1) — Protocolo operativo en Pi (actualizado 2026-09-03)

- **NO usar `~/bin/gpu.sh` ni `switch_model.py`** — el guardian los bloquea (mencionan reinicio de gateway). Flujo vigente:
  1. Lanza: `python3 /home/sarlock/krumm/test-mpfl/scripts/launch_lambda.py` (2x H100 SXM5, us-southeast-1, fs `qwen-storage`, modelo `/lambda/nfs/qwen-storage/models/Qwen3.8-27B-FP8`; evita doble instancia; escribe `~/.hermes/gpu_state.json` con instance_id + ip).
  2. Túnel: `ssh -i ~/.ssh/lambda_key -o IdentitiesOnly=yes -fNL 18000:localhost:8000 ubuntu@<ip>`. Auto-saneado: `~/.hermes/scripts/gpu_tunnel_check.sh` (crontab */5) reconecta si la instancia sigue activa en Lambda y limpia `gpu_state.json` si la instancia ya no existe (fix 2026-09-07: la versión previa validaba la IP pública:8000 — inalcanzable — y nunca reconectaba).
  3. Salud (2-5 min): `curl -sf http://127.0.0.1:18000/health`.
  4. Config: `~/.hermes/config.yaml` → default `qwen-model` (custom, `http://127.0.0.1:18000/v1`). El agente **NO** puede editar config.yaml (guard de seguridad): se edita a mano o con `hermes config`. Aplica con `/reset` (CLI) o `hermes gateway restart` (Discord).
- Apagar: terminar instancia por API Lambda (`LAMBDA_API_KEY` en `~/.hermes/.env`, header `User-Agent: curl/8.0`) + `pkill -f "ubuntu@"`. GPU-toggle solo por instrucción explícita del usuario; avisar costo vivo.
- Watchdog crontab (`~/.hermes/scripts/lambda_idle_watchdog.sh`, cada 5 min) monitorea idle/age; **desde 2026-09-08 con AUTO-OFF ACTIVO** (`GPU_AUTO_OFF=1` en crontab): cruza umbral (**idle >1h / age >6h**) → termina instancia, limpia state, vuelve a NIM, comenta cards y alerta Discord hermes-alerts. Fix 2026-09-07 (schema drift API Lambda: `file_system_names`, edad via stamp `~/.hermes/lambda_age_since`).
- Costo real verificado contra la API (2026-09-07): **$8.38/h** (`price_cents_per_hour`=838, us-southeast-1), facturado al segundo.
- `gpu.sh up` **idempotente (2026-09-08)**: reinicia el gateway solo si la config cambió a GPU (si ya apuntaba, no reinicia) — evita drenar workers en vuelo.
- Solo encender cuando la tarea lo justifique (tests multi-archivo, builds, análisis pesado, porting).

## Automatización GPU / modelo — orquestador (2026-09-03)

- **Orquestador**: `python3 ~/bin/model_orchestrate.py`. Cada 5 min (systemd timer `gpu-orchestrate.timer`); escribe en `~/.hermes/logs/gpu_orchestrate.log`. Salud GPU **solo por túnel 127.0.0.1:18000** (la IP pública:8000 es inalcanzable — fix 2026-09-07: antes daba DOWN falso permanente y reintentaba `gpu.sh up` cada tick).
- **Policy**:
  - GPU qwen (Tier-1) es el modelo default SOLO cuando está la instancia viva + hay trabajo heavy pendiente.
  - `switch_model.py auto` decide final: si GPU DOWN y sin iam, apunta a NIM kimi-k3 (tier-2 gratis).
  - Las tareas "heavy" (código, multi-archivo, builds, porting, debugging, tests; definido por keywords) se auto-fijan con `hermes kanban set-model qwen-model`; el orquestador aunque esté DOWN avisa; si el usuario la desbloquea, un watcher levantará GPU (respetando `GPU_AUTO_UP=0/1`).
  - `NEVER_HEAVY`: tareas de cámara / hardware físico (e.g. T.3 sanity empírico) — no van a GPU.

- **Triggers automáticos**:
  - **Subida** (condición): gpu down (health por túnel) + al menos 1 tarea heavy ready + `GPU_AUTO_UP=1` → `gpu.sh up` (tuyo `scripts/launch_lambda.py` con guardian-off) + polling health/túnel (boot 4-10 min) → GPU/NIM vía switch_model (idempotente) + aviso Discord + comenta cards.
  - **Apagado**: manual por el usuario (desde 2026-09-07); el watchdog solo loguea el umbral. `GPU_AUTO_OFF=1` restaura el auto-apagado.
  - **Aviso AWS SSO** (cada 30 min, `aws-sso-renew.timer`): si el token AWS SSO local expira en <60 min, manda a Discord el enlace de refresh.

- **Channels Discord (server KRUMM `1384264454631587860`, mapeo 2026-09-08)**:
  - `general` (`1384264455432572940`) = home_channel del gateway (conversación con Hermes).
  - `hermes-alerts` (`1545165790641258557`) = **webhook `DISCORD_ALERTS_WEBHOOK_URL`** → alertas infra: SSO expiry (`aws_sso_renew.sh`), salud Pi disco/térmica/gateway (`health_monitor.sh`), watchdog GPU umbral idle/age (`lambda_idle_watchdog.sh`).
  - `krumm-auto` (`1545165393021116426`) = **webhook `DISCORD_OPS_WEBHOOK_URL`** → eventos operativos del orquestador GPU (`model_orchestrate.py`): GPU up, up-fallido, health no responde, auto-up bloqueado.
  - `kanban` (`1545165811126243449`) = **bot token `DISCORD_BOT_TOKEN`** → snapshot kanban cada 10' (`kanban_discord_reporter.py`), embed estilo Linear (solo ready/running/blocked + done recientes).
  - `DISCORD_WEBHOOK_URL` es legacy (apuntaba a un server Discord ajeno): los scripts usan las variables por rol; retirarlo tras validar.
  - **Cloudflare**: los webhook requieren `User-Agent` de navegador en `urllib` (si no → HTTP 403 error 1010); `curl` no lo necesita. En card kanban queda bitácora (comentarios automáticos).

- **Para el usuario**: desactivar el automatismo: `systemctl --user stop gpu-orchestrate.timer` (o setear `GPU_AUTO_UP=0` en mundial). Default: funcionando.

- Tier-1 (GPU on): `qwen-model` (Qwen3.8-27B-FP8, 1M ctx) vía túnel 18000. Es el `model.default`; con GPU off, los fallbacks NIM se activan solos.
- Fallbacks NIM (`NVIDIA_API_KEY` en `~/.hermes/.env`), en orden:
  1. `moonshotai/kimi-k3`
  2. `deepseek-ai/deepseek-v4-flash-0731`
  3. `nvidia/nemotron-3.5-lightning-30b-a3b`
  4. `deepseek-ai/deepseek-v4-pro-0813`
- Tier local (WAN down): `qwen2.5-coder:1.5b` vía Ollama (`http://127.0.0.1:11434/v1`).

## Credenciales e identidad en la Pi (2026-09-03)

- **GitHub CLI**: `gh` autenticado como `Carloss97` (scopes `repo`, `gist`, `read:org`) — `~/.config/gh`. Renueva sin tty: `gh auth login --hostname github.com --git-protocol https --web < /dev/null` (imprime código one-time para https://github.com/login/device).
- **AWS**: SSO (Identity Center), cuenta staging `931932531447`, role `AdministratorAccess`, usuario `admin-carlos`. `~/.aws/config`: sso-session `aws_sso` (start URL `https://d-90667969cb.awsapps.com/start`, `us-east-1`) + perfil `default`. El token SSO vive ~11 h; **refresco: `aws sso login --sso-session aws_sso --use-device-code`** (imprime URL + código corto). NUNCA pegar tokens ASIA de ~1000 chars por chat: un solo carácter de error → `InvalidClientTokenId`.
- **Cognito staging (creado 2026-09-12, FASE A.1/A.2):** pool `us-east-1_FX1VyzTTA` (`krumm-staging-recruiters`; username=email, auto-verify por email, password min 12, MFA off, grupos `recruiters`+`admins`) + client SPA `7vpliahah8jbc5fh0d59qbjgej` (`krumm-web-spa`; sin secret, OAuth `code`, callbacks `https://stage.krumm.cl/empresa/acceso` + `https://krumm.cl/empresa/acceso`, logout `/empresa`, scopes openid/email/profile, refresh 30d, PreventUserExistenceErrors ENABLED).
- **PITFALL RED Pi (2026-09-12):** la egress IPv6 blackholea `cognito-idp.us-east-1` (aws CLI v2/awscrt y boto3 default CUELGAN; `curl -4` responde en 0.5s; sts/ses no se ven afectados). Solución persistente: `~/.hermes/scripts/aws_v4only.py` (venv `~/.venvs/awscli1` con boto3; fuerza `getaddrinfo` a AF_INET) — uso: `aws_v4only.py cognito-idp list_user_pools '{"MaxResults": 10}'`. SAM CLI: `~/.venvs/sam/bin/sam` (1.166.2).
- **Lambda**: `LAMBDA_API_KEY` en `~/.hermes/.env`. La API Lambda exige `User-Agent: curl/8.0` (sin UA → HTTP 403).
- **Discord gateway**: systemd user `hermes-gateway.service` (si no hay `XDG_RUNTIME_DIR`, exportar `/run/user/$(id -u)`). Cambios de `config.yaml` requieren `hermes gateway restart`. Logs INFO de conexión en `~/.hermes/logs/gateway.log` (usar `grep -a`; journalctl solo muestra WARNING).
- Regla vigente: no tocar `.env`, credenciales ni secretos; esta sección documenta ubicaciones y refresco, no valores.