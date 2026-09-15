// F.1 (KRU-118, plan pre-beta 2026-09-12) — Analytics de producto PostHog,
// privacy-safe.
//
// Contrato (docs/legal/politica-privacidad.md + plan §F.1):
// - OPT-IN explícito: solo captura con VITE_POSTHOG_ID (build) Y consentimiento
//   (cookie `cookie_consent`, 1 año). Sin alguno de los dos = no-op total
//   (sin red, sin cargar el chunk de posthog-js).
// - Rutas exclusas: /postulaciones* (candidato) y /dev* (labs) NO emiten
//   pageview ni autocapture; solo el whitelist de eventos de funnel
//   (invite_opened, consent_accepted, game_N_completed, report_viewed,
//   nps_submitted).
// - NUNCA sale: datos biométricos, contenido de respuestas/telemetría, tokens
//   de invitación, datos personales. Las propiedades pasan por un scrubber de
//   doble barrera (patrones prohibidos en keys + truncamiento).
// - posthog-js se carga con import dinámico (solo tras consentir): el chunk de
//   entrada no crece (budget G.1).
// - Sin perfilación: no se pasa identidad (posthog.identify NO se usa); el
//   distinct_id anónimo de posthog-js basta para el funnel de producto.

// Env VITE_POSTHOG_API: la credencial pública del proyecto PostHog.
// Inyectada en CI/CD (secrets POSTHOG_PROJECT_API_KEY); sin ella = analytics off.
const POSTHOG_ID = import.meta.env.VITE_POSTHOG_API || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
// IMPORTANTE: variante no-external (docs oficiales de PostHog): NO carga
// scripts externos (config.js remote, recorder, surveys, site-apps,
// conversations) → session replay IMPOSIBLE por construcción (privacy), sin
// expansión de script-src en la CSP, bundle determinista. En la CSP solo
// requiere connect-src a us.i.posthog.com + us.posthog.com (flags/decide).

export const CONSENT_COOKIE = 'cookie_consent';
const CONSENT_MAX_AGE_S = 60 * 60 * 24 * 365; // 1 año (tabla de cookies de la política)
const EXCLUDED_PREFIXES = ['/postulaciones', '/dev'];
// Public PII forms are excluded absolutely: unlike candidate routes, they have
// no funnel-event exception because typed contact details must never be tracked.
const PII_EXCLUDED_ROUTES = new Set(['/solicitar-demo']);

