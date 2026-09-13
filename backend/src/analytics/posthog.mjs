// posthog.mjs — Eventos PostHog server-side (F.2, KRU-118): Lambda → /capture/.
//
// Best-effort por diseño (mismo principio que el email de A.1): una falla de
// PostHog NUNCA bloquea ni altera la respuesta principal. Sin PII: el caller
// solo pasa propiedades agregadas (el scrubber adicional descarta claves
// prohibidas y trunca cadenas — doble barrera igual que el cliente).
//
// Credencial: key de PROYECTO (phc_) vía env POSTHOG_API_KEY. Es la misma key
// pública que viaja en el bundle del frontend (no es secreta, pero NO se
// hardcodea en el repo: el stack la inyecta por parámetro NoEcho). Vacía →
// no-op seguro.
//
// Endpoint: POST {host}/capture/ (body-auth, funciona con key de proyecto;
// la key personal phx_ es rechazada en /capture/ — solo sirve al REST API).

const DEFAULT_HOST = 'https://us.posthog.com';
const CAPTURE_TIMEOUT_MS = 2000;
const SERVICE_ID = 'krumm-backend';

// Mismo patrón que el scrubber del cliente (src/analytics/analytics.js):
// nada de PII/biométricos/tokens cruza hacia PostHog.
const FORBIDDEN_KEY_RE = /(landmark|video|frame|face|pose|keypoint|blendshape|pointer|trajectory|telemetry|biometric|answer|response|session|payload|name|email|phone|token|invite|gps|location|sample|signal|event|capture)/i;

function sanitizeServerProperties(input) {
  if (typeof input !== 'object' || input === null) return {};
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof k !== 'string' || FORBIDDEN_KEY_RE.test(k)) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 120);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'object' && v !== null) {
      const nested = {};
      for (const [k2, v2] of Object.entries(v)) {
        if (typeof k2 !== 'string' || FORBIDDEN_KEY_RE.test(k2)) continue;
        if (typeof v2 === 'string') nested[k2] = v2.slice(0, 120);
        else if (typeof v2 === 'number' && Number.isFinite(v2)) nested[k2] = v2;
        else if (typeof v2 === 'boolean') nested[k2] = v2;
      }
      out[k] = nested;
    }
    // null/undefined/functions/símbolos: se descarta.
  }
  return out;
}

/**
 * Envía un evento a PostHog (best-effort).
 * @param {string} event nombre del evento (ej. 'invite_received').
 * @param {object} [properties] propiedades agregadas (sin PII).
 * @param {object} [opts] { apiKey, apiHost, fetchImpl, log } — inyectables para tests.
 * @returns {Promise<{sent:boolean, status?:number, reason?:string}>}
 */
export async function sendPosthogEvent(event, properties = {}, opts = {}) {
  const apiKey = opts.apiKey ?? process.env.POSTHOG_API_KEY ?? '';
  const host = (opts.apiHost ?? process.env.POSTHOG_API_HOST ?? DEFAULT_HOST).replace(/\/+$/, '');
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const log = opts.log ?? ((...args) => console.log(...args));
  if (typeof event !== 'string' || !event.trim()) return { sent: false, reason: 'invalid_event' };
  if (!apiKey) return { sent: false, reason: 'not_configured' };
  if (typeof fetchImpl !== 'function') return { sent: false, reason: 'no_fetch' };
  const payload = {
    api_key: apiKey,
    event,
    distinct_id: SERVICE_ID,
    properties: sanitizeServerProperties(properties),
    timestamp: new Date().toISOString(),
  };
  try {
    const response = await fetchImpl(`${host}/capture/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
    });
    log('posthog_event', event, response.status);
    return { sent: response.ok, status: response.status };
  } catch (err) {
    // Solo el código del error (nunca el payload ni URLs con la key).
    log('posthog_event_error', event, String(err?.name ?? 'send_error').slice(0, 40));
    return { sent: false, reason: 'send_error' };
  }
}
