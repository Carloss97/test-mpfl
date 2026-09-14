// G.2 (KRU, FASE G): error tracking — Sentry frontend.
//
// El DSN es OPCIONAL: viene del build env `VITE_SENTRY_DSN` (GH secret
// SENTRY_DSN; solo stage/prod). Sin DSN (local/demo) NO se inicializa
// Sentry: el ErrorBoundary igual funciona como fallback (catch + render),
// simplemente no reporta.
//
// Reglas de privacidad (docs/security/error-tracking.md) — NUNCA:
// - payloads de sesión, telemetría biométrica ni respuestas en events,
//   breadcrumbs, tags o context
// - PII (sendDefaultPii: false; sin user/email/name/phone)
// - session replay ni performance traces (tracesSampleRate: 0)
// - tokens/JWT en breadcrumbs (sanitize: solo strings ≤500 chars y números)
import * as Sentry from '@sentry/react';

export const sentryConfig = {
  enabled: Boolean(import.meta.env.VITE_SENTRY_DSN),
  environment: import.meta.env.VITE_SENTRY_ENV || 'production',
  release: import.meta.env.VITE_GIT_SHA || undefined,
};

// Categorías de breadcrumb que NUNCA viajan a Sentry (guardrail para
// instrumentación futura).
export const FORBIDDEN_BREADCRUMB_CATEGORIES = new Set([
  'krumm-session',
  'krumm-telemetry',
  'krumm-bio',
  'krumm-answer',
]);

// Sanitización de breadcrumbs: descarta categorías prohibidas y limpia
// `data` (solo strings ≤500 y números; nunca objetos/arrays anidados).
export function sanitizeBreadcrumb(crumb) {
  if (!crumb) return null;
  if (FORBIDDEN_BREADCRUMB_CATEGORIES.has(crumb.category)) return null;
  if (crumb.data) {
    const clean = {};
    for (const [k, v] of Object.entries(crumb.data)) {
      if (typeof v === 'string') clean[k] = v.slice(0, 500);
      else if (typeof v === 'number') clean[k] = v;
    }
    crumb = { ...crumb, data: clean };
  }
  return crumb;
}

// Filtro final de events: sin tags que contengan datos de sesión/bio/PII.
export function sanitizeEvent(event) {
  if (!event) return null;
  if (event.tags) {
    for (const k of Object.keys(event.tags)) {
      if (/session|payload|bio|landmark|frame|pose|keypoint|blendshape|answer|response|telemetry|invite|token|email|phone/i.test(k)) {
        delete event.tags[k];
      }
    }
  }
  return event;
}

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) return false;
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: sentryConfig.environment,
    release: sentryConfig.release,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeBreadcrumb: sanitizeBreadcrumb,
    beforeSend: sanitizeEvent,
  });
  // Con Sentry.init el SDK auto-registra: window.onerror,
  // unhandledrejection, console.error y React (ErrorBoundary exportado).
  return true;
}

export const ErrorBoundary = Sentry.ErrorBoundary;