// Browser routers resolve a trailing slash to the same page. Normalize only
// route terminators before membership checks so exact PII exclusions stay exact:
// /solicitar-demo/ is protected, while /solicitar-demolition is not suppressed.
function normalizeAnalyticsPath(path = '') {
  if (typeof path !== 'string') return '';
  const pathname = path.split(/[?#]/, 1)[0];
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function matchesExcludedPrefix(path) {
  return EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
// Whitelist de eventos permitidos en rutas exclusas (funnel de candidato).
// nps_submitted (F.2): encuesta opcional 1-10 al final del reporte; solo viaja
// el score (métrica agregada, sin PII).
const EXCLUDED_ROUTE_WHITELIST = new Set(['invite_opened', 'consent_accepted', 'report_viewed', 'nps_submitted']);
const GAME_COMPLETED_RE = /^game_[1-9][0-9]*_completed$/;
// Doble barrera: si una key de propiedad matchea, no viaja NUNCA.
const FORBIDDEN_KEY_RE =
  /(landmark|video|frame|face|pose|keypoint|blendshape|pointer|trajectory|telemetry|biometric|answer|response|session|payload|name|email|phone|token|invite|gps|location|sample|signal|event|capture)/i;
const MAX_STRING_LEN = 120;
const MAX_DEPTH = 3;
const MAX_ARRAY_ITEMS = 10;

let posthogPromise = null;

function readConsentCookie() {
  if (typeof document === 'undefined') return null;
  const row = document.cookie.split('; ').find((entry) => entry.startsWith(`${CONSENT_COOKIE}=`));
  if (!row) return null;
  return row.slice(CONSENT_COOKIE.length + 1) === 'analytics' ? 'granted' : 'denied';
}

// La cookie es la única fuente de verdad (sin caché en módulo: si el usuario
// borra cookies o responde en otra pestaña, el estado se actualiza solo).
export function consentFromStorage() {
  return readConsentCookie() ?? 'unknown';
}

export function hasAnalyticsConsent() {
  return consentFromStorage() === 'granted';
}

/**
 * Fija el consentimiento en la cookie `cookie_consent` (1 año, forma
 * documentada en la política de privacidad). Si se acepta, arranca
 * posthog-js (lazy) — no hace fetch si no hay key.
 */
export function setConsent(granted) {
  if (typeof document !== 'undefined') {
    document.cookie = `${CONSENT_COOKIE}=${granted ? 'analytics' : 'essential'}; max-age=${CONSENT_MAX_AGE_S}; path=/; SameSite=Lax`;
  }
  if (granted) void bootstrap();
  return consentFromStorage();
}

export function isExcludedRoute(path = '') {
  const normalizedPath = normalizeAnalyticsPath(path);
  return PII_EXCLUDED_ROUTES.has(normalizedPath) || matchesExcludedPrefix(normalizedPath);
}

export function isPiiExcludedRoute(path = '') {
  return PII_EXCLUDED_ROUTES.has(normalizeAnalyticsPath(path));
}

/** ¿Hay key de build? (false → no existe analytics para consentir). */
export function isAnalyticsConfigured() {
  return !!POSTHOG_ID;
}

/**
 * ¿Analytics activo para esta petición? Key de build + consent + no modo fixture.
 */
export function isAnalyticsActive(path = '', search = '') {
  if (!POSTHOG_ID) return false;
  if (consentFromStorage() !== 'granted') return false;
  let params = null;
  try {
    params = new URLSearchParams(search);
  } catch {
    params = null;
  }
  if (params && (params.get('fixture') === '1' || params.get('fixtureMode') === '1')) return false;
  return true;
}

/**
 * Scrubber de doble barrera para propiedades de eventos. Solo pasan scalars,
 * strings truncados, arrays/objects profundos ≤ MAX_DEPTH, y las keys que
 * matchean patrones prohibidos se descartan.
 */
export function sanitizeProperties(props = {}) {
  const clean = (value, depth = 0) => {
    if (value === undefined || value === null) return null;
    if (depth > MAX_DEPTH) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.slice(0, MAX_STRING_LEN);
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map((item) => clean(item, depth + 1));
    if (typeof value === 'object') {
      const out = {};
      for (const [key, val] of Object.entries(value)) {
        if (typeof key !== 'string' || FORBIDDEN_KEY_RE.test(key)) continue;
        const v = clean(val, depth + 1);
        if (v !== null) out[key] = v;
      }
      return out;
    }
    return null; // functions/symbols/otros: descartar
  };
  if (typeof props !== 'object' || props === null) return {};
  return clean(props);
}

async function bootstrap() {
  if (!POSTHOG_ID || consentFromStorage() !== 'granted') return null;
  if (!posthogPromise) {
    posthogPromise = import('posthog-js/dist/module.no-external.js')
      .then((mod) => {
        const posthog = mod.default ?? mod;
        posthog.init(POSTHOG_ID, {
          api_host: POSTHOG_HOST,
          autocapture: false, // plan §F.1: solo pageviews + eventos explícitos
          capture_pageview: false, // manual (route observer, con exclusiones)
          person_profiles: 'never', // sin perfiles de persona (privacy 2025+)
          persistence: 'cookie',
        });
        return posthog;
      })
      .catch(() => null);
  }
  return posthogPromise;
}

/**
 * Captura un evento de producto. Returns true si se envió, false si quedó
 * gateado (sin key/consent, ruta excluida sin whitelist, fixture).
 */
export async function track(event, properties = {}, context = {}) {
  const path = context.path ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  const search = context.search ?? (typeof window !== 'undefined' ? window.location.search : '');
  if (typeof event !== 'string' || !event) return false;
  if (!isAnalyticsActive(path, search)) return false;
  if (isPiiExcludedRoute(path)) return false;
  if (isExcludedRoute(path) && !(EXCLUDED_ROUTE_WHITELIST.has(event) || GAME_COMPLETED_RE.test(event))) {
    return false;
  }
  const posthog = await bootstrap();
  if (!posthog) return false;
  posthog.capture(event, sanitizeProperties(properties));
  return true;
}

/**
 * Pageview manual (el auto de posthog está desactivado). Usa
 * capture('$pageview', ...) en vez de page(): en posthog-js 1.4xx la
 * llamada page() tras init inmediato no llegó a fluir en smoke live,
 * mientras que capture() sí (mismo pageViewManager.doPageView interno).
 */
export async function trackPageView(pathArg, searchArg) {
  const path = pathArg ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  const search = searchArg ?? (typeof window !== 'undefined' ? window.location.search : '');
  if (typeof path !== 'string' || !path) return false;
  if (!isAnalyticsActive(path, search)) return false;
  if (isExcludedRoute(path)) return false;
  const posthog = await bootstrap();
  if (!posthog) return false;
  posthog.capture('$pageview', sanitizeProperties({ path }));
  return true;
}

/**
 * Observador de rutas: página inicial + pushState/replaceState/popstate.
 * Cubre tanto las navegaciones de location.assign/replace (carga completa:
 * el pageview inicial lo cubre) como los cambios in-page (pocos en esta codebase).
 */
export function startRouteObserver(onRoute) {
  if (typeof window === 'undefined' || typeof history === 'undefined' || typeof onRoute !== 'function') {
    return () => {};
  }
  let lastPath = window.location.pathname;
  const originals = new Map();
  const report = () => {
    const current = window.location.pathname;
    if (current !== lastPath) {
      lastPath = current;
      onRoute(current);
    }
  };
  for (const name of ['pushState', 'replaceState']) {
    const original = history[name];
    if (typeof original !== 'function') continue;
    originals.set(name, original);
    history[name] = function patched(...args) {
      const result = original.apply(this, args);
      report();
      return result;
    };
  }
  window.addEventListener('popstate', report);
  onRoute(lastPath); // pageview inicial
  return () => {
    window.removeEventListener('popstate', report);
    for (const [name, original] of originals) history[name] = original;
  };
}

// Solo tests: restablece el estado módulo entre casos.
export function __resetAnalyticsForTests() {
  posthogPromise = null;
}
