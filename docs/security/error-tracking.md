# Error tracking (Sentry) — reglas y privacidad

**G.2 (FASE G, 2026-09-13).** Error tracking con Sentry cloud (plan Developer
free: 5,000 errores/mes, retención 30 días). Proyecto: "krumm" (org o4512081787486208).

## Arquitectura

- **Frontend**: `@sentry/react` (`src/observability/sentry.js`). El DSN viene
  del build env `VITE_SENTRY_DSN` (GH secret `SENTRY_DSN`; solo se inyecta en
  los builds de CD stage/prod). **Sin DSN (local/demo): no se inicializa** —
  el `ErrorBoundary` igual funciona como fallback (catch + render), sin reporte.
  `VITE_GIT_SHA` = release (agrupamiento por deploy).
- **Backend**: `@sentry/node` (`backend/src/index.mjs`). Env `SENTRY_DSN` vía
  parámetro CFN `SENTRYDSN` (NoEcho) en `infra/m2-backend-stack.yaml`.
  `captureException` SOLO en el catch del handler (500), con tags `code` +
  `route` — nunca con payloads crudos.
- **CSP**: `https://o4512081787486208.ingest.us.sentry.io` en connect-src
  (RHP CloudFront; ver SECURITY.md).

## NUNCA (reglas duras)

1. **Payloads de sesión, telemetría biométrica** (landmarks, frames,
   blendshapes, keypoints, samples) **ni respuestas/answer data** en events,
   breadcrumbs, tags o context. `beforeBreadcrumb` descarta las categorías
   `krumm-session`, `krumm-telemetry`, `krumm-bio`, `krumm-answer` y limpia
   `data` (solo strings ≤500 chars y números; nunca objetos/arrays).
2. **PII**: `sendDefaultPii: false`; sin user/email/name/phone en ningún
   campo. `beforeSend` elimina tags que coincidan con
   `/session|payload|bio|landmark|frame|pose|keypoint|blendshape|answer|response|telemetry|invite|token|email|phone/i`.
3. **Session replay y performance traces desactivados**
   (`tracesSampleRate: 0`) — no consumir spans del plan free y no capturar
   más de la cuenta.
4. **Tokens/JWT** en breadcrumbs o URLs: la sanitización anterior lo impide;
   si se agrega instrumentación de fetch, los breadcrumbs solo llevan
   URL+status (sin body ni headers).
5. **`/solicitar-demo`**: esta ruta pública contiene un formulario PII. El
   filtro route-specific descarta todos sus breadcrumbs y eventos (incluidos
   request URL, extras y valores de formulario), sin desactivar Sentry para el
   resto de la aplicación.

## Qué SÍ se envía

- Errores JS no capturados + `unhandledrejection` + errores React
  (`ErrorBoundary`): stack, message, ruta, navegador, versión de la app.
- 500 del handler Lambda: error + tags `code` (ej. `internal_error`) y `route`.
- Breadcrumbs de navegación/fetch (URL + status, sin body).

## Config de la UI de Sentry (usuario, una vez)

- **Settings → Data Management → IP Addresses: "Do Not Store"** — el SaaS
  registra la IP del que envía el evento si no se desactiva.
- Alerts: email en issues nuevas (default del plan).
- El DSN de frontend viaja en el bundle JS por diseño (es una clave de
  ingesta, no de lectura); rotación en Settings → Keys si se considera
  expuesto (p. ej. si pasó por chat).

## Tests

- `src/observability/sentry.test.jsx` — sin DSN → no-op; con DSN → init;
  `sanitizeBreadcrumb`/`sanitizeEvent` (categorías prohibidas, truncado,
  tags y exclusión total de `/solicitar-demo`); `ErrorBoundary` → fallback de marca.
- `backend/test/sentry.test.mjs` — 500 con DSN → `captureException` llamado
  con tag `code`; sin DSN → no llamado.

## Verificación live (E2E)

Smoke: cargar stage → inyectar `Error('krumm-g2-verify-…')` no capturado →
interceptar el fetch a `o4512081787486208.ingest.us.sentry.io` → esperar
respuesta 207 (envelope aceptada) + confirmar el issue "krumm-g2-verify" en
la UI de Sentry.
