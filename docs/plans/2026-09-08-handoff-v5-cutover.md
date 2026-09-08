# Handoff — V5 Cutover + audit h46c + deploy prod (fase v3, cierre) — 2026-09-08

**Card:** `t_0184d2e6` (V5: Cutover — deprecaciones, audit h46c, deploy prod)
**Autorización:** comentario kanban 2026-09-08 05:51 — "AUTORIZADO POR EL
USUARIO (sesion interactiva #krumm-auto): 'Autorizo V5'" (deploy prod incluido).
**Parent:** t_9319e84d (V4, done) · **Child:** t_ee587ad1 (quedará ready al
completar V5).

## Qué se hizo

1. **Cutover de rutas** (plan fase v3 §2):
   - `/reclutador*` → `/empresa` (navegación real `location.replace`,
     conserva `?lang`/hash).
   - `/postulaciones*` sin `invite` y sin `fixture` → `/candidato`
     (conserva `?lang`); con `?invite=…` el flujo de evaluación se conserva;
     con `?fixture=1` el reporte QA se conserva.
   - Helpers puros en `src/postulation-demo/postulationDemoRoute.js`:
     `resolveV5Cutover(pathname, search)` + `candidateHomeRedirectUrl(search)`.
   - `src/main.jsx`: cutover tras la normalización legacy
     (`/postulaciones-demo/hr` → `/reclutador` → `/empresa` en cadena) y sin
     render mientras redirige (sin flash de landing).
2. **Borrado de vistas deprecadas** (`git rm` con paths explícitos, 12 archivos):
   - `src/postulation-demo/hr-dashboard/` (9 archivos: HrDashboardRoot,
     PostulationHrDashboard, hrDashboardApi/Data + tests + CSS) — reemplazado
     por `/empresa*` (el reporte embebido del detalle V3 usa el motor H4.3,
     no el árbol hr-dashboard: D9).
   - `src/postulation-demo/PostulationLanding.jsx` + test — reemplazada por
     `/candidato` (V1). El phase "landing" de `PostulationDemoApp` ahora es
     `home-redirect` (navegación a /candidato, rama defensiva; prop `navigate`
     inyectable, patrón onNavigate de V1).
   - `scripts/smoke-postulation-hr-dashboard.mjs` (smoke de la vista borrada).
   - **Retargeteo de salidas del flujo:** "Volver al inicio" (setup), abortar
     (stage) y reiniciar (reporte) → `/candidato` (antes: landing interna).
3. **Landing pública actualizada al cutover:** CTA hero "Acceso candidatos"
   → `/candidato`; cards de accesos → `/empresa/acceso` (empresa) y `/candidato`
   (candidato); copy "cómo funciona" pasos 1/4 → `/candidato` y `/empresa`.
4. **Tests:** suite 950 → 934 (−24 de las vistas borradas: 4 test files
   hr-dashboard, PostulationLanding, 3 tests H4.4 del design-system) + 8 nuevos
   (6 cutover en route test, 2 cutover en app test). **934/934 en 127 archivos.**
   `PostulationFlowDesignSystem.test.jsx` recortado a H4.3 (flujo candidato).
5. **Audit visual h46c** (`scripts/smoke-h46c-visual-audit.mjs`, Chromium sobre
   build prod `vite preview`): 12 rutas × (ES desktop + ES móvil + EN desktop)
   + 6 verificaciones de cutover en navegador real = **42 vistas, 0 fallos, 0
   warnings, 0 console errors, 25 pares de contraste AA (mín 6.02:1), pill de
   idioma terracota verificada, 30 screenshots** en `docs/qa/h46c-visual-audit/`
   (+ doc `h46c-visual-audit.md`).
6. **Gates:** build prod OK (6.7s, warning de chunks preexistente), oxlint 0
   errores en diff, `npm audit --omit=dev` 0 vulnerabilidades,
   `git diff --check` limpio.

## Desviaciones / decisiones

- **CSS de la landing interna se conserva** en `postulationDemo.css` (archivo
  compartido con el flujo: guard/setup/stage/reporte): las reglas
  landing-only (`.postulation-demo__landing*`, `__hero*`, `__coverage`,
  `__privacy`, `__brief-link`) quedan órfanas sin impacto funcional (ningún
  elemento las usa). Borrarlas de un CSS de 3200 líneas intercaladas con
  media-queries era de mayor riesgo que el beneficio; cleanup opcional futuro.
- **`ReferenceGuide.jsx`** (app técnica /tecnico) conserva su tabla histórica
  de fases (A — Shell producto menciona PostulationLanding como estado
  "Completada" de su fase de build): es inventario histórico, no descripción
  del estado actual.
- El h1 de `/candidato` es el hero de la referencia ("Encuentra tu próxima
  oportunidad."), no el título de shell de la era V0 — el mapa de h1 del
  primer run del audit h46c usaba valores V0 y fue corregido (mismo caso para
  el detalle de proceso: nombre del rol, por diseño V3).

## Deploy (AWS)

- Bucket: `krumm-staging-frontend-931932531447` · Distribution:
  `EDQ39PDNI931R` · `VITE_KRUMM_API_BASE` sin definir = modo demo.
- `scripts/deploy-frontend.sh` (sync S3 --delete + index no-cache +
  invalidación CloudFront).
- **Verificación prod** (post-deploy): [PENDIENTE — se completa aquí con los
  números de la verificación: HTTP codes, fuentes v2, CSP m3, redirecciones en
  navegador, 0 console errors].

## Entorno

- SSO AWS: device-code por usuario (~11h de vida del token).
- Preview local: `NODE_ENV=production npm run preview` (127.0.0.1:4173).
- Suite: `NODE_ENV=test ./node_modules/.bin/vitest run` (npx bloqueado por
  security-scan transitorio en esta sesión).

## Siguiente (ordenado)

1. [child] `t_ee587ad1` queda ready al completar esta card.
2. Follow-up documentado fuera de fase: API de procesos (backend real para el
   workspace empresa; hoy es demo + `GET /sessions` opcional).
3. EXP-7 Bomb (cadena BOMB autorizada en la misma sesión) — su card sigue su
   propia secuencia.
